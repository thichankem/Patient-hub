// ─────────────────────────────────────────────────────────────────────────────
// Q-agent inference cho xếp lịch xét nghiệm.
//
// Cùng thuật toán với model ai/rl scheduling/train/env.py + agent.py.
// Load trọng số đã train từ q_agent.json (lưu offline bằng Python),
// rồi chạy greedy policy: ở mỗi bước chọn (item, room) có Q-value cao nhất.
//
// Bài toán:
//   - Bệnh nhân được chỉ định N xét nghiệm
//   - Mỗi xét nghiệm có ≥1 phòng (lab_room) phục vụ
//   - Mỗi phòng đang có queue (tổng phút bệnh nhân khác đang chờ)
//   - Cần quyết định: (item → room) + thứ tự bệnh nhân đi qua
//   - Mục tiêu: tối thiểu hóa tổng thời gian bệnh nhân hoàn tất
// ─────────────────────────────────────────────────────────────────────────────

import fs from 'node:fs';
import path from 'node:path';

// Vocab CỐ ĐỊNH (đồng bộ với train/env.py:TEST_TYPE_VOCAB).
// Khi tích hợp với DB thật, lib_test_types không có cột "vocab" → ta dùng hash
// của test_type_id (uuid) modulo VOCAB_SIZE để gán deterministic. Mất chính xác
// so với train trên synthetic data, nhưng vẫn đúng API và có thể re-train sau.
const VOCAB_SIZE = 10;

const FEATURE_DIM = 9 + VOCAB_SIZE; // khớp env.feature_dim() trong Python

interface RoomState {
  roomId: string;
  testType: string; // chỉ dùng để filter ứng viên — không đưa vào feature
  queueMinutes: number; // tổng phút queue hiện tại của phòng
}

interface ItemState {
  itemId: string;
  testType: string;
  estMinutes: number;
}

interface State {
  rooms: RoomState[];
  pending: ItemState[];
  elapsed: number;
}

/** Hash uuid → index 0..VOCAB_SIZE-1 deterministic (FNV-1a 32-bit). */
function vocabIndex(testTypeId: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < testTypeId.length; i++) {
    h ^= testTypeId.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h % VOCAB_SIZE;
}

/** Featurize 1 (state, action) — KHỚP env.featurize trong Python. */
function featurize(state: State, itemIdx: number, roomId: string): Float64Array {
  const item = state.pending[itemIdx]!;
  const room = state.rooms.find((r) => r.roomId === roomId)!;

  const wait = Math.max(room.queueMinutes - state.elapsed, 0);
  const sameTypeRooms = state.rooms.filter((r) => r.testType === item.testType);
  const sameTypeMinQueue = Math.min(...sameTypeRooms.map((r) => r.queueMinutes));
  const sameTypeAvgQueue =
    sameTypeRooms.reduce((s, r) => s + r.queueMinutes, 0) / sameTypeRooms.length;

  const phi = new Float64Array(FEATURE_DIM);
  // Numeric features (9):
  phi[0] = wait / 60;
  phi[1] = item.estMinutes / 60;
  phi[2] = room.queueMinutes / 60;
  phi[3] = state.elapsed / 60;
  phi[4] = (room.queueMinutes - sameTypeMinQueue) / 60;
  phi[5] = (room.queueMinutes - sameTypeAvgQueue) / 60;
  phi[6] = state.pending.length / 5;
  phi[7] = sameTypeRooms.length / 3;
  phi[8] = 1; // bias
  // One-hot test_type (10):
  phi[9 + vocabIndex(item.testType)] = 1;
  return phi;
}

function dot(w: Float64Array, phi: Float64Array): number {
  let s = 0;
  for (let i = 0; i < w.length; i++) s += w[i]! * phi[i]!;
  return s;
}

// ─── Loader ───────────────────────────────────────────────────────────────────

let cachedWeights: Float64Array | null = null;
let cachedLoadError: string | null = null;

function defaultModelPath(): string {
  // Tìm artifact đã train; có 2 vị trí khả dĩ:
  //   - model ai/rl scheduling/model/q_agent.json (folder gốc của user)
  //   - dist/.../model/q_agent.json (sau build, nếu copy thủ công)
  const root = process.cwd();
  return path.join(root, 'model ai', 'rl scheduling', 'model', 'q_agent.json');
}

function loadWeights(): Float64Array | null {
  if (cachedWeights) return cachedWeights;
  if (cachedLoadError) return null;

  const candidates = [
    process.env['RL_AGENT_PATH'] ?? '',
    defaultModelPath(),
  ].filter(Boolean);

  for (const p of candidates) {
    try {
      if (!fs.existsSync(p)) continue;
      const obj = JSON.parse(fs.readFileSync(p, 'utf8')) as { w: number[] };
      if (!Array.isArray(obj.w) || obj.w.length !== FEATURE_DIM) {
        cachedLoadError = `q_agent.json: w.length ${obj.w?.length} != ${FEATURE_DIM}`;
        return null;
      }
      cachedWeights = Float64Array.from(obj.w);
      return cachedWeights;
    } catch (err) {
      cachedLoadError = `Lỗi đọc ${p}: ${String(err)}`;
    }
  }
  cachedLoadError = 'Không tìm thấy q_agent.json — set RL_AGENT_PATH';
  return null;
}

