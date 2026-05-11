import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Menu,
  X,
  Home,
  BookOpen,
  Heart,
  Brain,
  Calendar,
  Users,
  AlertCircle,
  LineChart,
  BookMarked,
  User,
  LogOut,
  MessageCircle,
  Sparkles,
  Settings,
} from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import Logo from '../common/Logo';

const NavigationDrawer = () => {
  const [isOpen, setIsOpen] = useState(false); // Changed default to false for mobile
  const location = useLocation();
  const { user, signOut } = useAuthStore();

  const navItems = [
    { path: '/home', label: 'Dashboard', icon: Home },
    { path: '/ai-companion', label: 'Companion', icon: Sparkles },
    { path: '/forum', label: 'Community Forum', icon: MessageCircle },
    { path: '/mood-tracker', label: 'Mood Tracker', icon: LineChart },
    { path: '/appointments', label: 'Appointments', icon: Calendar },
    { path: '/journal', label: 'Journal', icon: BookMarked },
    // { path: '/resources', label: 'Resources', icon: BookOpen }, 
    { path: '/settings', label: 'Settings', icon: Settings },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-4 left-4 z-50 p-2 rounded-md bg-white shadow-md lg:hidden"
      >
        {isOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Desktop Sidebar - Always visible on large screens */}
      <div className="hidden lg:block fixed top-0 left-0 h-screen w-[25%] bg-white shadow-xl z-40">
        <div className="flex flex-col h-full">
          {/* Header with Logo and Profile */}
          <div className="p-4 border-b">
            <div className="flex items-center justify-between">
              <Link to="/home" className="flex items-center">
                <Logo size={32} />
                <span className="ml-2 text-xl font-semibold text-primary-700">Unwind</span>
              </Link>
              
              {/* Profile Link with Text in Header */}
              <Link 
                to="/profile"
                className={`flex items-center p-2 rounded-md transition-colors ${
                  isActive('/profile')
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-neutral-700 hover:bg-neutral-50'
                }`}
              >
                <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center overflow-hidden mr-2">
                  {user?.avatar_url ? (
                    <img
                      src={user.avatar_url}
                      alt={user.full_name || 'Profile'}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User size={16} className="text-primary-600" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-neutral-900 truncate">
                    {user?.full_name || 'User'}
                  </p>
                  <p className="text-xs text-neutral-500 capitalize">
                    {user?.role || 'user'}
                  </p>
                </div>
              </Link>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto py-4">
            <nav className="space-y-1 px-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center px-3 py-2 rounded-md transition-colors ${
                      isActive(item.path)
                        ? 'bg-primary-50 text-primary-700'
                        : 'text-neutral-700 hover:bg-neutral-50'
                    }`}
                  >
                    <Icon size={20} className="mr-3" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* User Info and Sign Out */}
          <div className="p-4 border-t">
            <button
              onClick={() => signOut()}
              className="w-full flex items-center px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-50 rounded-md transition-colors"
            >
              <LogOut size={18} className="mr-2" />
              Sign Out
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer - Overlay on mobile */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
              onClick={() => setIsOpen(false)}
            />
            
            {/* Mobile Drawer */}
            <motion.div
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="fixed top-0 left-0 h-screen w-80 bg-white shadow-xl z-40 flex flex-col lg:hidden"
            >
              {/* Header with Logo and Profile */}
              <div className="p-4 border-b">
                <div className="flex items-center justify-between mb-4">
                  <Link to="/home" className="flex items-center" onClick={() => setIsOpen(false)}>
                    <Logo size={32} />
                    <span className="ml-2 text-xl font-semibold text-primary-700">Unwind</span>
                  </Link>
                </div>
                
                {/* Profile Link with Text in Mobile Header */}
                <Link 
                  to="/profile"
                  onClick={() => setIsOpen(false)}
                  className={`flex items-center p-3 rounded-md transition-colors w-full ${
                    isActive('/profile')
                      ? 'bg-primary-50 text-primary-700'
                      : 'text-neutral-700 hover:bg-neutral-50'
                  }`}
                >
                  <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center overflow-hidden mr-3">
                    {user?.avatar_url ? (
                      <img
                        src={user.avatar_url}
                        alt={user.full_name || 'Profile'}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User size={20} className="text-primary-600" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-neutral-900 truncate">
                      {user?.full_name || 'User'}
                    </p>
                    <p className="text-xs text-neutral-500 capitalize">
                      {user?.role || 'user'}
                    </p>
                  </div>
                </Link>
              </div>

              <div className="flex-1 min-h-0 overflow-y-auto py-4">
                <nav className="space-y-1 px-2">
                  {navItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        onClick={() => setIsOpen(false)}
                        className={`flex items-center px-3 py-2 rounded-md transition-colors ${
                          isActive(item.path)
                            ? 'bg-primary-50 text-primary-700'
                            : 'text-neutral-700 hover:bg-neutral-50'
                        }`}
                      >
                        <Icon size={20} className="mr-3" />
                        <span>{item.label}</span>
                      </Link>
                    );
                  })}
                </nav>
              </div>

              <div className="flex-shrink-0 p-4 border-t bg-white">
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    void signOut();
                  }}
                  className="w-full flex items-center px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-50 rounded-md transition-colors"
                >
                  <LogOut size={18} className="mr-2" />
                  Sign Out
                </button>
              </div>
            </motion.div>

          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default NavigationDrawer;