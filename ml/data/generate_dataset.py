# -*- coding: utf-8 -*-
"""
Generator: sinh ra 4 files output từ dữ liệu nguồn trong symptoms_data.py + diseases_data.py.

Chạy: python ml/data/generate_dataset.py

Output:
  - ml/data/diseases.csv               (training data, 200 bệnh × ≥10 dòng = ~2000+ rows)
  - ml/data/symptom_weights.txt        (trọng số 300 triệu chứng)
  - ml/data/disease_explanations.txt   (giải thích 200 bệnh)
  - ml/data/treatment_guide.txt        (hướng dẫn điều trị 200 bệnh)
"""

import os
import csv
import random
import sys

sys.path.insert(0, os.path.dirname(__file__))
from symptoms_data import SYMPTOM_WEIGHTS, ALL_SYMPTOMS
from diseases_data import DISEASES


# ============================================================
# CHUẨN HÓA — map các biến thể triệu chứng về vocab chuẩn 300 từ
# ============================================================
NORMALIZE_MAP = {
    "amidan sưng đỏ":   "đau họng",
    "biến dạng xương":  "biến dạng khớp",
    "chảy máu da":      "xuất huyết da",
    "chậm chạp":        "chậm vận động",
    "giảm chiều cao":   "đau xương",
    "gãy xương dễ":     "đau xương",
    "khát nước":        "khát nước nhiều",
    "khó chịu":         "mệt mỏi",
    "khó nhìn":         "mờ mắt",
    "khó nhìn ban đêm": "mờ mắt",
    "khó nhìn gần":     "mờ mắt",
    "khó nhìn xa":      "mờ mắt",
    "khó thở qua mũi":  "nghẹt mũi",
    "khó tiêu":         "đầy bụng",
    "khó tập trung":    "mất tập trung",
    "khô môi":          "khô miệng",
    "khô âm đạo":       "nóng rát vùng kín",
    "không đi ngoài":   "táo bón",
    "không đi được":    "đi tập tễnh",
    "kéo tai":          "đau tai",
    "liệt":             "tê liệt nửa người",
    "loãng xương":      "đau xương",
    "lác mắt":          "nhìn đôi",
    "lách to":          "hạch to",
    "lạnh":             "ớn lạnh",
    "móng dày":         "nhiễm nấm móng",
    "móng vàng":        "nhiễm nấm móng",
    "móng đổi màu":     "nhiễm nấm móng",
    "mỏi mắt":          "khô mắt",
    "mụn trứng cá":     "nổi mụn",
    "ngạt thở":         "khó thở",
    "ngủ không yên":    "mất ngủ",
    "ngủ kém":          "mất ngủ",
    "ngủ ngáy":         "ngưng thở khi ngủ",
    "ngủ ngáy to":      "ngưng thở khi ngủ",
    "ngứa giữa đêm":    "ngứa da",
    "ngứa họng":        "đau họng",
    "ngứa tai":         "đau tai",
    "ngứa toàn thân":   "ngứa da",
    "nheo mắt":         "mờ mắt",
    "nhạy cảm răng":    "đau răng",
    "nhắm mắt không kín": "khô mắt",
    "nặng chân":        "phù chân",
    "nốt sần":          "mẩn đỏ",
    "rút lõm ngực":     "khó thở",
    "rụng tóc gáy":     "rụng tóc",
    "sưng nướu":        "chảy máu chân răng",
    "sưng ống tai":     "đau tai",
    "sốt thấp":         "sốt nhẹ",
    "thay đổi vú":      "khối u sờ thấy",
    "thiếu máu":        "da xanh tái",
    "tiết dịch núm vú": "khối u sờ thấy",
    "tiểu không tự chủ":"khó nín tiểu",
    "tiểu ngắt quãng":  "tiểu khó",
    "tiểu yếu":         "tiểu khó",
    "tiểu đau":         "tiểu buốt",
    "trí nhớ giảm":     "mất trí nhớ",
    "tóc rụng":         "rụng tóc",
    "tóc thưa":         "rụng tóc",
    "tăng cân nhanh":   "tăng cân",
    "tăng huyết áp":    "đau đầu",
    "tụt huyết áp":     "chóng mặt",
    "viêm kết mạc":     "đỏ mắt",
    "đau bụng dưới":    "đau hạ vị",
    "đau giữa đêm":     "mất ngủ",
    "đau hàm":          "đau lan hàm",
    "đau khi nhai":     "đau răng",
    "đau khi nuốt":     "khó nuốt",
    "đau lan vai phải": "đau hạ sườn phải",
    "đau ngón chân":    "đau khớp",
    "đau nhẹ":          "đau khớp",
    "đi ngoài nhiều":   "tiêu chảy nhiều lần",
    "đói nhiều":        "khát nước nhiều",
    "đường hầm da":     "vết loét da",
    "đổ mồ hôi":        "vã mồ hôi",
}