export function isRlAgentAvailable(): boolean {
  return loadWeights() !== null;
}

export function rlAgentLoadError(): string | null {
  loadWeights();
  return cachedLoadError;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export interface RlSchedulerInput {
  itemId: string;
  testTypeId: string;
  estimatedMinutes: number;
  candidateRooms: Array<{ labRoomId: string; queueMinutes: number }>;
}

export interface RlSchedulerResult {
  itemId: string;
  labRoomId: string | null;
  scheduleOrder: number;
}

/**
 * Greedy Q-policy: ở mỗi bước, chọn (item, room) cho Q cao nhất.
 * Trả về plan đầy đủ với schedule_order = 1, 2, 3...
 */
export function scheduleWithRL(items: RlSchedulerInput[]): RlSchedulerResult[] {
  const w = loadWeights();
  if (!w) return greedyFallback(items);

  // Gom tất cả phòng được nhắc tới → state.rooms
  const roomMap = new Map<string, RoomState>();
  for (const it of items) {
    for (const r of it.candidateRooms) {
      if (!roomMap.has(r.labRoomId)) {
        roomMap.set(r.labRoomId, {
          roomId: r.labRoomId,
          testType: it.testTypeId,
          queueMinutes: r.queueMinutes,
        });
      }
    }
  }

  const state: State = {
    rooms: Array.from(roomMap.values()),
    pending: items.map((it) => ({
      itemId: it.itemId,
      testType: it.testTypeId,
      estMinutes: it.estimatedMinutes,
    })),
    elapsed: 0,
  };

  const plan: RlSchedulerResult[] = [];
  const unavailable: RlSchedulerResult[] = [];
  let order = 1;

  // Tách trước các item không có phòng nào — mark unavailable.
  for (let i = state.pending.length - 1; i >= 0; i--) {
    const it = state.pending[i]!;
    if (!state.rooms.some((r) => r.testType === it.testType)) {
      unavailable.push({ itemId: it.itemId, labRoomId: null, scheduleOrder: 0 });
      state.pending.splice(i, 1);
    }
  }

  while (state.pending.length > 0) {
    let best: { itemIdx: number; roomId: string; q: number } | null = null;
    for (let i = 0; i < state.pending.length; i++) {
      const it = state.pending[i]!;
      for (const room of state.rooms) {
        if (room.testType !== it.testType) continue;
        const phi = featurize(state, i, room.roomId);
        const q = dot(w, phi);
        if (!best || q > best.q) best = { itemIdx: i, roomId: room.roomId, q };
      }
    }
    if (!best) break; // không còn cặp hợp lệ — an toàn

    const it = state.pending[best.itemIdx]!;
    const room = state.rooms.find((r) => r.roomId === best!.roomId)!;
    const wait = Math.max(room.queueMinutes - state.elapsed, 0);
    state.elapsed += wait + it.estMinutes;
    room.queueMinutes = state.elapsed;
    plan.push({ itemId: it.itemId, labRoomId: room.roomId, scheduleOrder: order++ });
    state.pending.splice(best.itemIdx, 1);
  }

  return [...plan, ...unavailable];
}

/** Fallback greedy nếu chưa load được agent — đảm bảo API luôn trả kết quả. */
function greedyFallback(items: RlSchedulerInput[]): RlSchedulerResult[] {
  const queueByRoom = new Map<string, number>();
  for (const it of items) {
    for (const r of it.candidateRooms) {
      if (!queueByRoom.has(r.labRoomId)) {
        queueByRoom.set(r.labRoomId, r.queueMinutes);
      }
    }
  }
  // Item ngắn đi trước (heuristic SPT)
  const sorted = [...items].sort((a, b) => a.estimatedMinutes - b.estimatedMinutes);
  const out: RlSchedulerResult[] = [];
  let order = 1;
  let elapsed = 0;
  for (const it of sorted) {
    if (it.candidateRooms.length === 0) {
      out.push({ itemId: it.itemId, labRoomId: null, scheduleOrder: 0 });
      continue;
    }
    const best = [...it.candidateRooms].sort((a, b) => {
      const wa = Math.max((queueByRoom.get(a.labRoomId) ?? a.queueMinutes) - elapsed, 0);
      const wb = Math.max((queueByRoom.get(b.labRoomId) ?? b.queueMinutes) - elapsed, 0);
      return wa - wb;
    })[0]!;
    const wait = Math.max((queueByRoom.get(best.labRoomId) ?? best.queueMinutes) - elapsed, 0);
    elapsed += wait + it.estimatedMinutes;
    queueByRoom.set(best.labRoomId, elapsed);
    out.push({ itemId: it.itemId, labRoomId: best.labRoomId, scheduleOrder: order++ });
  }
  return out;
}
