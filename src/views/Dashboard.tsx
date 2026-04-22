import { Upload, TrendingUp, Star, ArrowRight } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';
import { motion } from 'motion/react';

const trendData = [
  { name: 'T2', score: 7.2 }, { name: 'T3', score: 7.8 }, { name: 'T4', score: 7.4 },
  { name: 'T5', score: 8.5 }, { name: 'T6', score: 8.1 }, { name: 'T7', score: 8.8 },
  { name: 'CN', score: 8.2 },
];

const categoryData = [
  { name: 'Hình ảnh', value: 85 }, { name: 'Âm thanh', value: 65 },
  { name: 'Thông tin', value: 45 }, { name: 'Đồng bộ', value: 90 },
];

interface DashboardProps {
  onNewAnalysis: () => void;
  onProjectClick: (projectId: string) => void;
}

export default function Dashboard({ onNewAnalysis, onProjectClick }: DashboardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.35 }}
      className="max-w-7xl mx-auto space-y-8"
    >
      {/* Welcome Banner */}
      <div className="bg-white rounded-[40px] p-10 flex flex-col md:flex-row justify-between items-center gap-6 border border-slate-100 shadow-xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl group-hover:bg-primary/10 transition-all duration-700" />
        <div className="relative z-10 text-center md:text-left">
          <h1 className="text-4xl font-black text-slate-900 mb-3 tracking-tighter">Chào buổi sáng, Nhà sáng tạo.</h1>
          <p className="text-slate-500 text-lg max-w-xl font-medium">Hệ thống AI đã sẵn sàng. Bạn có 3 video cần tối ưu hóa để đạt hiệu quả cao nhất trên Reels hôm nay.</p>
        </div>
        <button
          onClick={onNewAnalysis}
          className="relative z-10 bg-primary text-white hover:bg-primary/90 transition-all rounded-2xl px-10 py-5 flex items-center gap-3 font-bold shadow-2xl shadow-primary/20 active:scale-95 flex-shrink-0"
        >
          <Upload size={20} strokeWidth={3} />
          Tải video mới lên
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard
          label="Tổng video"
          value="24"
          trend="+2 tuần này"
          colorClass="bg-blue-500/5 ring-1 ring-blue-500/10"
        />
        <KPICard
          label="Điểm TB"
          value="8.2"
          trend="Tăng 0.4"
          colorClass="bg-purple-500/5 ring-1 ring-purple-500/10"
        />
        <KPICard
          label="Tối ưu nhất"
          value="Hình ảnh"
          trend="92%"
          colorClass="bg-amber-500/5 ring-1 ring-amber-500/10"
        />
        <KPICard
          label="Thời gian xử lý"
          value="1.2 phút"
          trend="-10 giây"
          colorClass="bg-emerald-500/5 ring-1 ring-emerald-500/10"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Chart Section */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h2 className="text-2xl font-bold text-on-surface">Xu hướng chất lượng</h2>
                <p className="text-sm text-on-surface-variant font-medium">Theo dõi điểm số trung bình hàng ngày</p>
              </div>
              <div className="text-right">
                <span className="text-3xl font-bold text-primary">8.2</span>
                <p className="text-xs font-bold text-score-good uppercase tracking-widest mt-1">Hạng A+</p>
              </div>
            </div>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData}>
                  <defs>
                    <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0050cb" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#0050cb" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#727687', fontSize: 12, fontWeight: 600 }} dy={10} />
                  <Tooltip
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                  />
                  <Area type="monotone" dataKey="score" stroke="#0050cb" strokeWidth={4} fillOpacity={1} fill="url(#trendGradient)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="flex justify-between items-center px-2">
            <h2 className="text-2xl font-bold text-on-surface">Dự án gần đây</h2>
            <button className="text-primary font-bold flex items-center gap-1 hover:gap-2 transition-all">
              Xem bộ sưu tập <ArrowRight size={18} />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ProjectCard
              image="https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&q=80&w=800"
              title="Chiến dịch Autumn"
              date="14/10/2023"
              duration="01:12"
              score="8.8/10"
              onClick={() => onProjectClick('autumn')}
            />
            <ProjectCard
              image="https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80&w=800"
              title="Webinar Teaser"
              date="13/10/2023"
              duration="00:30"
              score="7.9/10"
              onClick={() => onProjectClick('webinar')}
            />
          </div>
        </div>

        {/* Sidebar/Actionable Items */}
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
            <h3 className="text-lg font-bold text-on-surface mb-6">Phân tích theo danh mục</h3>
            <div className="h-[200px] mb-6">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryData} layout="vertical">
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} width={80} style={{ fontSize: '12px', fontWeight: 600, fill: '#424656' }} />
                  <Tooltip
                    cursor={{ fill: 'transparent' }}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}
                  />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={12}>
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.value > 80 ? '#10B981' : entry.value > 60 ? '#F59E0B' : '#EF4444'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Cần chú ý nhất</h4>
              <PriorityItem
                text="Giảm độ nhiễu hình ảnh"
                impact="Tăng +1.2 điểm"
                color="bg-amber-600"
              />
              <PriorityItem
                text="Tối ưu độ dài văn bản"
                impact="Tăng +0.8 điểm"
                color="bg-blue-600"
              />
            </div>
          </div>

          <div className="bg-primary/5 rounded-[40px] p-8 text-slate-900 border border-primary/10 shadow-sm relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 transform translate-x-1/2 -translate-y-1/2">
              <div className="w-32 h-32 bg-primary/10 rounded-full blur-3xl group-hover:bg-primary/20 transition-all duration-700" />
            </div>
            <h3 className="text-lg font-black mb-2 relative z-10">Mẹo từ AI Coach</h3>
            <p className="text-sm text-slate-500 leading-relaxed relative z-10 mb-4 font-medium">
              Các video dùng âm nhạc có tiết tấu nhanh đang có tỉ lệ giữ chân người xem tốt hơn 20% trong tuần này.
            </p>
            <button className="text-sm font-bold text-primary flex items-center gap-1 hover:gap-2 transition-all relative z-10">
              Xem chi tiết mẹo <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function KPICard({ label, value, trend, colorClass }: { label: string; value: string; trend: string; colorClass: string }) {
  return (
    <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm hover:shadow-2xl hover:shadow-primary/5 hover:-translate-y-1.5 transition-all duration-500 group">
      <div className="flex justify-between items-start mb-6">
        <div className={`w-2 h-8 rounded-full transition-all duration-500 group-hover:h-12 ${colorClass.split(' ')[0].replace('/10', '/40')}`} />
        <span className={`text-[10px] font-bold px-2.5 py-1.5 rounded-xl backdrop-blur-md ${trend.includes('+') || trend.includes('Tăng') ? 'bg-emerald-50/50 text-emerald-600 border border-emerald-100' : 'bg-slate-50/50 text-slate-500 border border-slate-100'}`}>
          {trend}
        </span>
      </div>
      <div>
        <div className="flex items-center gap-2 mb-1">
          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{label}</h4>
          <div className="h-px flex-1 bg-slate-50" />
        </div>
        <span className="text-3xl font-black text-on-surface tracking-tighter tabular-nums">{value}</span>
      </div>
    </div>
  );
}

