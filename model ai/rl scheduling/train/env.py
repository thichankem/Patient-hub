# -*- coding: utf-8 -*-
"""
Environment cho RL xếp lịch xét nghiệm.

State (của 1 bệnh nhân tại 1 thời điểm):
    - rooms:    list phòng + hàng đợi còn lại (phút)
    - pending:  list xét nghiệm chưa làm
    - elapsed:  tổng phút bệnh nhân đã trải qua kể từ rời phòng khám

Action:
    Chọn 1 cặp (item, room) trong các cặp hợp lệ:
        item ∈ pending, room.test_type == item.test_type

Step:
    wait = max(room.queue_minutes - elapsed, 0)
    elapsed += wait + item.est_minutes
    reward = - (wait + item.est_minutes)     # tối thiểu hóa tổng thời gian
    remove item khỏi pending
    done khi pending rỗng

Episode return = - tổng phút bệnh nhân hoàn tất → maximize return ↔ minimize total time.
"""

from __future__ import annotations
import copy
import random
from typing import List, Dict, Tuple

# Vocab test_type cố định để one-hot dùng chung giữa env / agent / serve
TEST_TYPE_VOCAB = [
    "xet_nghiem_mau", "xet_nghiem_nuoc_tieu", "sieu_am_o_bung",
    "sieu_am_tim", "xquang_nguc", "xquang_xuong", "ct_scan",
    "mri", "dien_tim", "noi_soi_da_day",
]
TT_INDEX = {t: i for i, t in enumerate(TEST_TYPE_VOCAB)}


class SchedulingEnv:
    """Env đơn-bệnh-nhân (1 episode = 1 bệnh nhân với N test items)."""

    def __init__(self, rooms: List[Dict], items: List[Dict]):
        # Lưu state khởi tạo để reset
        self._init_rooms = copy.deepcopy(rooms)
        self._init_items = copy.deepcopy(items)
        self.reset()

    def reset(self):
        self.rooms   = copy.deepcopy(self._init_rooms)
        self.pending = copy.deepcopy(self._init_items)
        self.elapsed = 0
        return self._snapshot()

    def _snapshot(self):
        return {
            "rooms":   copy.deepcopy(self.rooms),
            "pending": copy.deepcopy(self.pending),
            "elapsed": self.elapsed,
        }

    def valid_actions(self) -> List[Tuple[int, int]]:
        """List (item_index_in_pending, room_id) hợp lệ."""
        out = []
        for i, it in enumerate(self.pending):
            for r in self.rooms:
                if r["test_type"] == it["test_type"]:
                    out.append((i, r["room_id"]))
        return out

    def step(self, action: Tuple[int, int]):
        i, room_id = action
        item = self.pending[i]
        room = next(r for r in self.rooms if r["room_id"] == room_id)
        if room["test_type"] != item["test_type"]:
            raise ValueError("Action không hợp lệ: room không phục vụ test_type này")

        wait = max(room["queue_minutes"] - self.elapsed, 0)
        cost = wait + item["est_minutes"]
        self.elapsed += cost

        # Phòng vừa dùng → hàng đợi nó kết thúc tại thời điểm self.elapsed
        # (các bệnh nhân khác trong env này không được mô hình hóa — coi như queue
        # bị "đẩy lùi" sau khi mình xen vào không hợp lý; ở đây giả định bệnh nhân
        # vào phòng ngay khi queue trống, tức room.queue_minutes giữ nguyên cho các
        # action sau là không đúng → cập nhật cho chính xác:)
        room["queue_minutes"] = self.elapsed

        del self.pending[i]
        done = len(self.pending) == 0
        reward = -float(cost)
        return self._snapshot(), reward, done

    # ----------- Featurize 1 (state, action) thành vector cố định -----------
    @staticmethod
    def featurize(state: Dict, action: Tuple[int, int]):
        """Vector hand-crafted dùng cho Q linear approximation."""
        import numpy as np
        i, room_id = action
        item = state["pending"][i]
        room = next(r for r in state["rooms"] if r["room_id"] == room_id)

        wait = max(room["queue_minutes"] - state["elapsed"], 0)
        same_type_rooms = [r for r in state["rooms"]
                           if r["test_type"] == item["test_type"]]
        same_type_min_queue = min(r["queue_minutes"] for r in same_type_rooms)
        same_type_avg_queue = sum(r["queue_minutes"] for r in same_type_rooms) / len(same_type_rooms)

        # One-hot test_type
        tt_oh = [0.0] * len(TEST_TYPE_VOCAB)
        tt_oh[TT_INDEX[item["test_type"]]] = 1.0

        numeric = [
            wait / 60.0,                                # phút chờ kỳ vọng (normalize)
            item["est_minutes"] / 60.0,                  # độ dài xét nghiệm
            room["queue_minutes"] / 60.0,                # tải phòng tuyệt đối
            state["elapsed"] / 60.0,                     # đã đi bao lâu
            (room["queue_minutes"] - same_type_min_queue) / 60.0,  # phòng này tệ hơn min bao nhiêu
            (room["queue_minutes"] - same_type_avg_queue) / 60.0,  # so với trung bình cùng loại
            len(state["pending"]) / 5.0,                 # số việc còn lại
            len(same_type_rooms) / 3.0,                  # số lựa chọn cùng loại
            1.0,                                          # bias
        ]
        return np.array(numeric + tt_oh, dtype=float)

    @staticmethod
    def feature_dim() -> int:
        return 9 + len(TEST_TYPE_VOCAB)


def episode_total_time(rooms: List[Dict], items: List[Dict],
                       assignment: List[int], order: List[int]) -> float:
    """Tính total time của 1 plan tĩnh (dùng cho random/greedy/optimal baselines)."""
    rooms_by_id = {r["room_id"]: r for r in rooms}
    elapsed = 0
    for idx in order:
        room = rooms_by_id[assignment[idx]]
        elapsed = max(room["queue_minutes"], elapsed) + items[idx]["est_minutes"]
    return elapsed


def random_policy_total(rooms, items, rng: random.Random) -> float:
    env = SchedulingEnv(rooms, items)
    state = env._snapshot()
    while True:
        acts = env.valid_actions()
        if not acts:
            break
        state, _, done = env.step(rng.choice(acts))
        if done:
            break
    return env.elapsed


def greedy_policy_total(rooms, items) -> float:
    """Greedy: ở mỗi bước chọn (item, room) có wait+est nhỏ nhất."""
    env = SchedulingEnv(rooms, items)
    while True:
        acts = env.valid_actions()
        if not acts:
            break

        def cost(a):
            i, rid = a
            it = env.pending[i]
            r = next(x for x in env.rooms if x["room_id"] == rid)
            wait = max(r["queue_minutes"] - env.elapsed, 0)
            return wait + it["est_minutes"]

        env.step(min(acts, key=cost))
        if not env.pending:
            break
    return env.elapsed
