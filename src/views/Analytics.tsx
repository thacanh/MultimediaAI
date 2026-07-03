import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { BarChart2, Upload, TrendingUp, Video, Award, Star, Clock, ChevronRight, Loader2, LogIn } from 'lucide-react';
import { AnalyticsSummary, AnalysisRecord } from '../types';
import { getAnalyticsSummary } from '../api';
import { useAuth } from '../context/AuthContext';

interface AnalyticsProps {
  onNewAnalysis?: () => void;
  onOpenRecord?: (record: AnalysisRecord) => void;
  onLoginClick?: () => void;
}

const GRADE_COLOR: Record<string, string> = {
  'S': 'bg-violet-500',
  'A': 'bg-emerald-500',
  'B': 'bg-blue-500',
  'C': 'bg-amber-500',
  'D': 'bg-orange-500',
  'F': 'bg-red-500',
};

const GRADE_TEXT: Record<string, string> = {
  'S': 'text-violet-600',
  'A': 'text-emerald-600',
  'B': 'text-blue-600',
  'C': 'text-amber-600',
  'D': 'text-orange-600',
  'F': 'text-red-600',
};

const GRADE_BG: Record<string, string> = {
  'S': 'bg-violet-50 border-violet-100',
  'A': 'bg-emerald-50 border-emerald-100',
  'B': 'bg-blue-50 border-blue-100',
  'C': 'bg-amber-50 border-amber-100',
  'D': 'bg-orange-50 border-orange-100',
  'F': 'bg-red-50 border-red-100',
};

function ScoreRing({ score }: { score: number }) {
  const pct = Math.min(score / 10, 1);
  const r = 36;
  const circ = 2 * Math.PI * r;
  const dash = circ * pct;

  const color =
    score >= 8 ? '#10b981' :
    score >= 6 ? '#3b82f6' :
    score >= 4 ? '#f59e0b' : '#ef4444';

  return (
    <div className="relative w-24 h-24">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 96 96">
        <circle cx="48" cy="48" r={r} stroke="#f1f5f9" strokeWidth="8" fill="none" />
        <motion.circle
          cx="48" cy="48" r={r}
          stroke={color} strokeWidth="8" fill="none"
          strokeLinecap="round"
          strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: circ - dash }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span
          className="text-2xl font-black tabular-nums"
          style={{ color }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          {score.toFixed(1)}
        </motion.span>
        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">/ 10</span>
      </div>
    </div>
  );
}

function GradeBar({ grade, count, total }: { grade: string; count: number; total: number }) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  const colorBar = GRADE_COLOR[grade] ?? 'bg-slate-400';
  const colorText = GRADE_TEXT[grade] ?? 'text-slate-600';
  const colorBg = GRADE_BG[grade] ?? 'bg-slate-50 border-slate-100';

  return (
    <div className="flex items-center gap-3">
      <div className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 ${colorBg}`}>
        <span className={`text-sm font-black ${colorText}`}>{grade}</span>
      </div>
      <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${colorBar}`}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
        />
      </div>
      <span className="text-sm font-bold text-slate-600 w-6 text-right">{count}</span>
    </div>
  );
}

