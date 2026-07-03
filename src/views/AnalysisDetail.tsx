import React from 'react';
import {
  ChevronRight, Play, TrendingDown, CheckCircle2,
  Info, Lightbulb, AlertTriangle, AlertCircle,
  Minus, BarChart2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AnalysisContext, IssueSeverity, SegmentData, AnalysisResponse } from '../types';

interface AnalysisDetailProps {
  context?: AnalysisContext;
  analysisResult: AnalysisResponse;
  videoFile?: File | null;
  videoSrcUrl?: string | null;  // URL MinIO cho bản ghi từ lịch sử
}

// ─── helpers ────────────────────────────────────────────────────────────────

function timeLabel(seg: SegmentData) {
  return `${seg.start}–${seg.end} giây`;
}

function segType(score: number): 'good' | 'warn' | 'poor' {
  if (score >= 7) return 'good';
  if (score >= 5) return 'warn';
  return 'poor';
}

function featureLevel(value: number): 'thấp' | 'trung bình' | 'cao' {
  if (value >= 7) return 'cao';
  if (value >= 4) return 'trung bình';
  return 'thấp';
}

// Map raw feature key → tên tự nhiên hiển thị
const FEATURE_LABEL_MAP: Record<string, string> = {
  // Visual
  visual_dynamics:  'Độ sinh động hình ảnh',
  motion_level:     'Mức độ chuyển động',
  scene_variation:  'Biến đổi cảnh quay',
  cut_frequency:    'Tần suất cắt cảnh',
  visual_focus:     'Tiêu điểm hình ảnh',
  // Text / OCR
  text_density:     'Mật độ chữ trên màn hình',
  readability:      'Độ dễ đọc văn bản',
  clutter_level:    'Mức độ lộn xộn bố cục',
  // Audio
  audio_energy:     'Cường độ âm thanh',
  pitch_variation:  'Biến thiên cao độ giọng',
  speech_rate:      'Tốc độ lời thoại',
  sync_alignment:   'Đồng bộ âm thanh & hình ảnh',
};

function featureLabel(key: string): string {
  return FEATURE_LABEL_MAP[key] ?? key;
}

// 12 đặc trưng đầy đủ từ BE, chia 3 nhóm
const FEATURE_GROUPS = [
  {
    label: 'Visual',
    color: 'text-violet-600',
    bar: 'bg-violet-400',
    bg: 'bg-violet-50',
    border: 'border-violet-100',
    keys: [
      { key: 'visual_dynamics',  label: 'Độ động thị giác' },
      { key: 'motion_level',     label: 'Chuyển động' },
      { key: 'scene_variation',  label: 'Biến đổi cảnh' },
      { key: 'cut_frequency',    label: 'Tần suất cắt' },
      { key: 'visual_focus',     label: 'Tiêu điểm hình ảnh' },
    ],
  },
  {
    label: 'Text / OCR',
    color: 'text-amber-600',
    bar: 'bg-amber-400',
    bg: 'bg-amber-50',
    border: 'border-amber-100',
    keys: [
      { key: 'text_density',  label: 'Tối giản văn bản', inverted: true },
      { key: 'readability',   label: 'Độ dễ đọc' },
      { key: 'clutter_level', label: 'Gọn gàng',         inverted: true },
    ],
  },
  {
    label: 'Audio',
    color: 'text-sky-600',
    bar: 'bg-sky-400',
    bg: 'bg-sky-50',
    border: 'border-sky-100',
    keys: [
      { key: 'audio_energy',    label: 'Năng lượng âm' },
      { key: 'pitch_variation', label: 'Biến điệu âm' },
      { key: 'speech_rate',     label: 'Tốc độ nói' },
      { key: 'sync_alignment',  label: 'Đồng bộ A/V' },
    ],
  },
];

// ─── sub-components ──────────────────────────────────────────────────────────

