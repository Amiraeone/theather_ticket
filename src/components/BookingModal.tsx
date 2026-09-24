import React, { useState, useEffect } from 'react';
import { Show, ShowSession, SeatMapData, SeatMapSeat } from '../types';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { formatToman, toPersianDigits, formatJalaliDate } from '../lib/persianUtils';
import {
  X,
  Calendar,
  Armchair,
  Users,
  Clock,
  ShieldCheck,
  CreditCard,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  Lock,
  Sparkles,
  Phone,
  CheckCircle2,
} from 'lucide-react';

interface BookingModalProps {
  show: Show | null;
  initialSession?: ShowSession | null;
  onClose: () => void;
  onPaymentSuccess?: (orderId: string) => void;
}

type BookingStep = 'session' | 'seats' | 'auth' | 'review';

export const BookingModal: React.FC<BookingModalProps> = ({ show, initialSession, onClose }) => {
  const { user, loginWithOtp, loginWithPassword } = useAuth();

  const [step, setStep] = useState<BookingStep>(initialSession ? 'seats' : 'session');
  const [sessions, setSessions] = useState<ShowSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<ShowSession | null>(initialSession || null);

  // Seat selection state
  const [seatMap, setSeatMap] = useState<SeatMapData | null>(null);
  const [selectedSeats, setSelectedSeats] = useState<SeatMapSeat[]>([]);
  const [quantity, setQuantity] = useState(1);
  const [holdExpiresAt, setHoldExpiresAt] = useState<number | null>(null);
  const [holdTimeLeft, setHoldTimeLeft] = useState<string>('');

  // Auth sub-state for unauthenticated users
  const [mobile, setMobile] = useState('');
  const [name, setName] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [debugOtp, setDebugOtp] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Processing & Error states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load seatmap when session is selected and advancing to seats step
  const loadSeatMap = async (session: ShowSession) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getSessionSeatMap(session.id);
      if (res.success) {
        setSeatMap(res.data);
        setSelectedSeats([]);
        setStep('seats');
      }
    } catch (err: any) {
      setError(err.message || 'خطا در بارگذاری نقشه صندلی‌ها');
    } finally {
      setLoading(false);
    }
  };

  // Load show sessions on open
  useEffect(() => {
    if (!show) return;
    api
      .getShowDetail(show.slug || show.id)
      .then((res) => {
        if (res.success && res.data.sessions) {
          setSessions(res.data.sessions);
          if (initialSession) {
            const matched = res.data.sessions.find((s: ShowSession) => s.id === initialSession.id);
            const targetSession = matched || initialSession;
            setSelectedSession(targetSession);
            loadSeatMap(targetSession);
          } else if (res.data.sessions.length > 0) {
            setSelectedSession(res.data.sessions[0]);
          }
        }
      })
      .catch((err) => console.error(err));
  }, [show, initialSession]);

  // Hold Timer countdown
  useEffect(() => {
    if (!holdExpiresAt) return;
    const interval = setInterval(() => {
      const diff = Math.max(0, Math.floor((holdExpiresAt - Date.now()) / 1000));
      const mins = Math.floor(diff / 60);
      const secs = diff % 60;
      setHoldTimeLeft(`${mins}:${secs < 10 ? '0' : ''}${secs}`);

      if (diff <= 0) {
        clearInterval(interval);
        setHoldExpiresAt(null);
        setError('مهلت ۱۰ دقیقه‌ای رزرو موقت صندلی‌ها به پایان رسید.');
        setSelectedSeats([]);
        if (selectedSession) loadSeatMap(selectedSession);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [holdExpiresAt, selectedSession]);

  // Handle seat click
  const toggleSeat = async (seat: SeatMapSeat) => {
    if (seat.status === 'SOLD' || seat.status === 'HELD_BY_OTHER') return;

    setError(null);
    let newSelection: SeatMapSeat[];

    if (selectedSeats.some((s) => s.id === seat.id)) {
      newSelection = selectedSeats.filter((s) => s.id !== seat.id);
    } else {
      if (selectedSeats.length >= 8) {
        setError('حداکثر می‌توانید ۸ صندلی را در یک سفارش انتخاب نمایید.');
        return;
      }
      newSelection = [...selectedSeats, seat];
    }

    setSelectedSeats(newSelection);

    // Call atomic hold lock if we have selected seats
    if (selectedSession && newSelection.length > 0) {
      try {
        const res = await api.holdSeats(
          selectedSession.id,
          newSelection.map((s) => s.id),
          user?.mobile
        );
        if (res.success) {
          setHoldExpiresAt(res.expires_at);
        }
      } catch (err: any) {
        setError(err.message || 'خطا در رزرو موقت صندلی');
        // reload seatmap on conflict
        loadSeatMap(selectedSession);
      }
    } else if (selectedSession && newSelection.length === 0) {
      api.releaseSeats(selectedSession.id);
      setHoldExpiresAt(null);
    }
  };

  // Handle Advance to Next Step
  const handleProceedToAuthOrReview = () => {
    setError(null);
    if (show?.ticketing_mode === 'SEAT_SELECTION') {
      if (selectedSeats.length === 0) {
        setError('لطفاً حداقل یک صندلی انتخاب فرمایید.');
        return;
      }
    } else {
      if (quantity < 1) {
        setError('تعداد بلیت نامعتبر است.');
        return;
      }
    }

    if (user) {
      setStep('review');
    } else {
      setStep('auth');
    }
  };

  // OTP Sending
  const handleSendOtp = async () => {
    if (!mobile || !/^09[0-9]{9}$/.test(mobile.trim())) {
      setError('شماره موبایل نامعتبر است (فرمت صحیح: ۰۹۱۲۳۴۵۶۷۸۹).');
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
          setOtpCode(res.debug_code); // auto fill for smooth testing
        }
        setResendCooldown(60);
      }
    } catch (err: any) {
      setError(err.message || 'خطا در ارسال پیامک');
    } finally {
      setLoading(false);
    }
  };

  // OTP Verification
  const handleVerifyOtp = async () => {
    if (!otpCode) {
      setError('لطفاً کد تایید پیامکی را وارد نمایید.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await loginWithOtp(mobile.trim(), otpCode.trim(), name.trim());
      setStep('review');
    } catch (err: any) {
      setError(err.message || 'کد تایید نادرست است');
    } finally {
      setLoading(false);
    }
  };

  // Quick Seed Login
  const handleQuickSeedLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      await loginWithPassword('09120000003', 'buyer123456');
      setStep('review');
    } catch (err: any) {
      setError(err.message || 'خطا در ورود آزمایشی');
    } finally {
      setLoading(false);
    }
  };

  // Final Checkout & Redirect to Zarinpal
  const handleCheckoutAndPay = async () => {
    if (!selectedSession) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.checkout({
        session_id: selectedSession.id,
        seat_ids: show?.ticketing_mode === 'SEAT_SELECTION' ? selectedSeats.map((s) => s.id) : undefined,
        quantity: show?.ticketing_mode === 'QUANTITY_ONLY' ? quantity : undefined,
        buyer_name: user?.name,
        buyer_mobile: user?.mobile,
      });

      if (res.success && res.payment_url) {
        // Redirect to Zarinpal / Mock Gateway
        window.location.href = res.payment_url;
      }
    } catch (err: any) {
      setError(err.message || 'خطا در ثبت سفارش');
      setLoading(false);
    }
  };

  if (!show) return null;

  // Calculate Total Price
  const totalPrice =
    show.ticketing_mode === 'SEAT_SELECTION'
      ? selectedSeats.reduce((sum, s) => sum + s.price, 0)
      : (selectedSession?.price_tiers[0]?.price_toman || 200000) * quantity;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-md overflow-y-auto animate-in fade-in">
      <div
        className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-auto flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-900/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
              {step === 'session' && <Calendar className="w-5 h-5" />}
              {step === 'seats' && <Armchair className="w-5 h-5" />}
              {step === 'auth' && <Phone className="w-5 h-5" />}
              {step === 'review' && <CreditCard className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white">
                خرید بلیت: {show.title}
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {step === 'session' && 'مرحله ۱ از ۴: انتخاب تاریخ و سانس نمایش'}
                {step === 'seats' && (show.ticketing_mode === 'SEAT_SELECTION' ? 'مرحله ۲ از ۴: انتخاب صندلی‌های مورد نظر' : 'مرحله ۲ از ۴: تعیین تعداد بلیت')}
                {step === 'auth' && 'مرحله ۳ از ۴: احراز هویت پیامکی'}
                {step === 'review' && 'مرحله ۴ از ۴: بازبینی سفارش و اتصال به درگاه'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Hold Countdown Banner (Active during seat selection) */}
        {holdExpiresAt && (
          <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 flex items-center justify-between text-amber-700 dark:text-amber-300 text-xs font-semibold">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 animate-spin" />
              <span>صندلی‌های انتخابی به مدت ۱۰ دقیقه برای شما رزرو موقت گردیدند.</span>
            </div>
            <span className="font-mono font-bold bg-amber-500/20 px-2 py-0.5 rounded-md">
              {toPersianDigits(holdTimeLeft)}
            </span>
          </div>
        )}

        {/* Error Notification */}
        {error && (
          <div className="mx-6 mt-4 p-3 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Step 1: Choose Session */}
        {step === 'session' && (
          <div className="p-6 space-y-4 overflow-y-auto flex-1">
            <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400">
              لطفاً یکی از سانس‌های باز زیر را انتخاب نمایید:
            </h4>

            {sessions.length === 0 ? (
              <div className="text-center py-10 text-xs text-slate-500">
                هیچ سانسی برای این نمایش یافت نشد.
              </div>
            ) : (
              <div className="space-y-2.5">
                {sessions.map((ses) => {
                  const isSelected = selectedSession?.id === ses.id;
                  return (
                    <div
                      key={ses.id}
                      onClick={() => setSelectedSession(ses)}
                      className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                        isSelected
                          ? 'border-blue-600 bg-blue-50/80 dark:bg-blue-950/40 shadow-sm'
                          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-blue-600" />
                          <span>{ses.start_at_jalali || formatJalaliDate(ses.start_at)}</span>
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          ظرفیت کل سالن: {toPersianDigits(ses.capacity)} صندلی
                        </div>
                      </div>

                      <div className="text-left">
                        <span
                          className={`inline-block px-3 py-1 rounded-xl text-xs font-bold ${
                            isSelected
                              ? 'bg-blue-600 text-white'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          {isSelected ? 'انتخاب شده' : 'انتخاب'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Step 2: Choose Seats / Quantity */}
        {step === 'seats' && (
          <div className="p-6 space-y-6 overflow-y-auto flex-1">
            {show.ticketing_mode === 'SEAT_SELECTION' ? (
              <div>
                {/* Stage Indicator */}
                <div className="mb-4 flex flex-col items-center">
                  <div className="w-3/4 h-2 bg-blue-500 rounded-full shadow-md shadow-blue-500/50" />
                  <span className="text-[11px] font-bold text-slate-400 mt-1 uppercase tracking-wider">
                    صحنه نمایش (Stage)
                  </span>
                </div>

                {/* Mobile scroll hint */}
                <div className="md:hidden mb-3 text-center py-1.5 px-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 text-[11px] font-bold border border-blue-100 dark:border-blue-900/60">
                  ↔️ برای مشاهده و انتخاب تمام صندلی‌ها به چپ یا راست بکشید
                </div>

                {/* Seat Map Legend */}
                <div className="flex flex-wrap items-center justify-center gap-3 text-[11px] text-slate-600 dark:text-slate-400 mb-6 bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-2xl border border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-1.5">
                    <span className="w-4 h-4 rounded-md bg-emerald-500 text-white flex items-center justify-center text-[9px] font-bold">✓</span>
                    <span>قابل خرید</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-4 h-4 rounded-md bg-blue-600" />
                    <span>انتخاب شما</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-4 h-4 rounded-md bg-amber-500 text-white flex items-center justify-center text-[9px]">
                      <Lock className="w-2.5 h-2.5" />
                    </span>
                    <span>رزرو موقت ۱۰ دقیقه‌ای</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-4 h-4 rounded-md bg-slate-300 dark:bg-slate-700" />
                    <span>فروخته شده</span>
                  </div>
                </div>

                {/* Sections & Seats Grid */}
                {seatMap && (
                  <div className="space-y-6">
                    {seatMap.sections.map((section) => (
                      <div key={section.section_id} className="space-y-2">
                        <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300 border-b border-slate-100 dark:border-slate-800 pb-1">
                          <span>{section.name}</span>
                          <span className="text-blue-600 dark:text-blue-400 font-extrabold">
                            {formatToman(section.price)}
                          </span>
                        </div>

                        <div className="overflow-x-auto py-2">
                          <div className="flex flex-col gap-2 min-w-max items-center">
                            {section.rows.map((row) => (
                              <div key={row.row_number} className="flex items-center gap-2">
                                <span className="w-6 text-[10px] text-slate-400 font-mono text-center">
                                  ردیف {toPersianDigits(row.row_number)}
                                </span>
                                <div className="flex items-center gap-1.5">
                                  {row.seats.map((seat) => {
                                    const isSelected = selectedSeats.some((s) => s.id === seat.id);
                                    let btnClasses =
                                      'w-7 h-7 sm:w-8 sm:h-8 rounded-lg text-xs font-bold flex items-center justify-center transition-all cursor-pointer ';

                                    if (isSelected) {
                                      btnClasses += 'bg-blue-600 text-white shadow-md shadow-blue-500/30 scale-105';
                                    } else if (seat.status === 'SOLD') {
                                      btnClasses +=
                                        'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed opacity-50';
                                    } else if (seat.status === 'HELD_BY_OTHER') {
                                      btnClasses +=
                                        'bg-amber-500 text-white cursor-not-allowed opacity-80';
                                    } else {
                                      btnClasses +=
                                        'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 hover:bg-emerald-500 hover:text-white';
                                    }

                                    return (
                                      <button
                                        key={seat.id}
                                        type="button"
                                        disabled={seat.status === 'SOLD' || seat.status === 'HELD_BY_OTHER'}
                                        onClick={() => toggleSeat(seat)}
                                        className={btnClasses}
                                        title={`ردیف ${seat.row} - صندلی ${seat.number}`}
                                      >
                                        {seat.status === 'HELD_BY_OTHER' ? (
                                          <Lock className="w-3 h-3" />
                                        ) : (
                                          toPersianDigits(seat.number)
                                        )}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              /* Quantity Selector for General Admission */
              <div className="py-6 flex flex-col items-center space-y-4">
                <div className="text-center">
                  <div className="text-sm font-bold text-slate-900 dark:text-white">
                    تعداد بلیت ورودی عمومی
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    قیمت هر بلیت:{' '}
                    {formatToman(selectedSession?.price_tiers[0]?.price_toman || 200000)}
                  </div>
                </div>

                <div className="flex items-center gap-4 bg-slate-100 dark:bg-slate-800 p-2 rounded-2xl">
                  <button
                    type="button"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-10 h-10 rounded-xl bg-white dark:bg-slate-700 text-slate-800 dark:text-white font-bold text-lg flex items-center justify-center shadow-sm"
                  >
                    -
                  </button>
                  <span className="w-12 text-center text-lg font-black text-slate-900 dark:text-white font-mono">
                    {toPersianDigits(quantity)}
                  </span>
                  <button
                    type="button"
                    onClick={() => setQuantity(Math.min(10, quantity + 1))}
                    className="w-10 h-10 rounded-xl bg-white dark:bg-slate-700 text-slate-800 dark:text-white font-bold text-lg flex items-center justify-center shadow-sm"
                  >
                    +
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 3: Auth (Phone OTP) */}
        {step === 'auth' && (
          <div className="p-6 space-y-5 overflow-y-auto flex-1">
            <div className="text-center space-y-1">
              <h4 className="text-base font-black text-slate-900 dark:text-white">
                ورود یا ثبت‌نام با شماره همراه
              </h4>
              <p className="text-xs text-slate-500">
                جهت صدور بلیت الکترونیک و ارسال کد پیگیری، شماره موبایل خود را تایید فرمایید.
              </p>
            </div>

            <div className="max-w-sm mx-auto space-y-4 pt-2">
              {!otpSent ? (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      شماره موبایل (مثال: ۰۹۱۲۳۴۵۶۷۸۹)
                    </label>
                    <input
                      type="tel"
                      dir="ltr"
                      value={mobile}
                      onChange={(e) => setMobile(e.target.value)}
                      placeholder="0912..."
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-mono text-center focus:border-blue-600 outline-none"
                    />
                  </div>

                  <button
                    type="button"
                    disabled={loading}
                    onClick={handleSendOtp}
                    className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-600/20 transition-all"
                  >
                    {loading ? 'در حال ارسال پیامک...' : 'ارسال کد تایید پیامکی (OTP)'}
                  </button>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      نام و نام خانوادگی خریدار (اختیاری)
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="مثال: علیرضا محمدی"
                      className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:border-blue-600 outline-none"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                        کد تایید ۵ رقمی پیامک شده به {mobile}
                      </span>
                      {debugOtp && (
                        <span className="text-[10px] text-blue-600 font-bold bg-blue-50 dark:bg-blue-950/60 px-1.5 py-0.5 rounded">
                          کد تستی: {debugOtp}
                        </span>
                      )}
                    </div>
                    <input
                      type="text"
                      dir="ltr"
                      maxLength={5}
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value)}
                      placeholder="XXXXX"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-base font-mono text-center tracking-widest focus:border-blue-600 outline-none"
                    />
                  </div>

                  <button
                    type="button"
                    disabled={loading}
                    onClick={handleVerifyOtp}
                    className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition-all"
                  >
                    {loading ? 'در حال بررسی...' : 'تایید کد و ادامه خرید'}
                  </button>
                </>
              )}

              {/* Quick Seed Login Button (Instant bypass for testing) */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={handleQuickSeedLogin}
                  className="w-full py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium text-xs transition-colors"
                >
                  ⚡ ورود سریع به عنوان خریدار تایید شده (09120000003)
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Order Review & Invoice */}
        {step === 'review' && (
          <div className="p-6 space-y-4 overflow-y-auto flex-1">
            <div className="p-4 rounded-2xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900 space-y-3">
              <div className="flex items-center justify-between border-b border-blue-200/60 dark:border-blue-900/60 pb-2">
                <span className="text-xs text-slate-500">عنوان نمایش</span>
                <span className="text-xs font-bold text-slate-900 dark:text-white">{show.title}</span>
              </div>
              <div className="flex items-center justify-between border-b border-blue-200/60 dark:border-blue-900/60 pb-2">
                <span className="text-xs text-slate-500">تاریخ و سانس</span>
                <span className="text-xs font-bold text-slate-900 dark:text-white">
                  {selectedSession?.start_at_jalali || formatJalaliDate(selectedSession?.start_at)}
                </span>
              </div>
              <div className="flex items-center justify-between border-b border-blue-200/60 dark:border-blue-900/60 pb-2">
                <span className="text-xs text-slate-500">خریدار</span>
                <span className="text-xs font-bold text-slate-900 dark:text-white">
                  {user?.name} ({user?.mobile})
                </span>
              </div>
              <div className="flex items-start justify-between border-b border-blue-200/60 dark:border-blue-900/60 pb-2">
                <span className="text-xs text-slate-500">صندلی‌ها / بلیت‌ها</span>
                <div className="text-right text-xs font-semibold text-slate-800 dark:text-slate-200 max-w-[220px]">
                  {show.ticketing_mode === 'SEAT_SELECTION' ? (
                    selectedSeats.map((s) => `ردیف ${toPersianDigits(s.row)}، صندلی ${toPersianDigits(s.number)}`).join(' - ')
                  ) : (
                    `${toPersianDigits(quantity)} بلیت ورودی عمومی`
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between pt-1 text-sm">
                <span className="font-bold text-slate-800 dark:text-slate-200">مبلغ قابل پرداخت</span>
                <span className="text-base font-black text-blue-700 dark:text-blue-400">
                  {formatToman(totalPrice)}
                </span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 text-[11px] text-slate-500 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>پرداخت شما از طریق درگاه رسمی شاپرک / زرین‌پال با تضمین امنیت انجام می‌پذیرد.</span>
            </div>
          </div>
        )}

        {/* Footer Navigation Bar */}
        <div className="p-4 sm:p-6 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex items-center justify-between gap-3">
          {/* Back button */}
          {step !== 'session' ? (
            <button
              type="button"
              onClick={() => {
                setError(null);
                if (step === 'seats') setStep('session');
                else if (step === 'auth') setStep('seats');
                else if (step === 'review') setStep('seats');
              }}
              className="flex items-center gap-1 px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
            >
              <ArrowRight className="w-4 h-4" />
              <span>مرحله قبل</span>
            </button>
          ) : (
            <div />
          )}

          {/* Next CTA button */}
          {step === 'session' && (
            <button
              type="button"
              disabled={!selectedSession || loading}
              onClick={() => selectedSession && loadSeatMap(selectedSession)}
              className="flex items-center gap-1.5 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold shadow-md shadow-blue-600/20 transition-all active:scale-95 disabled:opacity-50"
            >
              <span>انتخاب صندلی</span>
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}

          {step === 'seats' && (
            <div className="flex items-center gap-3">
              <div className="text-left">
                <span className="text-[10px] text-slate-400 block">مجموع مبلغ</span>
                <span className="text-xs sm:text-sm font-black text-blue-700 dark:text-blue-400">
                  {formatToman(totalPrice)}
                </span>
              </div>
              <button
                type="button"
                onClick={handleProceedToAuthOrReview}
                className="flex items-center gap-1.5 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold shadow-md shadow-blue-600/20 transition-all active:scale-95"
              >
                <span>ادامه خرید</span>
                <ArrowLeft className="w-4 h-4" />
              </button>
            </div>
          )}

          {step === 'review' && (
            <button
              type="button"
              disabled={loading}
              onClick={handleCheckoutAndPay}
              className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-black shadow-lg shadow-emerald-600/25 transition-all active:scale-95 disabled:opacity-50"
            >
              <CreditCard className="w-4 h-4" />
              <span>{loading ? 'در حال انتقال...' : 'پرداخت و انتقال به درگاه زرین‌پال'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
