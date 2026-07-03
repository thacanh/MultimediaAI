import {
  LayoutDashboard,
  Plus,
  ChevronLeft,
  ChevronRight,
  BarChart2,
  History,
  LogIn,
  LogOut,
  User,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onNewAnalysis: () => void;
  isCollapsed: boolean;
  setIsCollapsed: (val: boolean) => void;
  onProjectClick: (id: string) => void;
  onLoginClick: () => void;
  isProcessing?: boolean;
}

export default function Sidebar({
  activeTab,
  onTabChange,
  onNewAnalysis,
  isCollapsed,
  setIsCollapsed,
  onLoginClick,
  isProcessing = false,
}: SidebarProps) {
  const { isLoggedIn, user, logout } = useAuth();

  const navItems = [
    { id: 'dashboard', label: 'Bảng điều khiển', icon: LayoutDashboard },
    { id: 'analytics', label: 'Phân tích', icon: BarChart2 },
    { id: 'history', label: 'Lịch sử', icon: History },
  ];

  return (
    <>
      <aside
        className={`fixed left-0 top-0 h-full bg-white text-slate-600 transition-all duration-500 z-50 flex flex-col border-r border-slate-200 ${
          isCollapsed ? 'w-0 border-none overflow-hidden opacity-0' : 'w-64 opacity-100'
        }`}
      >
        {/* Header */}
        <div className="p-3 flex-1 flex flex-col">
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

          {/* New Analysis CTA */}
          <button
            onClick={onNewAnalysis}
            className="w-full flex items-center justify-between gap-3 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 transition-all group mb-4 shadow-sm"
          >
            <div className="flex items-center gap-3">
              <div className="bg-slate-100 p-1 rounded-full group-hover:bg-slate-200 transition-colors">
                <Plus size={18} className="text-slate-900" />
              </div>
              <span className="text-sm font-bold text-slate-900">Phân tích mới</span>
            </div>
            <div className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 text-slate-400 group-hover:text-slate-600">Mới</div>
          </button>

          {/* Nav */}
          <div className="space-y-1">
            {isProcessing && (
              <div className="flex items-center gap-2 px-3 py-2 mb-1">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Đang xử lý...</span>
              </div>
            )}
            {navItems.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => onTabChange(id)}
                disabled={isProcessing}
                title={isProcessing ? 'Đang phân tích video, vui lòng chờ...' : undefined}
                className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${
                  isProcessing
                    ? 'opacity-40 cursor-not-allowed'
                    : activeTab === id
                      ? 'bg-slate-100 text-slate-900 shadow-sm'
                      : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <Icon size={18} className={!isProcessing && activeTab === id ? 'text-primary' : 'text-slate-400'} />
                <span className="text-sm font-bold">{label}</span>
              </button>
            ))}
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* User section */}
          <div className="border-t border-slate-100 pt-3 mt-3">
            {isLoggedIn && user ? (
              <div className="space-y-1">
                <div className="flex items-center gap-3 px-3 py-2">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <User size={15} className="text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-800 truncate">{user.username}</p>
                    <p className="text-[10px] text-slate-400 truncate">{user.email}</p>
                  </div>
                </div>
                <button
                  onClick={logout}
                  className="w-full flex items-center gap-3 p-3 rounded-xl text-slate-500 hover:bg-red-50 hover:text-red-600 transition-all"
                >
                  <LogOut size={16} />
                  <span className="text-sm font-bold">Đăng xuất</span>
                </button>
              </div>
            ) : (
              <button
                onClick={onLoginClick}
                className="w-full flex items-center gap-3 p-3 rounded-xl border border-primary/20 text-primary hover:bg-primary/5 transition-all"
              >
                <LogIn size={16} />
                <span className="text-sm font-bold">Đăng nhập</span>
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Re-open button when collapsed */}
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
