"""
Tiền xử lý dữ liệu bệnh-triệu chứng:
  - Chuẩn hóa text tiếng Việt
  - Loại stopwords thông dụng
  - Data augmentation: xáo trộn + subset triệu chứng để tăng độ đa dạng
"""

import re
import random
import pandas as pd
from typing import List, Tuple

VIETNAMESE_STOPWORDS = {
    'tôi', 'bị', 'có', 'và', 'hoặc', 'với', 'của', 'trong', 'là',
    'thì', 'mà', 'vì', 'nên', 'nhưng', 'khi', 'đang', 'đã', 'sẽ',
    'rất', 'quá', 'hơi', 'hay', 'cũng', 'không', 'chưa', 'đây',
    'thấy', 'cảm', 'giác', 'bị', 'triệu', 'chứng', 'gần', 'đây',
    'hôm', 'nay', 'vài', 'ngày', 'tuần',
}


def normalize(text: str) -> str:
    """Lowercase + bỏ ký tự đặc biệt + bỏ stopwords."""
    text = text.lower().strip()
    text = re.sub(r'[^\w\s,àáâãèéêìíòóôõùúýăđơưạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹ]', ' ', text)
    tokens = [t.strip() for t in re.split(r'[,\s]+', text) if t.strip()]
    tokens = [t for t in tokens if t not in VIETNAMESE_STOPWORDS and len(t) > 1]
    return ' '.join(tokens)


def symptoms_to_list(symptoms_str: str) -> List[str]:
    """Tách chuỗi triệu chứng thành list chuẩn hóa."""
    parts = re.split(r',\s*', symptoms_str.lower().strip())
    return [p.strip() for p in parts if p.strip()]


def augment_symptoms(symptoms_list: List[str], n: int = 5, min_ratio: float = 0.6) -> List[str]:
    """
    Tạo n biến thể từ danh sách triệu chứng bằng cách:
    1. Xáo trộn thứ tự
    2. Lấy ngẫu nhiên >= min_ratio triệu chứng
    """
    results = []
    k = max(1, int(len(symptoms_list) * min_ratio))
    for _ in range(n):
        subset = random.sample(symptoms_list, k=random.randint(k, len(symptoms_list)))
        random.shuffle(subset)
        results.append(', '.join(subset))
    return results


def load_and_augment(csv_path: str, aug_per_sample: int = 3) -> pd.DataFrame:
    """
    Đọc CSV, chuẩn hóa, tạo thêm augmented samples.
    Trả về DataFrame với cột: symptoms_raw, symptoms_clean, disease_name, department_name
    """
    df = pd.read_csv(csv_path)
    df = df.dropna(subset=['disease_name', 'symptoms', 'department_name'])
    df['symptoms'] = df['symptoms'].astype(str)
    df['department_name'] = df['department_name'].astype(str)

    rows: List[dict] = []

    for _, row in df.iterrows():
        disease = row['disease_name'].strip()
        dept = row['department_name'].strip()
        symptoms_raw = row['symptoms']
        symptoms_clean = normalize(symptoms_raw)

        rows.append({
            'symptoms_raw': symptoms_raw,
            'symptoms_clean': symptoms_clean,
            'disease_name': disease,
            'department_name': dept,
        })

        symptom_list = symptoms_to_list(symptoms_raw)
        if len(symptom_list) >= 2:
            for aug in augment_symptoms(symptom_list, n=aug_per_sample):
                rows.append({
                    'symptoms_raw': aug,
                    'symptoms_clean': normalize(aug),
                    'disease_name': disease,
                    'department_name': dept,
                })

    result = pd.DataFrame(rows)
    result = result[result['symptoms_clean'].str.len() > 0].reset_index(drop=True)
    return result


def build_disease_dept_map(df: pd.DataFrame) -> dict:
    """Tạo dict {disease_name: department_name} từ training data."""
    return dict(zip(df['disease_name'], df['department_name']))


if __name__ == '__main__':
    import os
    data_path = os.path.join(os.path.dirname(__file__), '..', 'data', 'sample_diseases.csv')
    df = load_and_augment(data_path)
    print(f"Tổng dòng sau augmentation: {len(df)}")
    print(f"Số bệnh: {df['disease_name'].nunique()}")
    print(f"Số khoa: {df['department_name'].nunique()}")
    print(df[['disease_name', 'department_name']].drop_duplicates().to_string())
