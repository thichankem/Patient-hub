"""
Train mô hình Random Forest dự đoán bệnh từ triệu chứng.

Chạy:
    python ml/train/train_model.py
    python ml/train/train_model.py --data ml/data/merged_diseases.csv   # dùng data thật từ DB

Output (lưu vào ml/model/):
    disease_model.pkl   — Pipeline (TF-IDF + RandomForest) → disease_name
    dept_model.pkl      — Pipeline (TF-IDF + RandomForest) → department_name
    le_disease.pkl      — LabelEncoder cho disease
    le_dept.pkl         — LabelEncoder cho department
    disease_dept_map.json — {disease_name: department_name}
    label_info.json     — metadata: danh sách nhãn, accuracy
"""

import os
import sys
import json
import argparse
import numpy as np
import pandas as pd
import joblib
from sklearn.ensemble import RandomForestClassifier
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import LabelEncoder
from sklearn.model_selection import train_test_split, StratifiedKFold, cross_val_score
from sklearn.metrics import accuracy_score, classification_report

sys.path.insert(0, os.path.dirname(__file__))
from preprocess import load_and_augment, build_disease_dept_map

MODEL_DIR = os.path.join(os.path.dirname(__file__), '..', 'model')
DATA_DIR = os.path.join(os.path.dirname(__file__), '..', 'data')


def get_data_path(args_data: str | None) -> str:
    if args_data:
        return args_data
    merged = os.path.join(DATA_DIR, 'merged_diseases.csv')
    if os.path.exists(merged):
        return merged
    return os.path.join(DATA_DIR, 'sample_diseases.csv')


def make_pipeline(n_estimators: int = 300) -> Pipeline:
    return Pipeline([
        ('tfidf', TfidfVectorizer(
            analyzer='word',
            ngram_range=(1, 3),
            max_features=8000,
            sublinear_tf=True,
            min_df=1,
        )),
        ('clf', RandomForestClassifier(
            n_estimators=n_estimators,
            max_depth=None,
            min_samples_split=2,
            min_samples_leaf=1,
            class_weight='balanced',
            random_state=42,
            n_jobs=-1,
        )),
    ])


def train(data_path: str):
    print(f"Dùng data: {data_path}")
    df = load_and_augment(data_path, aug_per_sample=5)
    print(f"Tổng dòng (sau augmentation): {len(df)}")
    print(f"Số bệnh: {df['disease_name'].nunique()}, Số khoa: {df['department_name'].nunique()}")

    X = df['symptoms_clean'].values

    le_disease = LabelEncoder()
    le_dept = LabelEncoder()
    y_disease = le_disease.fit_transform(df['disease_name'])
    y_dept = le_dept.fit_transform(df['department_name'])

    # Chỉ stratify khi class nào cũng >= 2 mẫu
    min_class = np.bincount(y_disease).min()
    stratify = y_disease if min_class >= 2 else None
    X_train, X_test, yd_tr, yd_te, ya_tr, ya_te = train_test_split(
        X, y_disease, y_dept,
        test_size=0.2,
        random_state=42,
        stratify=stratify,
    )

    print("\nTrain disease model...")
    disease_pipe = make_pipeline()
    disease_pipe.fit(X_train, yd_tr)
    d_acc = accuracy_score(yd_te, disease_pipe.predict(X_test))
    print(f"  Disease accuracy (hold-out): {d_acc:.3f}")

    print("Train department model...")
    dept_pipe = make_pipeline()
    dept_pipe.fit(X_train, ya_tr)
    a_acc = accuracy_score(ya_te, dept_pipe.predict(X_test))
    print(f"  Department accuracy (hold-out): {a_acc:.3f}")

    # Cross-validation trên toàn bộ data
    print("\nCross-validation (5-fold) disease model...")
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    cv_scores = cross_val_score(disease_pipe, X, y_disease, cv=cv, scoring='accuracy', n_jobs=-1)
    print(f"  CV accuracy: {cv_scores.mean():.3f} ± {cv_scores.std():.3f}")

    print("\nClassification report (disease, hold-out):")
    print(classification_report(
        yd_te,
        disease_pipe.predict(X_test),
        target_names=le_disease.classes_,
        zero_division=0,
    ))

    disease_dept_map = build_disease_dept_map(
        df[['disease_name', 'department_name']].drop_duplicates()
    )

    os.makedirs(MODEL_DIR, exist_ok=True)
    joblib.dump(disease_pipe, os.path.join(MODEL_DIR, 'disease_model.pkl'))
    joblib.dump(dept_pipe,    os.path.join(MODEL_DIR, 'dept_model.pkl'))
    joblib.dump(le_disease,   os.path.join(MODEL_DIR, 'le_disease.pkl'))
    joblib.dump(le_dept,      os.path.join(MODEL_DIR, 'le_dept.pkl'))

    with open(os.path.join(MODEL_DIR, 'disease_dept_map.json'), 'w', encoding='utf-8') as f:
        json.dump(disease_dept_map, f, ensure_ascii=False, indent=2)

    label_info = {
        'disease_classes': le_disease.classes_.tolist(),
        'dept_classes':    le_dept.classes_.tolist(),
        'metrics': {
            'disease_accuracy_holdout': round(float(d_acc), 4),
            'dept_accuracy_holdout':    round(float(a_acc), 4),
            'disease_cv_mean':          round(float(cv_scores.mean()), 4),
            'disease_cv_std':           round(float(cv_scores.std()), 4),
        },
    }
    with open(os.path.join(MODEL_DIR, 'label_info.json'), 'w', encoding='utf-8') as f:
        json.dump(label_info, f, ensure_ascii=False, indent=2)

    print(f"\nĐã lưu model vào: {MODEL_DIR}")
    print("Files: disease_model.pkl, dept_model.pkl, le_disease.pkl, le_dept.pkl,")
    print("       disease_dept_map.json, label_info.json")


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--data', type=str, default=None, help='Đường dẫn CSV data')
    args = parser.parse_args()
    train(get_data_path(args.data))
