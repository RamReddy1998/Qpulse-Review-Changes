import { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/slices/authStore';
import {
  LayoutDashboard,
  BookOpen,
  FileCheck,
  Target,
  AlertTriangle,
  Users,
  Layers,
  BarChart3,
  LogOut,
  Zap,
  Sun,
  Moon,
   Menu,
  X,
  ChevronRight,
} from 'lucide-react';

export function DashboardLayout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    return localStorage.getItem('qpulse-sidebar-collapsed') === 'true';
  });
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('qpulse-theme') === 'dark';
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('qpulse-theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('qpulse-theme', 'light');
    }
  }, [darkMode]);

  useEffect(() => {
    localStorage.setItem('qpulse-sidebar-collapsed', String(isSidebarCollapsed));
  }, [isSidebarCollapsed]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const learnerLinks = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/practice', icon: BookOpen, label: 'Smart Practice' },
    { to: '/mock-tests', icon: FileCheck, label: 'Mock Tests' },
    { to: '/readiness', icon: Target, label: 'Readiness Score' },
    { to: '/mistakes', icon: AlertTriangle, label: 'Mistake Analysis' },
  ];

  const adminLinks = [
    { to: '/admin', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/admin/learners', icon: Users, label: 'Learners' },
    { to: '/admin/batches', icon: Layers, label: 'Batch Management' },
    { to: '/dashboard', icon: BookOpen, label: 'Certification View' },
    { to: '/admin/upload', icon: FileCheck, label: 'Upload Questions' },
    { to: '/admin/analytics', icon: BarChart3, label: 'Analytics' },
  ];

  const links = user?.role === 'ADMIN' ? adminLinks : learnerLinks;

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200 overflow-hidden">
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-4 z-50">
        <div className="flex items-center gap-2">
          <Zap className="h-6 w-6 text-primary-600" />
          <h1 className="text-lg font-bold text-gray-900 dark:text-white">Qpulse</h1>
        </div>
        <button
          onClick={() => setIsSidebarOpen(true)}
          className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
        >
          <Menu className="h-6 w-6" />
        </button>
      </div>

      {/* Sidebar Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-50 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col z-50 transition-all duration-300 lg:static lg:translate-x-0
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        ${isSidebarCollapsed ? 'lg:w-20' : 'lg:w-64'}
        w-64
      `}>
        {/* Logo */}
        <div className={`p-4 border-b border-gray-200 dark:border-gray-700 flex items-center ${isSidebarCollapsed ? 'justify-center' : 'justify-between'}`}>
          <div className="flex items-center gap-2 overflow-hidden">
            <Zap className="h-8 w-8 text-primary-600 flex-shrink-0" />
            {!isSidebarCollapsed && (
              <div className="animate-in fade-in slide-in-from-left-2 duration-300">
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">Qpulse</h1>
                <p className="text-xs text-gray-500 dark:text-gray-400">AI-Powered Learning</p>
              </div>
            )}
          </div>
          {!isSidebarCollapsed && (
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="lg:hidden p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Desktop Collapse Toggle */}
        <button
          onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          className="hidden lg:flex absolute top-5 -right-3 w-6 h-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full items-center justify-center text-gray-400 hover:text-primary-600 shadow-sm z-50 transition-transform hover:scale-110"
        >
          <ChevronRight className={`h-3 w-3 transition-transform duration-300 ${isSidebarCollapsed ? '' : 'rotate-180'}`} />
        </button>

        {/* Navigation */}
        <nav className={`flex-1 p-4 space-y-1 ${isSidebarCollapsed ? 'overflow-visible' : 'overflow-y-auto'}`}>
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === '/dashboard' || link.to === '/admin'}
              onClick={() => setIsSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg text-sm font-medium transition-all ${
                  isSidebarCollapsed ? 'px-2 py-2.5 justify-center tooltip' : 'px-3 py-2.5'
                } ${
                  isActive
                    ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 border-l-4 border-primary-600'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white'
                }`
              }
              data-tooltip={isSidebarCollapsed ? link.label : undefined}
            >
              <link.icon className={`h-5 w-5 flex-shrink-0 ${isSidebarCollapsed ? '' : ''}`} />
              {!isSidebarCollapsed && (
                <span className="truncate animate-in fade-in slide-in-from-left-1 duration-200">{link.label}</span>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Theme toggle + User info */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          {/* Theme Toggle */}
          <button
            onClick={() => setDarkMode(!darkMode)}
            className={`flex items-center gap-2 w-full text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all ${
              isSidebarCollapsed ? 'px-2 py-2.5 justify-center tooltip' : 'px-3 py-2 mb-3'
            }`}
            data-tooltip={isSidebarCollapsed ? (darkMode ? 'Light Mode' : 'Dark Mode') : undefined}
          >
            {darkMode ? <Sun className="h-4 w-4 flex-shrink-0" /> : <Moon className="h-4 w-4 flex-shrink-0" />}
            {!isSidebarCollapsed && (
              <span className="truncate animate-in fade-in slide-in-from-left-1 duration-200">
                {darkMode ? 'Light Mode' : 'Dark Mode'}
              </span>
            )}
          </button>

          <div className={`flex items-center gap-3 ${isSidebarCollapsed ? 'flex-col mb-4' : 'mb-3'}`}>
            <div className="h-9 w-9 flex-shrink-0 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center">
              <span className="text-sm font-bold text-primary-700 dark:text-primary-400">
                {user?.username?.charAt(0).toUpperCase()}
              </span>
            </div>
            {!isSidebarCollapsed && (
              <div className="min-w-0 animate-in fade-in slide-in-from-left-1 duration-200">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{user?.username}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{user?.role?.toLowerCase()}</p>
              </div>
            )}
          </div>
          <button
            onClick={handleLogout}
            className={`flex items-center gap-2 w-full text-sm text-gray-600 dark:text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all ${
              isSidebarCollapsed ? 'px-2 py-2.5 justify-center tooltip' : 'px-3 py-2'
            }`}
            data-tooltip={isSidebarCollapsed ? 'Logout' : undefined}
          >
            <LogOut className="h-4 w-4 flex-shrink-0" />
            {!isSidebarCollapsed && (
              <span className="truncate animate-in fade-in slide-in-from-left-1 duration-200">Logout</span>
            )}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto pt-16 lg:pt-0">
        <div className="p-4 md:p-6 lg:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
