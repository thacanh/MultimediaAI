import os
import time
import uuid
import logging
import requests
from typing import Dict, Any, List, Optional, Tuple

logger = logging.getLogger("vnpthack.vnpt_client")

class VnptClient:
    _instance = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(VnptClient, cls).__new__(cls)
            cls._instance._init_client()
        return cls._instance

    def _init_client(self) -> None:
        # Thông tin xác thực OAuth
        self.username = os.getenv("VNPT_USERNAME", "your_username")
        self.password = os.getenv("VNPT_PASSWORD", "your_password")
        self.client_id = os.getenv("VNPT_CLIENT_ID", "your_client_id")
        self.client_secret = os.getenv("VNPT_CLIENT_SECRET", "your_client_secret")
        
        # Token truy cập tĩnh/toàn cục tùy chọn được sao chép từ VNPT console
        self.global_access_token = os.getenv("VNPT_GLOBAL_ACCESS_TOKEN", "")
        
        # Token ID và Token Key dành riêng cho từng dịch vụ
        self.ocr_token_id = os.getenv("VNPT_OCR_TOKEN_ID", "your_ocr_token_id")
        self.ocr_token_key = os.getenv("VNPT_OCR_TOKEN_KEY", "your_ocr_token_key")
        
        self.stt_token_id = os.getenv("VNPT_STT_TOKEN_ID", "your_stt_token_id")
        self.stt_token_key = os.getenv("VNPT_STT_TOKEN_KEY", "your_stt_token_key")
        
        self.vision_token_id = os.getenv("VNPT_VISION_TOKEN_ID", "your_vision_token_id")
        self.vision_token_key = os.getenv("VNPT_VISION_TOKEN_KEY", "your_vision_token_key")
        
        self.bot_token_id = os.getenv("VNPT_BOT_TOKEN_ID", "your_bot_token_id")
        self.bot_token_key = os.getenv("VNPT_BOT_TOKEN_KEY", "your_bot_token_key")
        self.bot_id = os.getenv("VNPT_BOT_ID", "your_bot_id")
        
        self.base_url = "https://api.idg.vnpt.vn"
        self.bot_url = "https://assistant-stream.vnpt.vn/v1/conversation"
        
        # Bộ nhớ đệm token (sử dụng khi đăng nhập bằng username/password)
        self._access_token: Optional[str] = None
        self._token_expires_at: float = 0.0

    def is_ocr_mock_mode(self) -> bool:
        return self.ocr_token_id in ("your_ocr_token_id", "") or self.ocr_token_key in ("your_ocr_token_key", "")

    def is_stt_mock_mode(self) -> bool:
        return self.stt_token_id in ("your_stt_token_id", "") or self.stt_token_key in ("your_stt_token_key", "")

    def is_vision_mock_mode(self) -> bool:
        return self.vision_token_id in ("your_vision_token_id", "") or self.vision_token_key in ("your_vision_token_key", "")

    def is_bot_mock_mode(self) -> bool:
        return (
            self.bot_token_id in ("your_bot_token_id", "")
            or self.bot_token_key in ("your_bot_token_key", "")
            or self.bot_id in ("your_bot_id", "")
        )



    def get_access_token(self) -> str:
        """Lấy token truy cập. Sử dụng VNPT_GLOBAL_ACCESS_TOKEN nếu được thiết lập, ngược lại sử dụng OAuth."""
        # 1. Kiểm tra xem người dùng có cấu hình token toàn cục trực tiếp hay không
        if self.global_access_token and self.global_access_token not in ("your_global_access_token", ""):
            token = self.global_access_token.strip()
            if token.lower().startswith("bearer "):
                token = token[7:]
            return token

        # 2. Chế độ giả lập nếu không thiết lập thông tin đăng nhập
        if self.username in ("your_username", ""):
            return "mock_access_token"
            
        current_time = time.time()
        # Nếu token tồn tại và chưa hết hạn trong 5 phút tới, sử dụng lại nó
        if self._access_token and current_time < (self._token_expires_at - 300):
            return self._access_token
            
        try:
            logger.info("Fetching new OAuth token from VNPT...")
            url = f"{self.base_url}/auth/oauth/token"
            headers = {"Content-Type": "application/json"}
            payload = {
                "username": self.username,
                "password": self.password,
                "client_id": self.client_id,
                "client_secret": self.client_secret,
                "grant_type": "password"
            }
            res = requests.post(url, headers=headers, json=payload, timeout=10)
            res.raise_for_status()
            data = res.json()
            
            self._access_token = data["access_token"]
            expires_in = int(data.get("expires_in", 3600))
            self._token_expires_at = current_time + expires_in
            logger.info("VNPT OAuth token acquired successfully.")
            return self._access_token
        except Exception as e:
            logger.error(f"Lấy OAuth token từ VNPT thất bại: {e}")
            if self._access_token:
                logger.warning("Sử dụng token đã hết hạn làm phương án dự phòng.")
                return self._access_token
            raise RuntimeError(f"Xác thực VNPT thất bại: {e}")

    def get_headers(self, service: str, is_json: bool = True) -> Dict[str, str]:
        """Tạo các header đặc thù cho từng dịch vụ VNPT API."""
        if service == "ocr":
            tid = self.ocr_token_id
            tkey = self.ocr_token_key
        elif service == "stt":
            tid = self.stt_token_id
            tkey = self.stt_token_key
        elif service == "vision":
            tid = self.vision_token_id
            tkey = self.vision_token_key
        elif service == "bot":
            tid = self.bot_token_id
            tkey = self.bot_token_key
        else:
            # Dự phòng sang vision/ocr
            tid = self.vision_token_id or self.ocr_token_id
            tkey = self.vision_token_key or self.ocr_token_key

        headers = {
            "Authorization": f"Bearer {self.get_access_token()}",
            "Token-id": tid,
            "Token-key": tkey
        }
        if is_json:
            headers["Content-Type"] = "application/json"
        return headers

    def upload_file(self, file_path: str, service: str = "vision", title: str = "Upload", description: str = "File") -> Optional[str]:
        """
        Tải file lên Dịch vụ File của VNPT.
        """
        # Xác định xem có nên sử dụng chế độ giả lập dựa trên dịch vụ hay không
        is_mock = False
        if service == "vision" and self.is_vision_mock_mode():
            is_mock = True
        elif service == "ocr" and self.is_ocr_mock_mode():
            is_mock = True
        elif service == "stt" and self.is_stt_mock_mode():
            is_mock = True

        if is_mock:
            mock_hash = f"mock_hash_{uuid.uuid4().hex}"
            logger.info(f"[MOCK] Uploaded {file_path} to VNPT. Hash: {mock_hash}")
            return mock_hash

        try:
            url = f"{self.base_url}/file-service/v1/addFile"
            headers = self.get_headers(service=service, is_json=False)
            
            with open(file_path, "rb") as f:
                files = {"file": (os.path.basename(file_path), f, "image/jpeg")}
                data = {"title": title, "description": description}
                
                res = requests.post(url, headers=headers, files=files, data=data, timeout=30)
                res.raise_for_status()
                result = res.json()
                
                if result.get("message") == "IDG-00000000" and "object" in result:
                    file_hash = result["object"]["hash"]
                    logger.info(f"Uploaded file to VNPT successfully. Hash: {file_hash}")
                    return file_hash
                else:
                    logger.warning(f"VNPT addFile returned message: {result.get('message')}")
                    return None
        except Exception as e:
            logger.error(f"VNPT file upload failed: {e}")
            return None

    def get_file_url(self, file_hash: str, service: str = "vision") -> Optional[str]:
        """
        Lấy URL tải/truy cập tạm thời cho một file đã tải lên.
        """
        is_mock = False
        if service == "vision" and self.is_vision_mock_mode():
            is_mock = True
        elif service == "ocr" and self.is_ocr_mock_mode():
            is_mock = True

        if is_mock:
            return f"https://mock-obs.vnpt.vn/files/{file_hash}.jpg"

        try:
            url = f"{self.base_url}/proxy-service/url-file"
            headers = self.get_headers(service=service, is_json=True)
            params = {"hash": file_hash}
            
            res = requests.get(url, headers=headers, params=params, timeout=15)
            res.raise_for_status()
            result = res.json()
            
            if result.get("message") == "IDG-00000000" and "object" in result:
                url_val = result["object"]
                if isinstance(url_val, dict):
                    return url_val.get("url") or url_val.get("downloadUrl")
                return str(url_val)
            return None
        except Exception as e:
            logger.error(f"VNPT get_file_url failed: {e}")
            return None

    def transcribe_audio(self, audio_file_path: str) -> Optional[str]:
        """
        Chuyển đổi lời nói trong file âm thanh thành văn bản (STT).
        """
        if self.is_stt_mock_mode():
            logger.info("[MOCK] Transcribing audio with VNPT STT...")
            return "Đây là văn bản thử nghiệm của dịch vụ VNPT Speech to Text khi chưa cấu hình Key."

        try:
            url = f"{self.base_url}/stt-service/v1/grpc/standard"
            headers = self.get_headers(service="stt", is_json=False)
            
            with open(audio_file_path, "rb") as f:
                files = {"audioFile": (os.path.basename(audio_file_path), f, "audio/wav")}
                data = {
                    "clientSession": str(uuid.uuid4()),
                    "enableAutomaticPunctuation": "true",
                    "customConfiguration": '{"invert_text": "1", "capt_punch_recovery": "1"}'
                }
                
                res = requests.post(url, headers=headers, files=files, data=data, timeout=60)
                res.raise_for_status()
                result = res.json()
                
                is_success = (
                    result.get("message") == "IDG-00000000"
                    or result.get("status") == "OK"
                    or (isinstance(result.get("object"), dict) and result.get("object").get("status") == "OK")
                )
                if is_success and "object" in result:
                    results_list = result["object"].get("results", [])
                    transcripts = []
                    for r in results_list:
                        alternatives = r.get("alternatives", [])
                        if alternatives:
                            transcripts.append(alternatives[0].get("transcript", ""))
                    full_text = " ".join(transcripts)
                    logger.info("Speech transcribed successfully with VNPT.")
                    return full_text
                else:
                    logger.warning(f"VNPT STT returned status: {result.get('status')} or message: {result.get('message')}")
                    return None
        except Exception as e:
            logger.error(f"VNPT STT API call failed: {e}")
            return None

    def ocr_image(self, file_hash: str, file_type: str = "jpg") -> Optional[str]:
        """
        Thực hiện quét OCR trên một mã hash tài liệu/hình ảnh đã tải lên.
        """
        if self.is_ocr_mock_mode():
            logger.info("[MOCK] Running OCR with VNPT SmartReader...")
            return "MOCK TEXT: Đây là kết quả OCR giả lập từ VNPT SmartReader."

        try:
            url = f"{self.base_url}/rpa-service/aidigdoc/v1/ocr/scan"
            headers = self.get_headers(service="ocr", is_json=True)
            payload = {
                "token": str(uuid.uuid4()),
                "client_session": f"session-{uuid.uuid4().hex[:12]}",
                "file_hash": file_hash,
                "file_type": file_type,
                "details": False
            }
            
            res = requests.post(url, headers=headers, json=payload, timeout=30)
            res.raise_for_status()
            result = res.json()
            
            if result.get("status") == "OK" and "object" in result:
                paragraphs = result["object"].get("paragraphs", [])
                lines = []
                for p in paragraphs:
                    if isinstance(p, list):
                        lines.extend(p)
                    else:
                        lines.append(str(p))
                full_text = "\n".join(lines)
                logger.info("OCR completed successfully with VNPT.")
                return full_text
            else:
                logger.warning(f"VNPT OCR returned status: {result.get('status')}")
                return None
        except Exception as e:
            logger.error(f"VNPT OCR API call failed: {e}")
            return None

    def ocr_image_detailed(self, file_hash: str, w: int, h: int, file_type: str = "jpg") -> List[Tuple[List[List[int]], str, float]]:
        """
        Thực hiện quét OCR trên một mã hash hình ảnh với kết quả chi tiết (chứa tọa độ và độ tin cậy).
        """
        if self.is_ocr_mock_mode():
            logger.info("[MOCK] Running detailed OCR with VNPT SmartReader...")
            return [
                ([[int(0.1*w), int(0.1*h)], [int(0.9*w), int(0.1*h)], [int(0.9*w), int(0.2*h)], [int(0.1*w), int(0.2*h)]], "VNPT MULTIMEDIA AI HACKATHON", 0.95),
                ([[int(0.2*w), int(0.3*h)], [int(0.8*w), int(0.3*h)], [int(0.8*w), int(0.4*h)], [int(0.2*w), int(0.4*h)]], "HỆ THỐNG PHÂN TÍCH CHẤT LƯỢNG SÁNG TẠO", 0.90)
            ]

        try:
            url = f"{self.base_url}/rpa-service/aidigdoc/v1/ocr/scan"
            headers = self.get_headers(service="ocr", is_json=True)
            payload = {
                "token": str(uuid.uuid4()),
                "client_session": f"session-{uuid.uuid4().hex[:12]}",
                "file_hash": file_hash,
                "file_type": file_type,
                "details": True
            }
            
            res = requests.post(url, headers=headers, json=payload, timeout=30)
            res.raise_for_status()
            result = res.json()
            
            ocr_results = []
            if result.get("status") == "OK" and "object" in result:
                phrases = result["object"].get("phrases", [])
                if isinstance(phrases, list):
                    for item in phrases:
                        cells = item.get("cells", []) if isinstance(item, dict) else []
                        for cell in cells:
                            text = cell.get("text", "").strip()
                            conf = float(cell.get("confidence_score", 1.0))
                            cell_bboxes = cell.get("bboxes", {})
                            
                            bbox_coords = cell_bboxes.get("1")
                            if bbox_coords and len(bbox_coords) == 4:
                                xmin, ymin, xmax, ymax = bbox_coords
                                x0 = int(xmin * w)
                                y0 = int(ymin * h)
                                x1 = int(xmax * w)
                                y1 = int(ymin * h)
                                x2 = int(xmax * w)
                                y2 = int(ymax * h)
                                x3 = int(xmin * w)
                                y3 = int(ymax * h)
                                bbox = [[x0, y0], [x1, y1], [x2, y2], [x3, y3]]
                                ocr_results.append((bbox, text, conf))
                logger.info(f"Detailed OCR completed with VNPT. Extracted {len(ocr_results)} text blocks.")
                return ocr_results
            else:
                logger.warning(f"VNPT detailed OCR returned status: {result.get('status')}")
                return []
        except Exception as e:
            logger.error(f"VNPT detailed OCR failed: {e}")
            return []

    def detect_people(self, img_url: str) -> List[Tuple[float, float, float, float]]:
        """
        Phát hiện người trong URL hình ảnh.
        """
        if self.is_vision_mock_mode():
            return [(100.0, 100.0, 300.0, 400.0)]

        try:
            url = f"{self.base_url}/data-service/v1/smartvision/detect-people"
            headers = self.get_headers(service="vision", is_json=True)
            payload = {"data": img_url}
            
            res = requests.post(url, headers=headers, json=payload, timeout=20)
            res.raise_for_status()
            result = res.json()
            
            boxes = []
            info = result.get("info", {})
            bboxs = info.get("human_bboxs", [])
            for box in bboxs:
                if len(box) == 4:
                    boxes.append((box[0], box[1], box[2], box[3]))
            return boxes
        except Exception as e:
            logger.error(f"VNPT detect_people failed: {e}")
            return []

    def detect_vehicle(self, img_url: str) -> List[Dict[str, Any]]:
        """
        Phát hiện phương tiện và biển số xe trong URL hình ảnh.
        """
        if self.is_vision_mock_mode():
            return [{"bbox": (50.0, 200.0, 400.0, 500.0), "class": 1, "prob": 0.95, "license_plate": "30A12345"}]

        try:
            url = f"{self.base_url}/data-service/v1/smartvision/detect-vehicle"
            headers = self.get_headers(service="vision", is_json=True)
            payload = {"data": img_url, "max_object": 10}
            
            res = requests.post(url, headers=headers, json=payload, timeout=20)
            res.raise_for_status()
            result = res.json()
            
            vehicles = []
            info = result.get("info", {})
            coords = info.get("vehicle_coords", [])
            classes = info.get("vehicle_classes", [])
            probs = info.get("vehicle_probs", [])
            lprs = info.get("lpr", [])
            
            for i, coord in enumerate(coords):
                if len(coord) == 4:
                    vehicles.append({
                        "bbox": (coord[0], coord[1], coord[2], coord[3]),
                        "class": int(classes[i]) if i < len(classes) else 0,
                        "prob": float(probs[i]) if i < len(probs) else 0.0,
                        "license_plate": lprs[i] if i < len(lprs) else ""
                    })
            return vehicles
        except Exception as e:
            logger.error(f"VNPT detect_vehicle failed: {e}")
            return []

    def detect_face(self, img_url: str) -> List[Dict[str, Any]]:
        """
        Phát hiện khuôn mặt trong URL hình ảnh.
        """
        if self.is_vision_mock_mode():
            return [{"bbox": (180.0, 120.0, 240.0, 180.0), "prob": 0.98}]

        try:
            url = f"{self.base_url}/data-service/v1/smartvision/detect-face"
            headers = self.get_headers(service="vision", is_json=True)
            payload = {"data": img_url, "max_object": 10}
            
            res = requests.post(url, headers=headers, json=payload, timeout=20)
            res.raise_for_status()
            result = res.json()
            
            faces = []
            info = result.get("info", {})
            bboxs = info.get("face_bboxs", [])
            scores = info.get("face_scores", [])
            
            for i, bbox in enumerate(bboxs):
                if len(bbox) == 4:
                    faces.append({
                        "bbox": (bbox[0], bbox[1], bbox[2], bbox[3]),
                        "prob": float(scores[i][0] if isinstance(scores[i], list) else scores[i]) if i < len(scores) else 0.0
                    })
            return faces
        except Exception as e:
            logger.error(f"VNPT detect_face failed: {e}")
            return []

    def summarize_text(self, text: str) -> Optional[str]:
        """
        Tóm tắt văn bản hội thoại hoặc lời nói bằng VNPT SmartVoice Summary.
        """
        if not text.strip():
            return ""
            
        if self.is_stt_mock_mode():
            return "Tóm tắt giả lập: Nội dung video chủ yếu xoay quanh việc giới thiệu sản phẩm và hướng dẫn cài đặt hệ thống. Điểm nổi bật là tính dễ dùng và tích hợp API."

        try:
            url = f"{self.base_url}/eval-emotion-service/v1/conversation/summary"
            headers = self.get_headers(service="stt", is_json=True)
            payload = {
                "text": text,
                "languageCode": "vi-VN",
                "endMeeting": True
            }
            res = requests.post(url, headers=headers, json=payload, timeout=30)
            res.raise_for_status()
            result = res.json()
            
            if result.get("message") == "IDG-00000000" and "object" in result:
                return result["object"].get("summary")
            return None
        except Exception as e:
            logger.error(f"VNPT summarize_text failed: {e}")
            return None



    def transcribe_audio_detailed(self, audio_file_path: str) -> dict:
        """
        Nhận dạng file âm thanh qua VNPT STT API, trả về cấu trúc tương thích với Whisper.
        """
        if self.is_stt_mock_mode():
            logger.info("[MOCK] Transcribing detailed audio with VNPT STT...")
            return {
                "text": "Đây là văn bản thử nghiệm của dịch vụ VNPT Speech to Text.",
                "segments": [
                    {
                        "start": 0.0,
                        "end": 4.0,
                        "text": "Đây là văn bản thử nghiệm",
                        "words": [
                            {"word": "Đây", "start": 0.0, "end": 1.0},
                            {"word": "là", "start": 1.0, "end": 1.5},
                            {"word": "văn", "start": 1.5, "end": 2.0},
                            {"word": "bản", "start": 2.0, "end": 2.5},
                            {"word": "thử", "start": 2.5, "end": 3.0},
                            {"word": "nghiệm", "start": 3.0, "end": 4.0}
                        ]
                    }
                ]
            }

        try:
            url = f"{self.base_url}/stt-service/v1/grpc/standard"
            headers = self.get_headers(service="stt", is_json=False)
            
            with open(audio_file_path, "rb") as f:
                files = {"audioFile": (os.path.basename(audio_file_path), f, "audio/wav")}
                data = {
                    "clientSession": str(uuid.uuid4()),
                    "enableWordTimeOffsets": "true",
                    "enableAutomaticPunctuation": "true",
                    "customConfiguration": '{"invert_text": "1", "capt_punch_recovery": "1"}'
                }
                
                res = requests.post(url, headers=headers, files=files, data=data, timeout=90)
                res.raise_for_status()
                result = res.json()
                
                is_success = (
                    result.get("message") == "IDG-00000000"
                    or result.get("status") == "OK"
                    or (isinstance(result.get("object"), dict) and result.get("object").get("status") == "OK")
                )
                if is_success and "object" in result:
                    results_list = result["object"].get("results", [])
                    segments = []
                    full_text_list = []
                    
                    for s_idx, r in enumerate(results_list):
                        alternatives = r.get("alternatives", [])
                        if not alternatives:
                            continue
                        alt = alternatives[0]
                        transcript = alt.get("transcript", "")
                        full_text_list.append(transcript)
                        
                        raw_words = alt.get("words", [])
                        words_list = []
                        for w_item in raw_words:
                            word_str = w_item.get("word", "")
                            
                            def to_sec(val) -> float:
                                if val is None:
                                    return 0.0
                                if isinstance(val, (int, float)):
                                    return float(val)
                                val_str = str(val).strip().lower()
                                if val_str.endswith("s"):
                                    val_str = val_str[:-1]
                                try:
                                    return float(val_str)
                                except ValueError:
                                    return 0.0
                                    
                            w_start = to_sec(w_item.get("start_time") or w_item.get("startTime") or w_item.get("start") or w_item.get("startOffset"))
                            w_end = to_sec(w_item.get("end_time") or w_item.get("endTime") or w_item.get("end") or w_item.get("endOffset"))
                            
                            words_list.append({
                                "word": word_str,
                                "start": w_start,
                                "end": w_end
                            })
                            
                        segments.append({
                            "start": words_list[0]["start"] if words_list else 0.0,
                            "end": words_list[-1]["end"] if words_list else 0.0,
                            "text": transcript,
                            "words": words_list
                        })
                        
                    return {
                        "text": " ".join(full_text_list),
                        "segments": segments
                    }
                else:
                    logger.warning(f"VNPT STT returned status: {result.get('status')} or message: {result.get('message')}")
                    return {}
        except Exception as e:
            logger.error(f"VNPT detailed STT call failed: {e}")
            return {}

    def review_with_bot(self, prompt: str, system_prompt: str) -> Optional[str]:
        """
        Gửi yêu cầu đánh giá video đến VNPT SmartBot để thực hiện đánh giá video.
        """
        if self.is_bot_mock_mode():
            logger.warning("[MOCK] SmartBot credentials/ID not configured. Returning dummy review.")
            import json
            return json.dumps({
                "headline": "Video giới thiệu có chất lượng âm thanh tốt, hình ảnh rõ ràng.",
                "overall_score": 8.5,
                "grade": "B",
                "insight": "Video có mật độ chữ và độ rõ tốt, nội dung tóm tắt rành mạch. Tuy nhiên, chuyển động visual có thể tăng tính năng động hơn.",
                "key_issues": [
                    {
                        "feature": "visual_dynamics",
                        "severity": "Medium",
                        "description": "Chuyển động hình ảnh hơi đều và chậm ở một số phân đoạn.",
                        "recommendation": "Tăng cường hiệu ứng chuyển động hoặc góc quay đa dạng hơn."
                    }
                ],
                "segment_highlights": ["Đoạn giới thiệu mở đầu ấn tượng với độ nét cao."],
                "suggested_fixes": ["Thêm nhạc nền động hơn để giữ chân người xem."]
            }, ensure_ascii=False)

        try:
            headers = self.get_headers(service="bot", is_json=True)
            payload = {
                "bot_id": self.bot_id,
                "sender_id": f"eval-{uuid.uuid4().hex[:8]}",
                "text": prompt,
                "input_channel": "normal",
                "session_id": f"sess-{uuid.uuid4().hex[:12]}",
                "metadata": {"button_variables": []}
            }
            
            headers["Accept"] = "text/event-stream"
            res = requests.post(self.bot_url, headers=headers, json=payload, stream=True, timeout=40)
            res.raise_for_status()
            
            import json
            texts = []
            
            for line in res.iter_lines():
                if not line:
                    continue
                line_str = line.decode("utf-8").strip()
                if line_str.startswith("data:"):
                    data_content = line_str[5:].strip()
                    if not data_content:
                        continue
                    try:
                        chunk_json = json.loads(data_content)
                        if "object" in chunk_json and "sb" in chunk_json["object"]:
                            sb = chunk_json["object"]["sb"]
                            card_data = sb.get("card_data", [])
                            for card in card_data:
                                t = card.get("text", "")
                                if t:
                                    texts.append(t)
                    except Exception as parse_err:
                        logger.warning(f"Failed to parse SSE line: {parse_err}. Line content: {line_str}")
            
            if texts:
                return "\n".join(texts)
            return None
        except Exception as e:
            logger.error(f"VNPT review_with_bot failed: {e}")
            return None

