import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { BuyerPanel } from './BuyerPanel';
import { SellerPanel } from './SellerPanel';
import { AdminPanel } from './AdminPanel';
import {
  User,
  Ticket,
  Store,
  ShieldAlert,
  LogOut,
  Phone,
  CheckCircle2,
  ChevronLeft,
  ArrowRight,
} from 'lucide-react';

interface UserProfileDashboardProps {
  onBackToHome: () => void;
}

export const UserProfileDashboard: React.FC<UserProfileDashboardProps> = ({ onBackToHome }) => {
  const { user, logout } = useAuth();
  const [activeSection, setActiveSection] = useState<'buyer' | 'seller' | 'admin'>('buyer');

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-16 text-center space-y-4">
        <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
          برای مشاهده این بخش لطفاً وارد حساب کاربری خود شوید.
        </p>
        <button
          onClick={onBackToHome}
          className="px-6 py-2.5 rounded-xl bg-blue-600 text-white text-xs font-bold"
        >
          بازگشت به صفحه اصلی
        </button>
      </div>
    );
  }

  const isSeller = user.role === 'seller' || user.role === 'admin';
  const isAdmin = user.role === 'admin';

  return (
    <div className="container mx-auto px-3 sm:px-4 py-6 sm:py-8 space-y-6 sm:space-y-8 animate-in fade-in">
      {/* Return to Home Link */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBackToHome}
          className="flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
        >
          <ArrowRight className="w-4 h-4" />
          <span>بازگشت به نمایش‌ها</span>
        </button>

        <button
          type="button"
          onClick={logout}
          className="flex items-center gap-1 text-xs font-semibold text-red-500 hover:text-red-700 transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>خروج از حساب</span>
        </button>
      </div>

      {/* User Profile Overview Card */}
      <div className="p-4 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-black text-xl shadow-lg shadow-blue-600/20 shrink-0">
            {user.name ? user.name[0] : 'ک'}
          </div>

          <div className="space-y-1 text-right">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                {user.name || 'کاربر گرامی'}
              </h2>

              {/* Role Badges with Explanation */}
              {user.role === 'admin' && (
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-indigo-100 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                  مدیر کل سامانه
                </span>
              )}
              {user.role === 'seller' && (
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  فروشنده و گیشه (تخصیص یافته توسط مدیر)
                </span>
              )}
              {user.role === 'buyer' && (
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-100 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                  حساب کاربری خریدار
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-500 font-mono">
              <Phone className="w-3.5 h-3.5 text-slate-400" />
              <span>{user.mobile}</span>
              <span className="text-emerald-600 font-sans font-semibold flex items-center gap-0.5 text-[10px]">
                <CheckCircle2 className="w-3 h-3" />
                تایید شده
              </span>
            </div>
          </div>
        </div>

        {/* Note about Seller role if buyer */}
        {user.role === 'buyer' && (
          <div className="p-2.5 rounded-2xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/60 text-[11px] text-blue-800 dark:text-blue-300 max-w-xs text-justify">
            ثبت‌نام شما به عنوان خریدار انجام شده است. در صورت تمایل به فروش بلیت در گیشه، دسترسی فروشنده توسط مدیریت به شما بر روی نمایش اختصاص می‌یابد.
          </div>
        )}
      </div>

      {/* Role-Based Panel Selector Tabs (Inside the User Profile) */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-2 sm:gap-4 overflow-x-auto pb-1 text-xs font-extrabold">
        <button
          type="button"
          onClick={() => setActiveSection('buyer')}
          className={`flex items-center gap-2 pb-3 border-b-2 transition-colors whitespace-nowrap px-1 sm:px-2 ${
            activeSection === 'buyer'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Ticket className="w-4 h-4" />
          <span>بلیت‌ها و سفارش‌های من</span>
        </button>

        {isSeller && (
          <button
            type="button"
            onClick={() => setActiveSection('seller')}
            className={`flex items-center gap-2 pb-3 border-b-2 transition-colors whitespace-nowrap px-1 sm:px-2 ${
              activeSection === 'seller'
                ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Store className="w-4 h-4" />
            <span>پنل گیشه و فروشنده</span>
          </button>
        )}

        {isAdmin && (
          <button
            type="button"
            onClick={() => setActiveSection('admin')}
            className={`flex items-center gap-2 pb-3 border-b-2 transition-colors whitespace-nowrap px-1 sm:px-2 ${
              activeSection === 'admin'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <ShieldAlert className="w-4 h-4" />
            <span>مدیریت کل سامانه (Admin)</span>
          </button>
        )}
      </div>

      {/* Render Active Section */}
      <div>
        {activeSection === 'buyer' && <BuyerPanel />}
        {activeSection === 'seller' && isSeller && <SellerPanel />}
        {activeSection === 'admin' && isAdmin && <AdminPanel />}
      </div>
    </div>
  );
};
