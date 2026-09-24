import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { Ticket, Order } from '../types';
import { formatToman, toPersianDigits, formatJalaliDate } from '../lib/persianUtils';
import { TicketDetailModal } from './TicketDetailModal';
import {
  Ticket as TicketIcon,
  ShoppingBag,
  QrCode,
  Calendar,
  MapPin,
  Clock,
  Printer,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';

export const BuyerPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'tickets' | 'orders'>('tickets');
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [tRes, oRes] = await Promise.all([api.getBuyerTickets(), api.getBuyerOrders()]);
      if (tRes.success) setTickets(tRes.data);
      if (oRes.success) setOrders(oRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/20 shrink-0">
            <TicketIcon className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <h2 className="text-base sm:text-xl font-black text-slate-900 dark:text-white">
              بلیت‌های فعال من و سوابق سفارشات
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              مشاهده بلیت‌های صادر شده با بارکد ورود، جزییات صندلی و رسید سفارش‌ها
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={loadData}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-200 transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>به‌روزرسانی</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-4 text-xs font-bold">
        <button
          onClick={() => setActiveTab('tickets')}
          className={`pb-3 border-b-2 flex items-center gap-1.5 transition-colors ${
            activeTab === 'tickets'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <TicketIcon className="w-4 h-4" />
          <span>بلیت‌های فعال من ({toPersianDigits(tickets.length)})</span>
        </button>

        <button
          onClick={() => setActiveTab('orders')}
          className={`pb-3 border-b-2 flex items-center gap-1.5 transition-colors ${
            activeTab === 'orders'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <ShoppingBag className="w-4 h-4" />
          <span>سوابق و فاکتورهای سفارش ({toPersianDigits(orders.length)})</span>
        </button>
      </div>

      {/* TICKETS TAB */}
      {activeTab === 'tickets' && (
        <div className="space-y-4">
          {tickets.length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-2">
              <TicketIcon className="w-12 h-12 text-slate-300 mx-auto" />
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                هنوز هیچ بلیتی خریداری نکرده‌اید.
              </p>
              <p className="text-xs text-slate-500">
                از صفحه نخست می‌توانید نمایش‌های روی صحنه را مشاهده و بلیت تهیه فرمایید.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {tickets.map((ticket) => (
                <div
                  key={ticket.id}
                  className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between space-y-4 relative overflow-hidden"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          ticket.status === 'VALID'
                            ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                            : ticket.status === 'USED'
                            ? 'bg-slate-100 dark:bg-slate-800 text-slate-600'
                            : 'bg-red-100 dark:bg-red-950/60 text-red-700'
                        }`}
                      >
                        {ticket.status === 'VALID'
                          ? 'معتبر جهت ورود ✓'
                          : ticket.status === 'USED'
                          ? 'استفاده شده'
                          : 'باطل شده'}
                      </span>
                      <span className="font-mono text-xs font-bold text-slate-400">
                        {ticket.code}
                      </span>
                    </div>

                    <h3 className="font-extrabold text-base text-slate-900 dark:text-white line-clamp-1">
                      {ticket.show_title}
                    </h3>

                    <div className="space-y-1 text-xs text-slate-600 dark:text-slate-400">
                      {ticket.venue_name && (
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                          <span className="line-clamp-1">{ticket.venue_name}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                        <span>
                          {ticket.session_time ? formatJalaliDate(ticket.session_time) : 'مشخص شده'}
                        </span>
                      </div>
                    </div>

                    <div className="p-3 rounded-2xl bg-blue-50/60 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900 flex items-center justify-between text-xs">
                      <span className="text-slate-500">جایگاه:</span>
                      <span className="font-extrabold text-blue-700 dark:text-blue-300">
                        {ticket.seat_label || 'ورودی عمومی'}
                      </span>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-400 block">بهای بلیت</span>
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        {formatToman(ticket.price)}
                      </span>
                    </div>

                    <button
                      onClick={() => setSelectedTicket(ticket)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all"
                    >
                      <QrCode className="w-3.5 h-3.5" />
                      <span>مشاهده بارکد / چاپ</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ORDERS TAB */}
      {activeTab === 'orders' && (
        <div className="space-y-4">
          {orders.length === 0 ? (
            <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 text-xs text-slate-500">
              سفارشی یافت نشد.
            </div>
          ) : (
            <>
              {/* Mobile Cards */}
              <div className="grid grid-cols-1 sm:hidden gap-3">
                {orders.map((ord) => (
                  <div
                    key={ord.id}
                    className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2 text-xs"
                  >
                    <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-2">
                      <span className="font-mono font-bold text-blue-600">{ord.uuid}</span>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          ord.status === 'paid'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        {ord.status === 'paid' ? 'پرداخت موفق ✓' : 'در انتظار'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">عنوان نمایش:</span>
                      <span className="font-bold">{ord.show_title || 'نمایش تئاتر'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">مبلغ سفارش:</span>
                      <span className="font-extrabold text-slate-900 dark:text-white">
                        {formatToman(ord.total_amount)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">روش پرداخت:</span>
                      <span>{ord.type === 'online' ? 'درگاه زرین‌پال' : 'گیشه حضوری'}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Table */}
              <div className="hidden sm:block overflow-x-auto rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-500 border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="p-3.5">شماره پیگیری</th>
                      <th className="p-3.5">عنوان نمایش</th>
                      <th className="p-3.5">مبلغ سفارش</th>
                      <th className="p-3.5">روش پرداخت</th>
                      <th className="p-3.5">وضعیت</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                    {orders.map((ord) => (
                      <tr key={ord.id}>
                        <td className="p-3.5 font-mono font-bold text-blue-600">{ord.uuid}</td>
                        <td className="p-3.5 font-semibold">{ord.show_title || 'نمایش تئاتر'}</td>
                        <td className="p-3.5 font-extrabold text-slate-900 dark:text-white">
                          {formatToman(ord.total_amount)}
                        </td>
                        <td className="p-3.5">
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[10px]">
                            {ord.type === 'online' ? 'درگاه زرین‌پال' : 'گیشه حضوری'}
                          </span>
                        </td>
                        <td className="p-3.5">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              ord.status === 'paid'
                                ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                                : 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
                            }`}
                          >
                            {ord.status === 'paid' ? 'پرداخت موفق ✓' : 'در انتظار پرداخت'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {/* Ticket Preview Modal */}
      {selectedTicket && (
        <TicketDetailModal ticket={selectedTicket} onClose={() => setSelectedTicket(null)} />
      )}
    </div>
  );
};
