import React from 'react';
import { Show } from '../types';
import { MapPin, ChevronLeft } from 'lucide-react';

interface ShowCardProps {
  show: Show;
  onSelect: (show: Show) => void;
}

export const ShowCard: React.FC<ShowCardProps> = ({ show, onSelect }) => {
  return (
    <div
      onClick={() => onSelect(show)}
      className="group bg-white dark:bg-slate-900 rounded-2xl overflow-hidden border border-slate-200/80 dark:border-slate-800 shadow-xs hover:shadow-xl hover:border-blue-500/40 dark:hover:border-blue-500/40 transition-all duration-300 flex flex-col cursor-pointer"
    >
      {/* Poster Image Container - Clean & Minimal */}
      <div className="relative aspect-[3/4] w-full overflow-hidden bg-slate-100 dark:bg-slate-800">
        <img
          src={show.poster_url}
          alt={show.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-transparent to-transparent opacity-60 group-hover:opacity-80 transition-opacity" />

        {/* Quiet Category Indicator */}
        <div className="absolute top-3 right-3 z-10">
          <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-950/75 text-white backdrop-blur-md">
            {show.category}
          </span>
        </div>
      </div>

      {/* Details Box - Minimal & Clean */}
      <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
        <div className="space-y-1.5">
          <h3 className="font-extrabold text-base text-slate-900 dark:text-white line-clamp-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
            {show.title}
          </h3>

          {show.director && (
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
              کارگردان: <span className="text-slate-700 dark:text-slate-300 font-medium">{show.director}</span>
            </p>
          )}

          {show.venue_name && (
            <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 truncate">
              <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="truncate">{show.venue_name}</span>
            </div>
          )}
        </div>

        {/* Minimal Footer: Simple "View Details" call to action without prices or buy buttons */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-bold text-slate-500 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
          <span>مشاهده جزئیات و خرید</span>
          <ChevronLeft className="w-4 h-4 transform group-hover:-translate-x-1 transition-transform" />
        </div>
      </div>
    </div>
  );
};