function SeverityBadge({ severity }: { severity: IssueSeverity }) {
  const labels: Record<IssueSeverity, string> = {
    High: 'Cao',
    Medium: 'Trung bình',
    Low: 'Thấp',
  };
  const cfg = {
    High: 'bg-red-50 text-red-600 border-red-200',
    Medium: 'bg-amber-50 text-amber-600 border-amber-200',
    Low: 'bg-slate-50 text-slate-500 border-slate-200',
  }[severity];
  return (
    <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md border ${cfg}`}>
      {labels[severity]}
    </span>
  );
}

function SeverityIcon({ severity }: { severity: IssueSeverity }) {
  if (severity === 'High') return <AlertCircle size={15} className="text-red-400 shrink-0" />;
  if (severity === 'Medium') return <AlertTriangle size={15} className="text-amber-400 shrink-0" />;
  return <Minus size={15} className="text-slate-300 shrink-0" />;
}

function LevelTag({ level }: { level: 'thấp' | 'trung bình' | 'cao' }) {
  const variants = {
    thấp: 'text-red-500 bg-red-50',
    'trung bình': 'text-amber-500 bg-amber-50',
    cao: 'text-emerald-600 bg-emerald-50',
  } as const;
  return (
    <span className={`text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded ${variants[level]}`}>
      {level}
    </span>
  );
}

function ContextBadge({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-1.5 bg-primary/5 px-3 py-1.5 rounded-lg border border-primary/10">
      <span className="text-[10px] font-black text-primary/60 uppercase tracking-widest">{label}:</span>
      <span className="text-xs font-bold text-primary">{value}</span>
    </div>
  );
}

// Global score ring
function ScoreRing({ score }: { score: number }) {
  const r = 58;
  const circ = 2 * Math.PI * r;
  return (
    <div className="relative w-32 h-32 flex items-center justify-center">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 128 128">
        <circle cx="64" cy="64" r={r} stroke="#f1f5f9" strokeWidth="8" fill="transparent" />
        <motion.circle
          cx="64" cy="64" r={r}
          stroke="currentColor"
          strokeWidth="10"
          fill="transparent"
          strokeLinecap="round"
          strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: circ * (1 - score / 10) }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
          className="text-primary"
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-4xl font-black text-slate-900 tracking-tighter">{score}</span>
        <span className="text-[10px] font-black text-slate-400 tracking-widest -mt-1">/ 10</span>
      </div>
    </div>
  );
}

// Segment thumbnail card in the timeline strip
function SegmentThumb({
  seg,
  index,
  active,
  onClick,
}: {
  seg: SegmentData;
  index: number;
  active: boolean;
  onClick: () => void;
}) {
  const type = segType(seg.score);
  const isPoor = type === 'poor';

  return (
    <button
      key={index}
      onClick={onClick}
      className={`flex-shrink-0 w-36 h-20 rounded-2xl relative transition-all p-3 flex flex-col justify-between border-2 text-left ${
        active
          ? 'ring-2 ring-primary ring-offset-2 border-primary shadow-lg bg-slate-50'
          : isPoor
            ? 'border-red-200 bg-red-50/30 shadow-[0_0_12px_rgba(239,68,68,0.15)] hover:border-red-300'
            : 'border-slate-50 hover:border-slate-200 bg-white'
      }`}
    >
      <div className="flex justify-between items-center w-full">
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">
          {timeLabel(seg)}
        </span>
        <div className={`w-1.5 h-1.5 rounded-full ${
          type === 'good' ? 'bg-emerald-500' : type === 'warn' ? 'bg-amber-500' : 'bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.6)]'
        }`} />
      </div>
      <div className="space-y-1.5">
        <div className="flex justify-between items-center text-[10px] font-black">
          <span className={type === 'poor' ? 'text-red-600' : type === 'warn' ? 'text-amber-600' : 'text-slate-900'}>
            {seg.score}
          </span>
          <span className="text-slate-300 uppercase tracking-tighter">Điểm</span>
        </div>
        <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full ${
              type === 'good' ? 'bg-emerald-500' : type === 'warn' ? 'bg-amber-500' : 'bg-red-500'
            }`}
            style={{ width: `${seg.score * 10}%` }}
          />
        </div>
      </div>
    </button>
  );
}

