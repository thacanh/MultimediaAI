/**
 * History.tsx — Lịch sử phân tích của user / guest.
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { History as HistoryIcon, Clock, Star, Trash2, ChevronRight, FileVideo, RefreshCw, LogIn } from 'lucide-react';
import { AnalysisRecord } from '../types';
import { listAnalyses, deleteAnalysis } from '../api';
import { useAuth } from '../context/AuthContext';

interface HistoryProps {
  onNewAnalysis: () => void;
  onOpenRecord: (record: AnalysisRecord) => void;
  onLoginClick: () => void;
}

function gradeColor(grade: string | null): string {
  if (!grade) return 'text-slate-400 bg-slate-100';
  if (['S', 'A+', 'A'].includes(grade)) return 'text-emerald-700 bg-emerald-50';
  if (['B+', 'B'].includes(grade)) return 'text-blue-700 bg-blue-50';
  if (['C+', 'C'].includes(grade)) return 'text-amber-700 bg-amber-50';
  return 'text-red-700 bg-red-50';
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return m > 0 ? `${m}p ${s}s` : `${s}s`;
}

export default function History({ onNewAnalysis, onOpenRecord, onLoginClick }: HistoryProps) {
  const { isLoggedIn, user } = useAuth();
  const [records, setRecords] = useState<AnalysisRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<number | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listAnalyses();
      setRecords(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Lỗi tải lịch sử');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [isLoggedIn]);

  const handleDelete = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Xóa bản ghi này?')) return;
    setDeleting(id);
    try {
      await deleteAnalysis(id);
      setRecords((prev) => prev.filter((r) => r.id !== id));
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Lỗi xóa');
    } finally {
      setDeleting(null);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary/10 rounded-2xl flex items-center justify-center">
            <HistoryIcon size={20} className="text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900">Lịch sử phân tích</h1>
            <p className="text-xs text-slate-400 font-medium">
              {isLoggedIn ? `${user?.username} · ${records.length} bản ghi` : 'Guest · tối đa 10 bản'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={load}
            className="p-2 rounded-xl hover:bg-slate-100 text-slate-500 transition-colors"
          >
            <RefreshCw size={16} />
          </button>
          <button
            onClick={onNewAnalysis}
            className="bg-primary text-white text-sm font-bold px-4 py-2 rounded-xl hover:bg-primary/90 transition-all active:scale-95"
          >
            + Phân tích mới
          </button>
        </div>
      </div>

      {/* Guest banner */}
      {!isLoggedIn && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-3">
          <LogIn size={18} className="text-amber-600 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-amber-800">Bạn đang dùng chế độ khách</p>
            <p className="text-xs text-amber-600">Đăng nhập để lưu lịch sử không giới hạn và xem lại bất cứ lúc nào.</p>
          </div>
          <button
            onClick={onLoginClick}
            className="shrink-0 bg-amber-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-amber-700 transition-colors"
          >
            Đăng nhập
          </button>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-400">
          <div className="w-8 h-8 border-2 border-slate-200 border-t-primary rounded-full animate-spin" />
          <p className="text-sm font-medium">Đang tải lịch sử…</p>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <p className="text-red-500 font-bold">{error}</p>
          <button onClick={load} className="text-primary text-sm font-bold hover:underline">Thử lại</button>
        </div>
      ) : records.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-4 text-slate-400">
          <div className="w-16 h-16 bg-slate-100 rounded-3xl flex items-center justify-center">
            <FileVideo size={28} className="text-slate-300" />
          </div>
          <div className="text-center">
            <p className="font-bold text-slate-500">Chưa có phân tích nào</p>
            <p className="text-sm mt-1">Tải video lên để bắt đầu.</p>
          </div>
          <button
            onClick={onNewAnalysis}
            className="bg-primary text-white font-bold px-6 py-2.5 rounded-xl hover:bg-primary/90 transition-all active:scale-95"
          >
            Phân tích video đầu tiên
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {records.map((record, i) => (
              <motion.div
                key={record.id}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 16, height: 0 }}
                transition={{ delay: i * 0.04, duration: 0.25 }}
                onClick={() => onOpenRecord(record)}
                className="bg-white border border-slate-100 rounded-2xl p-4 flex items-center gap-4 hover:border-primary/30 hover:shadow-md cursor-pointer transition-all group"
              >
                {/* Icon */}
                <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center shrink-0 group-hover:bg-primary/10 transition-colors">
                  <FileVideo size={18} className="text-slate-400 group-hover:text-primary transition-colors" />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-slate-800 text-sm truncate">{record.filename}</p>
                  {record.headline && (
                    <p className="text-xs text-slate-500 truncate mt-0.5">{record.headline}</p>
                  )}
                  <div className="flex items-center gap-3 mt-1.5">
                    <span className="flex items-center gap-1 text-xs text-slate-400">
                      <Clock size={11} />
                      {formatDuration(record.duration_sec)}
                    </span>
                    <span className="text-xs text-slate-300">·</span>
                    <span className="text-xs text-slate-400">{formatDate(record.created_at)}</span>
                  </div>
                </div>

                {/* Score + Grade */}
                <div className="flex items-center gap-2 shrink-0">
                  {record.overall_score !== null && (
                    <div className="flex items-center gap-1 text-xs text-slate-500">
                      <Star size={12} className="text-amber-400" />
                      <span className="font-bold">{record.overall_score.toFixed(1)}</span>
                    </div>
                  )}
                  {record.grade && (
                    <span className={`text-xs font-black px-2 py-0.5 rounded-lg ${gradeColor(record.grade)}`}>
                      {record.grade}
                    </span>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  {isLoggedIn && (
                    <button
                      onClick={(e) => handleDelete(record.id, e)}
                      disabled={deleting === record.id}
                      className="p-2 rounded-lg hover:bg-red-50 text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      {deleting === record.id
                        ? <div className="w-4 h-4 border-2 border-red-300 border-t-red-500 rounded-full animate-spin" />
                        : <Trash2 size={14} />
                      }
                    </button>
                  )}
                  <ChevronRight size={16} className="text-slate-300 group-hover:text-primary transition-colors" />
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  );
}
