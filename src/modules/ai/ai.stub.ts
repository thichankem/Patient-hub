// ─────────────────────────────────────────────────────────────────────────────
// AI integration points.
//
// scheduleTestRooms — đã wire vào RL agent đã train (model ai/rl scheduling/).
// predictDiseaseDepartment — vẫn stub: Random Forest model lưu .pkl Python-only,
//   không inference được trực tiếp từ Node. Cần triển khai 1 microservice
//   FastAPI (model ai/ml random forest/serve/) hoặc port model sang ONNX.
//   Hiện trả null để hệ thống vẫn chạy được — patient phải tự chọn khoa.
// ─────────────────────────────────────────────────────────────────────────────

import {
  isRlAgentAvailable,
  rlAgentLoadError,
  scheduleWithRL,
  type RlSchedulerInput,
  type RlSchedulerResult,
} from './rl-scheduler';

export interface DiseasePrediction {
  departmentId: string | null;
  diseaseName: string | null;
  advice: string | null;
}

// TODO: gọi microservice ML (Python FastAPI) hoặc chuyển model sang ONNX để
// inference trực tiếp tại Node. Hiện stub trả null để hệ thống vẫn hoạt động.
export async function predictDiseaseDepartment(
  _symptoms: string,
): Promise<DiseasePrediction> {
  return { departmentId: null, diseaseName: null, advice: null };
}

export interface TestRoomScheduleInput {
  itemId: string;
  testTypeId: string;
  estimatedMinutes: number;
  // queueMinutes của mỗi phòng = SUM(estimated_minutes) của các item chưa
  // hoàn tất tại phòng đó. Tính tại service trước khi gọi scheduler.
  candidateRooms: Array<{ labRoomId: string; queueMinutes: number }>;
}

export type TestRoomScheduleResult = RlSchedulerResult;

// Wire vào RL agent đã train (Q-learning, linear function approximation).
// Khi agent chưa load được (file thiếu / chiều sai), fallback sang greedy SPT
// để API luôn trả kết quả.
export function scheduleTestRooms(
  items: TestRoomScheduleInput[],
): TestRoomScheduleResult[] {
  return scheduleWithRL(items as RlSchedulerInput[]);
}

// Diagnostic — để route /health hoặc admin có thể check.
export function aiHealth(): {
  rl_scheduler: { available: boolean; error?: string };
  disease_predict: { available: boolean; note: string };
} {
  return {
    rl_scheduler: {
      available: isRlAgentAvailable(),
      ...(rlAgentLoadError() ? { error: rlAgentLoadError()! } : {}),
    },
    disease_predict: {
      available: false,
      note: 'Stub — cần Python FastAPI microservice cho model RF',
    },
  };
}
