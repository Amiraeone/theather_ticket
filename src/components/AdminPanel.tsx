import React, { useState, useEffect, useRef } from 'react';
import { api } from '../lib/api';
import { Show, Venue, User, CastMember } from '../types';
import { formatToman, toPersianDigits, formatJalaliDate } from '../lib/persianUtils';
import {
  ShieldAlert,
  Plus,
  Users,
  Armchair,
  DollarSign,
  Ticket,
  Calendar,
  Layers,
  Sparkles,
  UserPlus,
  Trash2,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  X,
  UploadCloud,
  Image as ImageIcon,
  UserCheck,
  Clock,
  Building2,
  MapPin,
  CalendarRange,
} from 'lucide-react';

export interface SessionDraft {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  capacity: number;
  priceToman: number;
}

const getTomorrowDateStr = (offsetDays = 1) => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().split('T')[0];
};

const COMMON_ROLES = [
  'کارگردان',
  'نویسنده',
  'بازیگر',
  'تهیه‌کننده',
  'آهنگساز و موسیقی',
  'طراح صحنه',
  'طراح لباس',
  'طراح نور',
  'طراح گریم و چهره‌پردازی',
  'دستیار کارگردان',
  'مدیر تولید',
  'عکاس',
];

export const AdminPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'shows' | 'venues' | 'orders' | 'users'>('shows');
  const [overview, setOverview] = useState<any>(null);
  const [shows, setShows] = useState<any[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // New Show Form State
  const [showFormOpen, setShowFormOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newPoster, setNewPoster] = useState('');
  const [posterPreview, setPosterPreview] = useState<string | null>(null);
  const [newVenueId, setNewVenueId] = useState('');
  const [newDirector, setNewDirector] = useState('');
  const [newCategory, setNewCategory] = useState('تئاتر درام و تراژدی');
  const [newDuration, setNewDuration] = useState('90');
  const [newAgeRating, setNewAgeRating] = useState('+12');
  const [newTicketingMode, setNewTicketingMode] = useState<'SEAT_SELECTION' | 'QUANTITY_ONLY'>('SEAT_SELECTION');

  // Comprehensive Cast & Crew State
  const [castList, setCastList] = useState<CastMember[]>([
    { role: 'کارگردان', name: '' },
    { role: 'بازیگر', name: '' },
  ]);
  const [newMemberRole, setNewMemberRole] = useState('بازیگر');
  const [newMemberName, setNewMemberName] = useState('');

  // Venue Selection or Custom Typing Mode
  const [venueInputMode, setVenueInputMode] = useState<'SELECT' | 'CUSTOM'>('SELECT');
  const [customVenueName, setCustomVenueName] = useState('');
  const [customVenueCity, setCustomVenueCity] = useState('تهران');
  const [customVenueAddress, setCustomVenueAddress] = useState('');

  // Theatre Sessions & Dates State
  const [sessionList, setSessionList] = useState<SessionDraft[]>([
    {
      id: 'draft_1',
      date: getTomorrowDateStr(1),
      startTime: '19:30',
      endTime: '21:00',
      capacity: 150,
      priceToman: 200000,
    },
    {
      id: 'draft_2',
      date: getTomorrowDateStr(2),
      startTime: '20:30',
      endTime: '22:00',
      capacity: 150,
      priceToman: 250000,
    },
  ]);
  const [dateScheduleMode, setDateScheduleMode] = useState<'RANGE' | 'SINGLE'>('RANGE');
  // Range state
  const [rangeStartDate, setRangeStartDate] = useState(getTomorrowDateStr(1));
  const [rangeEndDate, setRangeEndDate] = useState(getTomorrowDateStr(7));
  const [rangeStartTime, setRangeStartTime] = useState('19:30');
  const [rangeEndTime, setRangeEndTime] = useState('21:00');
  const [rangeCapacity, setRangeCapacity] = useState('150');
  const [rangePrice, setRangePrice] = useState('200000');
  // Single session state
  const [sesDate, setSesDate] = useState(getTomorrowDateStr(3));
  const [sesStartTime, setSesStartTime] = useState('19:30');
  const [sesEndTime, setSesEndTime] = useState('21:00');
  const [sesCapacity, setSesCapacity] = useState('150');
  const [sesPrice, setSesPrice] = useState('200000');

  const handleAddSession = () => {
    if (!sesDate || !sesStartTime) {
      alert('لطفاً تاریخ و ساعت شروع سانس را مشخص فرمایید.');
      return;
    }
    const cap = Number(sesCapacity) > 0 ? Number(sesCapacity) : 100;
    const prc = Number(sesPrice) > 0 ? Number(sesPrice) : 200000;

    setSessionList((prev) => [
      ...prev,
      {
        id: 'ses_' + Date.now(),
        date: sesDate,
        startTime: sesStartTime,
        endTime: sesEndTime || sesStartTime,
        capacity: cap,
        priceToman: prc,
      },
    ]);
  };

  const handleAddRangeSessions = () => {
    if (!rangeStartDate || !rangeEndDate) {
      alert('لطفاً هر دو تاریخ شروع و پایان دوره اجرا را مشخص فرمایید.');
      return;
    }
    const start = new Date(rangeStartDate);
    const end = new Date(rangeEndDate);
    if (end < start) {
      alert('تاریخ پایان نمی‌تواند قبل از تاریخ شروع باشد.');
      return;
    }

    const cap = Number(rangeCapacity) > 0 ? Number(rangeCapacity) : 100;
    const prc = Number(rangePrice) > 0 ? Number(rangePrice) : 200000;

    const newSessions: SessionDraft[] = [];
    let current = new Date(start);
    let index = 0;

    while (current <= end && index < 60) {
      const yyyy = current.getFullYear();
      const mm = String(current.getMonth() + 1).padStart(2, '0');
      const dd = String(current.getDate()).padStart(2, '0');
      const dateString = `${yyyy}-${mm}-${dd}`;

      // Avoid adding duplicate date+time
      const alreadyExists = sessionList.some(
        (s) => s.date === dateString && s.startTime === rangeStartTime
      );

      if (!alreadyExists) {
        newSessions.push({
          id: 'ses_range_' + Date.now() + '_' + index,
          date: dateString,
          startTime: rangeStartTime,
          endTime: rangeEndTime || rangeStartTime,
          capacity: cap,
          priceToman: prc,
        });
      }

      current.setDate(current.getDate() + 1);
      index++;
    }

    if (newSessions.length === 0) {
      alert('تمامی سانس‌های این بازه زمانی قبلاً در جدول وجود دارند.');
      return;
    }

    setSessionList((prev) => [...prev, ...newSessions]);
  };

  const handleRemoveSession = (id: string) => {
    setSessionList((prev) => prev.filter((s) => s.id !== id));
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Assign seller modal/state
  const [assignShowId, setAssignShowId] = useState<string | null>(null);
  const [sellerMobile, setSellerMobile] = useState('');
  const [sellerName, setSellerName] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [ovRes, shRes, vnRes, usRes, orRes] = await Promise.all([
        api.getAdminOverview(),
        api.getAdminShows(),
        api.getAdminVenues(),
        api.getAdminUsers(),
        api.getAdminOrders(),
      ]);

      if (ovRes.success) setOverview(ovRes.data);
      if (shRes.success) setShows(shRes.data);
      if (vnRes.success) {
        setVenues(vnRes.data);
        if (vnRes.data.length > 0 && !newVenueId) setNewVenueId(vnRes.data[0].id);
      }
      if (usRes.success) setUsers(usRes.data);
      if (orRes.success) setOrders(orRes.data);
    } catch (e: any) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Handle Poster File Upload
  const handlePosterFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('لطفاً یک فایل تصویری انتخاب فرمایید.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('حداکثر حجم مجاز تصویر ۵ مگابایت است.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setPosterPreview(dataUrl);
      setNewPoster(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const handleAddCastMember = () => {
    if (!newMemberName.trim()) {
      alert('لطفاً نام عضو عوامل را وارد نمایید.');
      return;
    }
    setCastList([...castList, { role: newMemberRole, name: newMemberName.trim() }]);
    setNewMemberName('');
  };

  const handleRemoveCastMember = (index: number) => {
    setCastList(castList.filter((_, idx) => idx !== index));
  };

  const handleSeedSample = async () => {
    setLoading(true);
    try {
      const res = await api.seedSampleShow();
      setMsg({ type: 'success', text: res.message });
      loadData();
    } catch (e: any) {
      setMsg({ type: 'error', text: e.message || 'خطا در درج نمایش نمونه' });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateShow = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      setMsg({ type: 'error', text: 'عنوان نمایش الزامی است.' });
      return;
    }

    if (venueInputMode === 'SELECT' && !newVenueId) {
      setMsg({ type: 'error', text: 'لطفاً سالن و تالار اجرا را انتخاب کنید.' });
      return;
    }

    if (venueInputMode === 'CUSTOM' && !customVenueName.trim()) {
      setMsg({ type: 'error', text: 'لطفاً نام سالن یا تالار را بنویسید.' });
      return;
    }

    // Default poster if none provided
    const posterUrlToUse =
      newPoster ||
      posterPreview ||
      'https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?auto=format&fit=crop&w=800&q=80';

    // Format cast & crew list
    const validCast = castList.filter((c) => c.name.trim().length > 0);

    // Validate and format sessions
    if (sessionList.length === 0) {
      setMsg({
        type: 'error',
        text: 'حداقل یک سانس اجرایی (با تعیین روز، ساعت، ظرفیت و قیمت بلیت) برای نمایش الزامی است.',
      });
      return;
    }

    const formattedSessions = sessionList.map((ses) => {
      const startAt = new Date(`${ses.date}T${ses.startTime}:00`).toISOString();
      const endAt = new Date(`${ses.date}T${ses.endTime || ses.startTime}:00`).toISOString();
      return {
        start_at: startAt,
        end_at: endAt,
        capacity: Number(ses.capacity) || 100,
        price_toman: Number(ses.priceToman) || 200000,
      };
    });

    setLoading(true);
    try {
      const payload: any = {
        title: newTitle.trim(),
        description: newDesc.trim(),
        poster_url: posterUrlToUse,
        venue_id: venueInputMode === 'SELECT' ? newVenueId : undefined,
        venue_name: venueInputMode === 'CUSTOM' ? customVenueName.trim() : undefined,
        venue_city: venueInputMode === 'CUSTOM' ? (customVenueCity.trim() || 'تهران') : undefined,
        venue_address: venueInputMode === 'CUSTOM' ? customVenueAddress.trim() : undefined,
        director: newDirector.trim() || validCast.find((c) => c.role.includes('کارگردان'))?.name || '',
        category: newCategory,
        duration_minutes: Number(newDuration) || 90,
        age_rating: newAgeRating,
        ticketing_mode: newTicketingMode,
        cast_members: validCast,
        sessions: formattedSessions,
      };

      const res = await api.createShow(payload);

      if (res.success) {
        setMsg({ type: 'success', text: 'نمایش با موفقیت به همراه جدول سانس‌ها و ظرفیت‌ها منتشر گردید.' });
        setShowFormOpen(false);
        setNewTitle('');
        setNewDesc('');
        setNewPoster('');
        setPosterPreview(null);
        setCustomVenueName('');
        setCustomVenueAddress('');
        setCastList([]);
        setSessionList([
          {
            id: 'draft_1',
            date: getTomorrowDateStr(1),
            startTime: '19:30',
            endTime: '21:00',
            capacity: 150,
            priceToman: 200000,
          },
        ]);
        loadData();
      }
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'خطا در ایجاد نمایش' });
    } finally {
      setLoading(false);
    }
  };

  const handleAssignSeller = async () => {
    if (!assignShowId || !sellerMobile) return;
    setLoading(true);
    try {
      const res = await api.assignSeller(assignShowId, sellerMobile, sellerName);
      if (res.success) {
        setMsg({ type: 'success', text: res.message });
        setAssignShowId(null);
        setSellerMobile('');
        setSellerName('');
        loadData();
      }
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'خطا در تخصیص فروشنده' });
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveSeller = async (showId: string, sellerId: string) => {
    if (!confirm('آیا از حذف دسترسی این فروشنده از نمایش اطمینان دارید؟')) return;
    setLoading(true);
    try {
      const res = await api.removeSeller(showId, sellerId);
      if (res.success) {
        setMsg({ type: 'success', text: res.message });
        loadData();
      }
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'خطا' });
    } finally {
      setLoading(false);
    }
  };

  const handleRefund = async (orderId: string) => {
    if (!confirm('آیا از استرداد این سفارش و ابطال تمام بلیت‌های آن اطمینان دارید؟')) return;
    setLoading(true);
    try {
      const res = await api.refundOrder(orderId);
      if (res.success) {
        setMsg({ type: 'success', text: res.message });
        loadData();
      }
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'خطا در استرداد' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h2 className="text-base sm:text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-indigo-600" />
            <span>مدیریت نمایش‌ها، سالن‌ها و دسترسی‌ها</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            ایجاد نمایش با آپلود پوستر، تعریف کامل عوامل و انتساب فروشندگان به نمایش
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={loadData}
            disabled={loading}
            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 text-xs transition-colors shrink-0"
            title="به‌روزرسانی داده‌ها"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            type="button"
            onClick={handleSeedSample}
            disabled={loading}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 text-xs font-bold transition-colors"
          >
            <Sparkles className="w-4 h-4 text-indigo-500" />
            <span>نمایش نمونه هملت</span>
          </button>

          <button
            type="button"
            onClick={() => setShowFormOpen(true)}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-600/20 transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>ایجاد نمایش جدید</span>
          </button>
        </div>
      </div>

      {/* Alert Notification */}
      {msg && (
        <div
          className={`p-3.5 rounded-2xl border flex items-center justify-between text-xs font-semibold ${
            msg.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 text-emerald-800 dark:text-emerald-300'
              : 'bg-red-50 dark:bg-red-950/40 border-red-200 text-red-800 dark:text-red-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {msg.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            <span>{msg.text}</span>
          </div>
          <button onClick={() => setMsg(null)} className="text-slate-400 hover:text-slate-600 font-bold">
            ×
          </button>
        </div>
      )}

      {/* Overview Stat Cards - Mobile First Grid */}
      {overview && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
            <span className="text-[11px] text-slate-500">درآمد کل فروش</span>
            <div className="text-sm sm:text-base font-black text-blue-700 dark:text-blue-400 mt-1">
              {formatToman(overview.total_revenue)}
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
            <span className="text-[11px] text-slate-500">بلیت‌های فروخته شده</span>
            <div className="text-sm sm:text-base font-black text-emerald-600 dark:text-emerald-400 mt-1">
              {toPersianDigits(overview.total_tickets)} بلیت
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
            <span className="text-[11px] text-slate-500">تعداد نمایش‌ها</span>
            <div className="text-sm sm:text-base font-black text-indigo-600 dark:text-indigo-400 mt-1">
              {toPersianDigits(overview.total_shows)} عنوان
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
            <span className="text-[11px] text-slate-500">کاربران سامانه</span>
            <div className="text-sm sm:text-base font-black text-purple-600 dark:text-purple-400 mt-1">
              {toPersianDigits(overview.total_users)} نفر
            </div>
          </div>
        </div>
      )}

      {/* Navigation Sub-Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-2 sm:gap-4 overflow-x-auto text-xs font-bold pb-1">
        <button
          type="button"
          onClick={() => setActiveTab('shows')}
          className={`pb-2.5 border-b-2 transition-colors whitespace-nowrap px-1 ${
            activeTab === 'shows'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          نمایش‌ها و انتساب فروشنده ({toPersianDigits(shows.length)})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('orders')}
          className={`pb-2.5 border-b-2 transition-colors whitespace-nowrap px-1 ${
            activeTab === 'orders'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          سفارشات و تراکنش‌ها ({toPersianDigits(orders.length)})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('venues')}
          className={`pb-2.5 border-b-2 transition-colors whitespace-nowrap px-1 ${
            activeTab === 'venues'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          سالن‌ها و چیدمان ({toPersianDigits(venues.length)})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('users')}
          className={`pb-2.5 border-b-2 transition-colors whitespace-nowrap px-1 ${
            activeTab === 'users'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          کاربران سیستم ({toPersianDigits(users.length)})
        </button>
      </div>

      {/* TAB 1: SHOWS LIST */}
      {activeTab === 'shows' && (
        <div className="space-y-4">
          {shows.length === 0 ? (
            <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-3 p-4">
              <p className="text-xs text-slate-500">هنوز نمایشی در پایگاه داده ثبت نشده است.</p>
              <button
                type="button"
                onClick={handleSeedSample}
                className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold"
              >
                ایجاد نمایش نمونه هملت
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {shows.map((show) => (
                <div
                  key={show.id}
                  className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                >
                  <div className="flex items-start sm:items-center gap-3 w-full sm:w-auto">
                    <img
                      src={show.poster_url}
                      alt={show.title}
                      className="w-16 h-22 sm:w-20 sm:h-28 object-cover rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 shrink-0"
                    />

                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <h3 className="font-black text-sm sm:text-base text-slate-900 dark:text-white break-words">
                          {show.title}
                        </h3>
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300">
                          {show.category}
                        </span>
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                          {show.ticketing_mode === 'SEAT_SELECTION' ? 'انتخاب صندلی' : 'عمومی'}
                        </span>
                      </div>

                      <div className="text-xs text-slate-500 flex flex-wrap items-center gap-x-3 gap-y-1">
                        <span>سالن: {show.venue_name || 'تالار وحدت'}</span>
                        <span>سانس‌ها: {toPersianDigits(show.sessions_count || 0)}</span>
                        <span className="font-bold text-emerald-600">
                          بلیت فروخته شده: {toPersianDigits(show.tickets_sold || 0)}
                        </span>
                      </div>

                      {/* Assigned sellers on this show */}
                      <div className="pt-1 flex flex-wrap items-center gap-1 text-[11px]">
                        <span className="text-slate-400 font-semibold">فروشندگان تخصیص یافته:</span>
                        {show.sellers && show.sellers.length > 0 ? (
                          show.sellers.map((sel: any) => (
                            <span
                              key={sel.id}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[10px]"
                            >
                              <span>{sel.name || sel.mobile}</span>
                              <button
                                type="button"
                                onClick={() => handleRemoveSeller(show.id, sel.id)}
                                className="text-red-500 hover:text-red-700 text-xs font-bold"
                                title="حذف فروشنده"
                              >
                                ×
                              </button>
                            </span>
                          ))
                        ) : (
                          <span className="text-amber-500 font-medium">هیچ فروشنده‌ای تخصیص نیافته است</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Assign Seller Action */}
                  <div className="w-full sm:w-auto flex sm:flex-col justify-end gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => setAssignShowId(show.id)}
                      className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 text-xs font-bold transition-colors"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>تخصیص فروشنده گیشه</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: ORDERS (Responsive Cards on Mobile, Table on Desktop) */}
      {activeTab === 'orders' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:hidden gap-3">
            {orders.map((ord) => (
              <div
                key={ord.id}
                className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2 text-xs"
              >
                <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-2">
                  <span className="font-mono font-bold text-blue-600">{ord.uuid}</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      ord.status === 'paid'
                        ? 'bg-emerald-100 text-emerald-700'
                        : ord.status === 'refunded'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-amber-100 text-amber-700'
                    }`}
                  >
                    {ord.status === 'paid' ? 'پرداخت شده' : ord.status === 'refunded' ? 'مسترد شده' : 'در انتظار'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">نمایش:</span>
                  <span className="font-bold">{ord.show_title || 'نمایش'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">خریدار:</span>
                  <span>{ord.buyer_name} ({ord.buyer_mobile})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">مبلغ:</span>
                  <span className="font-extrabold text-blue-700 dark:text-blue-400">
                    {formatToman(ord.total_amount)}
                  </span>
                </div>
                {ord.status === 'paid' && (
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => handleRefund(ord.id)}
                      className="w-full py-1.5 rounded-lg bg-red-50 text-red-600 font-bold hover:bg-red-100"
                    >
                      استرداد وجه و ابطال بلیت
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="hidden md:block overflow-x-auto rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-500 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="p-3.5">کد سفارش</th>
                  <th className="p-3.5">عنوان نمایش</th>
                  <th className="p-3.5">خریدار</th>
                  <th className="p-3.5">مبلغ</th>
                  <th className="p-3.5">نوع پرداخت</th>
                  <th className="p-3.5">وضعیت</th>
                  <th className="p-3.5">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                {orders.map((ord) => (
                  <tr key={ord.id}>
                    <td className="p-3.5 font-mono font-bold text-blue-600">{ord.uuid}</td>
                    <td className="p-3.5 font-semibold">{ord.show_title || 'نمایش'}</td>
                    <td className="p-3.5">
                      {ord.buyer_name} ({ord.buyer_mobile})
                    </td>
                    <td className="p-3.5 font-bold text-slate-900 dark:text-white">
                      {formatToman(ord.total_amount)}
                    </td>
                    <td className="p-3.5">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[10px]">
                        {ord.type === 'online' ? 'زرین‌پال آنلاین' : ord.type === 'offline_pos' ? 'کارتخوان گیشه' : 'نقدی گیشه'}
                      </span>
                    </td>
                    <td className="p-3.5">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          ord.status === 'paid'
                            ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                            : ord.status === 'refunded'
                            ? 'bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300'
                            : 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
                        }`}
                      >
                        {ord.status === 'paid' ? 'پرداخت شده' : ord.status === 'refunded' ? 'مسترد شده' : 'در انتظار'}
                      </span>
                    </td>
                    <td className="p-3.5">
                      {ord.status === 'paid' && (
                        <button
                          type="button"
                          onClick={() => handleRefund(ord.id)}
                          className="px-2.5 py-1 rounded-lg bg-red-50 dark:bg-red-950/60 text-red-600 hover:bg-red-100 text-[11px] font-semibold transition-colors"
                        >
                          استرداد
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: VENUES */}
      {activeTab === 'venues' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {venues.map((venue) => (
            <div
              key={venue.id}
              className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">{venue.name}</h3>
                <span className="px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-600 text-xs font-semibold">
                  ظرفیت: {toPersianDigits(venue.capacity)} صندلی
                </span>
              </div>
              <p className="text-xs text-slate-500">{venue.address}</p>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1.5">
                <span className="text-[11px] font-bold text-slate-400">بخش‌ها و ردیف‌ها:</span>
                <div className="space-y-1">
                  {venue.sections.map((sec) => (
                    <div
                      key={sec.id}
                      className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-between text-xs"
                    >
                      <span>{sec.name} ({toPersianDigits(sec.rows)} ردیف)</span>
                      <span className="font-bold text-blue-600 dark:text-blue-400">
                        پایه {formatToman(sec.base_price)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 4: USERS */}
      {activeTab === 'users' && (
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:hidden gap-2.5">
            {users.map((u) => (
              <div
                key={u.id}
                className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs"
              >
                <div>
                  <div className="font-bold text-slate-900 dark:text-white">{u.name || 'کاربر'}</div>
                  <div className="font-mono text-slate-400 text-[11px] mt-0.5">{u.mobile}</div>
                </div>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                    u.role === 'admin'
                      ? 'bg-indigo-100 text-indigo-700'
                      : u.role === 'seller'
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  {u.role === 'admin' ? 'مدیر کل' : u.role === 'seller' ? 'فروشنده گیشه' : 'خریدار'}
                </span>
              </div>
            ))}
          </div>

          <div className="hidden sm:block overflow-x-auto rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-500 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="p-3.5">نام کاربر</th>
                  <th className="p-3.5">شماره همراه</th>
                  <th className="p-3.5">سطح دسترسی (نقش)</th>
                  <th className="p-3.5">وضعیت</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                {users.map((u) => (
                  <tr key={u.id}>
                    <td className="p-3.5 font-bold">{u.name || 'بدون نام'}</td>
                    <td className="p-3.5 font-mono">{u.mobile}</td>
                    <td className="p-3.5">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          u.role === 'admin'
                            ? 'bg-indigo-100 text-indigo-700'
                            : u.role === 'seller'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {u.role === 'admin' ? 'مدیر کل' : u.role === 'seller' ? 'فروشنده / گیشه' : 'خریدار'}
                      </span>
                    </td>
                    <td className="p-3.5 text-emerald-600 font-bold">
                      {u.is_verified ? 'تایید شده ✓' : 'در انتظار'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CREATE SHOW MODAL (WITH POSTER UPLOAD AND FULL CAST & CREW) */}
      {showFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto animate-in fade-in">
          <div
            className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-6 space-y-4 my-auto max-h-[92vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 sticky top-0 bg-white dark:bg-slate-900 z-10">
              <h3 className="font-black text-sm sm:text-base text-slate-900 dark:text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-blue-600" />
                <span>ثبت و انتشار نمایش جدید</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowFormOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-600 flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateShow} className="space-y-4 text-xs">
              {/* Title & Category */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">
                    عنوان نمایش *
                  </label>
                  <input
                    type="text"
                    required
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="مثال: تئاتر در انتظار گودو"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none focus:border-blue-600"
                  />
                </div>

                <div>
                  <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">
                    دسته‌بندی نمایش
                  </label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none"
                  >
                    <option value="تئاتر درام و تراژدی">تئاتر درام و تراژدی</option>
                    <option value="کمدی و طنز">کمدی و طنز</option>
                    <option value="موزیکال و پرفورمنس">موزیکال و پرفورمنس</option>
                    <option value="کودک و نوجوان">کودک و نوجوان</option>
                  </select>
                </div>
              </div>

              {/* POSTER UPLOAD SECTION */}
              <div className="space-y-2 p-3.5 rounded-2xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40">
                <label className="block font-extrabold text-blue-900 dark:text-blue-200">
                  آپلود پوستر رسمی نمایش
                </label>

                <div className="flex flex-col sm:flex-row items-center gap-4">
                  {/* Image Preview Box */}
                  <div className="w-24 h-32 sm:w-28 sm:h-36 rounded-2xl bg-slate-200 dark:bg-slate-800 border-2 border-dashed border-blue-300 dark:border-blue-700 flex flex-col items-center justify-center overflow-hidden shrink-0 relative">
                    {posterPreview ? (
                      <>
                        <img src={posterPreview} alt="پوستر" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => {
                            setPosterPreview(null);
                            setNewPoster('');
                          }}
                          className="absolute top-1 left-1 bg-red-600 text-white rounded-full p-1"
                          title="حذف پوستر"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </>
                    ) : (
                      <div className="text-center p-2 text-slate-400">
                        <ImageIcon className="w-8 h-8 mx-auto mb-1 opacity-50" />
                        <span className="text-[10px] block">پیش‌نمایش</span>
                      </div>
                    )}
                  </div>

                  {/* Upload Controls */}
                  <div className="flex-1 space-y-2 w-full">
                    <input
                      type="file"
                      ref={fileInputRef}
                      accept="image/*"
                      onChange={handlePosterFileUpload}
                      className="hidden"
                    />

                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold flex items-center justify-center gap-2 shadow-sm transition-all"
                    >
                      <UploadCloud className="w-4 h-4" />
                      <span>انتخاب و آپلود فایل تصویر از دستگاه (موبایل / رایانه)</span>
                    </button>

                    <div className="flex items-center gap-2">
                      <span className="text-slate-400 text-[11px]">یا آدرس اینترنتی تصویر (URL):</span>
                      <input
                        type="url"
                        dir="ltr"
                        value={newPoster}
                        onChange={(e) => {
                          setNewPoster(e.target.value);
                          setPosterPreview(e.target.value);
                        }}
                        placeholder="https://example.com/poster.jpg"
                        className="flex-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-[11px] font-mono outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Venue & Ticketing Mode */}
              <div className="space-y-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <label className="font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5 text-xs sm:text-sm">
                    <Building2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <span>محل برگزاری و سالن تئاتر (انتخاب از لیست یا نوشتن سالن دلخواه) *</span>
                  </label>

                  {/* Toggle between Select and Custom Writing */}
                  <div className="flex items-center gap-1 p-1 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 self-start sm:self-auto shadow-2xs">
                    <button
                      type="button"
                      onClick={() => setVenueInputMode('SELECT')}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                        venueInputMode === 'SELECT'
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      انتخاب از سالن‌های موجود
                    </button>
                    <button
                      type="button"
                      onClick={() => setVenueInputMode('CUSTOM')}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                        venueInputMode === 'CUSTOM'
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      + نوشتن / ثبت سالن جدید
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  {venueInputMode === 'SELECT' ? (
                    <div>
                      <label className="block text-xs font-bold mb-1 text-slate-700 dark:text-slate-300">
                        انتخاب سالن / تالار *
                      </label>
                      <select
                        value={newVenueId}
                        onChange={(e) => setNewVenueId(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none text-xs"
                      >
                        {venues.map((v) => (
                          <option key={v.id} value={v.id}>
                            {v.name} ({v.city}) {v.capacity ? `- ظرفیت: ${toPersianDigits(v.capacity)} نفر` : ''}
                          </option>
                        ))}
                      </select>
                      <p className="text-[10px] text-slate-400 mt-1">
                        سالن انتخابی شامل نقشه صندلی‌ها و ظرفیت از پیش تعریف شده است.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2 sm:col-span-2">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                        <div className="sm:col-span-2">
                          <label className="block text-xs font-bold mb-1 text-slate-700 dark:text-slate-300">
                            نام تالار یا سالن (تایپ کنید) *
                          </label>
                          <input
                            type="text"
                            value={customVenueName}
                            onChange={(e) => setCustomVenueName(e.target.value)}
                            placeholder="مثال: تالار وحدت، سالن اصلی تئاتر شهر، فرهنگسرای نیاوران..."
                            className="w-full px-3 py-2 rounded-xl border border-indigo-300 dark:border-indigo-700 bg-white dark:bg-slate-900 outline-none text-xs focus:ring-2 focus:ring-indigo-500/20"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold mb-1 text-slate-700 dark:text-slate-300">
                            شهر
                          </label>
                          <input
                            type="text"
                            value={customVenueCity}
                            onChange={(e) => setCustomVenueCity(e.target.value)}
                            placeholder="تهران"
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none text-xs"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-bold mb-1 text-slate-700 dark:text-slate-300">
                          آدرس دقیق سالن (اختیاری)
                        </label>
                        <input
                          type="text"
                          value={customVenueAddress}
                          onChange={(e) => setCustomVenueAddress(e.target.value)}
                          placeholder="مثال: خیابان انقلاب، خیابان حافظ، کوچه محمدحسن شهریار"
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none text-xs"
                        />
                      </div>
                    </div>
                  )}

                  <div className={venueInputMode === 'CUSTOM' ? 'sm:col-span-2 pt-1 border-t border-slate-200 dark:border-slate-700' : ''}>
                    <label className="block text-xs font-bold mb-1 text-slate-700 dark:text-slate-300">
                      نحوه فروش بلیت
                    </label>
                    <select
                      value={newTicketingMode}
                      onChange={(e) => setNewTicketingMode(e.target.value as any)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none text-xs"
                    >
                      <option value="SEAT_SELECTION">انتخاب صندلی (نقشه تفکیکی و شماره‌گذاری سالن)</option>
                      <option value="QUANTITY_ONLY">ورودی عمومی و آزاد (فقط تعیین تعداد نفرات)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* COMPREHENSIVE CAST & CREW SECTION */}
              <div className="space-y-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between">
                  <label className="font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-emerald-600" />
                    <span>عوامل و بازیگران نمایش (افزودن کامل و تفکیک سمت‌ها)</span>
                  </label>
                  <span className="text-[10px] text-slate-400">
                    {toPersianDigits(castList.length)} عضو ثبت شده
                  </span>
                </div>

                {/* Form to add a cast/crew member */}
                <div className="flex flex-col sm:flex-row items-center gap-2">
                  <select
                    value={newMemberRole}
                    onChange={(e) => setNewMemberRole(e.target.value)}
                    className="w-full sm:w-44 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none text-xs font-semibold"
                  >
                    {COMMON_ROLES.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>

                  <input
                    type="text"
                    value={newMemberName}
                    onChange={(e) => setNewMemberName(e.target.value)}
                    placeholder="نام و نام خانوادگی عضو (مثال: نوید محمدزاده)"
                    className="w-full sm:flex-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none text-xs"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddCastMember();
                      }
                    }}
                  />

                  <button
                    type="button"
                    onClick={handleAddCastMember}
                    className="w-full sm:w-auto px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shrink-0"
                  >
                    + افزودن به عوامل
                  </button>
                </div>

                {/* List of Added Members */}
                {castList.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                    {castList.map((member, idx) => (
                      <div
                        key={idx}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs shadow-sm"
                      >
                        <span className="font-bold text-blue-600 dark:text-blue-400">
                          {member.role}:
                        </span>
                        <span className="text-slate-800 dark:text-slate-200">{member.name}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveCastMember(idx)}
                          className="w-4 h-4 rounded-full text-red-500 hover:bg-red-50 flex items-center justify-center font-bold"
                          title="حذف این عضو"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* THEATRE SESSIONS & SCHEDULE SECTION (DAYS, TIME, CAPACITY, TICKET PRICE) */}
              <div className="space-y-3.5 p-3.5 sm:p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <label className="font-black text-indigo-950 dark:text-indigo-200 flex items-center gap-1.5 text-xs sm:text-sm">
                      <Calendar className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                      <span>روزها و سانس‌های اجرای تئاتر (تاریخ شروع و پایان، ساعت، ظرفیت و قیمت بلیت)</span>
                    </label>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      می‌توانید تاریخ‌ها را بصورت بازه شروع و پایان (چندین روز پشت‌سرهم) یا تک‌روز به همراه ساعت، ظرفیت و قیمت وارد کنید.
                    </p>
                  </div>

                  {/* Mode switcher: Range vs Single Date */}
                  <div className="flex items-center gap-1 p-1 bg-white dark:bg-slate-800 rounded-xl border border-indigo-100 dark:border-indigo-900/40 self-start sm:self-auto shadow-2xs">
                    <button
                      type="button"
                      onClick={() => setDateScheduleMode('RANGE')}
                      className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${
                        dateScheduleMode === 'RANGE'
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      <CalendarRange className="w-3.5 h-3.5" />
                      <span>بازه تاریخ (شروع و پایان)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setDateScheduleMode('SINGLE')}
                      className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${
                        dateScheduleMode === 'SINGLE'
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      <Calendar className="w-3.5 h-3.5" />
                      <span>تک‌سانس انتخابی</span>
                    </button>
                  </div>
                </div>

                {/* Session Input Controls Form */}
                <div className="p-3.5 rounded-xl bg-white dark:bg-slate-800/80 border border-indigo-100 dark:border-indigo-900/30 space-y-3">
                  {dateScheduleMode === 'RANGE' ? (
                    /* Range Mode (Start Date & End Date) */
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
                        {/* Start Date */}
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                            تاریخ شروع دوره اجرا *
                          </label>
                          <input
                            type="date"
                            value={rangeStartDate}
                            onChange={(e) => setRangeStartDate(e.target.value)}
                            className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-mono outline-none focus:border-indigo-500"
                          />
                          {rangeStartDate && (
                            <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold block mt-1 truncate">
                              از {formatJalaliDate(`${rangeStartDate}T12:00:00`).split('-')[0]}
                            </span>
                          )}
                        </div>

                        {/* End Date */}
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                            تاریخ پایان دوره اجرا *
                          </label>
                          <input
                            type="date"
                            value={rangeEndDate}
                            onChange={(e) => setRangeEndDate(e.target.value)}
                            className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-mono outline-none focus:border-indigo-500"
                          />
                          {rangeEndDate && (
                            <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold block mt-1 truncate">
                              تا {formatJalaliDate(`${rangeEndDate}T12:00:00`).split('-')[0]}
                            </span>
                          )}
                        </div>

                        {/* Start Time */}
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                            ساعت شروع سانس روزانه
                          </label>
                          <input
                            type="time"
                            value={rangeStartTime}
                            onChange={(e) => setRangeStartTime(e.target.value)}
                            className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-mono text-center outline-none focus:border-indigo-500"
                          />
                        </div>

                        {/* End Time */}
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                            ساعت پایان سانس روزانه
                          </label>
                          <input
                            type="time"
                            value={rangeEndTime}
                            onChange={(e) => setRangeEndTime(e.target.value)}
                            className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-mono text-center outline-none focus:border-indigo-500"
                          />
                        </div>
                      </div>

                      {/* Capacity & Price Row */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                            ظرفیت هر روز (صندلی)
                          </label>
                          <input
                            type="number"
                            min="1"
                            value={rangeCapacity}
                            onChange={(e) => setRangeCapacity(e.target.value)}
                            placeholder="۱۵۰"
                            className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-mono text-center outline-none focus:border-indigo-500"
                          />
                        </div>

                        <div className="sm:col-span-2">
                          <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                            قیمت هر بلیت (تومان)
                          </label>
                          <div className="flex items-center gap-2">
                            <div className="relative flex-1">
                              <input
                                type="number"
                                step="5000"
                                min="10000"
                                value={rangePrice}
                                onChange={(e) => setRangePrice(e.target.value)}
                                placeholder="۲۰۰۰۰۰"
                                className="w-full pl-14 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-mono outline-none focus:border-indigo-500"
                              />
                              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-bold">
                                تومان
                              </span>
                            </div>
                            <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 shrink-0">
                              {formatToman(Number(rangePrice) || 0)}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="pt-2 flex justify-end">
                        <button
                          type="button"
                          onClick={handleAddRangeSessions}
                          className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all"
                        >
                          <CalendarRange className="w-4 h-4" />
                          <span>ثبت سانس‌های بازه زمانی (از تاریخ شروع تا پایان) در جدول</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Single Date Mode */
                    <div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-2.5">
                        {/* Single Date Picker */}
                        <div className="md:col-span-2">
                          <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                            تاریخ / روز اجرا
                          </label>
                          <input
                            type="date"
                            value={sesDate}
                            onChange={(e) => setSesDate(e.target.value)}
                            className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-mono outline-none focus:border-indigo-500"
                          />
                          {sesDate && (
                            <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold block mt-1 truncate">
                              {formatJalaliDate(`${sesDate}T12:00:00`).split('-')[0]}
                            </span>
                          )}
                        </div>

                        {/* Start Time */}
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                            ساعت شروع
                          </label>
                          <input
                            type="time"
                            value={sesStartTime}
                            onChange={(e) => setSesStartTime(e.target.value)}
                            className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-mono text-center outline-none focus:border-indigo-500"
                          />
                        </div>

                        {/* End Time */}
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                            ساعت پایان
                          </label>
                          <input
                            type="time"
                            value={sesEndTime}
                            onChange={(e) => setSesEndTime(e.target.value)}
                            className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-mono text-center outline-none focus:border-indigo-500"
                          />
                        </div>

                        {/* Capacity */}
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                            ظرفیت (صندلی)
                          </label>
                          <input
                            type="number"
                            min="1"
                            value={sesCapacity}
                            onChange={(e) => setSesCapacity(e.target.value)}
                            placeholder="۱۵۰"
                            className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-mono text-center outline-none focus:border-indigo-500"
                          />
                        </div>
                      </div>

                      {/* Price & Add Button Row */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-3 mt-3 border-t border-slate-100 dark:border-slate-800">
                        <div className="flex items-center gap-2 flex-1">
                          <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 shrink-0">
                            قیمت هر بلیت:
                          </label>
                          <div className="relative flex-1 max-w-xs">
                            <input
                              type="number"
                              step="5000"
                              min="10000"
                              value={sesPrice}
                              onChange={(e) => setSesPrice(e.target.value)}
                              placeholder="۲۰۰۰۰۰"
                              className="w-full pl-14 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-mono outline-none focus:border-indigo-500"
                            />
                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-bold">
                              تومان
                            </span>
                          </div>
                          <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 shrink-0">
                            {formatToman(Number(sesPrice) || 0)}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={handleAddSession}
                          className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all shrink-0"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>افزودن این تک‌سانس به جدول</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* List of Added Sessions */}
                <div className="space-y-2">
                  <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block">
                    سانس‌های اضافه شده به این نمایش:
                  </span>
                  {sessionList.length === 0 ? (
                    <div className="text-center py-4 bg-white/60 dark:bg-slate-900/60 rounded-xl border border-dashed border-indigo-200 dark:border-indigo-800/60 text-xs text-amber-600 dark:text-amber-400">
                      هیچ سانسی ثبت نشده است. حداقل یک سانس اضافه نمایید.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {sessionList.map((ses, idx) => (
                        <div
                          key={ses.id}
                          className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-2 shadow-xs"
                        >
                          <div className="space-y-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 flex items-center justify-center text-[10px] font-bold shrink-0">
                                {toPersianDigits(idx + 1)}
                              </span>
                              <span className="font-bold text-slate-900 dark:text-white text-xs truncate">
                                {formatJalaliDate(`${ses.date}T${ses.startTime}:00`).split('-')[0]}
                              </span>
                            </div>
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-slate-500">
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3 text-indigo-500" />
                                <span>{toPersianDigits(ses.startTime)} الی {toPersianDigits(ses.endTime)}</span>
                              </span>
                              <span className="flex items-center gap-1">
                                <Armchair className="w-3 h-3 text-emerald-500" />
                                <span>{toPersianDigits(ses.capacity)} نفر</span>
                              </span>
                              <span className="font-extrabold text-blue-600 dark:text-blue-400">
                                {formatToman(ses.priceToman)}
                              </span>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleRemoveSession(ses.id)}
                            className="w-7 h-7 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-950/60 flex items-center justify-center shrink-0 transition-colors"
                            title="حذف سانس"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Duration & Age Rating */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">
                    مدت زمان (دقیقه)
                  </label>
                  <input
                    type="number"
                    value={newDuration}
                    onChange={(e) => setNewDuration(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">
                    رده سنی
                  </label>
                  <input
                    type="text"
                    value={newAgeRating}
                    onChange={(e) => setNewAgeRating(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">
                  خلاصه و درباره نمایش
                </label>
                <textarea
                  rows={3}
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="توضیحات اثر، جوایز و داستان..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none"
                />
              </div>

              {/* Submit Buttons */}
              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowFormOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold shadow-md shadow-blue-600/20"
                >
                  {loading ? 'در حال ثبت...' : 'انتشار و ذخیره نمایش'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ASSIGN SELLER MODAL */}
      {assignShowId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-md">
          <div
            className="relative w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                <UserCheck className="w-4 h-4 text-indigo-600" />
                <span>تخصیص فروشنده به نمایش</span>
              </h3>
              <button
                type="button"
                onClick={() => setAssignShowId(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed text-justify">
              کاربران معمولی به عنوان خریدار ثبت‌نام می‌کنند. با وارد کردن شماره همراه در این بخش، این کاربر به عنوان فروشنده گیشه این نمایش ارتقا یافته و دسترسی پنل گیشه برای او فعال می‌گردد:
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold mb-1">شماره تلفن همراه فروشنده</label>
                <input
                  type="tel"
                  dir="ltr"
                  value={sellerMobile}
                  onChange={(e) => setSellerMobile(e.target.value)}
                  placeholder="09120000002"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none font-mono text-center"
                />
              </div>

              <div>
                <label className="block font-bold mb-1">نام یا عنوان مسئول (اختیاری)</label>
                <input
                  type="text"
                  value={sellerName}
                  onChange={(e) => setSellerName(e.target.value)}
                  placeholder="مسئول گیشه تالار وحدت"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setAssignShowId(null)}
                  className="px-3 py-2 rounded-xl text-slate-500 font-semibold"
                >
                  انصراف
                </button>
                <button
                  type="button"
                  disabled={loading || !sellerMobile}
                  onClick={handleAssignSeller}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
                >
                  {loading ? 'در حال ثبت...' : 'تخصیص سطح فروشنده'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
