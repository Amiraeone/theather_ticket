import React, { useEffect, useState, useRef } from 'react';
import { Show, ShowSession } from '../types';
import { api } from '../lib/api';
import { formatToman, toPersianDigits, formatJalaliDate } from '../lib/persianUtils';
import {
  ArrowRight,
  Share2,
  Calendar,
  Clock,
  MapPin,
  Users,
  Armchair,
  ShieldCheck,
  ChevronLeft,
  Check,
  Sparkles,
  Info,
  Building,
  AlertCircle,
} from 'lucide-react';

interface ShowDetailPageProps {
  show: Show;
  onBack: () => void;
  onBookSession: (show: Show, session?: ShowSession) => void;
}

export const ShowDetailPage: React.FC<ShowDetailPageProps> = ({
  show,
  onBack,
  onBookSession,
}) => {
  const [detail, setDetail] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const sessionsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setLoading(true);
    api
      .getShowDetail(show.slug || show.id)
      .then((res) => {
        if (res.success) {
          setDetail(res.data);
        }
      })
      .catch((err) => {
        console.error('Failed to load show detail:', err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [show]);

  const currentShow = detail || show;
  const sessions: ShowSession[] = currentShow.sessions || [];
  const venue = currentShow.venue || {
    name: currentShow.venue_name || 'سالن اصلی تئاتر',
    city: currentShow.venue_city || 'تهران',
    address: 'خیابان حافظ، پایین‌تر از چهارراه کالج، تالار وحدت',
    capacity: 250,
  };

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: currentShow.title,
          text: `خرید بلیت نمایش تئاتر ${currentShow.title}`,
          url,
        });
        return;
      } catch (e) {
        // Fallback to clipboard
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (e) {}
  };

  const scrollToSessions = () => {
    if (sessionsRef.current) {
      sessionsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="min-h-screen pb-24 animate-in fade-in duration-300">
      {/* Top Navigation & Breadcrumbs Bar */}
      <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 sticky top-16 z-30">
        <div className="container mx-auto px-3 sm:px-4 h-12 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 sm:gap-3 truncate">
            <button
              type="button"
              onClick={onBack}
              className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 font-bold transition-colors shrink-0"
            >
              <ArrowRight className="w-4 h-4" />
              <span>بازگشت به نمایش‌ها</span>
            </button>
            <span className="text-slate-300 dark:text-slate-700 hidden sm:inline">|</span>
            <div className="hidden sm:flex items-center gap-1.5 text-slate-400 truncate">
              <span>نمایش‌های روی صحنه</span>
              <span>/</span>
              <span className="text-slate-800 dark:text-slate-200 font-semibold truncate">
                {currentShow.title}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleShare}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors shrink-0"
              title="اشتراک‌گذاری این نمایش"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-600 font-bold">کپی شد!</span>
                </>
              ) : (
                <>
                  <Share2 className="w-3.5 h-3.5" />
                  <span>اشتراک‌گذاری</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-8">
        {/* HERO SECTION: Atmospheric Cinematic Presentation */}
        <section className="relative rounded-3xl overflow-hidden bg-slate-950 border border-slate-800 shadow-2xl">
          {/* Blurred Backdrop */}
          <div className="absolute inset-0">
            <img
              src={currentShow.poster_url}
              alt={currentShow.title}
              className="w-full h-full object-cover opacity-20 blur-xl scale-125"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/80 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/90 to-transparent hidden md:block" />
          </div>

          <div className="relative z-10 p-5 sm:p-8 lg:p-10 flex flex-col md:flex-row items-center md:items-end justify-between gap-6 sm:gap-10">
            {/* Poster Card */}
            <div className="w-48 sm:w-60 md:w-72 aspect-[3/4] rounded-2xl overflow-hidden shadow-2xl border-2 border-white/20 shrink-0 bg-slate-900 group">
              <img
                src={currentShow.poster_url}
                alt={currentShow.title}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
            </div>

            {/* Metadata & Title */}
            <div className="flex-1 text-center md:text-right text-white space-y-4 max-w-2xl">
              {/* Category & Attributes */}
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 text-xs">
                <span className="px-3 py-1 rounded-xl bg-blue-600 text-white font-bold shadow-md shadow-blue-600/30">
                  {currentShow.category}
                </span>

                <span className="px-2.5 py-1 rounded-xl bg-white/10 backdrop-blur-md text-white font-medium border border-white/10">
                  رده سنی {currentShow.age_rating}
                </span>

                {currentShow.ticketing_mode === 'SEAT_SELECTION' ? (
                  <span className="px-2.5 py-1 rounded-xl bg-emerald-600/80 text-white font-medium backdrop-blur-md flex items-center gap-1">
                    <Armchair className="w-3.5 h-3.5" />
                    انتخاب صندلی در سالن
                  </span>
                ) : (
                  <span className="px-2.5 py-1 rounded-xl bg-purple-600/80 text-white font-medium backdrop-blur-md flex items-center gap-1">
                    <Users className="w-3.5 h-3.5" />
                    ورودی عمومی
                  </span>
                )}
              </div>

              {/* Title */}
              <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black leading-tight tracking-tight">
                {currentShow.title}
              </h1>

              {/* Quick Info Bar */}
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-x-5 gap-y-2 text-xs sm:text-sm text-slate-300">
                {currentShow.director && (
                  <div>
                    کارگردان: <span className="text-white font-bold">{currentShow.director}</span>
                  </div>
                )}
                <div className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-blue-400 shrink-0" />
                  <span>مدت زمان: {toPersianDigits(currentShow.duration_minutes)} دقیقه</span>
                </div>
                {venue?.name && (
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>{venue.name}</span>
                  </div>
                )}
              </div>

              {/* Price & Primary Call To Action */}
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center md:justify-start gap-4">
                <button
                  type="button"
                  onClick={scrollToSessions}
                  className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black text-sm shadow-xl shadow-blue-600/30 transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Calendar className="w-4 h-4" />
                  <span>مشاهده سانس‌ها و خرید بلیت</span>
                </button>

                {currentShow.min_price ? (
                  <div className="text-center sm:text-right">
                    <span className="text-[11px] text-slate-400 block">شروع قیمت بلیت</span>
                    <span className="text-base sm:text-lg font-extrabold text-blue-400">
                      از {formatToman(currentShow.min_price)}
                    </span>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </section>

        {/* MAIN BODY: Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* RIGHT COLUMN: Synopsis, Cast, Venue Info, Rules (8 Cols on LG) */}
          <div className="lg:col-span-8 space-y-8">
            {/* Synopsis Section */}
            <section className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <div className="flex items-center gap-2.5 text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-3">
                <Sparkles className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <h2 className="text-base sm:text-lg font-black">درباره اثر و خلاصه داستان</h2>
              </div>
              <div className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed text-justify whitespace-pre-line space-y-2">
                {currentShow.description ? (
                  currentShow.description
                ) : (
                  <p className="text-slate-400">توضیحاتی برای این نمایش ثبت نشده است.</p>
                )}
              </div>
            </section>

            {/* Cast & Crew Section */}
            {currentShow.cast_members && currentShow.cast_members.length > 0 && (
              <section className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div className="flex items-center gap-2.5 text-slate-900 dark:text-white">
                    <Users className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                    <h2 className="text-base sm:text-lg font-black">عوامل، بازیگران و طراحان</h2>
                  </div>
                  <span className="text-xs text-slate-400">
                    {toPersianDigits(currentShow.cast_members.length)} نفر
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {currentShow.cast_members.map((member: any, idx: number) => {
                    const isObj = typeof member === 'object' && member !== null;
                    const role = isObj ? member.role : 'عوامل';
                    const name = isObj ? member.name : member;

                    return (
                      <div
                        key={idx}
                        className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/80 flex flex-col justify-center space-y-1 transition-all hover:border-blue-400"
                      >
                        <span className="text-[11px] font-extrabold text-blue-600 dark:text-blue-400">
                          {role}
                        </span>
                        <span className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-100">
                          {name}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Venue & Hall Details */}
            {venue && (
              <section className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                <div className="flex items-center gap-2.5 text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-3">
                  <Building className="w-5 h-5 text-amber-500" />
                  <h2 className="text-base sm:text-lg font-black">اطلاعات سالن و محل برگزاری</h2>
                </div>

                <div className="space-y-3 text-xs sm:text-sm">
                  <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-100">
                    <MapPin className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                    <span>
                      {venue.name} ({venue.city})
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed pr-6">
                    {venue.address}
                  </p>

                  <div className="pt-2 flex flex-wrap items-center gap-3 pr-6 text-xs text-slate-500">
                    <span className="px-3 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 font-semibold">
                      ظرفیت سالن: {toPersianDigits(venue.capacity || 250)} صندلی
                    </span>
                    <span className="px-3 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 font-semibold">
                      سیستم صوتی و آکوستیک حرفه‌ای
                    </span>
                  </div>
                </div>
              </section>
            )}

            {/* Guidelines & Terms */}
            <section className="p-5 sm:p-6 rounded-3xl bg-slate-100/70 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
                <Info className="w-4 h-4 text-blue-600" />
                <span>قوانین و راهنمای تماشاگران</span>
              </div>
              <ul className="text-xs text-slate-600 dark:text-slate-400 space-y-1.5 list-disc list-inside leading-relaxed pr-1">
                <li>حضور تماشاگران گرامی حداقل ۱۵ دقیقه پیش از ساعت شروع در لابی سالن الزامی است.</li>
                <li>پس از آغاز اجرا و بسته شدن درب سالن، به منظور رعایت حقوق هنرمندان امکان ورود وجود ندارد.</li>
                <li>هرگونه عکاسی، ضبط صوت یا تصویربرداری حین اجرای نمایش ممنوع می‌باشد.</li>
                <li>بلیت‌های صادرشده دارای بارکد یکتا بوده و نیازی به چاپ کاغذی نیست (ارائه در گوشی کافی است).</li>
              </ul>
            </section>
          </div>

          {/* LEFT COLUMN: Sessions & Ticket Selection Box (4 Cols on LG, Sticky) */}
          <div ref={sessionsRef} className="lg:col-span-4 space-y-4 lg:sticky lg:top-32">
            <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border-2 border-blue-500/30 dark:border-blue-500/20 shadow-xl space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  <h3 className="font-black text-base text-slate-900 dark:text-white">
                    سانس‌های اجرا
                  </h3>
                </div>
                <span className="text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2.5 py-1 rounded-xl">
                  {toPersianDigits(sessions.length)} سانس
                </span>
              </div>

              {loading ? (
                <div className="text-center py-8 text-xs text-slate-400">
                  در حال بارگذاری سانس‌های نمایش...
                </div>
              ) : sessions.length === 0 ? (
                <div className="text-center py-8 space-y-2 bg-slate-50 dark:bg-slate-800/40 rounded-2xl p-4 border border-dashed border-slate-200 dark:border-slate-700">
                  <AlertCircle className="w-8 h-8 text-amber-500 mx-auto" />
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    در حال حاضر سانسی باز نشده است.
                  </p>
                  <p className="text-[11px] text-slate-400">
                    به‌زودی تاریخ‌های جدید اجرای این اثر اعلام خواهد شد.
                  </p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                  {sessions.map((ses) => {
                    const isClosed = ses.status === 'closed' || ses.status === 'sold_out';
                    return (
                      <div
                        key={ses.id}
                        className={`p-4 rounded-2xl border transition-all ${
                          isClosed
                            ? 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 opacity-60'
                            : 'bg-white dark:bg-slate-800/90 border-slate-200 dark:border-slate-700 hover:border-blue-500 shadow-sm'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="space-y-1">
                            <div className="font-black text-xs sm:text-sm text-slate-900 dark:text-white">
                              {ses.start_at_jalali || formatJalaliDate(ses.start_at)}
                            </div>
                            <div className="flex items-center gap-2 text-[11px] text-slate-500">
                              <span>ظرفیت: {toPersianDigits(ses.capacity)}</span>
                              <span>·</span>
                              <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                                {isClosed ? 'تکمیل ظرفیت' : 'آماده خرید'}
                              </span>
                            </div>
                          </div>

                          <button
                            type="button"
                            disabled={isClosed}
                            onClick={() => onBookSession(currentShow, ses)}
                            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1 shrink-0 ${
                              isClosed
                                ? 'bg-slate-200 dark:bg-slate-700 text-slate-400 cursor-not-allowed'
                                : 'bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-600/20 active:scale-95 cursor-pointer'
                            }`}
                          >
                            <span>خرید بلیت</span>
                            <ChevronLeft className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* General Booking CTA button */}
              {sessions.length > 0 && (
                <button
                  type="button"
                  onClick={() => onBookSession(currentShow, sessions[0])}
                  className="w-full py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs sm:text-sm shadow-lg shadow-emerald-600/25 transition-all flex items-center justify-center gap-2 active:scale-95 cursor-pointer"
                >
                  <Armchair className="w-4 h-4" />
                  <span>انتخاب صندلی و رزرو آنلاین</span>
                </button>
              )}

              <div className="text-[11px] text-slate-400 text-center flex items-center justify-center gap-1.5 pt-1">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                <span>ضمانت اصالت بلیت و بازگشت وجه در صورت لغو اجرا</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* MOBILE STICKY BOTTOM ACTION BAR */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 p-3 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 shadow-2xl flex items-center justify-between gap-3">
        <div>
          <span className="text-[10px] text-slate-400 block">شروع قیمت از</span>
          <span className="text-xs sm:text-sm font-black text-blue-600 dark:text-blue-400">
            {currentShow.min_price ? formatToman(currentShow.min_price) : 'مشاهده در انتخاب سانس'}
          </span>
        </div>

        <button
          type="button"
          onClick={() => {
            if (sessions.length > 0) {
              onBookSession(currentShow, sessions[0]);
            } else {
              scrollToSessions();
            }
          }}
          className="flex-1 max-w-xs py-2.5 sm:py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs sm:text-sm shadow-lg shadow-blue-600/30 flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer"
        >
          <Calendar className="w-4 h-4" />
          <span>انتخاب سانس و خرید بلیت</span>
        </button>
      </div>
    </div>
  );
};