// ─── Real data adapters ───────────────────────────────────────────────────────

function adaptSegments(result: AnalysisResponse): SegmentData[] {
  const review = result.review;
  const segReviews = review?.segment_reviews ?? [];
  return result.payload.segments.map((seg) => {
    const segReview = segReviews.find((r: any) => r.segment_index === seg.segment_index);
    return {
      start: Math.round(seg.start_sec),
      end: Math.round(seg.end_sec),
      score: Math.round(seg.derived.overall_quality_score * 10) / 10,
      features: { ...seg.features },
      derived: seg.derived,
      issues: (review?.key_issues ?? []).slice(0, 3).map((ki: any) => ({
        type: ki.feature,
        severity: ki.severity,
        description: ki.description,
        recommendation: ki.recommendation,
      })),
      impact: segReview?.impact || (seg.derived.retention_risk_score > 6 ? 'Nguy cơ rời bỏ cao' : 'Khá ổn định'),
      feedback: segReview?.feedback || review?.insight || '',
      suggestedFix: segReview?.suggested_fix || review?.suggested_fixes?.[0] || '',
    };
  });
}

// ─── main component ───────────────────────────────────────────────────────────

export default function AnalysisDetail({ context, analysisResult, videoFile, videoSrcUrl }: AnalysisDetailProps) {
  const review = (analysisResult as any).review ?? null;
  const segments: SegmentData[] = adaptSegments(analysisResult);
  // overall_quality_score từ computation của chúng ta (nhất quán với 4 derived scores)
  const overallScore = Math.round(
    (analysisResult.payload.global_derived.overall_quality_score ?? 0) * 10
  ) / 10;
  // VNPT Bot score hiển riêng làm tham khảo
  const botScore = review ? Math.round((review.overall_score ?? 0) * 10) / 10 : null;
  const summary = {
    headline: review?.headline ?? 'Chưa có nhận xét AI',
    insight: review?.insight ?? 'Bản ghi này chưa có phân tích VNPT Bot.',
    keyIssues: (review?.key_issues ?? []).map(
      (ki: any) => `${featureLabel(ki.feature)}: ${ki.description}`,
    ),
  };
  const grade = review?.grade ?? '—';
  const filename = analysisResult.payload.filename;
  const durationSec = analysisResult.payload.duration_sec;
  const durationLabel = `${Math.floor(durationSec / 60)}:${String(Math.floor(durationSec % 60)).padStart(2, '0')}`;

  // videoRef để seek khi click segment
  const videoRef = React.useRef<HTMLVideoElement>(null);

  // URL video: ưu tiên videoSrcUrl (MinIO/history) > file upload local
  const fileUrl = React.useMemo(
    () => (videoFile ? URL.createObjectURL(videoFile) : null),
    [videoFile],
  );
  React.useEffect(() => () => { if (fileUrl) URL.revokeObjectURL(fileUrl); }, [fileUrl]);
  const videoUrl = videoSrcUrl ?? fileUrl;

  // Default-select the most problematic segment
  const defaultIndex = React.useMemo(() => {
    const idx = segments.reduce(
      (worst, s, i) => (s.score < segments[worst].score ? i : worst),
      0,
    );
    return idx;
  }, [segments]);

  const [activeIndex, setActiveIndex] = React.useState(defaultIndex);

  // Seek video tới đầu segment khi click
  const handleSegmentClick = (idx: number) => {
    setActiveIndex(idx);
    const startSec = segments[idx]?.start ?? 0;
    if (videoRef.current) {
      videoRef.current.currentTime = startSec;
      videoRef.current.play().catch(() => {}); // auto-play sau khi seek
    }
  };

  const seg = segments[activeIndex];
  const type = segType(seg.score);
  const activeSegPayload = analysisResult.payload.segments[activeIndex];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="max-w-7xl mx-auto space-y-6 pb-20"
    >
      {/* ── HEADER ── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm">
        <div className="space-y-4">
          <nav className="flex items-center gap-2 text-slate-400 text-sm font-bold">
            <button className="hover:text-primary transition-colors">Dự án</button>
            <ChevronRight size={14} />
            <span className="text-slate-900">{filename}</span>
          </nav>
          <div className="space-y-3">
            <h1 className="text-3xl font-black text-slate-900 tracking-tighter">Phân tích video</h1>
            {context && (
              <div className="flex flex-wrap items-center gap-2">
                {context.video_type && <ContextBadge label="Loại" value={context.video_type} />}
                {context.goal && <ContextBadge label="Mục tiêu" value={context.goal} />}
                {context.audience && <ContextBadge label="Khán giả" value={context.audience} />}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-6 divide-x divide-slate-100 bg-slate-50 px-6 py-4 rounded-2xl border border-slate-100">
          <div className="text-center px-4">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Điểm TB</p>
            <p className="text-2xl font-black text-primary tabular-nums">{overallScore}</p>
          </div>
          <div className="text-center px-4">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Thời lượng</p>
            <p className="text-lg font-black text-slate-900 tabular-nums">{durationLabel}</p>
          </div>
          <div className="text-center px-4">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Phân đoạn</p>
            <p className="text-lg font-black text-slate-900 tabular-nums">{segments.length}</p>
          </div>
        </div>
      </div>

      {/* ── GLOBAL SUMMARY ── */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: summary text */}
        <div className="lg:col-span-2 bg-white rounded-[40px] p-10 border border-slate-100 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl opacity-50" />
          <div className="relative z-10 space-y-6">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tổng quan</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-3">
                <h4 className="text-2xl font-bold tracking-tight text-slate-900">{summary.headline}</h4>
                <p className="text-slate-500 text-sm leading-relaxed font-medium">{summary.insight}</p>
              </div>
              <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Vấn đề chính</p>
                <ul className="space-y-3">
                  {summary.keyIssues.map((issue, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm font-semibold text-slate-700">
                      <div className="w-1.5 h-1.5 rounded-full bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.4)] mt-1.5 shrink-0" />
                      {issue}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Right: score ring */}
        <div className="bg-white rounded-[40px] p-10 border border-slate-100 shadow-sm flex flex-col justify-center items-center text-center space-y-4">
          <ScoreRing score={overallScore} />
          <div className="space-y-1 text-center">
            <p className="font-bold text-slate-900">Chất lượng tổng thể</p>
            <p className="text-xs font-bold text-amber-500 uppercase tracking-widest">Hạng {grade}</p>
            {botScore !== null && (
              <p className="text-[10px] text-slate-400 font-semibold">AI đánh giá: {botScore}/10</p>
            )}
          </div>
        </div>
      </section>

      {/* ── VNPT SMART ANALYTICS & SUMMARY ── */}
      <section>
        {/* Speech Summary by VNPT SmartVoice */}
        <div className="bg-white rounded-[40px] p-10 border border-slate-100 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl opacity-50" />
          <div className="relative z-10 space-y-4">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">VNPT SmartVoice</span>
              <span className="text-[9px] bg-emerald-50 text-emerald-600 font-bold px-2 py-0.5 rounded-full uppercase">Tóm tắt đàm thoại</span>
            </div>
            <h4 className="text-xl font-bold text-slate-900">Tóm tắt nội dung lời thoại video</h4>
            <p className="text-slate-600 text-sm leading-relaxed font-medium bg-slate-50 p-5 rounded-2xl border border-slate-100 whitespace-pre-line">
              {analysisResult.payload.summary || "Không phát hiện lời thoại hoặc chưa có tóm tắt đàm thoại."}
            </p>
          </div>
        </div>
      </section>



      {/* ── VIDEO + TIMELINE ── */}
      <section className="bg-white rounded-[40px] p-2 border border-slate-100 shadow-xl overflow-hidden">
        <div className="relative aspect-video rounded-[36px] bg-slate-900 overflow-hidden">
          {videoUrl ? (
            <video
              ref={videoRef}
              src={videoUrl}
              controls
              className="w-full h-full object-contain"
              preload="metadata"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center gap-3 text-slate-500">
              <Play size={40} className="opacity-30" />
              <p className="text-sm font-medium opacity-50">Không có video preview</p>
            </div>
          )}
        </div>

        {/* Segment strip */}
        <div className="p-4 bg-white overflow-x-auto scrollbar-hide">
          <div className="flex gap-2 min-w-max">
            {segments.map((s, idx) => (
              <SegmentThumb
                key={idx}
                seg={s}
                index={idx}
                active={idx === activeIndex}
                onClick={() => handleSegmentClick(idx)}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ── WHY THIS SCORE? + DETAIL PANEL ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left sticky: score + feature breakdown */}
        <div className="lg:col-span-4 lg:sticky lg:top-8 h-fit">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeIndex}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 8 }}
              transition={{ duration: 0.25 }}
              className="bg-white rounded-[40px] p-10 border border-slate-100 shadow-sm space-y-8"
            >
              {/* A. Score */}
              <div className="space-y-2">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Điểm phân đoạn</h3>
                <div className="flex items-baseline gap-4">
                  <span className={`text-6xl font-black tracking-tighter ${
                    type === 'good' ? 'text-emerald-600' : type === 'warn' ? 'text-amber-600' : 'text-red-600'
                  }`}>
                    {seg.score}
                  </span>
                  <span className={`text-xs font-black uppercase tracking-widest px-3 py-1 rounded-lg ${
                    type === 'good' ? 'bg-emerald-50 text-emerald-600' : type === 'warn' ? 'bg-amber-50 text-amber-600' : 'bg-red-50 text-red-600'
                  }`}>
                    {timeLabel(seg)}
                  </span>
                </div>
              </div>

              {/* B. Feature breakdown — 12 đặc trưng, chia 3 nhóm */}
              <div className="space-y-5">
                <h4 className="text-[10px] font-black text-primary uppercase tracking-widest border-b border-slate-50 pb-2">
                  Phân tích 12 đặc trưng
                </h4>
                {FEATURE_GROUPS.map((group) => (
                  <div key={group.label} className={`rounded-2xl border p-4 space-y-3 ${group.bg} ${group.border}`}>
                    <p className={`text-[9px] font-black uppercase tracking-widest ${group.color}`}>{group.label}</p>
                    {group.keys.map(({ key, label, inverted }) => {
                      const raw = (seg.features as any)[key] as number | null | undefined;
                      if (raw === null || raw === undefined) {
                        // N/A
                        return (
                          <div key={key} className="flex items-center gap-2">
                            <div className="w-20 text-[9px] font-bold text-slate-500 uppercase tracking-tight truncate shrink-0">{label}</div>
                            <div className="flex-1 h-1.5 bg-white/70 rounded-full" />
                            <div className="text-[10px] font-black text-slate-400 tabular-nums w-5 text-right shrink-0">—</div>
                            <span className="text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded text-slate-400 bg-slate-100">N/A</span>
                          </div>
                        );
                      }
                      // inverted: điểm thấp = tốt → hiển thị 10 - raw
                      const displayVal = inverted ? Math.round((10 - raw) * 10) / 10 : raw;
                      const level = featureLevel(displayVal);
                      return (
                        <div key={key} className="flex items-center gap-2">
                          <div className="w-20 text-[9px] font-bold text-slate-500 uppercase tracking-tight truncate shrink-0">
                            {label}
                          </div>
                          <div className="flex-1 h-1.5 bg-white/70 rounded-full overflow-hidden">
                            <motion.div
                              key={`${activeIndex}-${key}`}
                              initial={{ width: 0 }}
                              animate={{ width: `${displayVal * 10}%` }}
                              transition={{ duration: 0.5, ease: 'easeOut', delay: 0.05 }}
                              className={`h-full rounded-full ${group.bar}`}
                            />
                          </div>
                          <div className="text-[10px] font-black text-slate-800 tabular-nums w-5 text-right shrink-0">{Number(displayVal).toFixed(1)}</div>
                          <LevelTag level={level} />
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>

              {/* Export */}
              <div className="pt-2">
                <button className="w-full flex items-center justify-center gap-2 py-3 bg-slate-50 hover:bg-slate-100 rounded-2xl text-xs font-bold text-slate-600 transition-all active:scale-[0.98]">
                  Xuất báo cáo phân đoạn
                </button>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Right: issues + impact + fix */}
        <div className="lg:col-span-8 space-y-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeIndex}
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.25 }}
              className="bg-white rounded-[40px] p-10 border border-slate-100 shadow-sm space-y-10"
            >
              {/* C. Issues with severity */}
              <div className="space-y-5">
                <div className="flex items-center gap-3">
                  <div className="bg-red-50 p-2 rounded-xl">
                    <TrendingDown size={18} className="text-red-500" />
                  </div>
                  <h4 className="text-sm font-black uppercase tracking-widest text-slate-400">Vấn đề</h4>
                </div>

                {seg.issues.length > 0 ? (
                  <div className="space-y-3">
                    {seg.issues.map((issue, i) => (
                      <div
                        key={i}
                        className="flex items-start gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:border-slate-200 transition-colors"
                      >
                        <SeverityIcon severity={issue.severity} />
                        <span className="text-sm font-semibold text-slate-700 leading-relaxed flex-1">
                          {featureLabel(issue.type)}
                        </span>
                        <SeverityBadge severity={issue.severity} />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex gap-3 p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                    <CheckCircle2 size={18} className="text-emerald-500 shrink-0 mt-0.5" />
                    <span className="text-sm font-bold text-emerald-700">Phân đoạn ổn, không có vấn đề.</span>
                  </div>
                )}
              </div>

              {/* D. Impact */}
              <div className="space-y-5">
                <div className="flex items-center gap-3">
                  <div className="bg-primary/5 p-2 rounded-xl">
                    <Info size={18} className="text-primary" />
                  </div>
                  <h4 className="text-sm font-black uppercase tracking-widest text-slate-400">Tác động</h4>
                </div>
                <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100">
                  <p className="text-sm text-slate-700 font-medium leading-relaxed">{seg.impact}</p>
                </div>
              </div>


              {/* E. Suggested Fix */}
              <div className="pt-4 border-t border-slate-50">
                <div className="bg-primary/5 rounded-3xl p-8 border border-primary/10 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-8 translate-x-1/2 -translate-y-1/2">
                    <div className="w-32 h-32 bg-primary/10 rounded-full blur-3xl group-hover:bg-primary/20 transition-all duration-700" />
                  </div>
                  <div className="relative z-10 flex items-start gap-5">
                    <div className="bg-primary/10 p-3 rounded-2xl shrink-0">
                      <Lightbulb size={20} className="text-primary" />
                    </div>
                    <div className="space-y-2">
                      <h4 className="text-[10px] font-black text-primary uppercase tracking-widest">Gợi ý AI</h4>
                      <p className="text-lg font-bold text-slate-900 leading-relaxed">{seg.suggestedFix}</p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Segment highlights từ VNPT SmartBot */}
          {(review?.segment_highlights?.length ?? 0) > 0 && (
            <div className="bg-white rounded-[40px] p-8 border border-slate-100 shadow-sm space-y-4">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Điểm nổi bật theo phân đoạn (AI)</p>
              <ul className="space-y-2">
                {review.segment_highlights.map((h: string, i: number) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-slate-700 font-medium">
                    <span className="text-primary font-black shrink-0">{i + 1}.</span>
                    {h}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
