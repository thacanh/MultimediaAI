import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bolt, Video, Mic, Sparkles, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { AnalysisContext, AnalysisResponse } from '../types';
import { extractFeaturesStream, getReview, patchReview, StreamEvent } from '../api';

interface ProcessingProps {
  file: File;
  context: AnalysisContext | null;
  onCancel: () => void;
  onComplete: (result: AnalysisResponse) => void;
}

// ─── Stage model ──────────────────────────────────────────────────────────────

type StageStatus = 'pending' | 'active' | 'done' | 'error';

interface Stage {
  id: string;
  label: string;
  detail: string;
  icon: React.ReactNode;
}

const FIXED_STAGES: Stage[] = [
  { id: 'video', label: 'Đọc video', detail: 'Trích xuất audio & metadata', icon: <Video size={16} /> },
  { id: 'review', label: 'AI đánh giá', detail: 'AI phân tích 12 đặc trưng', icon: <Sparkles size={16} /> },
];

// ─── Segment stage card ───────────────────────────────────────────────────────

function SegmentRow({
  index, total, start, end, status,
}: {
  index: number; total: number; start: number; end: number; status: StageStatus;
}) {
  const pct = total > 0 ? Math.round(((index + (status === 'done' ? 1 : 0)) / total) * 100) : 0;
  return (
    <div className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border transition-all duration-300 ${status === 'done' ? 'bg-emerald-50/60 border-emerald-100' :
      status === 'active' ? 'bg-indigo-50/50 border-primary/20' :
        'bg-slate-50 border-slate-100 opacity-40'
      }`}>
      <div className={`w-5 h-5 rounded-full shrink-0 flex items-center justify-center text-[10px] font-black transition-all ${status === 'done' ? 'bg-emerald-500 text-white' :
        status === 'active' ? 'bg-primary text-white' :
          'bg-slate-200 text-slate-400'
        }`}>
        {status === 'done' ? '✓' : index + 1}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-xs font-bold truncate ${status === 'done' ? 'text-emerald-700' : status === 'active' ? 'text-primary' : 'text-slate-400'
          }`}>
          Segment {index + 1}/{total} · {start}s – {end}s
        </p>
      </div>
      {status === 'active' && (
        <Loader2 size={12} className="text-primary animate-spin shrink-0" />
      )}
      {status === 'done' && (
        <CheckCircle2 size={12} className="text-emerald-500 shrink-0" />
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function Processing({ file, context, onCancel, onComplete }: ProcessingProps) {
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Segment tracking
  const [totalSegs, setTotalSegs] = useState<number>(0);
  const [segStatuses, setSegStatuses] = useState<{ start: number; end: number; status: StageStatus }[]>([]);

  // Phase: 'extract' | 'review' | 'done'
  const [phase, setPhase] = useState<'extract' | 'review' | 'done'>('extract');

  const hasStarted = useRef(false);

  // ── Smooth progress helper ────────────────────────────────────────────────
  const targetRef = useRef(0);
  const animFrameRef = useRef<number>(0);

  const setTargetProgress = (target: number) => {
    targetRef.current = target;
    const animate = () => {
      setProgress(prev => {
        const diff = targetRef.current - prev;
        if (Math.abs(diff) < 0.2) return targetRef.current;
        animFrameRef.current = requestAnimationFrame(animate);
        return prev + diff * 0.12;
      });
    };
    cancelAnimationFrame(animFrameRef.current);
    animFrameRef.current = requestAnimationFrame(animate);
  };

  // ── Pipeline ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (hasStarted.current) return;
    hasStarted.current = true;

    const run = async () => {
      try {
        // Phase 1: streaming extraction
        let total = 0;
        const { payload, recordId } = await extractFeaturesStream(file, (event: StreamEvent) => {
          if (event.type === 'video_info') {
            total = event.total_segments ?? 0;
            setTotalSegs(total);
            setSegStatuses(Array(total).fill(null).map(() => ({ start: 0, end: 0, status: 'pending' as StageStatus })));
            setTargetProgress(5);
          }

          if (event.type === 'segment_start' && event.index != null) {
            setSegStatuses(prev => prev.map((s, i) =>
              i === event.index ? { start: event.start ?? 0, end: event.end ?? 0, status: 'active' } : s
            ));
            const pct = 5 + ((event.index) / (total || 1)) * 75;
            setTargetProgress(pct);
          }

          if (event.type === 'segment_done' && event.index != null) {
            setSegStatuses(prev => prev.map((s, i) =>
              i === event.index ? { ...s, status: 'done' } : s
            ));
            const pct = 5 + ((event.index + 1) / (total || 1)) * 75;
            setTargetProgress(pct);
          }
        });

        // Phase 2: VNPT SmartBot review
        setPhase('review');
        setTargetProgress(83);

        const review = await getReview(payload);

        // Lưu review vào DB record đã tạo ở phase 1
        if (recordId != null) {
          patchReview(recordId, review).catch((e) =>
            console.warn('Patch review non-fatal:', e)
          );
        }

        setTargetProgress(100);
        setPhase('done');

        await new Promise(r => setTimeout(r, 600));
        cancelAnimationFrame(animFrameRef.current);
        onComplete({ payload, review });

      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Lỗi không xác định';
        setError(msg);
      }
    };

    run();
    return () => cancelAnimationFrame(animFrameRef.current);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const fileSizeMB = (file.size / (1024 * 1024)).toFixed(1);
  const roundedProgress = Math.round(progress);
  const isDone = phase === 'done';

  const phaseLabel =
    error ? '⚠ Lỗi' :
      isDone ? '✓ Hoàn tất' :
        phase === 'review' ? 'AI đang đánh giá' :
          totalSegs > 0 ? `Đang trích xuất — ${roundedProgress}%` : 'Đang chuẩn bị...';

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.35 }}
      className="max-w-4xl mx-auto space-y-6"
    >
      {/* Header */}
      <header className="space-y-1">
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Đang phân tích video</h1>
        <p className="text-sm text-slate-500 font-medium">
          {file.name} · {fileSizeMB} MB
        </p>
      </header>

      {/* Main card */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-lg p-8 space-y-8">

        {/* Progress ring + label */}
        <div className="flex items-center gap-8">
          {/* Circular progress */}
          <div className="relative w-24 h-24 shrink-0">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 96 96">
              <circle cx="48" cy="48" r="40" stroke="#f1f5f9" strokeWidth="8" fill="none" />
              <motion.circle
                cx="48" cy="48" r="40"
                stroke={error ? '#ef4444' : isDone ? '#10b981' : '#0050cb'}
                strokeWidth="8"
                fill="none"
                strokeLinecap="round"
                strokeDasharray={2 * Math.PI * 40}
                animate={{ strokeDashoffset: 2 * Math.PI * 40 * (1 - progress / 100) }}
                transition={{ duration: 0.3, ease: 'linear' }}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              {error ? (
                <AlertCircle size={24} className="text-red-500" />
              ) : isDone ? (
                <CheckCircle2 size={24} className="text-emerald-500" />
              ) : (
                <span className="text-lg font-black text-primary tabular-nums">{roundedProgress}%</span>
              )}
            </div>
          </div>

          {/* Phase status */}
          <div className="flex-1 space-y-3">
            <AnimatePresence mode="wait">
              <motion.div
                key={phase + String(error)}
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.2 }}
              >
                <p className={`text-sm font-black uppercase tracking-widest ${error ? 'text-red-500' : isDone ? 'text-emerald-600' : 'text-primary'
                  }`}>{phaseLabel}</p>

                <p className="text-xs text-slate-400 font-medium mt-0.5">
                  {error
                    ? 'Kiểm tra backend và API key'
                    : isDone
                      ? 'Đang chuyển đến báo cáo...'
                      : phase === 'review'
                        ? 'AI đang xử lý...'
                        : totalSegs > 0
                          ? `${segStatuses.filter(s => s.status === 'done').length}/${totalSegs} segment hoàn thành`
                          : 'Đang tải video và tách segment...'}
                </p>
              </motion.div>
            </AnimatePresence>

            {/* Linear progress bar */}
            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
              <motion.div
                className={`h-full rounded-full relative overflow-hidden ${error ? 'bg-red-400' : isDone ? 'bg-emerald-400' : 'bg-primary'
                  }`}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3, ease: 'linear' }}
              >
                {/* Shimmer */}
                {!error && !isDone && (
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-[shimmer_1.5s_infinite]" />
                )}
              </motion.div>
            </div>
          </div>
        </div>

        {/* Error box */}
        {error && (
          <div className="flex items-start gap-3 bg-red-50 border border-red-100 rounded-2xl px-5 py-4">
            <AlertCircle size={18} className="text-red-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-red-700">Phân tích thất bại</p>
              <p className="text-xs text-red-600 mt-1 break-all">{error}</p>
              <p className="text-xs text-red-400 mt-2">Đảm bảo Docker đang chạy và VNPT API Credentials đã được thiết lập.</p>
            </div>
          </div>
        )}

        {/* Segment list */}
        {segStatuses.length > 0 && (
          <div className="space-y-2">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tiến độ từng segment</p>
            <div className="space-y-1.5">
              {segStatuses.map((s, i) => (
                <SegmentRow key={i} index={i} total={totalSegs}
                  start={s.start} end={s.end} status={s.status} />
              ))}
            </div>
          </div>
        )}

        {/* Phases */}
        <div className="flex items-center gap-3">
          {[
            { id: 'extract', label: '1. Trích xuất đặc trưng', icon: <Video size={14} /> },
            { id: 'review', label: '2. Đánh giá AI', icon: <Sparkles size={14} /> },
          ].map(({ id, label, icon }) => {
            const isActive = phase === id && !error;
            const isDonePhase =
              (id === 'extract' && (phase === 'review' || phase === 'done')) ||
              (id === 'review' && phase === 'done');
            return (
              <div key={id} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold border transition-all ${isDonePhase ? 'bg-emerald-50 border-emerald-100 text-emerald-700' :
                isActive ? 'bg-indigo-50 border-primary/20 text-primary' :
                  'bg-slate-50 border-slate-100 text-slate-400'
                }`}>
                {isDonePhase ? <CheckCircle2 size={12} /> : isActive ? <Loader2 size={12} className="animate-spin" /> : icon}
                {label}
              </div>
            );
          })}
        </div>

        {/* Context */}
        {context && (
          <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest self-center">Ngữ cảnh:</span>
            {[context.video_type, context.goal, context.audience].filter(Boolean).map((v, i) => (
              <span key={i} className="text-[10px] font-bold px-2.5 py-1 bg-primary/5 text-primary rounded-lg border border-primary/10">
                {v}
              </span>
            ))}
            <span className="ml-auto text-[10px] font-bold flex items-center gap-1 text-primary">
              <Bolt size={10} fill="currentColor" /> AI
            </span>
          </div>
        )}
      </div>

      <div className="flex justify-end">
        <button
          onClick={onCancel}
          className="text-sm font-semibold text-slate-500 border border-slate-200 px-6 py-2.5 rounded-xl hover:bg-slate-50 active:scale-95 transition-all"
        >
          {error ? 'Quay lại' : 'Hủy'}
        </button>
      </div>
    </motion.div>
  );
}
