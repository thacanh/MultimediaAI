# CreativeIQ AI — Hệ Thống Đánh Giá Chất Lượng Sáng Tạo Video Ngắn (MVP)

CreativeIQ AI là giải pháp áp dụng công nghệ Trí tuệ Nhân tạo đa phương thức (Multimodal AI) để phân tích, đo lường và đưa ra các đề xuất tối ưu hóa chất lượng kỹ thuật & nghệ thuật của video ngắn (TikTok, Reels, Shorts). Giải pháp giúp các nhà sáng tạo nội dung, doanh nghiệp và agency tối ưu hiệu năng giữ chân người xem (audience retention) trước khi xuất bản.

---

## 1. Thông Tin Chung MVP & Tài Liệu Thuyết Minh
- **Link sản phẩm/MVP**:
- **Tài liệu thuyết minh MVP (docx/slide)**:
- **Video demo**:
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

### Phương án A: Chạy nhanh bằng Docker Compose (Khuyến nghị)
Yêu cầu hệ thống đã cài đặt **Docker** và **Docker Compose**. Chỉ cần thực hiện các lệnh sau:

1. Copy file cấu hình môi trường:
   ```bash
   copy .env.example .env
   # Hoặc trên Linux/macOS: cp .env.example .env
   ```
2. Khởi chạy toàn bộ hệ thống (Frontend, Backend, MySQL Database, MinIO Storage, ngrok):
   ```bash
   docker compose up --build -d
   ```
3. Truy cập giao diện ứng dụng tại: `http://localhost:8080`

---

### Phương án B: Cài đặt và chạy thủ công (Manual Setup)

#### 1. Cấu hình Backend (FastAPI)
Yêu cầu Python 3.11+.
```bash
cd BE
python -m venv .venv
# Kích hoạt virtual environment:
# Trên Windows:
.venv\Scripts\activate
# Trên Linux/macOS:
source .venv/bin/activate

# Cài đặt thư viện phụ thuộc
pip install -r requirements.txt

# Tạo file .env từ file ví dụ và cấu hình các API token của VNPT
copy .env.example .env

# Chạy server development
uvicorn main:app --reload --port 8000
```
Tài liệu API Swagger sẽ hiển thị tại: `http://localhost:8000/docs`

#### 2. Cấu hình Frontend (React + Vite)
Yêu cầu Node.js 18+.
```bash
# Trở lại thư mục gốc
cd ..
npm install
npm run dev
```
Truy cập giao diện tại: `http://localhost:5173`

---

### 4. Hướng Dẫn Kiểm Thử Tự Động (Automated Testing)
Dự án được đính kèm sẵn script kiểm thử tự động viết bằng Python tại thư mục gốc: [test_api.py](file:///test_api.py).

Script này sẽ tự động:
1. Gửi request kiểm tra trạng thái sức khỏe của Backend (`/health`).
2. Tự động khởi tạo một video ngắn 3 giây giả lập có chứa chuyển động hình học và chữ viết.
3. Gửi tệp tin lên endpoint `/analyse` của Backend để kiểm tra toàn bộ luồng xử lý trích xuất 12 đặc trưng và phản hồi của VNPT SmartBot.
4. Kiểm tra cấu trúc dữ liệu phản hồi JSON để đảm bảo độ tin cậy và tính nhất quán.

**Cách chạy script test:**
```bash
# Kích hoạt virtual environment của Backend trước để đảm bảo có đủ thư viện requests và opencv
# Chạy script test trỏ tới cổng Nginx gateway (mặc định là localhost:8080/api)
python test_api.py http://localhost:8080/api
```
