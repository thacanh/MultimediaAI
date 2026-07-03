import React, { useState, useRef } from 'react';
import { X, Upload, ArrowRight, Check, Film } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AnalysisContext } from '../types';

interface AnalysisSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStart: (context: AnalysisContext, file: File) => void;
}


export default function AnalysisSetupModal({ isOpen, onClose, onStart }: AnalysisSetupModalProps) {
  const [context, setContext] = useState<AnalysisContext>({
    video_type: 'TikTok / Reels / Shorts'
  });
  const [isUploaded, setIsUploaded] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
      setIsUploaded(true);
    }
  };

  const isReady = isUploaded;

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={onClose}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative bg-white rounded-[32px] shadow-2xl w-full max-w-xl overflow-hidden"
          >
            {/* Header */}
            <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Thiết lập phân tích mới</h2>
                <p className="text-xs font-medium text-slate-500 mt-1 uppercase tracking-widest">Cung cấp bối cảnh để AI phân tích chuẩn xác hơn</p>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400">
                <X size={20} />
              </button>
            </div>

            <div className="p-8 space-y-7 max-h-[60vh] overflow-y-auto custom-scrollbar">

              {/* Định dạng video */}
              <div className="space-y-3">
                <label className="flex items-center gap-2 text-sm font-bold text-slate-700">
                  <Film size={16} className="text-primary" />
                  Định dạng video
                </label>
                <div className="grid grid-cols-1 gap-2.5">
                  <button
                    type="button"
                    className="flex items-center justify-between p-3.5 rounded-2xl border bg-primary/5 border-primary text-primary text-xs font-bold transition-all shadow-sm"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                      TikTok / Reels / Shorts (Video ngắn)
                    </div>
                    <span className="text-[10px] bg-primary/10 text-primary px-2.5 py-1 rounded-lg uppercase tracking-wider font-extrabold">Mặc định</span>
                  </button>

                  <button
                    type="button"
                    disabled
                    className="flex items-center justify-between p-3.5 rounded-2xl border border-slate-100 bg-slate-50 text-slate-400 text-xs font-bold cursor-not-allowed opacity-60"
                  >
                    <span>Youtube / Long-form video (Video dài)</span>
                    <span className="text-[9px] bg-slate-200 text-slate-500 px-2 py-0.5 rounded-md font-bold">Đang phát triển</span>
                  </button>
                </div>
              </div>




              {/* Upload Simulation */}
              <div className="space-y-3">
                <label className="flex items-center gap-2 text-sm font-bold text-slate-700">
                  <Upload size={16} className="text-primary" />
                  Dữ liệu Video <span className="text-red-500">*</span>
                </label>
                <input
                  type="file"
                  accept="video/*"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className={`w-full flex items-center justify-center gap-3 p-8 rounded-2xl border-2 border-dashed transition-all ${isUploaded
                    ? 'border-emerald-200 bg-emerald-50/30'
                    : 'border-slate-200 bg-slate-50 hover:bg-slate-100/50'
                    }`}
                >
                  {isUploaded && selectedFile ? (
                    <>
                      <div className="bg-emerald-500 text-white p-2 rounded-full shadow-lg shadow-emerald-500/20">
                        <Check size={20} strokeWidth={3} />
                      </div>
                      <div className="text-left flex-1 min-w-0">
                        <p className="text-sm font-bold text-emerald-700 leading-tight">Video đã sẵn sàng</p>
                        <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-tight mt-1 opacity-70 truncate" title={selectedFile.name}>
                          {selectedFile.name} ({(selectedFile.size / (1024 * 1024)).toFixed(1)}MB)
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      <Upload size={24} className="text-slate-300" />
                      <span className="text-sm font-bold text-slate-400">Bấm để tải video lên</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Footer */}
            <div className="p-8 pt-4 flex gap-4 bg-slate-50/50 border-t border-slate-100">
              <button
                disabled={!isReady}
                onClick={() => selectedFile && onStart(context, selectedFile)}
                className={`flex-1 flex items-center justify-center gap-3 py-4 rounded-2xl font-bold transition-all shadow-lg ${isReady
                  ? 'bg-primary text-white hover:bg-primary-hover active:scale-[0.98] shadow-primary/20'
                  : 'bg-slate-100 text-slate-400 cursor-not-allowed shadow-none'
                  }`}
              >
                Bắt đầu phân tích
                <ArrowRight size={20} strokeWidth={3} />
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
