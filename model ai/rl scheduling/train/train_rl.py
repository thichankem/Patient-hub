# -*- coding: utf-8 -*-
"""
Train LinearQAgent bằng Q-learning trên các kịch bản bệnh viện sinh ngẫu nhiên.

Mỗi episode = 1 bệnh nhân: env reset với (rooms, items) mới.
Reward = -(wait + est) mỗi step → return = - tổng thời gian → maximize.

Chạy:
    python "model ai/rl scheduling/train/train_rl.py"
        --episodes 20000
        --out "model ai/rl scheduling/model"
"""

import os
import sys
import json
import argparse
import random
import numpy as np

sys.path.insert(0, os.path.dirname(__file__))
sys.path.insert(0, os.path.normpath(os.path.join(os.path.dirname(__file__), "..", "data")))

from env import SchedulingEnv, greedy_policy_total, random_policy_total
from agent import LinearQAgent
from generate_dataset import build_hospital_state, pick_patient_tests


def run_episode_train(env: SchedulingEnv, agent: LinearQAgent, epsilon: float):
    state = env.reset()
    total_reward = 0.0
    while True:
        valid = env.valid_actions()
        if not valid:
            break
        action, phi = agent.select(state, valid, env.featurize, epsilon)
        next_state, reward, done = env.step(action)
        total_reward += reward

        if done:
            target = reward
        else:
            next_valid = env.valid_actions()
            _, _, next_qmax = agent.best_action(next_state, next_valid, env.featurize)
            target = reward + agent.gamma * next_qmax

        agent.update(phi, target)
        state = next_state
        if done:
            break
    return total_reward, env.elapsed


def run_episode_greedy(env: SchedulingEnv, agent: LinearQAgent):
    env.reset()
    while True:
        valid = env.valid_actions()
        if not valid:
            break
        action, _, _ = agent.best_action(env._snapshot(), valid, env.featurize)
        env.step(action)
        if not env.pending:
            break
    return env.elapsed


def main():
    here = os.path.dirname(__file__)
    default_out = os.path.normpath(os.path.join(here, "..", "model"))

    parser = argparse.ArgumentParser()
    parser.add_argument("--episodes", type=int, default=20000)
    parser.add_argument("--seed",     type=int, default=42)
    parser.add_argument("--lr",       type=float, default=0.02)
    parser.add_argument("--gamma",    type=float, default=1.0)
    parser.add_argument("--eps_start", type=float, default=1.0)
    parser.add_argument("--eps_end",   type=float, default=0.05)
    parser.add_argument("--out", type=str, default=default_out)
    args = parser.parse_args()

    rng = random.Random(args.seed)
    agent = LinearQAgent(feature_dim=SchedulingEnv.feature_dim(),
                         lr=args.lr, gamma=args.gamma, seed=args.seed)

    # Log
    window_returns = []
    window_size = 500
    print(f"Bắt đầu train RL: {args.episodes} episodes, lr={args.lr}, γ={args.gamma}")

    for ep in range(args.episodes):
        frac = ep / max(args.episodes - 1, 1)
        eps = args.eps_start + (args.eps_end - args.eps_start) * frac

        rooms = build_hospital_state(rng)
        items = pick_patient_tests(rng)
        env = SchedulingEnv(rooms, items)

        ret, total_time = run_episode_train(env, agent, eps)
        window_returns.append(total_time)

        if (ep + 1) % window_size == 0:
            avg = float(np.mean(window_returns))
            window_returns = []
            print(f"  ep {ep+1:>6}/{args.episodes}  ε={eps:.3f}  "
                  f"avg_total_time(last {window_size})={avg:.1f} phút")

    # ----------- Đánh giá nhanh sau train -----------
    print("\nĐánh giá nhanh trên 200 scenarios mới (so với random + greedy):")
    eval_rng = random.Random(args.seed + 1000)
    rl_totals, greedy_totals, random_totals = [], [], []
    for _ in range(200):
        rooms = build_hospital_state(eval_rng)
        items = pick_patient_tests(eval_rng)
        env = SchedulingEnv(rooms, items)
        rl_totals.append(run_episode_greedy(env, agent))
        greedy_totals.append(greedy_policy_total(rooms, items))
        random_totals.append(random_policy_total(rooms, items, eval_rng))

    print(f"  RL agent (greedy-Q): trung bình {np.mean(rl_totals):.1f} phút")
    print(f"  Greedy heuristic   : trung bình {np.mean(greedy_totals):.1f} phút")
    print(f"  Random             : trung bình {np.mean(random_totals):.1f} phút")

    # Lưu
    os.makedirs(args.out, exist_ok=True)
    with open(os.path.join(args.out, "q_agent.json"), "w", encoding="utf-8") as f:
        json.dump(agent.state_dict(), f, ensure_ascii=False, indent=2)
    with open(os.path.join(args.out, "training_info.json"), "w", encoding="utf-8") as f:
        json.dump({
            "episodes": args.episodes,
            "lr": args.lr, "gamma": args.gamma,
            "eps_start": args.eps_start, "eps_end": args.eps_end,
            "eval_mean": {
                "rl":     round(float(np.mean(rl_totals)), 2),
                "greedy": round(float(np.mean(greedy_totals)), 2),
                "random": round(float(np.mean(random_totals)), 2),
            },
        }, f, ensure_ascii=False, indent=2)
    print(f"\nĐã lưu agent vào: {args.out}/q_agent.json")


if __name__ == "__main__":
    main()
