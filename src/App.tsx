/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { ShowCard } from './components/ShowCard';
import { ShowDetailPage } from './components/ShowDetailPage';
import { BookingModal } from './components/BookingModal';
import { LoginModal } from './components/LoginModal';
import { TicketDetailModal } from './components/TicketDetailModal';
import { UserProfileDashboard } from './components/UserProfileDashboard';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { api } from './lib/api';
import { Show, Ticket, ShowSession } from './types';
import { formatToman } from './lib/persianUtils';
import {
  Sparkles,
  Ticket as TicketIcon,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  ChevronLeft,
} from 'lucide-react';

type AppView = 'home' | 'profile' | 'show-detail';

function MainApp() {
  const { user } = useAuth();
  const [currentView, setCurrentView] = useState<AppView>('home');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('همه');

  const [shows, setShows] = useState<Show[]>([]);
  const [loading, setLoading] = useState(true);

  // Single Show Page state
  const [selectedShowForPage, setSelectedShowForPage] = useState<Show | null>(null);

  // Booking Modal state
  const [selectedShowForBooking, setSelectedShowForBooking] = useState<Show | null>(null);
  const [selectedSessionForBooking, setSelectedSessionForBooking] = useState<ShowSession | null>(null);

  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [viewTicket, setViewTicket] = useState<Ticket | null>(null);

  // Payment Callback Banner
  const [paymentSuccessOrder, setPaymentSuccessOrder] = useState<any>(null);
  const [paymentFailedMsg, setPaymentFailedMsg] = useState<string | null>(null);

  // Navigation helpers for Single Show Page
  const handleOpenShowDetail = (show: Show) => {
    setSelectedShowForPage(show);
    setCurrentView('show-detail');
    const url = new URL(window.location.href);
    url.searchParams.set('show', show.slug || show.id);
    window.history.pushState({}, '', url.toString());
  };

  const handleBackToHome = () => {
    setCurrentView('home');
    setSelectedShowForPage(null);
    const url = new URL(window.location.href);
    url.searchParams.delete('show');
    window.history.pushState({}, '', url.toString());
  };

  // Load shows from backend
  const loadShows = async () => {
    setLoading(true);
    try {
      const res = await api.getShows();
      if (res.success) {
        setShows(res.data);

        // Check if show param was requested in initial URL
        const params = new URLSearchParams(window.location.search);
        const showParam = params.get('show');
        if (showParam) {
          const matched = res.data.find(
            (s: Show) => s.slug === showParam || s.id === showParam
          );
          if (matched) {
            setSelectedShowForPage(matched);
            setCurrentView('show-detail');
          }
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadShows();

    // Check payment callback URL params
    const params = new URLSearchParams(window.location.search);
    const payment = params.get('payment');
    const orderId = params.get('order_id');
    const refId = params.get('ref_id');

    if (payment === 'success' && orderId) {
      api
        .getOrderDetail(orderId)
        .then((res) => {
          if (res.success) {
            setPaymentSuccessOrder({ ...res.data, ref_id: refId });
          }
        })
        .catch(console.error);

      // Clean query params without reloading
      window.history.replaceState({}, '', window.location.pathname);
    } else if (payment === 'failed') {
      setPaymentFailedMsg('پرداخت ناموفق بود یا توسط کاربر لغو گردید.');
      window.history.replaceState({}, '', window.location.pathname);
    }

    // Handle browser forward/back buttons
    const handlePopState = () => {
      const currentParams = new URLSearchParams(window.location.search);
      const showP = currentParams.get('show');
      if (showP) {
        api
          .getShowDetail(showP)
          .then((res) => {
            if (res.success) {
              setSelectedShowForPage(res.data);
              setCurrentView('show-detail');
            }
          })
          .catch(() => {});
      } else {
        setCurrentView('home');
        setSelectedShowForPage(null);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const categories = ['همه', 'تئاتر درام و تراژدی', 'کمدی و طنز', 'موزیکال و پرفورمنس', 'کودک و نوجوان'];

  const filteredShows = shows.filter((show) => {
    const matchesCategory =
      selectedCategory === 'همه' || show.category.toLowerCase().includes(selectedCategory.toLowerCase());
    const matchesSearch =
      !searchQuery ||
      show.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      show.director?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (Array.isArray(show.cast_members) &&
        show.cast_members.some((c: any) =>
          typeof c === 'string'
            ? c.toLowerCase().includes(searchQuery.toLowerCase())
            : c?.name?.toLowerCase().includes(searchQuery.toLowerCase())
        ));
    return matchesCategory && matchesSearch;
  });

  const featuredShow = shows[0];

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
      {/* Top Navbar */}
      <Navbar
        currentView={currentView}
        setCurrentView={(view) => {
          if (view === 'home') {
            handleBackToHome();
          } else {
            setCurrentView(view as any);
          }
        }}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onOpenLogin={() => setIsLoginOpen(true)}
      />

      {/* Payment Success Dialog */}
      {paymentSuccessOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-emerald-300 dark:border-emerald-800 p-5 sm:p-6 space-y-4 text-center">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8 sm:w-9 sm:h-9" />
            </div>

            <div>
              <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
                پرداخت با موفقیت انجام شد!
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                بلیت‌های شما صادر گردیدند و پیامک تایید با شناسه پیگیری به شماره همراه شما ارسال شد.
              </p>
            </div>

            <div className="p-3.5 sm:p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-right space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-500">شماره سفارش:</span>
                <span className="font-mono font-bold text-emerald-700 dark:text-emerald-300">
                  {paymentSuccessOrder.uuid}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">کد رهگیری زرین‌پال:</span>
                <span className="font-mono font-bold">{paymentSuccessOrder.ref_id || 'ZP-982341'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">مجموع پرداختی:</span>
                <span className="font-extrabold text-slate-900 dark:text-white">
                  {formatToman(paymentSuccessOrder.total_amount)}
                </span>
              </div>
            </div>

            {/* Issued Tickets Quick View */}
            {paymentSuccessOrder.tickets && paymentSuccessOrder.tickets.length > 0 && (
              <div className="space-y-2 text-right">
                <div className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  بلیت‌های صادر شده:
                </div>
                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                  {paymentSuccessOrder.tickets.map((t: any) => (
                    <div
                      key={t.id}
                      className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="font-bold text-blue-600 dark:text-blue-400">
                          {t.seat_label || 'ورودی عمومی'}
                        </div>
                        <div className="text-[11px] font-mono text-slate-400">{t.code}</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setPaymentSuccessOrder(null);
                          setViewTicket(t);
                        }}
                        className="px-3 py-1 bg-blue-600 text-white rounded-lg font-bold text-[11px] hover:bg-blue-700"
                      >
                        نمایش بارکد QR
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-2 flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setPaymentSuccessOrder(null);
                  setCurrentView('profile');
                }}
                className="px-5 py-2.5 rounded-xl bg-blue-600 text-white text-xs font-bold shadow-md hover:bg-blue-700 transition-colors"
              >
                مشاهده در حساب کاربری
              </button>
              <button
                type="button"
                onClick={() => setPaymentSuccessOrder(null)}
                className="px-4 py-2.5 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold"
              >
                بستن
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Failed Banner */}
      {paymentFailedMsg && (
        <div className="bg-red-500 text-white text-xs py-3 px-4 flex items-center justify-between">
          <div className="container mx-auto flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            <span>{paymentFailedMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setPaymentFailedMsg(null)}
            className="text-white/80 hover:text-white font-bold"
          >
            ×
          </button>
        </div>
      )}

      {/* VIEW ROUTER */}
      {currentView === 'profile' ? (
        <main className="flex-1">
          <UserProfileDashboard onBackToHome={handleBackToHome} />
        </main>
      ) : currentView === 'show-detail' && selectedShowForPage ? (
        <main className="flex-1">
          <ShowDetailPage
            show={selectedShowForPage}
            onBack={handleBackToHome}
            onBookSession={(show, session) => {
              setSelectedShowForBooking(show);
              setSelectedSessionForBooking(session || null);
            }}
          />
        </main>
      ) : (
        /* HOME VIEW */
        <main className="flex-1 space-y-8 sm:space-y-12">
          {/* Hero Banner / Featured Show */}
          {featuredShow && (
            <section className="relative w-full min-h-[380px] sm:min-h-[440px] bg-slate-950 flex items-center overflow-hidden">
              {/* Background Poster Blur */}
              <img
                src={featuredShow.poster_url}
                alt={featuredShow.title}
                className="absolute inset-0 w-full h-full object-cover opacity-25 blur-md scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/85 to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-black/50" />

              <div className="container mx-auto px-4 relative z-10 py-8 sm:py-12 flex flex-col-reverse md:flex-row items-center justify-between gap-6 sm:gap-8">
                <div className="max-w-xl text-white space-y-3 sm:space-y-4 text-center md:text-right w-full">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-600/90 text-white text-xs font-bold backdrop-blur-md">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>پیشنهاد ویژه تئاتر ایران</span>
                  </div>

                  <h1
                    onClick={() => handleOpenShowDetail(featuredShow)}
                    className="text-xl sm:text-3xl lg:text-4xl font-black leading-tight tracking-tight break-words cursor-pointer hover:text-blue-400 transition-colors"
                  >
                    {featuredShow.title}
                  </h1>

                  <p className="text-xs sm:text-sm text-slate-300 line-clamp-3 leading-relaxed text-justify">
                    {featuredShow.description}
                  </p>

                  <div className="flex flex-wrap items-center justify-center md:justify-start gap-x-4 gap-y-1 text-xs text-slate-300 pt-1">
                    {featuredShow.director && (
                      <div>
                        کارگردان: <span className="text-white font-bold">{featuredShow.director}</span>
                      </div>
                    )}
                    {featuredShow.venue_name && (
                      <div>
                        تالار: <span className="text-white font-bold">{featuredShow.venue_name}</span>
                      </div>
                    )}
                  </div>

                  <div className="pt-2 flex flex-wrap items-center justify-center md:justify-start gap-3">
                    <button
                      type="button"
                      onClick={() => handleOpenShowDetail(featuredShow)}
                      className="px-6 py-2.5 sm:py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs sm:text-sm shadow-xl shadow-blue-600/30 transition-all active:scale-95 flex items-center gap-2 cursor-pointer"
                    >
                      <TicketIcon className="w-4 h-4" />
                      <span>مشاهده جزئیات و خرید بلیت</span>
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Poster Card on Hero */}
                <div
                  onClick={() => handleOpenShowDetail(featuredShow)}
                  className="w-44 sm:w-56 aspect-[3/4] rounded-3xl overflow-hidden shadow-2xl border-4 border-white/10 shrink-0 cursor-pointer hover:scale-105 transition-transform duration-300"
                >
                  <img
                    src={featuredShow.poster_url}
                    alt={featuredShow.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            </section>
          )}

          {/* Shows Grid Section */}
          <div className="container mx-auto px-3 sm:px-4 space-y-6" id="shows">
            {/* Filter Bar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base sm:text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  نمایش‌های روی صحنه
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  جهت مشاهده سانس‌ها، عوامل و رزرو بلیت، روی نمایش موردنظر کلیک فرمایید
                </p>
              </div>

              {/* Category Pills */}
              <div className="flex flex-wrap gap-1.5 sm:gap-2">
                {categories.map((cat) => (
                  <button
                    type="button"
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      selectedCategory === cat
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:border-slate-300'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Grid */}
            {loading ? (
              <div className="text-center py-20 text-slate-400 text-xs sm:text-sm">
                در حال دریافت اطلاعات نمایش‌ها از سرور...
              </div>
            ) : filteredShows.length === 0 ? (
              <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-3 p-4">
                <TicketIcon className="w-12 h-12 text-slate-300 mx-auto" />
                <p className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300">
                  نمایشی با این مشخصات یافت نشد.
                </p>
                {user?.role === 'admin' && (
                  <button
                    type="button"
                    onClick={() => setCurrentView('profile')}
                    className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold"
                  >
                    رفتن به پنل مدیریت و ایجاد نمایش
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
                {filteredShows.map((show) => (
                  <ShowCard
                    key={show.id}
                    show={show}
                    onSelect={(s) => handleOpenShowDetail(s)}
                  />
                ))}
              </div>
            )}
          </div>
        </main>
      )}

      {/* Modals Pipeline */}
      {/* 1. Purchase Flow Modal (Session -> Seats -> Auth -> Review -> Zarinpal) */}
      {selectedShowForBooking && (
        <BookingModal
          show={selectedShowForBooking}
          initialSession={selectedSessionForBooking}
          onClose={() => {
            setSelectedShowForBooking(null);
            setSelectedSessionForBooking(null);
          }}
        />
      )}

      {/* 3. Login Modal */}
      <LoginModal isOpen={isLoginOpen} onClose={() => setIsLoginOpen(false)} />

      {/* 4. Ticket Detail QR Modal */}
      {viewTicket && <TicketDetailModal ticket={viewTicket} onClose={() => setViewTicket(null)} />}

      {/* Footer */}
      <Footer />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <MainApp />
      </AuthProvider>
    </ThemeProvider>
  );
}
