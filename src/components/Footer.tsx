import React from 'react';
import { Ticket, Phone, Mail, MapPin, ShieldCheck, HeartHandshake } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="w-full bg-slate-900 text-slate-300 border-t border-slate-800 pt-12 pb-8 mt-16 transition-colors">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
          {/* Col 1: Brand & Info */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-white font-extrabold text-lg">
              <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white">
                <Ticket className="w-5 h-5" />
              </div>
              <span>تیکت تئاتر</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed text-justify">
              سامانه جامع و رسمی رزرواسیون و فروش بلیت تئاتر کشور. امکان انتخاب صندلی در سالن، خرید آنلاین از درگاه امن شاپرک و زرین‌پال، و تحویل آنی بلیت الکترونیک با بارکد دوبعدی یکتا.
            </p>
          </div>

          {/* Col 2: Fast Links */}
          <div className="space-y-2">
            <h4 className="text-sm font-bold text-white mb-3">دسترسی سریع</h4>
            <ul className="text-xs space-y-2 text-slate-400">
              <li><a href="#shows" className="hover:text-blue-400 transition-colors">نمایش‌های روی صحنه</a></li>
              <li><a href="#featured" className="hover:text-blue-400 transition-colors">تئاترهای برگزیده ماه</a></li>
              <li><a href="#venues" className="hover:text-blue-400 transition-colors">لیست تالارها و سالن‌های کشور</a></li>
              <li><a href="#rules" className="hover:text-blue-400 transition-colors">قوانین و مقررات خرید و استرداد</a></li>
            </ul>
          </div>

          {/* Col 3: Contact */}
          <div className="space-y-2">
            <h4 className="text-sm font-bold text-white mb-3">پشتیبانی و ارتباط</h4>
            <div className="text-xs space-y-2.5 text-slate-400">
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-emerald-400" />
                <span>پشتیبانی تلفنی گیشه: ۰۲۱-۶۶۷۰۰۰۰۰</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-blue-400" />
                <span>ایمیل: support@tickettheatre.ir</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-amber-400" />
                <span>تهران، بلوار شهریار، تالار وحدت</span>
              </div>
            </div>
          </div>

          {/* Col 4: Trust & Security Badges */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-white mb-3">مجوزها و امنیت پرداخت</h4>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700 flex flex-col items-center justify-center text-center w-24">
                <ShieldCheck className="w-6 h-6 text-emerald-400 mb-1" />
                <span className="text-[10px] text-slate-300">درگاه امن زرین‌پال</span>
              </div>
              <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700 flex flex-col items-center justify-center text-center w-24">
                <HeartHandshake className="w-6 h-6 text-blue-400 mb-1" />
                <span className="text-[10px] text-slate-300">نماد اعتماد الکترونیک</span>
              </div>
            </div>
          </div>
        </div>

        <div className="pt-6 border-t border-slate-800 text-center text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>تمامی حقوق مادی و معنوی برای سامانه تیکت تئاتر محفوظ است.</span>
          <span className="text-[11px]">طراحی و توسعه با بالاترین استانداردهای امنیتی و هم‌زمانی</span>
        </div>
      </div>
    </footer>
  );
};
