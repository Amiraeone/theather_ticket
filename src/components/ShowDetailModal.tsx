import React, { useEffect, useState } from 'react';
import { Show, CastMember } from '../types';
import { api } from '../lib/api';
import { formatToman, toPersianDigits, formatJalaliDate } from '../lib/persianUtils';
import {
  X,
  MapPin,
  Clock,
  Users,
  Armchair,
  Calendar,
  Sparkles,
  ChevronLeft,
} from 'lucide-react';

interface ShowDetailModalProps {
  show: Show | null;
  onClose: () => void;
  onStartBooking: (show: Show) => void;
}

export const ShowDetailModal: React.FC<ShowDetailModalProps> = ({ show, onClose, onStartBooking }) => {
  const [detail, setDetail] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!show) return;
    setLoading(true);
    api
      .getShowDetail(show.slug || show.id)
      .then((res) => {
        if (res.success) {
          setDetail(res.data);
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [show]);

  if (!show) return null;

  const currentShow = detail || show;
  const sessions = currentShow.sessions || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto animate-in fade-in">
      <div
        className="relative w-full max-w-3xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-auto max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sticky Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 left-3 z-30 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-black/50 hover:bg-black/80 text-white flex items-center justify-center backdrop-blur-md transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Scrollable Container */}
        <div className="overflow-y-auto flex-1">
          {/* Hero Banner with Poster & Info */}
          <div className="relative min-h-[260px] sm:min-h-[320px] flex items-end p-4 sm:p-6 bg-slate-950 overflow-hidden">
            <img
              src={currentShow.poster_url}
              alt={currentShow.title}
              className="absolute inset-0 w-full h-full object-cover opacity-35 blur-sm scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/70 to-transparent" />

            <div className="relative z-10 flex flex-col sm:flex-row gap-4 sm:gap-6 items-center sm:items-end w-full">
              <img
                src={currentShow.poster_url}
                alt={currentShow.title}
                className="w-28 sm:w-40 aspect-[3/4] object-cover rounded-2xl shadow-2xl border-2 border-white/20 shrink-0"
              />
              <div className="flex-1 text-center sm:text-right text-white space-y-2 w-full">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-1.5 sm:gap-2">
                  <span className="px-2.5 py-0.5 rounded-lg text-xs font-bold bg-blue-600">
                    {currentShow.category}
                  </span>
                  <span className="px-2 py-0.5 rounded-lg text-xs font-medium bg-white/20 backdrop-blur-md">
                    رده سنی {currentShow.age_rating}
                  </span>
                  <span className="px-2 py-0.5 rounded-lg text-xs font-medium bg-emerald-600/90 flex items-center gap-1">
                    {currentShow.ticketing_mode === 'SEAT_SELECTION' ? (
                      <>
                        <Armchair className="w-3.5 h-3.5" />
                        انتخاب صندلی
                      </>
                    ) : (
                      <>
                        <Users className="w-3.5 h-3.5" />
                        ظرفیت عمومی
                      </>
                    )}
                  </span>
                </div>

                <h2 className="text-lg sm:text-2xl font-black break-words">{currentShow.title}</h2>

                {currentShow.director && (
                  <p className="text-xs sm:text-sm text-slate-300">
                    کارگردان: <span className="font-semibold text-white">{currentShow.director}</span>
                  </p>
                )}

                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 text-xs text-slate-300 pt-1">
                  <div className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-blue-400" />
                    <span>مدت: {toPersianDigits(currentShow.duration_minutes)} دقیقه</span>
                  </div>
                  {currentShow.venue && (
                    <div className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-amber-400" />
                      <span>{currentShow.venue.name}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Modal Body */}
          <div className="p-4 sm:p-6 space-y-6">
            {/* Description */}
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                درباره اثر و خلاصه داستان
              </h4>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed text-justify whitespace-pre-line break-words">
                {currentShow.description || 'توضیحاتی برای این نمایش درج نشده است.'}
              </p>
            </div>

            {/* Cast & Crew (Full Structure) */}
            {currentShow.cast_members && currentShow.cast_members.length > 0 && (
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-2.5 flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  عوامل، بازیگران و طراحان
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                  {currentShow.cast_members.map((member: any, idx: number) => {
                    const isObj = typeof member === 'object' && member !== null;
                    const role = isObj ? member.role : 'عوامل';
                    const name = isObj ? member.name : member;

                    return (
                      <div
                        key={idx}
                        className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 text-xs border border-slate-200 dark:border-slate-700 flex items-center justify-between"
                      >
                        <span className="font-bold text-blue-600 dark:text-blue-400 text-[11px]">{role}:</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">{name}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Venue Details */}
            {currentShow.venue && (
              <div className="p-3.5 sm:p-4 rounded-2xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/50 space-y-1">
                <div className="flex items-center gap-2 text-xs font-bold text-blue-900 dark:text-blue-200">
                  <MapPin className="w-4 h-4 text-blue-600" />
                  <span>{currentShow.venue.name} ({currentShow.venue.city})</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 pr-6 break-words">
                  {currentShow.venue.address}
                </p>
              </div>
            )}

            {/* Sessions Overview */}
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                سانس‌های باز ({toPersianDigits(sessions.length)})
              </h4>
              {sessions.length === 0 ? (
                <div className="text-center py-6 bg-slate-50 dark:bg-slate-800/50 rounded-2xl text-xs text-slate-500">
                  در حال حاضر سانسی برای این نمایش باز نشده است.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {sessions.map((ses: any) => (
                    <div
                      key={ses.id}
                      className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/80 flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="font-bold text-slate-800 dark:text-slate-200">
                          {ses.start_at_jalali || formatJalaliDate(ses.start_at)}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          ظرفیت: {toPersianDigits(ses.capacity)} صندلی
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 shrink-0">
                        آماده خرید
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer CTA */}
        <div className="p-3.5 sm:p-5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex items-center justify-between gap-3 shrink-0">
          <div>
            <span className="text-[10px] sm:text-[11px] text-slate-500 block">شروع قیمت از</span>
            <span className="text-sm sm:text-base font-black text-blue-700 dark:text-blue-400">
              {currentShow.min_price ? formatToman(currentShow.min_price) : 'مشاهده در انتخاب سانس'}
            </span>
          </div>

          <button
            type="button"
            onClick={() => {
              onClose();
              onStartBooking(currentShow);
            }}
            className="flex items-center gap-1.5 px-5 sm:px-6 py-2.5 sm:py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs sm:text-sm shadow-lg shadow-blue-600/30 transition-all active:scale-95"
          >
            <span>انتخاب سانس و خرید بلیت</span>
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
