# -*- coding: utf-8 -*-
"""
Inference: dùng Q-agent đã train để sinh lịch xét nghiệm cho 1 bệnh nhân.

Input:
    rooms: list {room_id, test_type, queue_minutes, est_minutes}
        - queue_minutes: tổng phút còn lại của hàng đợi hiện tại
    items: list {item_id, test_type, est_minutes}
        - item_id chính là test_order_items.id trong DB
Output:
    plan: list {item_id, lab_room_id, schedule_order} — sẵn sàng UPDATE vào
          bảng test_order_items.
    expected_total_minutes: tổng phút dự kiến bệnh nhân hoàn tất.

CLI:
    python "model ai/rl scheduling/serve/scheduler.py"
        --scenario examples/sample.json
        --model    "model ai/rl scheduling/model/q_agent.json"
"""

from __future__ import annotations
import os
import sys
import json
import argparse
from typing import List, Dict

THIS = os.path.dirname(__file__)
sys.path.insert(0, os.path.normpath(os.path.join(THIS, "..", "train")))
from env import SchedulingEnv
from agent import LinearQAgent


def load_agent(path: str) -> LinearQAgent:
    with open(path, encoding="utf-8") as f:
        return LinearQAgent.from_state_dict(json.load(f))


def schedule(rooms: List[Dict], items: List[Dict], agent: LinearQAgent) -> Dict:
    """
    Chạy policy greedy theo Q-value đã học → trả về plan + total time.

    Lưu ý: items có thể truyền item_id là UUID (string). Hàm này map lại
    sang index để gọi env, rồi đính kèm item_id gốc vào output.
    """
    # Env yêu cầu items không có UUID, ta gán index nội bộ
    internal_items = [{"item_id": i, "test_type": it["test_type"],
                       "est_minutes": it["est_minutes"]}
                      for i, it in enumerate(items)]
    original_ids = [it["item_id"] for it in items]

    env = SchedulingEnv(rooms, internal_items)
    plan = []
    order = 1
    while True:
        valid = env.valid_actions()
        if not valid:
            break
        # Q-greedy
        best = None
        for a in valid:
            phi = env.featurize(env._snapshot(), a)
            q = agent.q(phi)
            if best is None or q > best[1]:
                best = (a, q)
        action, _ = best
        item_idx_in_pending, room_id = action
        item_index_original = env.pending[item_idx_in_pending]["item_id"]
        env.step(action)
        plan.append({
            "item_id":       original_ids[item_index_original],
            "lab_room_id":   room_id,
            "schedule_order": order,
        })
        order += 1
        if not env.pending:
            break

    return {"plan": plan, "expected_total_minutes": env.elapsed}


def main():
    default_model = os.path.normpath(os.path.join(THIS, "..", "model", "q_agent.json"))
    parser = argparse.ArgumentParser()
    parser.add_argument("--scenario", type=str, required=True,
                        help="JSON file có 2 keys: rooms, items")
    parser.add_argument("--model", type=str, default=default_model)
    args = parser.parse_args()

    with open(args.scenario, encoding="utf-8") as f:
        scen = json.load(f)
    agent = load_agent(args.model)
    out = schedule(scen["rooms"], scen["items"], agent)
    print(json.dumps(out, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
