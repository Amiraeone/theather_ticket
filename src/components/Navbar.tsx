import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Ticket, Moon, Sun, User, Search, X } from 'lucide-react';

interface NavbarProps {
  currentView: string;
  setCurrentView: (view: string) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  onOpenLogin: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  setCurrentView,
  searchQuery,
  setSearchQuery,
  onOpenLogin,
}) => {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 dark:border-slate-800/80 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md transition-colors">
      <div className="container mx-auto px-3 sm:px-4 h-16 flex items-center justify-between gap-2 sm:gap-4">
        {/* Brand & Logo */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => setCurrentView('home')}
            className="flex items-center gap-2 sm:gap-2.5 text-blue-700 dark:text-blue-400 font-black hover:opacity-90 transition-opacity text-right"
          >
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0">
              <Ticket className="w-5 h-5 sm:w-6 sm:h-6 rotate-12" />
            </div>
            <div className="flex flex-col text-right">
              <span className="leading-tight text-slate-900 dark:text-white font-black text-base sm:text-lg">
                تیکت تئاتر
              </span>
              <span className="text-[10px] sm:text-[11px] text-blue-600 dark:text-blue-400 font-medium">
                سامانه بلیت تئاتر کشور
              </span>
            </div>
          </button>
        </div>

        {/* Desktop Search Bar (Hidden on Mobile) */}
        {currentView === 'home' && (
          <div className="hidden md:block flex-1 max-w-md mx-4">
            <div className="relative w-full">
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="جستجوی نمایش، کارگردان یا بازیگر..."
                className="w-full pr-9 pl-3 py-2 bg-slate-100 dark:bg-slate-800/90 border border-transparent focus:border-blue-500 rounded-xl text-xs sm:text-sm text-slate-800 dark:text-slate-200 outline-none transition-all placeholder:text-slate-400"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        )}

        {/* Right Side Actions: Mobile Search Toggle, Theme & User Dashboard Access */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Mobile Search Toggle Button (Visible only on mobile when on home view) */}
          {currentView === 'home' && (
            <button
              type="button"
              onClick={() => setIsMobileSearchOpen((prev) => !prev)}
              aria-label="جستجو"
              className={`md:hidden w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
                isMobileSearchOpen || searchQuery
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Search className="w-4 h-4" />
            </button>
          )}

          {/* Theme Toggle Button */}
          <button
            type="button"
            onClick={toggleTheme}
            aria-label="تغییر حالت شب و روز"
            title={theme === 'dark' ? 'تغییر به حالت روشن (روز)' : 'تغییر به حالت تاریک (شب)'}
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100/80 dark:bg-slate-800/90 text-slate-600 dark:text-amber-400 hover:bg-slate-200/80 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-amber-300 flex items-center justify-center transition-all shadow-xs active:scale-95 cursor-pointer"
          >
            {theme === 'dark' ? (
              <Sun className="w-5 h-5 text-amber-400 animate-in spin-in-180 duration-300" />
            ) : (
              <Moon className="w-5 h-5 text-slate-600 animate-in spin-in-180 duration-300" />
            )}
          </button>

          {/* User Profile / Login Button (Logout button removed per user request; handled inside profile panel) */}
          {user ? (
            <button
              type="button"
              onClick={() => setCurrentView('profile')}
              className={`flex items-center gap-2 px-2.5 sm:px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                currentView === 'profile'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                  : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200'
              }`}
            >
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                  currentView === 'profile'
                    ? 'bg-white text-blue-600'
                    : 'bg-blue-600 text-white'
                }`}
              >
                {user.name ? user.name[0] : 'ک'}
              </div>
              <span className="max-w-[85px] sm:max-w-[120px] truncate">{user.name || user.mobile}</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-black/10 dark:bg-white/10 font-normal">
                {user.role === 'admin' ? 'مدیر' : user.role === 'seller' ? 'فروشنده' : 'خریدار'}
              </span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onOpenLogin}
              className="flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs sm:text-sm font-bold shadow-md shadow-blue-600/20 transition-all"
            >
              <User className="w-4 h-4" />
              <span>ورود / ثبت‌نام</span>
            </button>
          )}
        </div>
      </div>

      {/* Mobile Search Pop-Up Dropdown Bar (Slides down smoothly) */}
      {isMobileSearchOpen && currentView === 'home' && (
        <div className="md:hidden w-full border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-3 shadow-xl animate-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-blue-600 dark:text-blue-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="جستجوی نمایش، کارگردان یا بازیگر..."
                className="w-full pr-9 pl-8 py-2.5 bg-slate-100 dark:bg-slate-800 border border-blue-400/40 focus:border-blue-500 rounded-xl text-xs text-slate-800 dark:text-slate-200 outline-none"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center text-xs"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={() => setIsMobileSearchOpen(false)}
              className="px-3 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-lg"
            >
              بستن
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
