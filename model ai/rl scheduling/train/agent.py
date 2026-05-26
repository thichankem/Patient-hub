# -*- coding: utf-8 -*-
"""
Q-learning với linear function approximation.

Q(s, a) ≈ w · φ(s, a)
    với φ là vector feature đã định nghĩa trong env.SchedulingEnv.featurize

Update Bellman (1 bước):
    target = r + γ · max_{a'} Q(s', a')      (hoặc r nếu terminal)
    w ← w + α · (target - Q(s, a)) · φ(s, a)

ε-greedy exploration, ε giảm tuyến tính theo episode.
"""

from __future__ import annotations
import numpy as np
import random
from typing import List, Tuple


class LinearQAgent:
    def __init__(self, feature_dim: int, lr: float = 0.05, gamma: float = 1.0, seed: int = 42):
        self.w = np.zeros(feature_dim, dtype=float)
        self.lr = lr
        self.gamma = gamma
        self.rng = random.Random(seed)

    def q(self, phi: np.ndarray) -> float:
        return float(self.w @ phi)

    def best_action(self, state, valid_actions, featurize):
        """Trả về (action, phi, q_value) tốt nhất theo Q hiện tại."""
        best = None
        for a in valid_actions:
            phi = featurize(state, a)
            qv = self.q(phi)
            if best is None or qv > best[2]:
                best = (a, phi, qv)
        return best

    def select(self, state, valid_actions, featurize, epsilon: float):
        if self.rng.random() < epsilon:
            a = self.rng.choice(valid_actions)
            return a, featurize(state, a)
        a, phi, _ = self.best_action(state, valid_actions, featurize)
        return a, phi

    def update(self, phi: np.ndarray, target: float):
        pred = self.q(phi)
        self.w += self.lr * (target - pred) * phi

    def state_dict(self):
        return {"w": self.w.tolist(), "lr": self.lr, "gamma": self.gamma}

    @classmethod
    def from_state_dict(cls, d):
        agent = cls(feature_dim=len(d["w"]), lr=d["lr"], gamma=d["gamma"])
        agent.w = np.array(d["w"], dtype=float)
        return agent
