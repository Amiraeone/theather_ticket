import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { X, Phone, KeyRound, ShieldCheck, AlertCircle } from 'lucide-react';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose }) => {
  const { loginWithOtp, loginWithPassword } = useAuth();

  const [mode, setMode] = useState<'otp' | 'password'>('otp');
  const [mobile, setMobile] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [debugOtp, setDebugOtp] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSendOtp = async () => {
    if (!mobile || !/^09[0-9]{9}$/.test(mobile.trim())) {
      setError('شماره همراه نامعتبر است (فرمت صحیح: ۰۹۱۲۳۴۵۶۷۸۹).');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await api.sendOtp(mobile.trim());
      if (res.success) {
        setOtpSent(true);
        if (res.debug_code) {
          setDebugOtp(res.debug_code);
          setOtpCode(res.debug_code);
        }
      }
    } catch (err: any) {
      setError(err.message || 'خطا در ارسال پیامک');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otpCode) {
      setError('لطفاً کد تایید را وارد کنید.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await loginWithOtp(mobile.trim(), otpCode.trim(), name.trim());
      onClose();
    } catch (err: any) {
      setError(err.message || 'کد تایید نادرست است');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordLogin = async () => {
    if (!mobile || !password) {
      setError('شماره همراه و رمز عبور الزامی هستند.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await loginWithPassword(mobile.trim(), password);
      onClose();
    } catch (err: any) {
      setError(err.message || 'اطلاعات ورود اشتباه است');
    } finally {
      setLoading(false);
    }
  };

  const handleSeedQuickLogin = async (m: string, p: string) => {
    setLoading(true);
    setError(null);
    try {
      await loginWithPassword(m, p);
      onClose();
    } catch (err: any) {
      setError(err.message || 'خطا در ورود');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
      <div
        className="relative w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2 font-black text-sm text-slate-900 dark:text-white">
            <ShieldCheck className="w-5 h-5 text-blue-600" />
            <span>ورود / ثبت‌نام در سامانه</span>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center text-slate-500"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab switch */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 p-1">
          <button
            type="button"
            onClick={() => {
              setMode('otp');
              setError(null);
            }}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-colors ${
              mode === 'otp'
                ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            پیامک یکبارمصرف (OTP)
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('password');
              setError(null);
            }}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-colors ${
              mode === 'password'
                ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            ورود با کلمه عبور
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {mode === 'otp' ? (
            !otpSent ? (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    شماره تلفن همراه
                  </label>
                  <input
                    type="tel"
                    dir="ltr"
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value)}
                    placeholder="0912..."
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 text-sm font-mono text-center outline-none focus:border-blue-600"
                  />
                  <p className="text-[10px] text-slate-400 mt-1.5 leading-relaxed text-justify">
                    * کلیه کاربران جدید به عنوان «خریدار» ثبت‌نام می‌شوند. سطح دسترسی فروشنده تنها با انتساب مدیر به نمایش‌ها فعال می‌گردد.
                  </p>
                </div>

                <button
                  type="button"
                  disabled={loading}
                  onClick={handleSendOtp}
                  className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-600/20 transition-all"
                >
                  {loading ? 'در حال ارسال...' : 'ارسال کد تایید پیامکی'}
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    نام شما (اختیاری)
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="علیرضا محمدی"
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 text-xs outline-none focus:border-blue-600"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">کد تایید ۵ رقمی</span>
                    {debugOtp && (
                      <span className="text-[10px] text-blue-600 font-bold">کد: {debugOtp}</span>
                    )}
                  </div>
                  <input
                    type="text"
                    dir="ltr"
                    maxLength={5}
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    placeholder="XXXXX"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 text-base font-mono text-center tracking-widest outline-none focus:border-blue-600"
                  />
                </div>

                <button
                  type="button"
                  disabled={loading}
                  onClick={handleVerifyOtp}
                  className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition-all"
                >
                  {loading ? 'در حال تایید...' : 'ورود به سامانه'}
                </button>

                <button
                  type="button"
                  onClick={() => setOtpSent(false)}
                  className="w-full text-center text-xs text-slate-500 hover:text-slate-700 pt-1"
                >
                  ویرایش شماره موبایل
                </button>
              </div>
            )
          ) : (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  شماره موبایل
                </label>
                <input
                  type="tel"
                  dir="ltr"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  placeholder="0912..."
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-mono text-center outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  کلمه عبور
                </label>
                <input
                  type="password"
                  dir="ltr"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm outline-none focus:border-blue-600"
                />
              </div>

              <button
                type="button"
                disabled={loading}
                onClick={handlePasswordLogin}
                className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-600/20 transition-all"
              >
                {loading ? 'در حال ورود...' : 'ورود با کلمه عبور'}
              </button>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-1.5">
                <div className="text-[11px] font-bold text-slate-400 text-center">ورود سریع با حساب‌های سید شده:</div>
                <div className="grid grid-cols-3 gap-1.5 text-[10px]">
                  <button
                    type="button"
                    onClick={() => handleSeedQuickLogin('09120000001', 'admin123456')}
                    className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 font-semibold text-center hover:bg-indigo-100"
                  >
                    مدیر کل
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSeedQuickLogin('09120000002', 'seller123456')}
                    className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 font-semibold text-center hover:bg-emerald-100"
                  >
                    فروشنده/گیشه
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSeedQuickLogin('09120000003', 'buyer123456')}
                    className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 font-semibold text-center hover:bg-blue-100"
                  >
                    خریدار
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
