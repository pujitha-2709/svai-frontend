import React, { useState, useEffect } from 'react';
import { View, User } from '../types';
import { 
  LayoutDashboard, 
  BookOpen, 
  Users, 
  Map, 
  UserCircle, 
  LogOut,
  MessageSquare
} from 'lucide-react';
import { Logo } from './Logo';

interface LayoutProps {
  currentView: View;
  onNavigate: (view: View) => void;
  children: React.ReactNode;
  user: User;
  onLogout: () => void;
  unreadCount?: number;
}

export const Layout: React.FC<LayoutProps> = ({ currentView, onNavigate, children, user, onLogout, unreadCount = 0 }) => {
  // Mobile menu state
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Force dark mode
  useEffect(() => {
    document.documentElement.classList.add('dark');
  }, []);

  // Close mobile menu when view changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [currentView]);

  const NavItem = ({ view, icon: Icon, label }: { view: View; icon: any; label: string }) => (
    <button
      onClick={() => onNavigate(view)}
      className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 mb-1 ${
        currentView === view 
          ? 'bg-indigo-600/10 text-indigo-400 border-r-2 border-indigo-500' 
          : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
      }`}
    >
      <Icon className="w-5 h-5" />
      <span className="font-medium flex-1 text-left">{label}</span>
      {view === View.MESSAGES && unreadCount > 0 && (
           <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full shadow-sm">
               {unreadCount > 99 ? '99+' : unreadCount}
           </span>
      )}
    </button>
  );

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans transition-colors duration-200">
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className="md:hidden fixed top-4 left-4 z-50 p-2 bg-white dark:bg-slate-900 rounded-lg shadow-lg border border-slate-200 dark:border-slate-800"
      >
        <div className="w-6 h-0.5 bg-slate-900 dark:bg-white mb-1.5 transition-transform"></div>
        <div className="w-6 h-0.5 bg-slate-900 dark:bg-white mb-1.5 transition-transform"></div>
        <div className="w-6 h-0.5 bg-slate-900 dark:bg-white transition-transform"></div>
      </button>

      {/* Mobile Sidebar Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-black/50 z-40 transition-opacity"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className="hidden md:flex md:flex-shrink-0 w-64 bg-slate-900 border-r border-slate-800 flex-col">
        <div className="p-6 border-b border-slate-800">
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => onNavigate(View.DASHBOARD)}>
            <Logo className="w-9 h-9" />
            <h1 className="text-xl font-bold tracking-tight text-white">SkillVouch AI</h1>
          </div>
        </div>

        <nav className="flex-1 p-4 overflow-y-auto">
          <div className="mb-2 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Platform</div>
          <NavItem view={View.DASHBOARD} icon={LayoutDashboard} label="Dashboard" />
          <NavItem view={View.MY_SKILLS} icon={BookOpen} label="My Skills" />
          <NavItem view={View.FIND_PEERS} icon={Users} label="Find Peers" />
          <NavItem view={View.ROADMAP} icon={Map} label="Learning Path" />
          <NavItem view={View.MESSAGES} icon={MessageSquare} label="Messages" />
        </nav>

        <div className="p-4 border-t border-slate-800 space-y-2">
           <div className="mb-2 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Settings</div>
           <NavItem view={View.PROFILE} icon={UserCircle} label="Profile" />
           
           <button
             onClick={onLogout}
             className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-colors mt-2"
           >
             <LogOut className="w-5 h-5" />
             <span className="font-medium">Sign Out</span>
           </button>
           
           <div className="mt-4 px-4 flex items-center space-x-3">
              <img src={user.avatar} alt="User" className="w-8 h-8 rounded-full border border-slate-700" />
              <div className="flex-1 min-w-0">
                 <p className="text-sm font-medium text-white truncate">{user.name}</p>
                 <p className="text-xs text-slate-500 truncate">{user.email}</p>
              </div>
           </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden md:ml-0">
        {/* Mobile Top Bar */}
        <div className="md:hidden bg-slate-900 border-b border-slate-800 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Logo className="w-6 h-6" />
            <h1 className="text-lg font-bold text-white">SkillVouch AI</h1>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-auto pb-16 md:pb-0">
          {children}
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-800 flex justify-around p-2 z-40 transition-colors duration-200">
        <button 
          onClick={() => onNavigate(View.DASHBOARD)} 
          className={`flex flex-col items-center p-2 rounded-lg transition-colors ${
            currentView === View.DASHBOARD ? 'text-indigo-400' : 'text-slate-400'
          }`}
        >
          <LayoutDashboard className="w-5 h-5" />
          <span className="text-xs mt-1">Home</span>
        </button>
        <button 
          onClick={() => onNavigate(View.MY_SKILLS)} 
          className={`flex flex-col items-center p-2 rounded-lg transition-colors ${
            currentView === View.MY_SKILLS ? 'text-indigo-400' : 'text-slate-400'
          }`}
        >
          <BookOpen className="w-5 h-5" />
          <span className="text-xs mt-1">Skills</span>
        </button>
        <button 
          onClick={() => onNavigate(View.FIND_PEERS)} 
          className={`flex flex-col items-center p-2 rounded-lg transition-colors ${
            currentView === View.FIND_PEERS ? 'text-indigo-400' : 'text-slate-400'
          }`}
        >
          <Users className="w-5 h-5" />
          <span className="text-xs mt-1">Find</span>
        </button>
        <button 
          onClick={() => onNavigate(View.MESSAGES)} 
          className={`flex flex-col items-center p-2 rounded-lg transition-colors relative ${
            currentView === View.MESSAGES ? 'text-indigo-400' : 'text-slate-400'
          }`}
        >
          <MessageSquare className="w-5 h-5" />
          <span className="text-xs mt-1">Chat</span>
          {unreadCount > 0 && currentView !== View.MESSAGES && (
            <span className="absolute top-1 right-2 bg-red-500 text-white text-[10px] font-bold px-1 py-0.5 rounded-full min-w-[14px] flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
        <button 
          onClick={() => onNavigate(View.PROFILE)} 
          className={`flex flex-col items-center p-2 rounded-lg transition-colors ${
            currentView === View.PROFILE ? 'text-indigo-400' : 'text-slate-400'
          }`}
        >
          <UserCircle className="w-5 h-5" />
          <span className="text-xs mt-1">Profile</span>
        </button>
      </div>
    </div>
  );
};