def normalize_symptoms(symptoms):
    """Đưa triệu chứng về vocab chuẩn 300, loại trùng giữ thứ tự."""
    result = []
    seen = set()
    for s in symptoms:
        norm = NORMALIZE_MAP.get(s, s)
        if norm not in seen:
            seen.add(norm)
            result.append(norm)
    return result


# ============================================================
# GENERATE diseases.csv
# ============================================================
def generate_csv_rows(disease_record, n_rows=10):
    """
    Sinh n_rows biến thể triệu chứng cho 1 bệnh.
    - Dòng 1: toàn bộ triệu chứng (presentation đầy đủ)
    - Dòng 2..n: subset random 50-100% triệu chứng, shuffle thứ tự
    """
    name, dept, severity, symptoms, _, _ = disease_record
    symptoms = normalize_symptoms(symptoms)
    n_sym = len(symptoms)
    rows = []

    # Dòng 1: full
    rows.append((name, ", ".join(symptoms), dept))

    # Dòng còn lại: random subset
    for i in range(n_rows - 1):
        if n_sym >= 4:
            k = random.randint(max(3, n_sym // 2), n_sym)
        else:
            k = n_sym
        subset = random.sample(symptoms, k)
        random.shuffle(subset)
        rows.append((name, ", ".join(subset), dept))

    return rows


def write_diseases_csv(out_path, n_rows_per_disease=10):
    random.seed(42)
    all_rows = []
    for d in DISEASES:
        all_rows.extend(generate_csv_rows(d, n_rows=n_rows_per_disease))

    with open(out_path, 'w', encoding='utf-8', newline='') as f:
        writer = csv.writer(f)
        writer.writerow(['disease_name', 'symptoms', 'department_name'])
        writer.writerows(all_rows)

    return len(all_rows)


# ============================================================
# GENERATE symptom_weights.txt
# ============================================================
def write_symptom_weights(out_path):
    lines = []
    lines.append("=" * 78)
    lines.append("TRỌNG SỐ TRIỆU CHỨNG (300 từ vựng)")
    lines.append("=" * 78)
    lines.append("Format: <triệu chứng> | <trọng số> | <nhóm giải phẫu>")
    lines.append("")
    lines.append("Quy ước trọng số:")
    lines.append("  0.85 - 1.00: rất đặc trưng, gần như chỉ điểm 1 nhóm bệnh")
    lines.append("  0.60 - 0.84: đặc trưng cao, giá trị phân biệt tốt")
    lines.append("  0.40 - 0.59: trung bình, có giá trị nhưng gặp ở nhiều bệnh")
    lines.append("  0.20 - 0.39: phổ biến, ít giá trị phân biệt")
    lines.append("  0.10 - 0.19: rất phổ biến, gần như không phân biệt")
    lines.append("=" * 78)
    lines.append("")

    by_group = {}
    for s, w, g in SYMPTOM_WEIGHTS:
        by_group.setdefault(g, []).append((s, w))

    for group in sorted(by_group.keys()):
        items = sorted(by_group[group], key=lambda x: -x[1])
        lines.append(f"── {group.upper()} ({len(items)} triệu chứng) ──")
        for s, w in items:
            lines.append(f"  {s:<32s} | {w:.2f} | {group}")
        lines.append("")

    lines.append("=" * 78)
    lines.append(f"Tổng cộng: {len(SYMPTOM_WEIGHTS)} triệu chứng")
    lines.append("=" * 78)

    with open(out_path, 'w', encoding='utf-8') as f:
        f.write("\n".join(lines))


# ============================================================
# GENERATE disease_explanations.txt
# ============================================================
SEVERITY_LABEL = {
    "nhẹ":        "Nhẹ — có thể tự chăm sóc tại nhà",
    "trung bình": "Trung bình — nên đến khám bác sĩ",
    "nặng":       "Nặng — cần đi bệnh viện",
    "nguy hiểm":  "Nguy hiểm — cấp cứu ngay lập tức",
}


def write_disease_explanations(out_path):
    lines = []
    lines.append("=" * 78)
    lines.append("GIẢI THÍCH 200 BỆNH PHỔ BIẾN")
    lines.append("=" * 78)
    lines.append("")

    by_dept = {}
    for idx, d in enumerate(DISEASES, 1):
        by_dept.setdefault(d[1], []).append((idx, d))

    for dept in sorted(by_dept.keys()):
        lines.append("")
        lines.append("█" * 78)
        lines.append(f"  KHOA: {dept.upper()}")
        lines.append("█" * 78)

        for idx, (name, _, severity, symptoms, explanation, _) in by_dept[dept]:
            lines.append("")
            lines.append("─" * 78)
            lines.append(f"[{idx:03d}] {name}")
            lines.append(f"     Mức độ: {SEVERITY_LABEL[severity]}")
            lines.append("─" * 78)
            lines.append(f"Mô tả: {explanation}")
            lines.append(f"Triệu chứng chính: {', '.join(normalize_symptoms(symptoms))}")
            lines.append("")

    with open(out_path, 'w', encoding='utf-8') as f:
        f.write("\n".join(lines))


# ============================================================
# GENERATE treatment_guide.txt
# ============================================================
def write_treatment_guide(out_path):
    lines = []
    lines.append("=" * 78)
    lines.append("HƯỚNG DẪN ĐIỀU TRỊ 200 BỆNH")
    lines.append("=" * 78)
    lines.append("")
    lines.append("Lưu ý: Đây là thông tin tham khảo. Mọi điều trị cần có chỉ định của bác sĩ.")
    lines.append("Không tự dùng thuốc kê đơn (kháng sinh, corticoid, opioid...).")
    lines.append("=" * 78)
    lines.append("")

    severity_action = {
        "nhẹ":        "→ Có thể tự chăm sóc tại nhà, theo dõi 3-5 ngày. Nếu không đỡ → khám bác sĩ.",
        "trung bình": "→ Nên đến khám bác sĩ trong vài ngày tới để có chỉ định điều trị phù hợp.",
        "nặng":       "→ Cần đến bệnh viện sớm để được điều trị, có thể cần nhập viện.",
        "nguy hiểm":  "→ CẤP CỨU NGAY. Gọi 115 hoặc đưa đến cấp cứu ngay lập tức.",
    }

    by_dept = {}
    for idx, d in enumerate(DISEASES, 1):
        by_dept.setdefault(d[1], []).append((idx, d))

    for dept in sorted(by_dept.keys()):
        lines.append("")
        lines.append("█" * 78)
        lines.append(f"  KHOA: {dept.upper()}")
        lines.append("█" * 78)

        for idx, (name, _, severity, _, _, treatment) in by_dept[dept]:
            lines.append("")
            lines.append("─" * 78)
            lines.append(f"[{idx:03d}] {name}  [{severity.upper()}]")
            lines.append("─" * 78)
            lines.append(f"  {severity_action[severity]}")
            lines.append("")
            lines.append(f"  Điều trị: {treatment}")
            lines.append("")

    with open(out_path, 'w', encoding='utf-8') as f:
        f.write("\n".join(lines))


# ============================================================
# MAIN
# ============================================================
def main():
    out_dir = os.path.dirname(__file__)

    csv_path  = os.path.join(out_dir, 'diseases.csv')
    sw_path   = os.path.join(out_dir, 'symptom_weights.txt')
    exp_path  = os.path.join(out_dir, 'disease_explanations.txt')
    tr_path   = os.path.join(out_dir, 'treatment_guide.txt')

    print("Đang sinh dataset...")
    n_rows = write_diseases_csv(csv_path, n_rows_per_disease=10)
    print(f"  ✓ {csv_path}  ({n_rows} dòng cho {len(DISEASES)} bệnh)")

    write_symptom_weights(sw_path)
    print(f"  ✓ {sw_path}  ({len(SYMPTOM_WEIGHTS)} triệu chứng)")

    write_disease_explanations(exp_path)
    print(f"  ✓ {exp_path}  ({len(DISEASES)} bệnh)")

    write_treatment_guide(tr_path)
    print(f"  ✓ {tr_path}  ({len(DISEASES)} bệnh)")

    print("\nDone.")


if __name__ == '__main__':
    main()
