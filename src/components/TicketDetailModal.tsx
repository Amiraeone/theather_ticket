import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Ticket } from '../types';
import { formatToman, toPersianDigits, formatJalaliDate } from '../lib/persianUtils';
import { X, Printer, CheckCircle2, AlertOctagon, MapPin, Calendar, Armchair } from 'lucide-react';

interface TicketDetailModalProps {
  ticket: Ticket | null;
  onClose: () => void;
}

export const TicketDetailModal: React.FC<TicketDetailModalProps> = ({ ticket, onClose }) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  useEffect(() => {
    if (!ticket) return;
    // Generate QR Code containing the ticket verification payload
    QRCode.toDataURL(
      JSON.stringify({
        code: ticket.code,
        show: ticket.show_title,
        seat: ticket.seat_label,
        name: ticket.buyer_name,
      }),
      { width: 220, margin: 1, color: { dark: '#0f172a', light: '#ffffff' } }
    )
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.error(err));
  }, [ticket]);

  if (!ticket) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md overflow-y-auto animate-in fade-in">
      <div
        className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-auto print:m-0 print:border-none print:shadow-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900 print:hidden">
          <span className="font-extrabold text-sm text-slate-800 dark:text-slate-200">بلیت الکترونیک ورود</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 hover:bg-blue-100 transition-colors"
              title="چاپ بلیت"
            >
              <Printer className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-300 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Ticket Container */}
        <div className="p-6 space-y-5 text-center">
          {/* Status Badge */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold shadow-sm mx-auto">
            {ticket.status === 'VALID' && (
              <span className="bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 px-3 py-1 rounded-full flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                معتبر جهت ورود
              </span>
            )}
            {ticket.status === 'USED' && (
              <span className="bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-3 py-1 rounded-full flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                استفاده شده در گیشه
              </span>
            )}
            {ticket.status === 'CANCELLED' && (
              <span className="bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300 px-3 py-1 rounded-full flex items-center gap-1">
                <AlertOctagon className="w-3.5 h-3.5" />
                باطل شده
              </span>
            )}
          </div>

          <div>
            <h3 className="text-lg font-black text-slate-900 dark:text-white">{ticket.show_title}</h3>
            {ticket.venue_name && (
              <p className="text-xs text-slate-500 mt-1 flex items-center justify-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-blue-500" />
                <span>{ticket.venue_name}</span>
              </p>
            )}
          </div>

          {/* QR Code Container */}
          <div className="p-4 bg-white rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 inline-block shadow-sm">
            {qrDataUrl ? (
              <img src={qrDataUrl} alt={ticket.code} className="w-44 h-44 mx-auto object-contain" />
            ) : (
              <div className="w-44 h-44 flex items-center justify-center text-xs text-slate-400">در حال تولید بارکد...</div>
            )}
            <div className="mt-2 text-xs font-mono font-bold text-slate-800 tracking-wider">
              {ticket.code}
            </div>
          </div>

          {/* Ticket Details Grid */}
          <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 text-right space-y-2 text-xs">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-1.5">
              <span className="text-slate-500">تاریخ و سانس:</span>
              <span className="font-bold text-slate-900 dark:text-white">
                {ticket.session_time ? formatJalaliDate(ticket.session_time) : 'مشخص شده'}
              </span>
            </div>

            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-1.5">
              <span className="text-slate-500">جایگاه و صندلی:</span>
              <span className="font-bold text-blue-700 dark:text-blue-400">
                {ticket.seat_label || 'ورودی عمومی'}
              </span>
            </div>

            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-1.5">
              <span className="text-slate-500">نام خریدار:</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">{ticket.buyer_name}</span>
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-slate-500">بهای بلیت:</span>
              <span className="font-extrabold text-slate-900 dark:text-white">{formatToman(ticket.price)}</span>
            </div>
          </div>

          <p className="text-[11px] text-slate-400 leading-relaxed">
            لطفاً این بلیت و کد QR را هنگام مراجعه به تالار نمایش به مسئول گیشه ارائه نمایید.
          </p>
        </div>
      </div>
    </div>
  );
};
