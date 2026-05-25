"""
Đánh giá chi tiết mô hình đã train.

Chạy: python ml/train/evaluate.py
      python ml/train/evaluate.py --top5   # hiện top-5 feature importance
"""

import os
import sys
import json
import argparse
import numpy as np
import joblib
from sklearn.metrics import classification_report, confusion_matrix
from sklearn.model_selection import StratifiedKFold, cross_val_score

sys.path.insert(0, os.path.dirname(__file__))
from preprocess import load_and_augment

MODEL_DIR = os.path.join(os.path.dirname(__file__), '..', 'model')
DATA_DIR  = os.path.join(os.path.dirname(__file__), '..', 'data')


def load_models():
    disease_pipe = joblib.load(os.path.join(MODEL_DIR, 'disease_model.pkl'))
    le_disease   = joblib.load(os.path.join(MODEL_DIR, 'le_disease.pkl'))
    le_dept      = joblib.load(os.path.join(MODEL_DIR, 'le_dept.pkl'))
    return disease_pipe, le_disease, le_dept


def evaluate(show_top_features: bool = False):
    data_path = os.path.join(DATA_DIR, 'merged_diseases.csv')
    if not os.path.exists(data_path):
        data_path = os.path.join(DATA_DIR, 'sample_diseases.csv')

    print(f"Data: {data_path}")
    df = load_and_augment(data_path, aug_per_sample=5)
    X = df['symptoms_clean'].values

    disease_pipe, le_disease, le_dept = load_models()
    y_disease = le_disease.transform(df['disease_name'])

    print("\n--- Cross-Validation (5-fold) ---")
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    scores = cross_val_score(disease_pipe, X, y_disease, cv=cv, scoring='accuracy', n_jobs=-1)
    print(f"Accuracy: {scores.mean():.4f} ± {scores.std():.4f}")
    print(f"Scores: {[round(s, 4) for s in scores]}")

    y_pred = disease_pipe.predict(X)
    print("\n--- Classification Report (disease) ---")
    print(classification_report(y_disease, y_pred, target_names=le_disease.classes_, zero_division=0))

    # Top-5 sai lầm thường gặp
    wrong_mask = y_disease != y_pred
    wrong_count = wrong_mask.sum()
    print(f"\nSố mẫu dự đoán sai: {wrong_count} / {len(y_disease)}")

    if show_top_features:
        print("\n--- Top 20 Features (TF-IDF weight × RF importance) ---")
        tfidf = disease_pipe.named_steps['tfidf']
        rf    = disease_pipe.named_steps['clf']
        vocab = np.array(tfidf.get_feature_names_out())
        imp   = rf.feature_importances_
        top_idx = np.argsort(imp)[::-1][:20]
        for i, idx in enumerate(top_idx, 1):
            print(f"  {i:2d}. {vocab[idx]:<30s}  importance={imp[idx]:.5f}")

    # Đọc metrics từ label_info
    info_path = os.path.join(MODEL_DIR, 'label_info.json')
    if os.path.exists(info_path):
        with open(info_path, encoding='utf-8') as f:
            info = json.load(f)
        print("\n--- Metrics lưu từ lần train gần nhất ---")
        for k, v in info.get('metrics', {}).items():
            print(f"  {k}: {v}")


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--top5', action='store_true', help='Hiện top feature importance')
    args = parser.parse_args()
    evaluate(show_top_features=args.top5)
