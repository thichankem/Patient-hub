// ─────────────────────────────────────────────────────────────────────────────
// STUB AI — điểm cắm cho Random Forest (dự đoán bệnh) + RAG/Gemini (NLP chatbot)
// và Reinforcement Learning (xếp thứ tự phòng xét nghiệm).
//
// Hiện trả kết quả mặc định để hệ thống chạy được không cần model/API key.
// Khi tích hợp thật: thay phần thân hàm, KHÔNG đổi chữ ký hàm.
// ─────────────────────────────────────────────────────────────────────────────

export interface DiseasePrediction {
  departmentId: string | null; // khoa đề xuất, null = để bệnh nhân tự chọn
  diseaseName: string | null;
  advice: string | null; // lời khuyên nếu bệnh nhẹ, không cần đi viện
}

// Random Forest + RAG/Gemini cắm vào đây.
export async function predictDiseaseDepartment(
  _symptoms: string,
): Promise<DiseasePrediction> {
  return { departmentId: null, diseaseName: null, advice: null };
}

export interface TestRoomScheduleInput {
  itemId: string;
  testTypeId: string;
  estimatedMinutes: number;
  candidateRooms: Array<{ labRoomId: string; currentQueue: number }>;
}

export interface TestRoomScheduleResult {
  itemId: string;
  labRoomId: string | null; // null = không còn phòng → unavailable
  scheduleOrder: number;
}

// RL cắm vào đây. Hiện dùng greedy deterministic: gán phòng ít hàng chờ nhất,
// xếp thứ tự ưu tiên xét nghiệm nhanh trước để giảm tổng thời gian chờ.
export function scheduleTestRooms(
  items: TestRoomScheduleInput[],
): TestRoomScheduleResult[] {
  const queue = new Map<string, number>();
  for (const it of items) {
    for (const r of it.candidateRooms) {
      if (!queue.has(r.labRoomId)) queue.set(r.labRoomId, r.currentQueue);
    }
  }

  const ordered = [...items].sort(
    (a, b) => a.estimatedMinutes - b.estimatedMinutes,
  );

  const results: TestRoomScheduleResult[] = [];
  let order = 1;
  for (const it of ordered) {
    let best: { labRoomId: string; load: number } | null = null;
    for (const r of it.candidateRooms) {
      const load = queue.get(r.labRoomId) ?? r.currentQueue;
      if (!best || load < best.load) best = { labRoomId: r.labRoomId, load };
    }
    if (!best) {
      results.push({ itemId: it.itemId, labRoomId: null, scheduleOrder: 0 });
      continue;
    }
    queue.set(best.labRoomId, best.load + 1);
    results.push({
      itemId: it.itemId,
      labRoomId: best.labRoomId,
      scheduleOrder: order++,
    });
  }
  return results;
}
