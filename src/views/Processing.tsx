import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, Edit2, Bolt, Settings, Video, Mic, Timer, Sparkles } from 'lucide-react';
import { AnalysisContext } from '../types';

interface ProcessingProps {
  onCancel: () => void;
  onComplete: () => void;
  context: AnalysisContext | null;
}

// ---------- Stage definitions ----------
interface Stage {
  id: number;
  label: string;
  duration: number; // ms
  icon: React.ReactNode;
}

const STAGES: Stage[] = [
  { id: 0, label: 'Đang chuẩn bị video...', duration: 2000, icon: <Settings size={24} /> },
  { id: 1, label: 'Đang phân tích hình ảnh...', duration: 1333, icon: <Video size={24} /> },
  { id: 2, label: 'Đang đánh giá âm thanh...', duration: 1333, icon: <Mic size={24} /> },
  { id: 3, label: 'Đang phát hiện vấn đề về nhịp độ...', duration: 1333, icon: <Timer size={24} /> },
  { id: 4, label: 'Đang tạo báo cáo phân tích...', duration: 2000, icon: <Sparkles size={24} /> },
];

const TOTAL_DURATION = STAGES.reduce((s, st) => s + st.duration, 0); // 8000 ms

export default function Processing({ onCancel, onComplete, context }: ProcessingProps) {
  const [elapsed, setElapsed] = useState(0);
  const [stageIndex, setStageIndex] = useState(0);
  const [done, setDone] = useState(false);
  const startRef = useRef(Date.now());
  const frameRef = useRef<number | null>(null);

  // Animate progress from 0 → 100 over TOTAL_DURATION
  useEffect(() => {
    const tick = () => {
      const now = Date.now();
      const ms = now - startRef.current;
      if (ms >= TOTAL_DURATION) {
        setElapsed(TOTAL_DURATION);
        setDone(true);
        return;
      }
      setElapsed(ms);

      // Determine which stage we're in
      let acc = 0;
      for (let i = 0; i < STAGES.length; i++) {
        acc += STAGES[i].duration;
        if (ms < acc) {
          setStageIndex(i);
          break;
        }
      }
      frameRef.current = requestAnimationFrame(tick);
    };

    frameRef.current = requestAnimationFrame(tick);
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, []);

  // Auto-transition to result when done
  useEffect(() => {
    if (done) {
      const t = setTimeout(onComplete, 600);
      return () => clearTimeout(t);
    }
  }, [done, onComplete]);

  const progress = Math.min((elapsed / TOTAL_DURATION) * 100, 100);
  const currentStage = STAGES[stageIndex];

  // Which stages are fully completed (not just current)
  const isStageCompleted = (idx: number) => {
    let acc = 0;
    for (let i = 0; i <= idx; i++) acc += STAGES[i].duration;
    return elapsed >= acc;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.35 }}
      className="max-w-7xl mx-auto space-y-8"
    >
      <header>
        <h1 className="text-4xl font-bold text-on-surface tracking-tight">Đang phân tích video</h1>
        <p className="text-lg text-on-surface-variant mt-2">
          AI của chúng tôi đang thực hiện phân tích đa giai đoạn trên video của bạn.
        </p>
      </header>

      <div className="grid gap-6 grid-cols-1 xl:grid-cols-3">
        {/* Left: file info */}
        <div className="xl:col-span-1 space-y-6">
          <div className="bg-white rounded-xl shadow-card border border-slate-200 p-4 overflow-hidden">
            <div className="relative aspect-video rounded-lg overflow-hidden">
              <img
                src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=800"
                alt="Video thumbnail"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent flex items-end p-4">
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-bold text-white truncate">Campaign_Promo_v2.mp4</h3>
                  <p className="text-sm text-white/80 mt-1">12 MB • 0:20</p>
                </div>
                <button className="bg-white/20 backdrop-blur-md p-2 rounded-lg text-white hover:bg-white/30 transition-colors ml-4">
                  <Edit2 size={18} />
                </button>
              </div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white">
                  <Play size={24} fill="currentColor" />
                </div>
              </div>
            </div>
          </div>

          {/* Analysis context */}
          {context && (
            <div className="bg-white rounded-xl shadow-card border border-slate-200 p-6 space-y-4">
              <h4 className="text-sm font-bold text-on-surface flex items-center gap-2">
                <Bolt size={14} className="text-primary" fill="currentColor" />
                Thiết lập phân tích
              </h4>
              <SettingItem label="Loại video" value={context.video_type} />
              <SettingItem label="Mục tiêu" value={context.goal} />
              {context.audience && (
                <SettingItem label="Khán giả" value={context.audience} />
              )}
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-on-surface-variant">AI Engine</span>
                <span className="text-sm text-primary font-bold flex items-center gap-1.5">
                  <Bolt size={14} fill="currentColor" /> CreativeIQ Pro
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Right: AI status */}
        <div className="xl:col-span-2 bg-white rounded-xl shadow-card border border-slate-200 p-8 flex flex-col gap-8">
          {/* Header row */}
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-on-surface">Tiến trình AI</h2>
            <div className={`text-xs font-semibold px-3 py-1.5 rounded-full flex items-center gap-2 border transition-all ${
              done
                ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                : 'bg-indigo-50 text-primary border-indigo-100'
            }`}>
              {done ? (
                <>✓ Hoàn tất</>
              ) : (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                  Đang xử lý
                </>
              )}
            </div>
          </div>

          {/* Progress bar */}
          <div>
            <div className="flex justify-between items-end mb-3">
              <span className="text-sm text-on-surface font-semibold">Tiến độ tổng thể</span>
              <span className="font-mono-data text-primary font-bold text-xl tabular-nums">
                {Math.round(progress)}%
              </span>
            </div>
            <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
              <motion.div
                animate={{ width: `${progress}%` }}
                transition={{ ease: 'linear', duration: 0.1 }}
                className="h-full bg-primary rounded-full shadow-[0_0_8px_rgba(0,80,203,0.35)]"
              />
            </div>
          </div>

          {/* Current stage message */}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStage.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.25 }}
              className="flex items-center gap-4 bg-indigo-50/40 border border-indigo-100 rounded-2xl px-6 py-4"
            >
              <span className="text-primary">{currentStage.icon}</span>
              <div>
                <p className="text-sm font-bold text-primary">{currentStage.label}</p>
                <p className="text-xs text-on-surface-variant mt-0.5">
                  Giai đoạn {stageIndex + 1} của {STAGES.length}
                </p>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Stage checklist */}
          <div className="flex flex-col gap-3">
            {STAGES.map((stage, idx) => {
              const completed = isStageCompleted(idx);
              const active = idx === stageIndex && !done;
              return (
                <div
                  key={stage.id}
                  className={`flex items-center gap-4 px-5 py-3.5 rounded-xl border transition-all duration-300 ${
                    completed
                      ? 'bg-white border-slate-200 border-l-2 border-l-primary'
                      : active
                        ? 'bg-indigo-50/30 border-primary/30'
                        : 'bg-white border-slate-100 opacity-50'
                  }`}
                >
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-xs font-bold transition-all ${
                    completed
                      ? 'bg-primary text-white'
                      : active
                        ? 'bg-white border-2 border-primary text-primary'
                        : 'bg-slate-100 text-slate-400'
                  }`}>
                    {completed ? '✓' : idx + 1}
                  </div>
                  <span className={`text-sm font-semibold ${
                    completed ? 'text-on-surface' : active ? 'text-primary' : 'text-slate-400'
                  }`}>
                    {stage.label}
                  </span>
                  {active && (
                    <div className="ml-auto flex gap-1">
                      {[0, 1, 2].map(i => (
                        <span
                          key={i}
                          className="w-1 h-1 rounded-full bg-primary animate-bounce"
                          style={{ animationDelay: `${i * 0.15}s` }}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-auto flex justify-end">
            <button
              onClick={onCancel}
              className="text-on-surface font-medium border border-slate-200 px-8 py-3 rounded-xl hover:bg-slate-50 transition-colors shadow-sm active:scale-95 text-sm"
            >
              Hủy
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function SettingItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center border-b border-slate-100 pb-3">
      <span className="text-sm text-on-surface-variant font-medium">{label}</span>
      <span className="text-sm text-on-surface font-semibold">{value}</span>
    </div>
  );
}
