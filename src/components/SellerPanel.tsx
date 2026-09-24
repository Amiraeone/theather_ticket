import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { Ticket } from '../types';
import { formatToman, toPersianDigits, formatJalaliDate } from '../lib/persianUtils';
import { TicketDetailModal } from './TicketDetailModal';
import {
  Store,
  QrCode,
  CreditCard,
  Banknote,
  CheckCircle2,
  AlertTriangle,
  Search,
  Printer,
  Calendar,
  Layers,
  DollarSign,
  Users,
  RefreshCw,
  Clock,
  History,
  ShieldCheck,
  Check,
  ChevronLeft,
  Info,
  MapPin,
  Lock,
} from 'lucide-react';

export const SellerPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'scan' | 'offline_sale' | 'history' | 'stats'>('scan');
  const [shows, setShows] = useState<any[]>([]);
  const [selectedShow, setSelectedShow] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);

  // Check-In Scanner State
  const [ticketInput, setTicketInput] = useState('');
  const [checkInResult, setCheckInResult] = useState<any>(null);
  const [checkInLoading, setCheckInLoading] = useState(false);

  // Check-In History Logs State
  const [checkInLogs, setCheckInLogs] = useState<any[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [historyFilterShowId, setHistoryFilterShowId] = useState<string>('all');

  // Offline Box Office State
  const [offlineShowId, setOfflineShowId] = useState('');
  const [offlineSessions, setOfflineSessions] = useState<any[]>([]);
  const [offlineSessionId, setOfflineSessionId] = useState('');
  const [offlineSeatMap, setOfflineSeatMap] = useState<any>(null);
  const [offlineSelectedSeats, setOfflineSelectedSeats] = useState<any[]>([]);
  const [offlineQuantity, setOfflineQuantity] = useState(1);
  const [offlineMethod, setOfflineMethod] = useState<'pos' | 'cash'>('pos');
  const [offlineBuyerName, setOfflineBuyerName] = useState('');
  const [offlineBuyerMobile, setOfflineBuyerMobile] = useState('');
  const [offlineIssuedTickets, setOfflineIssuedTickets] = useState<Ticket[]>([]);
  const [offlineLoading, setOfflineLoading] = useState(false);
  const [offlineSuccessMsg, setOfflineSuccessMsg] = useState<string | null>(null);

  // Ticket Preview Modal
  const [viewTicket, setViewTicket] = useState<Ticket | null>(null);

  const loadSellerData = async () => {
    try {
      const res = await api.getSellerShows();
      if (res.success) {
        setShows(res.data);
        if (res.data.length > 0) {
          // If no selectedShow yet or current is not in list, pick first
          setSelectedShow((prev: any) => {
            const exists = res.data.find((s: any) => s.id === prev?.id);
            return exists || res.data[0];
          });
          setOfflineShowId((prev) => {
            const exists = res.data.find((s: any) => s.id === prev);
            return exists ? prev : res.data[0].id;
          });
        }
      }
      loadStats(selectedShow?.id);
      loadCheckInLogs(selectedShow?.id);
    } catch (err) {
      console.error(err);
    }
  };

  const loadStats = async (showId?: string) => {
    try {
      const stRes = await api.getSellerStats(showId);
      if (stRes.success) setStats(stRes.data);
    } catch (err) {
      console.error(err);
    }
  };

  const loadCheckInLogs = async (showId?: string) => {
    setLogsLoading(true);
    try {
      const filterId = showId && showId !== 'all' ? showId : undefined;
      const res = await api.getSellerCheckInLogs(filterId);
      if (res.success) {
        setCheckInLogs(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLogsLoading(false);
    }
  };

  useEffect(() => {
    loadSellerData();
  }, []);

  // When selectedShow changes, reload stats and checkin logs if in history tab
  const handleSelectShow = (show: any) => {
    setSelectedShow(show);
    setOfflineShowId(show.id);
    setCheckInResult(null);
    setTicketInput('');
    loadStats(show.id);
    loadCheckInLogs(show.id);
  };

  // When offline show changes, load sessions
  useEffect(() => {
    if (!offlineShowId) return;
    api.getShowDetail(offlineShowId).then((res) => {
      if (res.success && res.data.sessions) {
        setOfflineSessions(res.data.sessions);
        if (res.data.sessions.length > 0) {
          setOfflineSessionId(res.data.sessions[0].id);
        }
      }
    });
  }, [offlineShowId]);

  // When offline session changes, load seatmap
  useEffect(() => {
    if (!offlineSessionId) return;
    api.getSessionSeatMap(offlineSessionId).then((res) => {
      if (res.success) {
        setOfflineSeatMap(res.data);
        setOfflineSelectedSeats([]);
      }
    });
  }, [offlineSessionId]);

  // Check In Ticket
  const handleCheckIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketInput.trim() || !selectedShow) return;
    setCheckInLoading(true);
    setCheckInResult(null);
    try {
      const res = await api.checkInTicket(ticketInput.trim(), selectedShow.id);
      setCheckInResult(res);
      // Reload stats and history log
      loadStats(selectedShow.id);
      loadCheckInLogs(selectedShow.id);
      if (res.success) {
        setTicketInput('');
      }
    } catch (err: any) {
      setCheckInResult({
        success: false,
        status_code: 'ERROR',
        message: err.message || 'خطا در بررسی بلیت',
      });
    } finally {
      setCheckInLoading(false);
    }
  };

  // Submit Offline Box-office Order
  const handleOfflineSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!offlineSessionId) return;
    const currentShow = shows.find((s) => s.id === offlineShowId);

    if (currentShow?.ticketing_mode === 'SEAT_SELECTION' && offlineSelectedSeats.length === 0) {
      alert('لطفاً حداقل یک صندلی انتخاب فرمایید.');
      return;
    }

    setOfflineLoading(true);
    setOfflineSuccessMsg(null);
    try {
      const res = await api.createOfflineOrder({
        session_id: offlineSessionId,
        seat_ids: currentShow?.ticketing_mode === 'SEAT_SELECTION' ? offlineSelectedSeats.map((s) => s.id) : undefined,
        quantity: currentShow?.ticketing_mode === 'QUANTITY_ONLY' ? offlineQuantity : undefined,
        payment_method: offlineMethod,
        buyer_name: offlineBuyerName || 'خریدار حضوری گیشه',
        buyer_mobile: offlineBuyerMobile || '09000000000',
      });

      if (res.success) {
        setOfflineSuccessMsg(res.message);
        setOfflineIssuedTickets(res.tickets);
        setOfflineSelectedSeats([]);
        // Reload seatmap & stats
        api.getSessionSeatMap(offlineSessionId).then((sm) => sm.success && setOfflineSeatMap(sm.data));
        loadStats(currentShow?.id);
        loadCheckInLogs(currentShow?.id);
      }
    } catch (err: any) {
      alert(err.message || 'خطا در ثبت فروش حضوری');
    } finally {
      setOfflineLoading(false);
    }
  };

  const selectedOfflineShow = shows.find((s) => s.id === offlineShowId);

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-lg shadow-emerald-500/20 shrink-0">
            <Store className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <h2 className="text-base sm:text-xl font-black text-slate-900 dark:text-white">
              پنل گیشه و کنترل بلیت اختصاصی
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              مدیریت استعلام، ورود و ثبت بلیت‌های نمایش‌های منتسب به گیشه شما با ثبت دائم در تاریخچه
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={loadSellerData}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-200 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          <span>به‌روزرسانی اطلاعات</span>
        </button>
      </div>

      {shows.length === 0 ? (
        <div className="p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center space-y-3">
          <Store className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">
            هنوز هیچ نمایشی به گیشه شما تخصیص نیافته است
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
            دسترسی استعلام و صدور بلیت گیشه، پس از انتساب شما توسط مدیر ارشد به نمایش‌ها فعال خواهد شد. شما تنها مجاز به استعلام و فروش نمایش‌های دارای مجوز هستید.
          </p>
        </div>
      ) : (
        <>
          {/* SECTION 1: THEATRE SHOW SELECTOR CARDS (Shows assigned to this seller) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <h3 className="font-black text-sm text-slate-900 dark:text-white">
                  نمایش‌های تحت مدیریت گیشه شما ({toPersianDigits(shows.length)} نمایش)
                </h3>
              </div>
              <span className="text-[11px] text-slate-500 hidden sm:inline">
                جهت استعلام یا صدور بلیت، روی نمایش موردنظر کلیک فرمایید
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {shows.map((show) => {
                const isSelected = selectedShow?.id === show.id;
                return (
                  <button
                    key={show.id}
                    type="button"
                    onClick={() => handleSelectShow(show)}
                    className={`relative p-3.5 rounded-2xl text-right transition-all flex items-center gap-3 border ${
                      isSelected
                        ? 'bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-500 ring-2 ring-emerald-500/20 shadow-md'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-xs'
                    }`}
                  >
                    <img
                      src={show.poster_url}
                      alt={show.title}
                      className="w-14 h-18 rounded-xl object-cover shrink-0 shadow-xs"
                    />
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <h4 className="font-black text-xs sm:text-sm text-slate-900 dark:text-white truncate">
                          {show.title}
                        </h4>
                        {isSelected && (
                          <span className="w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
                            <Check className="w-2.5 h-2.5 stroke-[3]" />
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1 text-[11px] text-slate-500">
                        <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="truncate">{show.venue_name || 'سالن تئاتر'}</span>
                      </div>

                      <div className="flex items-center gap-2 pt-1 text-[10px] text-slate-600 dark:text-slate-300">
                        <span className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded font-bold">
                          {toPersianDigits(show.sessions_count || 0)} سانس
                        </span>
                        <span className="bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.5 rounded font-bold">
                          {toPersianDigits(show.attendees_count || 0)} ورودی
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ACTIVE SHOW BANNER */}
          {selectedShow && (
            <div className="p-3.5 sm:p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 font-bold">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400">
                      گیشه فعال در حال حاضر:
                    </span>
                    <h3 className="font-black text-sm sm:text-base text-slate-900 dark:text-white">
                      «{selectedShow.title}»
                    </h3>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    استعلام و ثبت بلیت در این حالت تنها برای بلیت‌های مجاز این نمایش انجام خواهد شد.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 text-xs self-end sm:self-auto">
                <div className="text-right">
                  <span className="text-[10px] text-slate-500 block">فروش کل:</span>
                  <span className="font-extrabold text-blue-600 dark:text-blue-400">
                    {formatToman(selectedShow.revenue_toman || 0)}
                  </span>
                </div>
                <div className="text-right border-r border-slate-200 dark:border-slate-700 pr-3">
                  <span className="text-[10px] text-slate-500 block">ورود قطعی:</span>
                  <span className="font-extrabold text-emerald-600 dark:text-emerald-400">
                    {toPersianDigits(selectedShow.attendees_count || 0)} نفر
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Overview Stat Cards for active show / all */}
          {stats && (
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
                <div className="space-y-1">
                  <span className="text-xs text-slate-500">درآمد حاصله</span>
                  <div className="text-sm sm:text-lg font-black text-blue-700 dark:text-blue-400 truncate">
                    {formatToman(stats.total_revenue)}
                  </div>
                </div>
                <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 flex items-center justify-center shrink-0">
                  <DollarSign className="w-5 h-5" />
                </div>
              </div>

              <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
                <div className="space-y-1">
                  <span className="text-xs text-slate-500">کل بلیت‌های صادر شده</span>
                  <div className="text-sm sm:text-lg font-black text-emerald-600 dark:text-emerald-400">
                    {toPersianDigits(stats.total_tickets)} بلیت
                  </div>
                </div>
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center shrink-0">
                  <Layers className="w-5 h-5" />
                </div>
              </div>

              <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between col-span-2 lg:col-span-1">
                <div className="space-y-1">
                  <span className="text-xs text-slate-500">تعداد تماشاگران وارد شده (چک‌این)</span>
                  <div className="text-sm sm:text-lg font-black text-purple-600 dark:text-purple-400">
                    {toPersianDigits(stats.total_attendees)} نفر
                  </div>
                </div>
                <div className="w-10 h-10 rounded-2xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 flex items-center justify-center shrink-0">
                  <Users className="w-5 h-5" />
                </div>
              </div>
            </div>
          )}

          {/* Navigation Tabs */}
          <div className="flex border-b border-slate-200 dark:border-slate-800 gap-2 sm:gap-4 text-xs font-bold overflow-x-auto">
            <button
              onClick={() => setActiveTab('scan')}
              className={`pb-3 border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                activeTab === 'scan'
                  ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
              }`}
            >
              <QrCode className="w-4 h-4" />
              <span>استعلام و ثبت ورود (Check-in)</span>
            </button>

            <button
              onClick={() => setActiveTab('offline_sale')}
              className={`pb-3 border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                activeTab === 'offline_sale'
                  ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
              }`}
            >
              <CreditCard className="w-4 h-4" />
              <span>فروش حضوری گیشه (کارتخوان / نقدی)</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('history');
                loadCheckInLogs(selectedShow?.id);
              }}
              className={`pb-3 border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                activeTab === 'history'
                  ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
              }`}
            >
              <History className="w-4 h-4" />
              <span>تاریخچه استعلام و بلیت‌های باطل‌شده</span>
            </button>

            <button
              onClick={() => setActiveTab('stats')}
              className={`pb-3 border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                activeTab === 'stats'
                  ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
              }`}
            >
              <Calendar className="w-4 h-4" />
              <span>گزارشات و فروش روزانه</span>
            </button>
          </div>

          {/* TAB 1: SCANNER & CHECK-IN */}
          {activeTab === 'scan' && (
            <div className="max-w-xl mx-auto space-y-6">
              <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-md space-y-5">
                <div className="text-center space-y-1">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-xs font-bold mb-1">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>گیشه فعال: {selectedShow?.title}</span>
                  </div>
                  <h3 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center justify-center gap-2">
                    <QrCode className="w-5 h-5 text-emerald-600" />
                    استعلام اصالت و ثبت ورود بلیت
                  </h3>
                  <p className="text-xs text-slate-500">
                    کد بلیت یا بارکد خوانده شده با بارکدخوان را وارد نمایید. پس از تأیید، بلیت مصرف و در تاریخچه ثبت می‌شود.
                  </p>
                </div>

                <form onSubmit={handleCheckIn} className="space-y-4">
                  <div className="relative">
                    <input
                      type="text"
                      dir="ltr"
                      value={ticketInput}
                      onChange={(e) => setTicketInput(e.target.value)}
                      placeholder="TCK-XXXX-XXXX"
                      className="w-full px-4 py-3 rounded-2xl border-2 border-emerald-500/40 focus:border-emerald-600 bg-slate-50 dark:bg-slate-800 text-center font-mono font-bold text-base outline-none tracking-widest text-slate-900 dark:text-white"
                      autoFocus
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={checkInLoading || !ticketInput}
                    className="w-full py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm shadow-md shadow-emerald-600/20 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {checkInLoading ? (
                      <span>در حال استعلام در دیتابیس...</span>
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4" />
                        <span>استعلام اصالت و ثبت قطعی ورود</span>
                      </>
                    )}
                  </button>
                </form>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 flex items-start gap-2">
                  <Lock className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  <span>
                    <strong>امنیت گیشه:</strong> شما تنها مجاز به استعلام و ثبت ورود بلیت‌های همین نمایش هستید. در صورت اسکن بلیت سایر سالن‌ها یا نمایش‌های دیگر، سیستم از ورود جلوگیری می‌کند.
                  </span>
                </div>
              </div>

              {/* Verification Result Card */}
              {checkInResult && (
                <div
                  className={`p-6 rounded-3xl border shadow-lg space-y-4 animate-in zoom-in-95 ${
                    checkInResult.status_code === 'SUCCESS'
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-100'
                      : checkInResult.status_code === 'ALREADY_USED'
                      ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-100'
                      : 'bg-red-50 dark:bg-red-950/40 border-red-300 dark:border-red-800 text-red-900 dark:text-red-100'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {checkInResult.status_code === 'SUCCESS' ? (
                      <div className="w-12 h-12 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0">
                        <CheckCircle2 className="w-7 h-7" />
                      </div>
                    ) : checkInResult.status_code === 'ALREADY_USED' ? (
                      <div className="w-12 h-12 rounded-full bg-amber-500 text-white flex items-center justify-center shrink-0">
                        <AlertTriangle className="w-7 h-7" />
                      </div>
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-red-500 text-white flex items-center justify-center shrink-0">
                        <AlertTriangle className="w-7 h-7" />
                      </div>
                    )}
                    <div>
                      <h4 className="font-black text-base">
                        {checkInResult.status_code === 'SUCCESS'
                          ? 'ورود مجاز - بلیت معتبر است ✓'
                          : checkInResult.status_code === 'ALREADY_USED'
                          ? 'هشدار: بلیت قبلاً استفاده شده است!'
                          : checkInResult.status_code === 'UNAUTHORIZED_SHOW'
                          ? 'عدم دسترسی به این نمایش'
                          : checkInResult.status_code === 'WRONG_SHOW'
                          ? 'بلیت متعلق به نمایش دیگری است'
                          : 'خطا: بلیت نامعتبر است!'}
                      </h4>
                      <p className="text-xs mt-0.5 opacity-90">{checkInResult.message}</p>
                    </div>
                  </div>

                  {checkInResult.ticket_info && (
                    <div className="p-4 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-current/10 space-y-2 text-xs">
                      <div className="flex justify-between border-b border-current/10 pb-1.5">
                        <span className="opacity-70">نمایش:</span>
                        <span className="font-bold">{checkInResult.ticket_info.show_title}</span>
                      </div>
                      {checkInResult.ticket_info.ticket_code && (
                        <div className="flex justify-between border-b border-current/10 pb-1.5">
                          <span className="opacity-70">شماره سریال بلیت:</span>
                          <span className="font-mono font-bold">{checkInResult.ticket_info.ticket_code}</span>
                        </div>
                      )}
                      <div className="flex justify-between border-b border-current/10 pb-1.5">
                        <span className="opacity-70">صندلی / جایگاه:</span>
                        <span className="font-bold text-blue-600 dark:text-blue-400">
                          {checkInResult.ticket_info.seat_label || 'ورودی عمومی'}
                        </span>
                      </div>
                      <div className="flex justify-between border-b border-current/10 pb-1.5">
                        <span className="opacity-70">نام تماشاگر:</span>
                        <span className="font-semibold">{checkInResult.ticket_info.buyer_name}</span>
                      </div>
                      {checkInResult.ticket_info.buyer_mobile && (
                        <div className="flex justify-between border-b border-current/10 pb-1.5">
                          <span className="opacity-70">شماره تماس:</span>
                          <span className="font-mono" dir="ltr">{checkInResult.ticket_info.buyer_mobile}</span>
                        </div>
                      )}
                      {checkInResult.ticket_info.verified_at && (
                        <div className="flex justify-between text-emerald-600 dark:text-emerald-400 pt-1 font-bold">
                          <span>زمان ابطال و ثبت در تاریخچه:</span>
                          <span dir="ltr">{formatJalaliDate(checkInResult.ticket_info.verified_at)}</span>
                        </div>
                      )}
                      {checkInResult.ticket_info.used_at && (
                        <div className="flex justify-between text-red-600 dark:text-red-400 pt-1 font-bold">
                          <span>زمان ثبت قبلی:</span>
                          <span dir="ltr">{formatJalaliDate(checkInResult.ticket_info.used_at)}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: OFFLINE BOX-OFFICE SALE */}
          {activeTab === 'offline_sale' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-black text-base text-slate-900 dark:text-white">
                      ثبت سفارش حضوری در گیشه
                    </h3>
                    <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-bold">
                      نمایش: {selectedOfflineShow?.title}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div>
                      <label className="block font-semibold mb-1">انتخاب نمایش تحت مدیریت</label>
                      <select
                        value={offlineShowId}
                        onChange={(e) => {
                          setOfflineShowId(e.target.value);
                          const matched = shows.find((s) => s.id === e.target.value);
                          if (matched) setSelectedShow(matched);
                        }}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none"
                      >
                        {shows.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.title}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block font-semibold mb-1">انتخاب سانس</label>
                      <select
                        value={offlineSessionId}
                        onChange={(e) => setOfflineSessionId(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none"
                      >
                        {offlineSessions.map((ses) => (
                          <option key={ses.id} value={ses.id}>
                            {ses.start_at_jalali || formatJalaliDate(ses.start_at)}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Seat Selection / Quantity Grid */}
                  {selectedOfflineShow?.ticketing_mode === 'SEAT_SELECTION' ? (
                    <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                      <div className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        انتخاب صندلی‌های خریدار حضوری:
                      </div>

                      {offlineSeatMap?.sections?.map((section: any) => (
                        <div key={section.section_id} className="space-y-2">
                          <div className="text-xs font-bold text-slate-500">
                            {section.name} - {formatToman(section.price)}
                          </div>
                          <div className="overflow-x-auto py-2">
                            <div className="flex flex-col gap-1.5 min-w-max">
                              {section.rows.map((row: any) => (
                                <div key={row.row_number} className="flex items-center gap-1.5">
                                  <span className="w-12 text-[10px] text-slate-400 font-bold shrink-0">
                                    ردیف {toPersianDigits(row.row_number)}
                                  </span>
                                  <div className="flex gap-1">
                                    {row.seats.map((seat: any) => {
                                      const isChosen = offlineSelectedSeats.some((s) => s.id === seat.id);
                                      const isSold = seat.status === 'sold';
                                      return (
                                        <button
                                          key={seat.id}
                                          type="button"
                                          disabled={isSold}
                                          onClick={() => {
                                            if (isChosen) {
                                              setOfflineSelectedSeats((prev) => prev.filter((s) => s.id !== seat.id));
                                            } else {
                                              setOfflineSelectedSeats((prev) => [
                                                ...prev,
                                                { ...seat, price: section.price, section_name: section.name },
                                              ]);
                                            }
                                          }}
                                          className={`w-7 h-7 rounded-lg text-[10px] font-bold flex items-center justify-center transition-all ${
                                            isSold
                                              ? 'bg-slate-200 dark:bg-slate-700 text-slate-400 cursor-not-allowed'
                                              : isChosen
                                              ? 'bg-emerald-600 text-white shadow-sm'
                                              : 'bg-slate-100 dark:bg-slate-800 hover:bg-emerald-100 dark:hover:bg-emerald-950 text-slate-700 dark:text-slate-300'
                                          }`}
                                          title={`ردیف ${seat.row_number}، صندلی ${seat.seat_number}`}
                                        >
                                          {toPersianDigits(seat.seat_number)}
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
                  ) : (
                    <div className="space-y-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                        تعداد بلیت ورودی:
                      </label>
                      <div className="flex items-center gap-3">
                        <input
                          type="number"
                          min="1"
                          max="20"
                          value={offlineQuantity}
                          onChange={(e) => setOfflineQuantity(Number(e.target.value) || 1)}
                          className="w-24 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-center font-bold text-sm outline-none"
                        />
                        <span className="text-xs text-slate-500">نفر</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Sidebar: Payment & Issue */}
              <div className="space-y-4">
                <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 text-xs">
                  <h4 className="font-black text-sm text-slate-900 dark:text-white">روش پرداخت و مشخصات</h4>

                  <div>
                    <label className="block font-semibold mb-1">روش تسویه در گیشه</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setOfflineMethod('pos')}
                        className={`p-3 rounded-2xl border flex flex-col items-center gap-1 font-bold ${
                          offlineMethod === 'pos'
                            ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300'
                            : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        <CreditCard className="w-5 h-5" />
                        <span>دستگاه کارتخوان (POS)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setOfflineMethod('cash')}
                        className={`p-3 rounded-2xl border flex flex-col items-center gap-1 font-bold ${
                          offlineMethod === 'cash'
                            ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300'
                            : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        <Banknote className="w-5 h-5" />
                        <span>پرداخت نقدی</span>
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold mb-1">نام خریدار (اختیاری)</label>
                    <input
                      type="text"
                      value={offlineBuyerName}
                      onChange={(e) => setOfflineBuyerName(e.target.value)}
                      placeholder="خریدار حضوری"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold mb-1">شماره همراه خریدار (اختیاری)</label>
                    <input
                      type="tel"
                      dir="ltr"
                      value={offlineBuyerMobile}
                      onChange={(e) => setOfflineBuyerMobile(e.target.value)}
                      placeholder="09..."
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none text-center font-mono"
                    />
                  </div>

                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-sm">
                    <span className="font-bold">مجموع مبلغ:</span>
                    <span className="font-black text-blue-600 dark:text-blue-400">
                      {formatToman(
                        selectedOfflineShow?.ticketing_mode === 'SEAT_SELECTION'
                          ? offlineSelectedSeats.reduce((sum, s) => sum + s.price, 0)
                          : (offlineSessions[0]?.price_tiers[0]?.price_toman || 200000) * offlineQuantity
                      )}
                    </span>
                  </div>

                  <button
                    type="button"
                    disabled={offlineLoading}
                    onClick={handleOfflineSubmit}
                    className="w-full py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold shadow-md shadow-emerald-600/20 transition-all active:scale-95 disabled:opacity-50"
                  >
                    {offlineLoading ? 'در حال صدور بلیت...' : 'تایید دریافت وجه و صدور بلیت'}
                  </button>
                </div>

                {/* Issued Tickets for Printing */}
                {offlineIssuedTickets.length > 0 && (
                  <div className="p-4 rounded-3xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 space-y-2">
                    <div className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
                      بلیت‌های صادر شده ({toPersianDigits(offlineIssuedTickets.length)} عدد):
                    </div>
                    <div className="space-y-1.5">
                      {offlineIssuedTickets.map((t) => (
                        <div
                          key={t.id}
                          className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800 flex items-center justify-between text-xs"
                        >
                          <div>
                            <div className="font-mono font-bold text-slate-800 dark:text-white">
                              {t.code}
                            </div>
                            <div className="text-[11px] text-slate-500">{t.seat_label}</div>
                          </div>
                          <button
                            onClick={() => setViewTicket(t)}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 text-white text-[11px] font-bold hover:bg-emerald-700"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            <span>چاپ / QR</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: CHECK-IN HISTORY & ARCHIVE (PERMANENT LOG) */}
          {activeTab === 'history' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
                <div className="space-y-0.5">
                  <h4 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                    <History className="w-4 h-4 text-emerald-600" />
                    تاریخچه استعلام و بلیت‌های مصرف‌شده در گیشه
                  </h4>
                  <p className="text-xs text-slate-500">
                    تمامی بلیت‌هایی که توسط گیشه استعلام، بررسی و ثبت ورود شده‌اند برای همیشه در این تاریخچه بایگانی می‌مانند.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-500 shrink-0">فیلتر نمایش:</span>
                  <select
                    value={historyFilterShowId}
                    onChange={(e) => {
                      setHistoryFilterShowId(e.target.value);
                      loadCheckInLogs(e.target.value === 'all' ? undefined : e.target.value);
                    }}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold outline-none"
                  >
                    <option value="all">همه نمایش‌های من</option>
                    {shows.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {logsLoading ? (
                <div className="text-center py-12 text-xs text-slate-400">در حال دریافت تاریخچه...</div>
              ) : checkInLogs.length === 0 ? (
                <div className="p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center space-y-2">
                  <History className="w-10 h-10 text-slate-300 mx-auto" />
                  <div className="text-sm font-bold text-slate-700 dark:text-slate-300">
                    هنوز هیچ استعلام یا ورودی ثبت نشده است
                  </div>
                  <p className="text-xs text-slate-500">
                    به محض اسکن بارکد یا وارد کردن کد بلیت در تب «استعلام و ثبت ورود»، اطلاعات در اینجا ذخیره خواهد شد.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
                  <table className="w-full text-right text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-500 border-b border-slate-200 dark:border-slate-800 font-bold">
                      <tr>
                        <th className="p-3.5">کد بلیت</th>
                        <th className="p-3.5">نام نمایش</th>
                        <th className="p-3.5">جایگاه / صندلی</th>
                        <th className="p-3.5">خریدار</th>
                        <th className="p-3.5">مسئول ثبت</th>
                        <th className="p-3.5">زمان ثبت در گیشه</th>
                        <th className="p-3.5 text-center">وضعیت بلیت</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                      {checkInLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                          <td className="p-3.5 font-mono font-bold text-slate-900 dark:text-white">
                            {log.ticket_code}
                          </td>
                          <td className="p-3.5 font-bold">
                            {log.show_title || 'نامشخص'}
                          </td>
                          <td className="p-3.5 font-semibold text-blue-600 dark:text-blue-400">
                            {log.seat_label || 'ورودی عمومی'}
                          </td>
                          <td className="p-3.5">
                            <div>{log.buyer_name || 'خریدار حضوری'}</div>
                            {log.buyer_mobile && (
                              <span className="text-[10px] text-slate-400 font-mono" dir="ltr">
                                {log.buyer_mobile}
                              </span>
                            )}
                          </td>
                          <td className="p-3.5 text-slate-500 font-bold">
                            {log.seller_name || 'مسئول گیشه'}
                          </td>
                          <td className="p-3.5 text-slate-500 text-[11px] font-mono" dir="ltr">
                            {formatJalaliDate(log.timestamp)}
                          </td>
                          <td className="p-3.5 text-center">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>استفاده‌شده (باطل)</span>
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: DAILY STATS & REPORTS */}
          {activeTab === 'stats' && (
            <div className="space-y-4">
              <div className="overflow-x-auto rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-500 border-b border-slate-200 dark:border-slate-800 font-bold">
                    <tr>
                      <th className="p-3.5">تاریخ</th>
                      <th className="p-3.5">تعداد بلیت فروخته شده</th>
                      <th className="p-3.5">مبلغ کل فروش</th>
                      <th className="p-3.5">تعداد ورودی‌ها (چک‌این)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                    {stats?.daily_breakdown?.map((day: any) => (
                      <tr key={day.date}>
                        <td className="p-3.5 font-bold font-mono">{day.date}</td>
                        <td className="p-3.5 font-bold text-emerald-600">
                          {toPersianDigits(day.tickets_sold)} بلیت
                        </td>
                        <td className="p-3.5 font-extrabold text-blue-600 dark:text-blue-400">
                          {formatToman(day.amount)}
                        </td>
                        <td className="p-3.5 font-semibold text-purple-600">
                          {toPersianDigits(day.attendees)} نفر
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* View Ticket Modal */}
      {viewTicket && <TicketDetailModal ticket={viewTicket} onClose={() => setViewTicket(null)} />}
    </div>
  );
};
