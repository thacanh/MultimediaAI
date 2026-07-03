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
      visual_dynamics: 2, visual_dynamic: 2,
      motion_level: 2,
      scene_variation: 3,
      cut_frequency: 2,
      text_density: 4,
      readability: 5,
      visual_focus: 3,
      clutter_level: 4,
      audio_energy: 3,
      pitch_variation: 3,
      speech_rate: 4,
      sync_alignment: 5,
    },
    issues: [
      { type: 'Thiếu điểm nhấn thị giác (Visual Hook) ở phần mở đầu', severity: 'High' },
      { type: 'Nhịp độ chưa đủ để tối ưu hóa tỷ lệ giữ chân (Retention Rate)', severity: 'High' },
      { type: 'Cường độ âm thanh thấp, làm giảm mức độ tác động', severity: 'Medium' },
    ],
    impact:
      'Người xem thường đưa ra quyết định lướt qua trong 3 giây đầu. Việc thiếu điểm nhấn và cường độ âm thanh thấp có thể làm tăng tỷ lệ thoát (Drop-off Rate) lên đến 70%.',
    feedback:
      'Phân đoạn mở đầu hiện thiếu một "Hook" đủ mạnh. Chuyển động trên khung hình khá tĩnh và mức năng lượng âm thanh chưa đạt mức tối ưu. Đây là giai đoạn có rủi ro thoát trang cao nhất.',
    suggestedFix:
      'Cân nhắc sử dụng phân cảnh có mức độ tương tác cao nhất để mở đầu. Tích hợp hiệu ứng văn bản động (Kinetic Typography) trong 1.5 giây đầu tiên. Đề xuất tăng Gain nhạc nền (Intro BGM) thêm khoảng +3dB.',
  },
  {
    start: 4,
    end: 8,
    score: 7.8,
    features: {
      visual_dynamics: 8, visual_dynamic: 8,
      motion_level: 7,
      scene_variation: 7,
      cut_frequency: 6,
      text_density: 3,
      readability: 8,
      visual_focus: 7,
      clutter_level: 2,
      audio_energy: 8,
      pitch_variation: 6,
      speech_rate: 6,
      sync_alignment: 7,
    },
    issues: [{ type: 'Độ trễ đồng bộ âm thanh - hình ảnh (A/V Sync) ở mức thấp', severity: 'Low' }],
    impact:
      'Mức độ đa dạng về thị giác ở phân đoạn này hoạt động hiệu quả, giúp duy trì sự chú ý của tệp khán giả đã vượt qua phần Hook.',
    feedback:
      'Nhịp độ (Pacing) được xử lý rất tốt. Sự kết hợp giữa chuyển động hình ảnh, mật độ văn bản tối ưu và cường độ âm thanh tạo ra trải nghiệm liền mạch.',
    suggestedFix:
      'Có thể vi chỉnh (fine-tune) điểm cắt (cut point) tại mốc 5.2s sớm hơn 1 frame để đạt độ đồng bộ hoàn hảo hơn.',
  },
  {
    start: 8,
    end: 12,
    score: 8.1,
    features: {
      visual_dynamics: 8, visual_dynamic: 8,
      motion_level: 7,
      scene_variation: 6,
      cut_frequency: 5,
      text_density: 5,
      readability: 7,
      visual_focus: 8,
      clutter_level: 3,
      audio_energy: 8,
      pitch_variation: 7,
      speech_rate: 5,
      sync_alignment: 8,
    },
    issues: [{ type: 'Cảnh báo nhẹ: Nguy cơ quá tải lượng thông tin (Cognitive Overload)', severity: 'Low' }],
    impact:
      'Nhịp độ được duy trì ổn định giúp củng cố mức độ tập trung, chuẩn bị cho người xem tiếp nhận thông điệp cốt lõi (Core Message).',
    feedback:
      'Sự đồng bộ A/V tiếp tục thể hiện hiệu suất cao. Mặc dù mật độ văn bản có sự gia tăng, tổng thể vẫn nằm trong giới hạn tối ưu.',
    suggestedFix:
      'Cân nhắc tinh giản một dòng văn bản phụ trên màn hình để tạo thêm "không gian thở" (Negative Space) cho thị giác.',
  },
  {
    start: 12,
    end: 16,
    score: 3.2,
    features: {
      visual_dynamics: 2, visual_dynamic: 2,
      motion_level: 2,
      scene_variation: 2,
      cut_frequency: 1,
      text_density: 9,
      readability: 4,
      visual_focus: 2,
      clutter_level: 8,
      audio_energy: 3,
      pitch_variation: 2,
      speech_rate: 3,
      sync_alignment: 3,
    },
    issues: [
      { type: 'Cảnh báo đỏ: Mật độ văn bản vượt ngưỡng tối ưu', severity: 'High' },
      { type: 'Hình ảnh thiếu sự thay đổi, dẫn đến cảm giác tĩnh lặng', severity: 'High' },
      { type: 'Cường độ âm thanh sụt giảm đáng kể', severity: 'Medium' },
    ],
    impact:
      'Sự kết hợp giữa quá tải thông tin dạng văn bản và hình ảnh tĩnh tạo ra điểm sụt giảm tương tác (Engagement Drop) nghiêm trọng nhất trong toàn bộ video.',
    feedback:
      'Mật độ văn bản đạt đỉnh điểm trong bối cảnh hình ảnh không có sự thay đổi. Đây là rủi ro lớn đối với tỷ lệ xem hết (Completion Rate).',
    suggestedFix:
      'Phân tách khối văn bản hiện tại thành 3 lần xuất hiện (animations) độc lập. Thay thế các gạch đầu dòng bằng các biểu tượng trực quan (Visual Icons).',
  },
  {
    start: 16,
    end: 20,
    score: 5.9,
    features: {
      visual_dynamics: 5, visual_dynamic: 5,
      motion_level: 6,
      scene_variation: 5,
      cut_frequency: 4,
      text_density: 7,
      readability: 6,
      visual_focus: 5,
      clutter_level: 5,
      audio_energy: 5,
      pitch_variation: 4,
      speech_rate: 5,
      sync_alignment: 6,
    },
    issues: [
      { type: 'Chuyển cảnh kết thúc (Outro) khá đột ngột', severity: 'Medium' },
      { type: 'Call-to-Action (CTA) thiếu sự nổi bật về mặt thị giác', severity: 'Low' },
    ],
    impact:
      'Phần kết thúc thiếu lực làm giảm khả năng ghi nhớ thông điệp (Brand Recall) và tác động tiêu cực đến Tỷ lệ chuyển đổi (Conversion Rate).',
    feedback:
      'Cường độ âm thanh có dấu hiệu phục hồi nhưng chưa đủ để tạo ra một cái kết bùng nổ. Lời kêu gọi hành động (CTA) bị chìm.',
    suggestedFix:
      'Áp dụng hiệu ứng Zoom-punch 0.5s vào phần CTA. Nâng mức nhạc nền (BGM) thêm +4dB và điều chỉnh EQ giọng nói.',
  },
];


