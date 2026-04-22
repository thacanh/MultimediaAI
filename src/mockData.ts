import { SegmentData } from './types';

/**
 * Dữ liệu giả định ổn định cho demo phân tích video AI.
 * Các giá trị này không thay đổi giữa các lần render.
 */
export const MOCK_SEGMENTS: SegmentData[] = [
  {
    start: 0,
    end: 4,
    score: 3.4,
    features: {
      visual_dynamic: 2,
      motion_level: 2,
      text_density: 4,
      audio_energy: 3,
    },
    issues: [
      { type: 'Phần mở đầu thiếu điểm nhấn thị giác (visual hook)', severity: 'High' },
      { type: 'Nhịp độ quá chậm để giữ chân người xem trong giây đầu tiên', severity: 'High' },
      { type: 'Năng lượng âm thanh thấp làm giảm tác động', severity: 'Medium' },
    ],
    impact:
      'Người xem quyết định ở lại hoặc rời đi trong vòng 3 giây đầu tiên - phần mở đầu chậm, năng lượng thấp khiến tỷ lệ bỏ qua tăng trên 70%.',
    feedback:
      'Phần mở đầu không có điểm nhấn thị giác. Chuyển động gần như tĩnh và năng lượng âm thanh phẳng. Đây là phân đoạn có rủi ro cao nhất.',
    suggestedFix:
      'Bắt đầu bằng cảnh quay hình ảnh mạnh nhất của bạn. Thêm văn bản động hoặc đồ họa chuyển động trong 1.5 giây đầu tiên. Tăng âm lượng nhạc nền intro thêm +3dB.',
  },
  {
    start: 4,
    end: 8,
    score: 7.8,
    features: {
      visual_dynamic: 8,
      motion_level: 7,
      text_density: 3,
      audio_energy: 8,
    },
    issues: [{ type: 'Lỗi đồng bộ âm thanh-hình ảnh nhẹ', severity: 'Low' }],
    impact:
      'Sự đa dạng về thị giác mạnh mẽ ở thời điểm này giúp giữ chân những người xem đã vượt qua phần mở đầu.',
    feedback:
      'Nhịp điệu ở đây rất tốt. Sự đa dạng thị giác cao, mật độ văn bản sạch sẽ và âm thanh tràn đầy năng lượng kết hợp rất hài hòa. Một sự phục hồi mạnh mẽ từ phần mở đầu.',
    suggestedFix:
      'Điều chỉnh điểm cắt tại giây 5.2 sớm hơn 1 khung hình để thắt chặt nhịp đồng bộ.',
  },
  {
    start: 8,
    end: 12,
    score: 8.1,
    features: {
      visual_dynamic: 8,
      motion_level: 7,
      text_density: 5,
      audio_energy: 8,
    },
    issues: [{ type: 'Rủi ro quá tải thông tin nhẹ', severity: 'Low' }],
    impact:
      'Nhịp độ ổn định giúp giữ sự chú ý; người xem đã sẵn sàng để tiếp nhận thông điệp cốt lõi.',
    feedback:
      'Sự đồng bộ hình ảnh-âm thanh rất mạnh mẽ. Mật độ văn bản hơi tăng nhẹ nhưng vẫn trong tầm kiểm soát. Phân đoạn này củng cố đà tăng trưởng.',
    suggestedFix:
      'Giảm bớt một dòng văn bản trên màn hình để hình ảnh có thêm không gian "thở".',
  },
  {
    start: 12,
    end: 16,
    score: 3.2,
    features: {
      visual_dynamic: 2,
      motion_level: 2,
      text_density: 9,
      audio_energy: 3,
    },
    issues: [
      { type: 'Quá tải thông tin - mật độ văn bản ở mức báo động', severity: 'High' },
      { type: 'Hình ảnh trì trệ, không có chuyển động', severity: 'High' },
      { type: 'Năng lượng âm thanh sụt giảm mạnh', severity: 'Medium' },
      { type: 'Giọng đọc bị đều, thiếu cảm xúc', severity: 'Medium' },
    ],
    impact:
      'Sự kết hợp giữa quá tải nhận thức và hình ảnh tĩnh tạo ra điểm sụt giảm người xem lớn nhất dự kiến trong video.',
    feedback:
      'Mật độ văn bản tối đa trong khi hình ảnh hoàn toàn tĩnh. Năng lượng âm thanh rơi xuống mức thấp nhất. Đây là phân đoạn rủi ro lớn nhất.',
    suggestedFix:
      'Chia khối văn bản này thành 3 hiệu ứng xuất hiện riêng biệt. Sử dụng chữ động (kinetic typography) hoặc biểu tượng thay vì các đoạn văn bản liệt kê.',
  },
  {
    start: 16,
    end: 20,
    score: 5.9,
    features: {
      visual_dynamic: 5,
      motion_level: 6,
      text_density: 7,
      audio_energy: 5,
    },
    issues: [
      { type: 'Kết thúc có cảm giác đột ngột', severity: 'Medium' },
      { type: 'Năng lượng giọng nói vẫn đang phục hồi', severity: 'Medium' },
      { type: 'Lời kêu gọi hành động (CTA) thiếu sự nhấn mạnh thị giác', severity: 'Low' },
    ],
    impact:
      'Kết thúc yếu làm giảm khả năng ghi nhớ thông điệp và giảm khả năng chuyển đổi CTA xuống khoảng 30%.',
    feedback:
      'Năng lượng đang phục hồi nhưng chưa đạt đến mức kết thúc mạnh mẽ. CTA thiếu sự nổi bật thị giác và âm lượng âm thanh vẫn còn thấp.',
    suggestedFix:
      'Thêm hiệu ứng zoom-punch 0.5 giây vào CTA. Tăng nhạc nền (BGM) thêm +4dB và tăng âm lượng giọng nói cho khớp với năng lượng của đoạn từ 4–8 giây.',
  },
];

export const OVERALL_SCORE = 6.2;

export const GLOBAL_SUMMARY = {
  headline: 'Phần giữa mạnh mẽ, mở đầu và kết thúc yếu',
  insight:
    'Video của bạn phục hồi tốt sau khởi đầu chậm, nhưng giây đầu tiên và CTA kết thúc đều cần các chỉnh sửa mục tiêu để tối đa hóa khả năng giữ chân và chuyển đổi.',
  keyIssues: [
    'Phần mở đầu thiếu sức hút thị giác - rủi ro bỏ qua cao',
    'Quá tải thông tin từ giây 12-16 là điểm rơi chính',
    'Năng lượng giọng nói quá phẳng trong suốt video',
  ],
};

export const NARRATIVE_TREND = [
  { label: 'Mở đầu (0-4s)', status: 'weak', note: 'Năng lượng thấp, rủi ro bỏ qua cao' },
  { label: 'Tăng tốc (4-12s)', status: 'strong', note: 'Ổn định - đà phát triển tốt' },
  { label: 'Rủi ro đỉnh điểm (12-16s)', status: 'weak', note: 'Khu vực sụt giảm nghiêm trọng' },
  { label: 'Kết thúc (16-20s)', status: 'neutral', note: 'Đang phục hồi, CTA cần cải thiện' },
];

export type TrendStatus = 'weak' | 'neutral' | 'strong';
