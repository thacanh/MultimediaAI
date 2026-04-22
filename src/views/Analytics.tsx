import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { Info, Globe, Smartphone, Tablet, Monitor, AlertCircle, ArrowUpRight } from 'lucide-react';

const platformData = [
  { name: 'TikTok', score: 8.8, color: '#000000' },
  { name: 'Instagram', score: 7.5, color: '#E1306C' },
  { name: 'YouTube', score: 8.2, color: '#FF0000' },
  { name: 'Facebook', score: 6.8, color: '#1877F2' },
];

const issueData = [
  { name: 'Text Oversize', count: 12 },
  { name: 'Audio Clipping', count: 8 },
  { name: 'Poor Contrast', count: 15 },
  { name: 'Slow Pace', count: 5 },
  { name: 'Visual Clutter', count: 20 },
];

const comparisonData = [
  { month: 'Jan', current: 7.2, user: 6.5 },
  { month: 'Feb', current: 7.5, user: 6.8 },
  { month: 'Mar', current: 8.1, user: 7.2 },
  { month: 'Apr', current: 8.4, user: 7.5 },
];

export default function Analytics() {
  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <header>
        <h1 className="text-4xl font-bold text-on-surface tracking-tight">Chiến lược & Phân tích</h1>
        <p className="text-lg text-on-surface-variant mt-2 font-medium">So sánh hiệu suất đa nền tảng và tối ưu hóa workflow.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Platform Performance */}
        <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-bold text-on-surface flex items-center gap-2">
              <Globe size={20} className="text-primary" />
              Hiệu suất theo nền tảng
            </h3>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Nửa đầu tháng 10</span>
          </div>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={platformData}>
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#727687', fontSize: 12, fontWeight: 600}} />
                <Tooltip 
                  cursor={{fill: '#f8fafc'}}
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                />
                <Bar dataKey="score" radius={[8, 8, 0, 0]} barSize={40}>
                  {platformData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} fillOpacity={0.8} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-8 grid grid-cols-4 gap-4">
             {platformData.map((p) => (
               <div key={p.name} className="text-center">
                 <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">{p.name}</p>
                 <p className="text-lg font-bold text-on-surface">{p.score}</p>
               </div>
             ))}
          </div>
        </div>

        {/* Common Issues */}
        <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-bold text-on-surface flex items-center gap-2">
              <AlertCircle size={20} className="text-score-poor" />
              Các lỗi phổ biến nhất
            </h3>
          </div>
          <div className="flex-1 flex items-center">
             <div className="w-1/2 h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={issueData} dataKey="count" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5}>
                      {issueData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={['#0050cb', '#4b41e1', '#645efb', '#b3c5ff', '#ef4444'][index % 5]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
             </div>
             <div className="w-1/2 space-y-4">
                {issueData.slice(0, 4).map((issue, idx) => (
                  <div key={issue.name} className="flex justify-between items-center">
                    <span className="text-sm font-semibold text-on-surface-variant">{issue.name}</span>
                    <span className="text-sm font-bold text-on-surface bg-slate-50 px-2 py-1 rounded-md">{issue.count} lần</span>
                  </div>
                ))}
             </div>
          </div>
          <div className="mt-6 p-4 bg-score-poor-bg rounded-2xl flex items-start gap-4">
            <Info size={20} className="text-score-poor shrink-0 mt-0.5" />
            <p className="text-sm font-medium text-score-poor/80 leading-relaxed">
              <strong>Lưu ý:</strong> "Visual Clutter" đang tăng 15% so với tháng trước. Hãy thử sử dụng các khung hình tối giản hơn.
            </p>
          </div>
        </div>
      </div>

      {/* Benchmarking Section */}
      <div className="bg-slate-900 rounded-[40px] p-10 text-white shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/20 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/4" />
        
        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-3 gap-12 items-center">
           <div className="lg:col-span-1 space-y-6 text-center lg:text-left">
              <h2 className="text-3xl font-bold leading-tight">So sánh với<br/>mặt bằng chung</h2>
              <p className="text-slate-400 text-lg">Bạn đang nằm trong top 15% nhà sáng tạo có sự tăng trưởng điểm số AI ổn định nhất.</p>
              <div className="flex justify-center lg:justify-start gap-8">
                <div className="text-center">
                   <p className="text-primary text-4xl font-bold flex items-center gap-1 justify-center">
                     +12% <ArrowUpRight size={24} />
                   </p>
                   <p className="text-xs font-bold text-slate-500 uppercase mt-2">vượt mức trung bình</p>
                </div>
              </div>
           </div>

           <div className="lg:col-span-2 bg-white/5 backdrop-blur-xl rounded-[32px] p-8 border border-white/10 h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={comparisonData}>
                   <XAxis dataKey="month" stroke="#475569" hide />
                   <Tooltip 
                    contentStyle={{ borderRadius: '16px', border: 'none', backgroundColor: '#0f172a' }}
                    itemStyle={{ color: '#fff' }}
                   />
                   <Line type="monotone" dataKey="current" stroke="#0050cb" strokeWidth={4} dot={{ r: 6, fill: '#0050cb', strokeWidth: 2, stroke: '#fff' }} name="Điểm của bạn" />
                   <Line type="monotone" dataKey="user" stroke="#475569" strokeWidth={2} strokeDasharray="5 5" name="Trung bình" />
                </LineChart>
              </ResponsiveContainer>
           </div>
        </div>
      </div>

      {/* Device distribution suggestions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <DeviceCard icon={<Smartphone size={24} strokeWidth={2.5} />} label="Mobile Optimized" status="Excellent" value="98%" colorClass="bg-blue-50 text-blue-600" />
        <DeviceCard icon={<Monitor size={24} strokeWidth={2.5} />} label="Desktop View" status="Good" value="82%" colorClass="bg-purple-50 text-purple-600" />
        <DeviceCard icon={<Tablet size={24} strokeWidth={2.5} />} label="Tablet Response" status="Average" value="65%" colorClass="bg-slate-100 text-slate-600" />
      </div>
    </div>
  );
}

function DeviceCard({ icon, label, status, value, colorClass }: { icon: React.ReactNode, label: string, status: string, value: string, colorClass: string }) {
  return (
    <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm flex items-center justify-between group hover:shadow-lg transition-all duration-300">
      <div className="flex items-center gap-4">
        <div className={`p-4 ${colorClass} rounded-2xl transition-transform group-hover:scale-110 shadow-inner`}>
          {icon}
        </div>
        <div>
          <h4 className="text-sm font-bold text-on-surface">{label}</h4>
          <span className={`text-[10px] font-bold uppercase tracking-widest ${status === 'Excellent' ? 'text-score-good' : 'text-slate-400'}`}>
            {status}
          </span>
        </div>
      </div>
      <span className="text-2xl font-black text-primary tracking-tight">{value}</span>
    </div>
  );
}