export const OVERALL_SCORE = 6.2;

export const GLOBAL_SUMMARY = {
  headline: 'Hiệu suất duy trì tốt ở phần thân, cần tối ưu Hook và Call-to-Action',
  insight:
    'Video có đà phục hồi tương tác rất tốt ở các phân đoạn giữa, tuy nhiên 3 giây đầu tiên và phần kêu gọi hành động (CTA) cần được tinh chỉnh để tối đa hóa Tỷ lệ giữ chân (Retention) và Chuyển đổi (Conversion).',
  keyIssues: [
    'Thiếu "Hook" thị giác mạnh mẽ ở phần mở đầu - rủi ro Drop-off cao.',
    'Quá tải thông tin văn bản từ giây 12-16, nguy cơ sụt giảm tương tác.',
    'Năng lượng giọng đọc (Voiceover Dynamics) chưa có sự đột phá.',
  ],
};

export const NARRATIVE_TREND = [
  { label: 'Mở đầu (0-4s)', status: 'weak', note: 'Cường độ thấp, cần cải thiện Visual Hook' },
  { label: 'Tăng tốc (4-12s)', status: 'strong', note: 'Nhịp độ tối ưu - Đà giữ chân tốt' },
  { label: 'Rủi ro đỉnh điểm (12-16s)', status: 'weak', note: 'Cảnh báo sụt giảm tương tác (Drop-off Zone)' },
  { label: 'Kết thúc (16-20s)', status: 'neutral', note: 'Đang phục hồi, cần làm nổi bật CTA' },
];

export type TrendStatus = 'weak' | 'neutral' | 'strong';
