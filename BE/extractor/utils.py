"""Các hàm tiện ích dùng chung cho các bộ trích xuất đặc trưng."""
import json
import os

_CONFIG = None

def clamp_score(value: float, low: float = 0.0, high: float = 10.0) -> float:
    """Giới hạn điểm số trong khoảng [low, high] và làm tròn đến 2 chữ số thập phân."""
    return round(max(low, min(high, value)), 2)

def get_feature_config(feature_name: str) -> dict:
    """Tải và lưu trữ cấu hình ngưỡng tối ưu, trả về cấu hình cho đặc trưng cụ thể."""
    global _CONFIG
    if _CONFIG is None:
        config_path = os.path.join(os.path.dirname(__file__), 'optimal_ranges.json')
        try:
            with open(config_path, 'r', encoding='utf-8') as f:
                _CONFIG = json.load(f)
        except Exception:
            _CONFIG = {}
    return _CONFIG.get(feature_name, {})

def compute_inverted_u_score(
    val: float,
    opt_min: float,
    opt_max: float,
    peak: float,
    scale_min: float,
    scale_max: float
) -> float:
    """
    Tính toán điểm số theo đường cong phản hồi chữ U ngược (Inverted U-Curve).
    Điểm 10.0 tại mốc đỉnh (peak).
    Điểm trong khoảng [9.0, 10.0] trong vùng tối ưu [opt_min, opt_max].
    Giảm dần về 1.0 tại các biên scale_min và scale_max.
    Dưới scale_min hoặc trên scale_max sẽ nhận điểm 0.0.
    """
    if val is None:
        return 0.0
    
    if val == peak:
        return 10.0
        
    if val < peak:
        if val >= opt_min:
            # Nội suy tuyến tính từ opt_min (9.0) lên peak (10.0)
            denom = max(peak - opt_min, 1e-4)
            return 9.0 + (val - opt_min) / denom * 1.0
        else:
            # Nội suy tuyến tính từ scale_min (1.0) lên opt_min (9.0)
            denom = max(opt_min - scale_min, 1e-4)
            score = 1.0 + (val - scale_min) / denom * 8.0
            return max(0.0, score) if val >= scale_min else 0.0
    else:  # val > peak
        if val <= opt_max:
            # Nội suy tuyến tính từ peak (10.0) xuống opt_max (9.0)
            denom = max(opt_max - peak, 1e-4)
            return 9.0 + (opt_max - val) / denom * 1.0
        else:
            # Nội suy tuyến tính từ opt_max (9.0) xuống scale_max (1.0)
            denom = max(scale_max - opt_max, 1e-4)
            score = 9.0 - (val - opt_max) / denom * 8.0
            return max(0.0, score) if val <= scale_max else 0.0


def compute_monotone_down_score(
    val: float,
    opt_max: float,
    scale_max: float
) -> float:
    """
    Tính toán điểm số theo đường cong giảm đơn điệu (Monotone Down Curve).
    Điểm 10.0 tại 0.0.
    Giảm nhẹ xuống 9.0 trong vùng tối ưu [0.0, opt_max].
    Giảm mạnh về 1.0 tại biên scale_max.
    Vượt quá scale_max nhận điểm 0.0.
    """
    if val is None or val < 0.0:
        return 10.0
        
    if val <= opt_max:
        # Nội suy tuyến tính từ 0.0 (10.0) xuống opt_max (9.0)
        denom = max(opt_max, 1e-4)
        return 10.0 - (val / denom) * 1.0
    else:
        # Nội suy tuyến tính từ opt_max (9.0) xuống scale_max (1.0)
        denom = max(scale_max - opt_max, 1e-4)
        score = 9.0 - (val - opt_max) / denom * 8.0
        return max(0.0, score) if val <= scale_max else 0.0
