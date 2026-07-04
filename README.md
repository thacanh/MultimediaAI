# CreativeIQ AI — Hệ Thống Đánh Giá Chất Lượng Sáng Tạo Video Ngắn (MVP)

CreativeIQ AI là giải pháp áp dụng công nghệ Trí tuệ Nhân tạo đa phương thức (Multimodal AI) để phân tích, đo lường và đưa ra các đề xuất tối ưu hóa chất lượng kỹ thuật & nghệ thuật của video ngắn (TikTok, Reels, Shorts). Giải pháp giúp các nhà sáng tạo nội dung, doanh nghiệp và agency tối ưu hiệu năng giữ chân người xem (audience retention) trước khi xuất bản.

---

## 1. Thông Tin Chung MVP & Tài Liệu Thuyết Minh
- **Link sản phẩm/MVP**: [CreativeIQ AI Frontend (Vercel)](https://multimedia-ai.vercel.app/)
- **API Backend**: [CreativeIQ API Backend (Hugging Face)](https://thacanh-creativeiq.hf.space/)
- **Tài liệu thuyết minh MVP (docx/slide)**: [Đề án CreativeIQ (hack.docx)](./hack.docx)
- **Video demo**: *[Đang cập nhật]*
---

## 2. Danh Sách Các API VNPT Đã Tích Hợp
Hệ thống sử dụng tổ hợp các giải pháp AI tiên tiến từ VNPT để phân tích đa phương thức (Hình ảnh, Âm thanh, Ngôn ngữ):
1. **VNPT SmartReader (OCR API)**: Trích xuất nội dung văn bản xuất hiện trên khung hình (on-screen text), đo lường độ phủ chữ (`text_density`) và độ tương phản/kích cỡ chữ để chấm điểm khả năng đọc (`readability`).
2. **VNPT SmartVoice (STT API)**: Chuyển đổi lời thoại trong video thành văn bản để tính toán tốc độ nói (`speech_rate`) và phân tích nội dung kịch bản.
3. **VNPT SmartVision (Object Detection API)**:
   - **Phát hiện người (People Detection)**: Xác định sự xuất hiện và vị trí của con người trong các phân đoạn.
   - **Nhận diện khuôn mặt (Face Detection)**: Nhận diện biểu cảm, hướng nhìn để xác định vùng tập trung thị giác (`visual_focus`) và mức độ lộn xộn của khung cảnh (`clutter_level`).
4. **VNPT SmartBot (LLM API)**: Tiếp nhận toàn bộ 12 chỉ số đặc trưng được chuẩn hóa từ Backend, thực hiện phân tích chuyên sâu về mặt marketing/nội dung, viết tiêu đề thu hút (headline), phân tích ưu/nhược điểm và đưa ra hướng dẫn chỉnh sửa cụ thể cho từng phân đoạn video.

---

## 3. Hướng Dẫn Cài Đặt & Chạy Thử MVP

Hệ thống hỗ trợ hai phương thức triển khai chính: chạy container hóa bằng Docker (khuyến nghị cho môi trường production/test nhanh) và chạy thủ công (cho môi trường phát triển).

### Phương án A: Chạy nhanh bằng Docker Compose (Khuyến nghị)
Yêu cầu hệ thống đã cài đặt **Docker** và **Docker Compose (hoặc Docker Desktop)**.

1. **Sao chép cấu hình môi trường**:
   Tạo tệp cấu hình `.env` cho backend và ứng dụng:
   ```bash
   copy .env.example .env
   # Hoặc trên Linux/macOS:
   cp .env.example .env
   ```
2. **Khởi chạy hệ thống**:
   Docker Compose sẽ tự động build các image và chạy đồng thời các dịch vụ (FastAPI Backend, React Frontend qua Nginx, MySQL Database, MinIO Object Storage, và ngrok tunnel):
   ```bash
   docker compose up --build -d
   ```
3. **Địa chỉ truy cập**:
   - Giao diện người dùng (Frontend): `http://localhost:8080` (được định tuyến qua cổng Nginx Gateway).
   - API Backend Docs (Swagger): `http://localhost:8000/docs` (chạy trực tiếp từ container api).

---

### Phương án B: Cài đặt và chạy thủ công (Manual Setup)

#### 1. Khởi chạy và cấu hình Backend (FastAPI)
Yêu cầu hệ thống đã cài đặt **Python 3.11+**.

```bash
# Di chuyển vào thư mục backend
cd BE

# Khởi tạo môi trường ảo
python -m venv .venv

# Kích hoạt môi trường ảo:
# Trên Windows:
.venv\Scripts\activate
# Trên Linux/macOS:
source .venv/bin/activate

# Nâng cấp pip và cài đặt các thư viện phụ thuộc
pip install --upgrade pip
pip install -r requirements.txt

# Tạo tệp cấu hình môi trường (.env) và điền các API token của VNPT
copy .env.example .env
# Hoặc trên Linux/macOS: cp .env.example .env

# Chạy máy chủ phát triển Backend (port 8000)
uvicorn main:app --reload --port 8000
```
*Tài liệu hướng dẫn sử dụng API (Swagger UI) sẽ khả dụng tại: `http://localhost:8000/docs`*

#### 2. Khởi chạy và cấu hình Frontend (React + Vite)
Yêu cầu hệ thống đã cài đặt **Node.js 18+**.

```bash
# Trở về thư mục gốc của dự án
cd ..

# Cài đặt các gói thư viện phụ thuộc npm
npm install

# Khởi chạy server phát triển Frontend (Vite)
npm run dev
```
*Giao diện ứng dụng cục bộ sẽ khả dụng tại: `http://localhost:5173`*

---

## 4. Hướng Dẫn Kiểm Thử Tự Động (Automated Testing)

Dự án đính kèm sẵn script kiểm thử tự động viết bằng Python tại thư mục gốc: [test_api.py](file:///test_api.py). Script này giúp Ban giám khảo đánh giá và kiểm thử toàn bộ tính năng cốt lõi của API Backend một cách khách quan mà không cần tương tác qua giao diện web.

### Quy trình hoạt động của script test:
1. **Kiểm tra sức khỏe hệ thống (Health Check)**: Gửi yêu cầu GET tới `/health` để xác thực trạng thái máy chủ Backend đang hoạt động.
2. **Khởi tạo Video Test**: Sử dụng thư viện OpenCV và NumPy để tự động tạo một tệp tin video kiểm thử tạm thời dài 3 giây (`test_temp.mp4`) có chứa các hoạt cảnh chuyển động tròn và chữ viết OCR.
3. **Gửi phân tích (Multimodal Analysis)**: Gửi tệp tin video lên endpoint `/analyse` của Backend để trích xuất 12 chỉ số đặc trưng đa phương thức (hình ảnh, âm thanh, text OCR) và gọi VNPT SmartBot để viết nhận xét.
4. **Xác thực dữ liệu phản hồi (JSON Validation)**: Kiểm tra mã phản hồi HTTP 200, xác thực cấu trúc JSON trả về chứa đầy đủ các phân đoạn, chấm điểm chất lượng (overall score, grade), và đủ 12 đặc trưng.
5. **Dọn dẹp tài nguyên**: Tự động xóa tệp tin video tạm thời sau khi hoàn tất.

### Hướng dẫn chạy kiểm thử:
Đảm bảo bạn đã kích hoạt môi trường ảo của Backend và cài đặt thư viện `requests` và `opencv-python`.

```bash
# 1. Kích hoạt môi trường ảo (nếu chưa kích hoạt)
# Trên Windows:
BE\.venv\Scripts\activate
# Trên Linux/macOS:
source BE/.venv/bin/activate

# 2. Chạy script test trỏ tới Backend đang chạy cục bộ (port 8000)
python test_api.py http://localhost:8000

# Hoặc trỏ tới Gateway của Docker (port 8080)
python test_api.py http://localhost:8080/api
```
*Kết quả kiểm thử thành công sẽ hiển thị thông báo: `[+] TẤT CẢ CÁC BÀI KIỂM TRA ĐÃ ĐẠT!`*
