import React from 'react';
import {
  ChevronRight, Play, TrendingDown, CheckCircle2,
  Info, Lightbulb, AlertTriangle, AlertCircle,
  Minus,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AnalysisContext, IssueSeverity, SegmentData } from '../types';
import {
  MOCK_SEGMENTS,
  OVERALL_SCORE,
  GLOBAL_SUMMARY,
  NARRATIVE_TREND,
  TrendStatus,
} from '../mockData';

interface AnalysisDetailProps {
  context?: AnalysisContext;
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

const FEATURE_LABELS: Record<keyof SegmentData['features'], string> = {
  visual_dynamic: 'Độ động thị giác',
  motion_level: 'Mức độ chuyển động',
  text_density: 'Mật độ văn bản',
  audio_energy: 'Năng lượng âm thanh',
};

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

// ─── main component ───────────────────────────────────────────────────────────

export default function AnalysisDetail({ context }: AnalysisDetailProps) {
  // Default-select the most problematic segment
  const defaultIndex = React.useMemo(() => {
    const idx = MOCK_SEGMENTS.reduce(
      (worst, s, i) => (s.score < MOCK_SEGMENTS[worst].score ? i : worst),
      0,
    );
    return idx;
  }, []);

  const [activeIndex, setActiveIndex] = React.useState(defaultIndex);
  const seg = MOCK_SEGMENTS[activeIndex];
  const type = segType(seg.score);

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
            <span className="text-slate-900">Campaign_Promo_v2.mp4</span>
          </nav>
          <div className="space-y-3">
            <h1 className="text-4xl font-black text-slate-900 tracking-tighter">Báo cáo phân tích video</h1>
            {/* Context badges */}
            {context && (
              <div className="flex flex-wrap items-center gap-2">
                <ContextBadge label="Loại" value={context.video_type} />
                <ContextBadge label="Mục tiêu" value={context.goal} />
                {context.audience && <ContextBadge label="Khán giả" value={context.audience} />}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-6 divide-x divide-slate-100 bg-slate-50 px-6 py-4 rounded-2xl border border-slate-100">
          <div className="text-center px-4">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Điểm TB</p>
            <p className="text-2xl font-black text-primary tabular-nums">{OVERALL_SCORE}</p>
          </div>
          <div className="text-center px-4">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Thời lượng</p>
            <p className="text-lg font-black text-slate-900 tabular-nums">0:20</p>
          </div>
          <div className="text-center px-4">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Phân đoạn</p>
            <p className="text-lg font-black text-slate-900 tabular-nums">{MOCK_SEGMENTS.length}</p>
          </div>
        </div>
      </div>

      {/* ── GLOBAL SUMMARY ── */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: summary text */}
        <div className="lg:col-span-2 bg-white rounded-[40px] p-10 border border-slate-100 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl opacity-50" />
          <div className="relative z-10 space-y-6">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tóm tắt tổng quát</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-3">
                <h4 className="text-2xl font-bold tracking-tight text-slate-900">{GLOBAL_SUMMARY.headline}</h4>
                <p className="text-slate-500 text-sm leading-relaxed font-medium">{GLOBAL_SUMMARY.insight}</p>
              </div>
              <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Các vấn đề chính</p>
                <ul className="space-y-3">
                  {GLOBAL_SUMMARY.keyIssues.map((issue, i) => (
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
          <ScoreRing score={OVERALL_SCORE} />
          <div className="space-y-1">
            <p className="font-bold text-slate-900">Điểm chất lượng</p>
            <p className="text-xs font-bold text-amber-500 uppercase tracking-widest">Hạng B - Cần cải thiện</p>
          </div>
        </div>
      </section>

      {/* ── NARRATIVE TREND ── */}
      <section className="bg-white rounded-[40px] p-8 border border-slate-100 shadow-sm">
        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-5">Biểu đồ sự gắn kết theo thời gian</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {NARRATIVE_TREND.map((point, i) => {
            const clr: Record<TrendStatus, string> = {
              weak: 'border-red-200 bg-red-50/40',
              neutral: 'border-amber-200 bg-amber-50/40',
              strong: 'border-emerald-200 bg-emerald-50/40',
            };
            const dot: Record<TrendStatus, string> = {
              weak: 'bg-red-500',
              neutral: 'bg-amber-400',
              strong: 'bg-emerald-500',
            };
            return (
              <div key={i} className={`rounded-2xl border p-4 space-y-2 ${clr[point.status as TrendStatus]}`}>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${dot[point.status as TrendStatus]}`} />
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{point.label}</span>
                </div>
                <p className="text-xs font-semibold text-slate-700">{point.note}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── VIDEO + TIMELINE ── */}
      <section className="bg-white rounded-[40px] p-2 border border-slate-100 shadow-xl overflow-hidden group">
        <div className="relative aspect-video rounded-[36px] bg-slate-900 overflow-hidden cursor-pointer">
          <img
            src="https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=1600"
            alt="Video Preview"
            className="w-full h-full object-cover opacity-80"
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-20 h-20 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center text-white border border-white/20 group-hover:bg-primary transition-all duration-500 group-hover:scale-110 shadow-2xl">
              <Play size={32} fill="currentColor" className="ml-1" />
            </div>
          </div>
        </div>

        {/* Segment strip */}
        <div className="p-4 bg-white overflow-x-auto scrollbar-hide">
          <div className="flex gap-2 min-w-max">
            {MOCK_SEGMENTS.map((s, idx) => (
              <SegmentThumb
                key={idx}
                seg={s}
                index={idx}
                active={idx === activeIndex}
                onClick={() => setActiveIndex(idx)}
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
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tại sao điểm này?</h3>
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

              {/* B. Feature breakdown */}
              <div className="space-y-4">
                <h4 className="text-[10px] font-black text-primary uppercase tracking-widest border-b border-slate-50 pb-2">
                  Phân tích thành phần
                </h4>
                <div className="space-y-4">
                  {(Object.keys(FEATURE_LABELS) as Array<keyof typeof FEATURE_LABELS>).map((key) => {
                    const val = seg.features[key];
                    const level = featureLevel(val);
                    return (
                      <div key={key} className="flex items-center gap-3">
                        <div className="w-24 text-[10px] font-bold text-slate-500 uppercase tracking-tight truncate shrink-0">
                          {FEATURE_LABELS[key]}
                        </div>
                        <div className="flex-1 h-1.5 bg-slate-50 rounded-full overflow-hidden">
                          <motion.div
                            key={`${activeIndex}-${key}`}
                            initial={{ width: 0 }}
                            animate={{ width: `${val * 10}%` }}
                            transition={{ duration: 0.5, ease: 'easeOut' }}
                            className={`h-full rounded-full ${
                              level === 'cao' ? 'bg-emerald-400' : level === 'trung bình' ? 'bg-amber-400' : 'bg-red-400'
                            }`}
                          />
                        </div>
                        <div className="text-[11px] font-black text-slate-900 tabular-nums w-4 text-right">{val}</div>
                        <LevelTag level={level} />
                      </div>
                    );
                  })}
                </div>
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
                  <h4 className="text-sm font-black uppercase tracking-widest text-slate-400">Các lỗi đã phát hiện</h4>
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
                          {issue.type}
                        </span>
                        <SeverityBadge severity={issue.severity} />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex gap-3 p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                    <CheckCircle2 size={18} className="text-emerald-500 shrink-0 mt-0.5" />
                    <span className="text-sm font-bold text-emerald-700">Không phát hiện vấn đề nghiêm trọng trong phân đoạn này.</span>
                  </div>
                )}
              </div>

              {/* D. Impact */}
              <div className="space-y-5">
                <div className="flex items-center gap-3">
                  <div className="bg-primary/5 p-2 rounded-xl">
                    <Info size={18} className="text-primary" />
                  </div>
                  <h4 className="text-sm font-black uppercase tracking-widest text-slate-400">Tác động đến người xem</h4>
                </div>
                <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100">
                  <p className="text-sm text-slate-700 font-medium leading-relaxed">{seg.impact}</p>
                  <div className="mt-4 pt-4 border-t border-slate-200/60">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Lý giải từ AI</p>
                    <p className="text-sm font-semibold text-slate-600 italic leading-relaxed">"{seg.feedback}"</p>
                  </div>
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
                      <h4 className="text-[10px] font-black text-primary uppercase tracking-widest">Đề xuất chỉnh sửa từ AI</h4>
                      <p className="text-lg font-bold text-slate-900 leading-relaxed">{seg.suggestedFix}</p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Mini stats */}
          <div className="grid grid-cols-2 gap-6">
            <div className="bg-white rounded-[40px] p-8 border border-slate-100 shadow-sm">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Độ mượt cắt dựng</p>
              <p className="text-2xl font-black text-slate-900 tracking-tighter">88%</p>
              <p className="text-xs text-slate-400 font-medium mt-1">Trên mức trung bình ngành</p>
            </div>
            <div className="bg-white rounded-[40px] p-8 border border-slate-100 shadow-sm">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">So với các video tương tự</p>
              <p className="text-2xl font-black text-slate-900 tracking-tighter">+12%</p>
              <p className="text-xs text-slate-400 font-medium mt-1">Chất lượng hình ảnh tốt hơn</p>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
