# -*- coding: utf-8 -*-
"""
So sánh RL agent với 3 baseline (random / greedy / optimal brute-force)
trên tập kịch bản đã sinh sẵn.

Chạy:
    python "model ai/rl scheduling/data/generate_dataset.py" --samples 500
    python "model ai/rl scheduling/train/evaluate.py"
        --scenarios "model ai/rl scheduling/data/scheduling_scenarios.jsonl"
        --model     "model ai/rl scheduling/model/q_agent.json"
"""

import os
import sys
import json
import random
import argparse
import numpy as np

THIS = os.path.dirname(__file__)
sys.path.insert(0, THIS)
sys.path.insert(0, os.path.normpath(os.path.join(THIS, "..", "serve")))

from env import SchedulingEnv, greedy_policy_total, random_policy_total
from agent import LinearQAgent
from scheduler import schedule, load_agent


def rl_total_via_agent(rooms, items, agent: LinearQAgent) -> float:
    items_with_idx = [{"item_id": i, "test_type": it["test_type"],
                       "est_minutes": it["est_minutes"]}
                      for i, it in enumerate(items)]
    return schedule(rooms, items_with_idx, agent)["expected_total_minutes"]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--scenarios", type=str,
                        default=os.path.normpath(os.path.join(
                            THIS, "..", "data", "scheduling_scenarios.jsonl")))
    parser.add_argument("--model", type=str,
                        default=os.path.normpath(os.path.join(
                            THIS, "..", "model", "q_agent.json")))
    parser.add_argument("--seed", type=int, default=7)
    args = parser.parse_args()

    agent = load_agent(args.model)
    rng = random.Random(args.seed)

    rl_t, gr_t, rd_t, opt_t = [], [], [], []
    with open(args.scenarios, encoding="utf-8") as f:
        for line in f:
            scen = json.loads(line)
            rooms, items = scen["rooms"], scen["items"]
            opt_t.append(scen["optimal_total"])
            gr_t.append(greedy_policy_total(rooms, items))
            rd_t.append(random_policy_total(rooms, items, rng))
            rl_t.append(rl_total_via_agent(rooms, items, agent))

    n = len(opt_t)
    print(f"Đánh giá trên {n} scenarios:")
    print(f"  Optimal (brute-force) : {np.mean(opt_t):.2f} phút")
    print(f"  RL  agent             : {np.mean(rl_t):.2f} phút "
          f"(+{(np.mean(rl_t) - np.mean(opt_t)):.2f} so với optimal)")
    print(f"  Greedy heuristic      : {np.mean(gr_t):.2f} phút "
          f"(+{(np.mean(gr_t) - np.mean(opt_t)):.2f})")
    print(f"  Random                : {np.mean(rd_t):.2f} phút "
          f"(+{(np.mean(rd_t) - np.mean(opt_t)):.2f})")

    # Tỉ lệ trùng với optimal
    rl_opt    = sum(1 for a, b in zip(rl_t, opt_t) if a == b) / n
    greedy_opt = sum(1 for a, b in zip(gr_t, opt_t) if a == b) / n
    print(f"\n  Tỉ lệ match optimal:")
    print(f"    RL    : {rl_opt:.1%}")
    print(f"    Greedy: {greedy_opt:.1%}")


if __name__ == "__main__":
    main()
