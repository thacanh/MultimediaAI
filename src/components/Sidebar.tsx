import { 
  LayoutDashboard, 
  Settings, 
  LogOut, 
  Plus, 
  MessageSquare, 
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  User,
  History
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onNewAnalysis: () => void;
  isCollapsed: boolean;
  setIsCollapsed: (val: boolean) => void;
  onProjectClick: (id: string) => void;
}

const mockProjects = [
  { id: '1', title: 'Phân tích Chiến dịch Autumn' },
  { id: '2', title: 'Thử nghiệm Reels V1' },
  { id: '3', title: 'Video Ra mắt Sản phẩm' },
  { id: '4', title: 'Quảng cáo TikTok Creative' },
  { id: '5', title: 'Video Giải thích 2D' },
];

export default function Sidebar({ 
  activeTab, 
  onTabChange, 
  onNewAnalysis, 
  isCollapsed, 
  setIsCollapsed,
  onProjectClick
}: SidebarProps) {
  return (
    <>
      <aside 
        className={`fixed left-0 top-0 h-full bg-white text-slate-600 transition-all duration-500 z-50 flex flex-col border-r border-slate-200 ${
          isCollapsed ? 'w-0 border-none overflow-hidden opacity-0' : 'w-64 opacity-100'
        }`}
      >
        {/* Header: Toggle & New Project */}
        <div className="p-3">
          <div className="flex items-center justify-between mb-4 px-1">
            {!isCollapsed && (
              <div className="flex items-center gap-2">
                <img src="/logeCreativeIQ.png" alt="CreativeIQ Logo" className="h-8 w-auto object-contain" />
                <span className="text-sm font-black text-slate-800 uppercase tracking-[0.1em]">CreativeIQ</span>
              </div>
            )}
            <button 
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-900 transition-colors"
              title="Đóng sidebar"
            >
              <ChevronLeft size={18} />
            </button>
          </div>

          <button 
            onClick={onNewAnalysis}
            className="w-full flex items-center justify-between gap-3 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 transition-all group mb-2 shadow-sm"
          >
            <div className="flex items-center gap-3">
              <div className="bg-slate-100 p-1 rounded-full group-hover:bg-slate-200 transition-colors">
                <Plus size={18} className="text-slate-900" />
              </div>
              <span className="text-sm font-bold text-slate-900">Dự án mới</span>
            </div>
            <div className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 text-slate-400 group-hover:text-slate-600">Mới</div>
          </button>

          <button 
            onClick={() => onTabChange('dashboard')}
            className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${
              activeTab === 'dashboard' 
                ? 'bg-slate-100 text-slate-900 shadow-sm' 
                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <LayoutDashboard size={18} className={activeTab === 'dashboard' ? 'text-primary' : 'text-slate-400'} />
            <span className="text-sm font-bold">Bảng điều khiển</span>
          </button>
        </div>

        {/* History Section */}
        <div className="flex-1 overflow-y-auto px-3 custom-scrollbar space-y-4">
          <div className="mt-8">
             <p className="text-[11px] font-bold text-slate-400 px-3 py-2 uppercase tracking-wide">Gần đây</p>
             <div className="space-y-1">
               {mockProjects.map((project) => (
                 <button
                   key={project.id}
                   onClick={() => onProjectClick(project.id)}
                   className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left group relative ${
                     activeTab === `project-${project.id}`
                       ? 'bg-slate-100 text-slate-900 shadow-sm'
                       : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                   }`}
                 >
                   <span className="text-sm truncate flex-1 font-medium italic">
                     {project.title}
                   </span>
                   <div className={`transition-opacity ${activeTab === `project-${project.id}` ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                      <MoreHorizontal size={14} className="text-slate-400 hover:text-slate-900" />
                   </div>
                 </button>
               ))}
             </div>
          </div>
        </div>

        {/* Bottom Area: User & Settings */}
        <div className="p-3 mt-auto border-t border-slate-100">
          <div className="space-y-1">
            <button 
              onClick={() => onTabChange('settings')}
              className={`w-full flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-all group ${activeTab === 'settings' ? 'bg-slate-50' : ''}`}
            >
              <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-white text-xs font-bold shadow-sm">
                AT
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-bold text-slate-900">Anh Thac</p>
              </div>
              <MoreHorizontal size={14} className="text-slate-400" />
            </button>
          </div>
        </div>
      </aside>

      {/* External Re-open Button (when hidden) */}
      {isCollapsed && (
        <button 
          onClick={() => setIsCollapsed(false)}
          className="fixed left-4 top-4 p-2 bg-white border border-slate-200 rounded-lg shadow-lg text-slate-400 hover:text-slate-900 hover:scale-110 transition-all z-[60]"
          title="Mở sidebar"
        >
          <ChevronRight size={18} />
        </button>
      )}
    </>
  );
}
