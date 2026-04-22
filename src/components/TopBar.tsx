import { Bell, HelpCircle, User } from 'lucide-react';

interface TopBarProps {
  onUpgrade: () => void;
}

export default function TopBar({ onUpgrade }: TopBarProps) {
  return (
    <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-slate-200 shadow-sm flex justify-between items-center px-6 h-16">
      <div className="flex items-center gap-4">
        <span className="text-xl font-bold tracking-tight text-slate-900">CreativeIQ AI</span>
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <button aria-label="notifications" className="p-2 text-slate-600 hover:bg-slate-50 transition-colors rounded-full active:scale-95">
            <Bell size={20} />
          </button>
          <button aria-label="help" className="p-2 text-slate-600 hover:bg-slate-50 transition-colors rounded-full active:scale-95">
            <HelpCircle size={20} />
          </button>
        </div>
        <button 
          onClick={onUpgrade}
          className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors active:scale-95"
        >
          Upgrade
        </button>
        <div className="w-8 h-8 rounded-full border border-slate-200 overflow-hidden cursor-pointer hover:opacity-80 transition-opacity">
          <img 
            src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80" 
            alt="Profile" 
            className="w-full h-full object-cover"
          />
        </div>
      </div>
    </nav>
  );
}
