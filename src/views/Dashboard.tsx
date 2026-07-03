import { Upload } from 'lucide-react';
import { motion } from 'motion/react';

interface DashboardProps {
  onNewAnalysis: () => void;
  onProjectClick: (projectId: string) => void;
}

export default function Dashboard({ onNewAnalysis }: DashboardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.35 }}
      className="max-w-3xl mx-auto"
    >
      {/* Welcome / Empty State */}
      <div className="min-h-[70vh] flex flex-col items-center justify-center text-center gap-10">
        {/* Decorative ring */}
        <div className="relative">
          <div className="w-32 h-32 rounded-full bg-primary/5 border-2 border-primary/10 flex items-center justify-center">
            <div className="w-20 h-20 rounded-full bg-primary/10 border-2 border-primary/20 flex items-center justify-center">
              <Upload size={36} className="text-primary" strokeWidth={2} />
            </div>
          </div>
          {/* Animated pulse */}
          <div className="absolute inset-0 rounded-full animate-ping bg-primary/5" style={{ animationDuration: '3s' }} />
        </div>

        <div className="space-y-3">
          <h1 className="text-4xl font-black text-slate-900 tracking-tighter">
            Chào mừng đến với CreativeIQ
          </h1>
        </div>

        <button
          onClick={onNewAnalysis}
          className="bg-primary text-white hover:bg-primary/90 transition-all rounded-2xl px-12 py-5 flex items-center gap-3 font-bold text-lg shadow-2xl shadow-primary/25 active:scale-95 hover:-translate-y-0.5"
        >
          <Upload size={22} strokeWidth={2.5} />
          Tải video lên để phân tích
        </button>
      </div>
    </motion.div>
  );
}
