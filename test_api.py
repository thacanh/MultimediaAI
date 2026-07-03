#!/usr/bin/env python3
"""
test_api.py — Script kiểm thử tự động hệ thống API CreativeIQ.
Tự động tạo video test nhỏ và gửi yêu cầu phân tích tới API.
"""
from __future__ import annotations

import os
import sys
import time
import requests
import cv2
import numpy as np

# Ép hệ thống dùng mã hóa UTF-8 trên Windows console
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

# Sử dụng cổng mặc định của Docker localhost:8000
API_URL = os.getenv("API_URL", "http://localhost:8000")


def generate_test_video(output_path: str, duration_sec: int = 3, fps: int = 24) -> None:
    """Tạo video giả lập màu đen kích thước 640x480 để kiểm thử."""
    print(f"[*] Đang tạo video test: {output_path} ({duration_sec}s, {fps}fps)...")
    width, height = 640, 480
    fourcc = cv2.VideoWriter_fourcc(*"mp4v")
    out = cv2.VideoWriter(output_path, fourcc, fps, (width, height))

    # Tạo các frame chuyển động đơn giản
    for i in range(duration_sec * fps):
        frame = np.zeros((height, width, 3), dtype=np.uint8)
        # Thêm vòng tròn chuyển động để tạo đặc trưng visual_dynamics
        cv2.circle(frame, (100 + i * 5, 240), 50, (0, 0, 255), -1)
        # Thêm chữ test ocr
        cv2.putText(frame, "CreativeIQ", (50, 100), cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 255, 255), 2)
        out.write(frame)

    out.release()
    print("[+] Tạo video test thành công.")


def run_tests() -> None:
    print(f"=== Bắt đầu kiểm thử tự động API CreativeIQ tại: {API_URL} ===")
    
    # 1. Kiểm tra Health Check
    health_url = f"{API_URL}/health"
    print(f"[*] Kiểm tra Health Check: {health_url}...")
    try:
        r = requests.get(health_url, timeout=10)
        if r.status_code == 200:
            print(f"[+] Health Check OK: {r.json()}")
        else:
            print(f"[-] Health Check thất bại. Mã phản hồi: {r.status_code}")
            sys.exit(1)
    except Exception as e:
        print(f"[-] Không thể kết nối tới Backend: {e}")
        sys.exit(1)

    # 2. Tạo video test
    test_video = "test_temp.mp4"
    try:
        generate_test_video(test_video, duration_sec=3)
        
        # 3. Gửi yêu cầu phân tích video
        analyse_url = f"{API_URL}/analyse"
        print(f"[*] Gửi video lên endpoint phân tích: {analyse_url}...")
        
        start_time = time.time()
        with open(test_video, "rb") as f:
            files = {"file": (test_video, f, "video/mp4")}
            r = requests.post(analyse_url, files=files, timeout=90)
            
        elapsed = time.time() - start_time
        print(f"[+] Thời gian phản hồi: {elapsed:.2f} giây")

        if r.status_code == 200:
            res_data = r.json()
            print("[+] API phản hồi thành công (200 OK)!")
            
            # Kiểm tra cấu trúc JSON phản hồi
            payload = res_data.get("payload", {})
            review = res_data.get("review", {})
            
            print("\n=== Kết quả phân tích (JSON Validation) ===")
            print(f"- Tên file: {payload.get('filename')}")
            print(f"- Thời lượng: {payload.get('duration_sec')} giây")
            print(f"- Hạng chất lượng (Grade): {review.get('grade')}")
            print(f"- Điểm đánh giá (Overall Score): {review.get('overall_score')}/10")
            print(f"- Nhận xét AI: {review.get('headline')}")
            
            # Kiểm tra 12 đặc trưng
            segments = payload.get("segments", [])
            if segments:
                features = segments[0].get("features", {})
                print(f"- Số phân đoạn: {len(segments)}")
                print(f"- Số đặc trưng trích xuất: {len(features)}/12")
                if len(features) == 12:
                    print("[+] Xác nhận: Đủ 12 đặc trưng kỹ thuật.")
                else:
                    print("[-] Cảnh báo: Số lượng đặc trưng không chính xác.")
            else:
                print("[-] Lỗi: Không có dữ liệu phân đoạn (segments).")
                sys.exit(1)
                
            print("\n[+] TẤT CẢ CÁC BÀI KIỂM TRA ĐÃ ĐẠT!")
        else:
            print(f"[-] Phân tích thất bại. Mã phản hồi: {r.status_code}")
            print(f"Chi tiết: {r.text}")
            sys.exit(1)
            
    finally:
        # Dọn dẹp tệp tin tạm
        if os.path.exists(test_video):
            os.remove(test_video)
            print("[*] Đã dọn dẹp file video test tạm thời.")


if __name__ == "__main__":
    # Cho phép ghi đè URL qua đối số dòng lệnh
    if len(sys.argv) > 1:
        API_URL = sys.argv[1]
    run_tests()