function RecordRow({ record, onClick }: { record: AnalysisRecord; onClick: () => void }) {
  const grade = record.grade ?? '—';
  const colorText = GRADE_TEXT[grade] ?? 'text-slate-400';
  const colorBg = GRADE_BG[grade] ?? 'bg-slate-50 border-slate-100';
  const date = new Date(record.created_at);
  const dateStr = date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });

  return (
    <motion.button
      onClick={onClick}
      whileHover={{ x: 4 }}
      className="w-full flex items-center gap-4 p-4 rounded-2xl hover:bg-slate-50 transition-colors text-left group"
    >
      <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${colorBg}`}>
        <span className={`text-base font-black ${colorText}`}>{grade}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-slate-800 truncate">{record.filename}</p>
        <p className="text-xs text-slate-400 font-medium mt-0.5 truncate">
          {record.headline ?? 'Chưa có nhận xét'} · {dateStr}
        </p>
      </div>
      {record.overall_score != null && (
        <span className="text-sm font-black text-slate-600 shrink-0 tabular-nums">
          {record.overall_score.toFixed(1)}
        </span>
      )}
      <ChevronRight size={14} className="text-slate-300 group-hover:text-slate-500 shrink-0 transition-colors" />
    </motion.button>
  );
}

export default function Analytics({ onNewAnalysis, onOpenRecord, onLoginClick }: AnalyticsProps) {
  const { isLoggedIn, isLoading: authLoading } = useAuth();
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoggedIn) { setLoading(false); return; }
    getAnalyticsSummary()
      .then(setSummary)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [isLoggedIn]);

  // Chưa đăng nhập → yêu cầu đăng nhập
  if (!authLoading && !isLoggedIn) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-3xl mx-auto"
      >
        <div className="min-h-[70vh] flex flex-col items-center justify-center text-center gap-8">
          <div className="w-24 h-24 rounded-full bg-blue-50 border-2 border-blue-100 flex items-center justify-center">
            <BarChart2 size={40} className="text-blue-400" strokeWidth={1.5} />
          </div>
          <div className="space-y-3">
            <h1 className="text-3xl font-black text-slate-900 tracking-tighter">Phân tích tổng hợp</h1>
            <p className="text-slate-400 text-base font-medium max-w-sm mx-auto leading-relaxed">
              Đăng nhập để lưu lịch sử và xem thống kê tổng hợp hiệu suất sáng tạo của bạn.
            </p>
          </div>
          <button
            onClick={onLoginClick}
            className="flex items-center gap-2 px-8 py-4 bg-primary text-white rounded-2xl font-bold hover:bg-primary/90 transition-all active:scale-95 shadow-lg shadow-primary/20"
          >
            <LogIn size={18} />
            Đăng nhập để xem phân tích
          </button>
        </div>
      </motion.div>
    );
  }

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={28} className="animate-spin text-primary" />
      </div>
    );
  }

  // ── Error ────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="max-w-md mx-auto mt-20 text-center space-y-3">
        <p className="text-slate-400 font-medium">Không thể tải dữ liệu: {error}</p>
        <button onClick={() => window.location.reload()} className="text-sm text-primary font-bold hover:underline">
          Thử lại
        </button>
      </div>
    );
  }

  // ── Empty state ──────────────────────────────────────────────────────────
  if (!summary || summary.total === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-3xl mx-auto"
      >
        <div className="min-h-[70vh] flex flex-col items-center justify-center text-center gap-8">
          <div className="w-24 h-24 rounded-full bg-violet-50 border-2 border-violet-100 flex items-center justify-center">
            <BarChart2 size={40} className="text-violet-400" strokeWidth={1.5} />
          </div>
          <div className="space-y-3">
            <h1 className="text-3xl font-black text-slate-900 tracking-tighter">Phân tích tổng hợp</h1>
            <p className="text-slate-400 text-base font-medium max-w-sm mx-auto leading-relaxed">
              Sau khi phân tích video, các chỉ số thống kê tổng hợp sẽ hiển thị tại đây.
            </p>
          </div>
          {onNewAnalysis && (
            <button
              onClick={onNewAnalysis}
              className="flex items-center gap-2 px-8 py-4 bg-primary text-white rounded-2xl font-bold hover:bg-primary/90 transition-all active:scale-95 shadow-lg shadow-primary/20"
            >
              <Upload size={18} />
              Phân tích video đầu tiên
            </button>
          )}
        </div>
      </motion.div>
    );
  }

  // ── Grade distribution ────────────────────────────────────────────────────
  const gradeOrder = ['S', 'A', 'B', 'C', 'D', 'F'];
  const gradeDist = gradeOrder
    .filter((g) => (summary.grade_distribution[g] ?? 0) > 0)
    .map((g) => ({ grade: g, count: summary.grade_distribution[g] }));

  const bestGrade = gradeOrder.find((g) => (summary.grade_distribution[g] ?? 0) > 0) ?? '—';

  // ── Full page ─────────────────────────────────────────────────────────────
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="max-w-5xl mx-auto space-y-6 pb-20"
    >
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Phân tích tổng hợp</h1>
          <p className="text-sm text-slate-400 font-medium mt-1">Tổng quan hiệu suất sáng tạo của bạn</p>
        </div>
        {onNewAnalysis && (
          <button
            onClick={onNewAnalysis}
            className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-xl font-bold text-sm hover:bg-primary/90 transition-all active:scale-95 shadow-md shadow-primary/20"
          >
            <Upload size={15} />
            Phân tích mới
          </button>
        )}
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          {
            icon: <Video size={22} className="text-blue-500" />,
            bg: 'bg-blue-50 border-blue-100',
            label: 'Tổng số video',
            value: summary.total.toString(),
            sub: 'đã phân tích',
          },
          {
            icon: <TrendingUp size={22} className="text-emerald-500" />,
            bg: 'bg-emerald-50 border-emerald-100',
            label: 'Điểm trung bình',
            value: summary.avg_score != null ? summary.avg_score.toFixed(1) : '—',
            sub: 'trên thang 10',
          },
          {
            icon: <Award size={22} className="text-violet-500" />,
            bg: 'bg-violet-50 border-violet-100',
            label: 'Xếp hạng tốt nhất',
            value: bestGrade,
            sub: `${summary.grade_distribution[bestGrade] ?? 0} video`,
          },
        ].map(({ icon, bg, label, value, sub }, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className={`bg-white rounded-3xl border p-6 space-y-3 shadow-sm ${bg}`}
          >
            <div className={`w-10 h-10 rounded-xl border flex items-center justify-center ${bg}`}>
              {icon}
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
              <p className="text-3xl font-black text-slate-900 mt-1 tabular-nums">{value}</p>
              <p className="text-xs text-slate-400 font-medium mt-0.5">{sub}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Score ring + grade dist */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-6">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Điểm & Xếp hạng</p>

          <div className="flex items-center gap-6">
            {summary.avg_score != null && <ScoreRing score={summary.avg_score} />}
            <div className="flex-1 space-y-2">
              {gradeDist.length > 0 ? gradeDist.map(({ grade, count }) => (
                <GradeBar key={grade} grade={grade} count={count} total={summary.total} />
              )) : (
                <p className="text-sm text-slate-400">Chưa có dữ liệu xếp hạng.</p>
              )}
            </div>
          </div>
        </div>

        {/* Recent */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-2">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Phân tích gần đây</p>
            <Clock size={13} className="text-slate-300" />
          </div>
          {summary.recent.length === 0 ? (
            <p className="text-sm text-slate-400 py-4 text-center">Chưa có dữ liệu.</p>
          ) : (
            summary.recent.map((rec) => (
              <RecordRow
                key={rec.id}
                record={rec}
                onClick={() => onOpenRecord?.(rec)}
              />
            ))
          )}
        </div>
      </div>
    </motion.div>
  );
}