function ProjectCard({ image, title, date, duration, score, onClick }: any) {
  return (
    <div
      onClick={onClick}
      className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden group hover:shadow-lg transition-all cursor-pointer flex flex-col active:scale-[0.98]"
    >
      <div className="aspect-video w-full bg-slate-100 relative overflow-hidden">
        <img src={image} alt={title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
        <div className="absolute bottom-4 right-4 bg-black/70 text-white font-mono-data text-xs px-2.5 py-1.5 rounded-lg backdrop-blur-md">
          {duration}
        </div>
      </div>
      <div className="p-5 flex flex-col flex-1">
        <h3 className="text-lg font-bold text-on-surface truncate mb-1 group-hover:text-primary transition-colors">{title}</h3>
        <p className="text-sm text-on-surface-variant mb-4">Ngày: {date}</p>
        <div className="mt-auto flex justify-between items-center pt-2">
          <div className="flex items-center gap-1.5 text-primary border border-slate-100 bg-slate-50 px-3 py-1.5 rounded-full font-mono-data text-sm font-bold">
            <Star size={14} fill="currentColor" />
            {score}
          </div>
          <button className="p-2 hover:bg-slate-50 rounded-full transition-colors">
            <ArrowRight size={18} className="text-slate-400 group-hover:text-primary" />
          </button>
        </div>
      </div>
    </div>
  );
}

function PriorityItem({ text, impact, color }: { text: string, impact: string, color: string }) {
  return (
    <div className="flex items-center gap-4 group cursor-pointer hover:bg-slate-50 p-3 -mx-3 rounded-2xl transition-all duration-300">
      <div className={`w-1.5 h-6 rounded-full ${color} transition-all group-hover:h-10`} />
      <div className="min-w-0">
        <p className="text-sm font-bold text-on-surface truncate">{text}</p>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{impact}</p>
      </div>
    </div>
  );
}
