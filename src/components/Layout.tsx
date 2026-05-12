import React, { useState } from 'react';
import { 
  Dumbbell, 
  Users, 
  Calendar, 
  Clock,
  CreditCard,
  AlertTriangle,
  Bell, 
  LogOut,
  LayoutDashboard,
  Utensils,
  Menu,
  User as UserIcon,
  QrCode
} from 'lucide-react';
import { User } from '../types';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface LayoutProps {
  children: React.ReactNode;
  user: User;
  onLogout: () => void;
  activeTab?: string;
}

export const Layout: React.FC<LayoutProps> = ({ children, user, onLogout, activeTab }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(typeof window !== 'undefined' ? window.innerWidth >= 1024 : true);

  const isAdmin = user.role === 'admin' || user.role === 'trainer';

  const menuItems = isAdmin ? [
    { icon: <LayoutDashboard size={20} />, label: 'Dashboard', id: 'dash' },
    { icon: <Users size={20} />, label: 'Members', id: 'members' },
    { icon: <CreditCard size={20} />, label: 'Payments', id: 'payments' },
    { icon: <Clock size={20} />, label: 'Expiring Soon', id: 'expiring' },
    { icon: <AlertTriangle size={20} />, label: 'Expired', id: 'expired' },
    { icon: <QrCode size={20} />, label: 'Scan Attendance', id: 'scan' },
    { icon: <Bell size={20} />, label: 'Notifications', id: 'notif' },
  ] : [
    { icon: <LayoutDashboard size={20} />, label: 'Overview', id: 'dash' }, // Changed over to dash for consistency
    { icon: <Dumbbell size={20} />, label: 'Workouts', id: 'workout' },
    { icon: <Utensils size={20} />, label: 'Diet Plan', id: 'diet' },
    { icon: <QrCode size={20} />, label: 'My QR', id: 'myqr' },
    { icon: <Calendar size={20} />, label: 'Attendance', id: 'history' },
    { icon: <Bell size={20} />, label: 'Alerts', id: 'alerts' },
  ];

  return (
    <div className="flex h-screen bg-[#050505] text-white">
      {/* Sidebar */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.aside
            initial={{ x: -280, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -280, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-y-0 left-0 z-50 w-72 bg-zinc-950 border-r border-zinc-900 flex flex-col lg:relative"
          >
            <div className="p-8 flex items-center gap-3">
              <div className="w-10 h-10 bg-red-600 rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(220,38,38,0.3)]">
                <Dumbbell className="text-white w-6 h-6" />
              </div>
              <span className="font-black text-2xl tracking-tighter italic">FITCORE</span>
            </div>

            <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
              {menuItems.map((item) => {
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      (window as any).setActiveTab?.(item.id);
                      if (window.innerWidth < 1024) setIsSidebarOpen(false);
                    }}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-4 rounded-2xl transition-all font-bold uppercase italic tracking-widest text-xs group relative",
                      isActive 
                        ? "bg-red-600 text-white shadow-[0_4px_20px_rgba(220,38,38,0.2)]" 
                        : "text-gray-500 hover:text-white hover:bg-zinc-900"
                    )}
                  >
                    <span className={cn(
                      "transition-transform group-hover:scale-110",
                      isActive ? "text-white" : "text-gray-600 group-hover:text-red-500"
                    )}>
                      {item.icon}
                    </span>
                    {item.label}
                    {isActive && (
                      <motion.div 
                        layoutId="activeTab"
                        className="absolute left-0 w-1 h-6 bg-white rounded-r-full"
                      />
                    )}
                  </button>
                );
              })}
            </nav>

            <div className="p-6 border-t border-zinc-900">
              <div className="flex items-center gap-3 mb-6 p-3 bg-zinc-900/50 rounded-2xl">
                <div className="w-10 h-10 rounded-full bg-red-600 flex items-center justify-center overflow-hidden">
                  {user.photoURL ? (
                    <img src={user.photoURL} alt={user.displayName} />
                  ) : (
                    <UserIcon size={20} />
                  )}
                </div>
                <div className="flex-1 truncate">
                  <p className="text-sm font-bold truncate">{user.displayName}</p>
                  <p className="text-[10px] text-gray-500 uppercase tracking-widest">{user.role}</p>
                </div>
              </div>
              
              <button 
                onClick={onLogout}
                className="w-full flex items-center gap-3 px-4 py-3 text-gray-500 hover:text-red-500 transition-colors"
              >
                <LogOut size={20} />
                <span>Sign Out</span>
              </button>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-16 flex items-center justify-between px-6 border-b border-zinc-900 bg-zinc-950/50 backdrop-blur-md">
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
            <Menu className="text-gray-400 hover:text-white" />
          </button>
          
          <div className="flex items-center gap-4">
            <button className="relative p-2 text-gray-400 hover:text-white transition-colors">
              <Bell size={20} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-600 rounded-full border-2 border-zinc-950"></span>
            </button>
            <div className="h-8 w-[1px] bg-zinc-800 mx-2" />
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 hidden md:block">Active Session</span>
              <div className="w-2 h-2 bg-green-500 rounded-full" />
            </div>
          </div>
        </header>

        <section className="flex-1 overflow-y-auto p-6 md:p-8">
          {children}
        </section>
      </main>
    </div>
  );
};
