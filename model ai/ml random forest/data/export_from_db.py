"""
Xuất dữ liệu lib_diseases + departments từ PostgreSQL,
gộp với sample_diseases.csv rồi lưu ra merged_diseases.csv
để train model với dữ liệu thật của hệ thống.

Chạy: python ml/data/export_from_db.py
"""

import os
import sys
import pandas as pd
import psycopg2
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), '..', '..', '.env'))

DB_URL = os.getenv('DATABASE_URL')


def export():
    if not DB_URL:
        print("Thiếu DATABASE_URL trong .env — chỉ dùng sample data.")
        return

    print("Kết nối PostgreSQL...")
    conn = psycopg2.connect(DB_URL)
    cur = conn.cursor()

    cur.execute("""
        SELECT
            d.name        AS disease_name,
            d.symptoms    AS symptoms,
            dep.name      AS department_name
        FROM lib_diseases d
        LEFT JOIN departments dep ON dep.id = d.department_id
        WHERE d.symptoms IS NOT NULL AND d.symptoms <> ''
          AND dep.name IS NOT NULL
    """)
    rows = cur.fetchall()
    cur.close()
    conn.close()

    if not rows:
        print("Bảng lib_diseases chưa có dữ liệu. Dùng sample_diseases.csv.")
        return

    db_df = pd.DataFrame(rows, columns=['disease_name', 'symptoms', 'department_name'])
    print(f"Xuất được {len(db_df)} bệnh từ database.")

    sample_path = os.path.join(os.path.dirname(__file__), 'sample_diseases.csv')
    sample_df = pd.read_csv(sample_path)

    merged = pd.concat([sample_df, db_df], ignore_index=True).drop_duplicates(
        subset=['disease_name', 'symptoms']
    )

    out_path = os.path.join(os.path.dirname(__file__), 'merged_diseases.csv')
    merged.to_csv(out_path, index=False)
    print(f"Đã lưu {len(merged)} dòng → {out_path}")


if __name__ == '__main__':
    export()
