# -*- coding: utf-8 -*-
"""
Sinh tập kịch bản (scenarios) cho bài toán xếp lịch phòng xét nghiệm.

Mỗi scenario:
    - rooms: trạng thái các phòng (test_type, queue_minutes, est_minutes)
    - items: danh sách xét nghiệm bệnh nhân được chỉ định
    - optimal_total / optimal_assignment / optimal_order:
        lời giải tối ưu tính bằng brute-force (dùng để evaluate agent RL)

Chạy:
    python "model ai/rl scheduling/data/generate_dataset.py"
        --samples 1000 --out "model ai/rl scheduling/data/scheduling_scenarios.jsonl"
"""

import os
import json
import random
import argparse
from itertools import permutations, product

TEST_TYPES = [
    ("xet_nghiem_mau",       15),
    ("xet_nghiem_nuoc_tieu", 10),
    ("sieu_am_o_bung",       20),
    ("sieu_am_tim",          25),
    ("xquang_nguc",          10),
    ("xquang_xuong",         10),
    ("ct_scan",              30),
    ("mri",                  45),
    ("dien_tim",             10),
    ("noi_soi_da_day",       40),
]

ROOMS_PER_TYPE_RANGE = (1, 3)
QUEUE_MINUTES_RANGE = (0, 120)
N_TESTS_RANGE = (2, 5)


def build_hospital_state(rng: random.Random):
    rooms, rid = [], 0
    for tname, est in TEST_TYPES:
        for _ in range(rng.randint(*ROOMS_PER_TYPE_RANGE)):
            rooms.append({
                "room_id":        rid,
                "test_type":      tname,
                "queue_minutes":  rng.randint(*QUEUE_MINUTES_RANGE),
                "est_minutes":    est,
            })
            rid += 1
    return rooms


def pick_patient_tests(rng: random.Random):
    n = rng.randint(*N_TESTS_RANGE)
    chosen = rng.sample(TEST_TYPES, k=n)
    return [{"item_id": i, "test_type": t, "est_minutes": est}
            for i, (t, est) in enumerate(chosen)]


def simulate_plan(rooms_by_id, items, assignment, order):
    elapsed = 0
    for idx in order:
        room = rooms_by_id[assignment[idx]]
        elapsed = max(room["queue_minutes"], elapsed) + items[idx]["est_minutes"]
    return elapsed


def find_optimal(rooms, items):
    rooms_by_id = {r["room_id"]: r for r in rooms}
    cand_ids = [[r["room_id"] for r in rooms if r["test_type"] == it["test_type"]]
                for it in items]
    best = (float("inf"), None, None)
    for assign in product(*cand_ids):
        for order in permutations(range(len(items))):
            total = simulate_plan(rooms_by_id, items, list(assign), list(order))
            if total < best[0]:
                best = (total, list(assign), list(order))
    return best


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--samples", type=int, default=1000)
    parser.add_argument("--seed",    type=int, default=42)
    parser.add_argument("--out", type=str,
                        default=os.path.join(os.path.dirname(__file__),
                                             "scheduling_scenarios.jsonl"))
    args = parser.parse_args()

    rng = random.Random(args.seed)
    os.makedirs(os.path.dirname(args.out), exist_ok=True)

    with open(args.out, "w", encoding="utf-8") as f:
        for s in range(args.samples):
            rooms = build_hospital_state(rng)
            items = pick_patient_tests(rng)
            total, assign, order = find_optimal(rooms, items)
            f.write(json.dumps({
                "rooms": rooms,
                "items": items,
                "optimal_total": total,
                "optimal_assignment": assign,
                "optimal_order": order,
            }, ensure_ascii=False) + "\n")
            if (s + 1) % 200 == 0:
                print(f"  ...sinh {s + 1}/{args.samples}")

    print(f"Đã ghi: {args.out}")


if __name__ == "__main__":
    main()
