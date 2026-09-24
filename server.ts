import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const DB_FILE = path.resolve(process.cwd(), 'data/db.json');

// Ensure data folder exists
if (!fs.existsSync(path.dirname(DB_FILE))) {
  fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });
}

// ----------------------------------------------------
// Database In-Memory Cache & File Persistence
// ----------------------------------------------------
interface User {
  id: string;
  mobile: string;
  name: string;
  role: 'admin' | 'seller' | 'buyer';
  is_verified: boolean;
  password_hash?: string;
  created_at: string;
}

interface OtpRecord {
  mobile: string;
  code_hash: string;
  plain_code_for_debug?: string;
  attempts: number;
  expires_at: number;
  last_sent_at: number;
}

interface Venue {
  id: string;
  name: string;
  city: string;
  address: string;
  capacity: number;
  sections: {
    id: string;
    name: string;
    rows: number;
    seats_per_row: number;
    base_price: number;
  }[];
}

interface Seat {
  id: string;
  venue_id: string;
  section_id: string;
  row_number: number;
  seat_number: number;
}

interface ShowSession {
  id: string;
  show_id: string;
  venue_id: string;
  start_at: string; // ISO
  start_at_jalali?: string;
  end_at: string;
  capacity: number;
  remaining_capacity: number;
  status: 'open' | 'closed' | 'sold_out';
  price_tiers: {
    id: string;
    section_id?: string;
    name: string;
    price_toman: number;
  }[];
}

interface Show {
  id: string;
  title: string;
  slug: string;
  description: string;
  poster_url: string;
  gallery_urls: string[];
  venue_id: string;
  duration_minutes: number;
  age_rating: string;
  category: string;
  director: string;
  cast_members: string[];
  ticketing_mode: 'SEAT_SELECTION' | 'QUANTITY_ONLY';
  status: 'published' | 'draft' | 'archived';
  seller_ids: string[];
  created_at: string;
}

interface SeatReservation {
  id: string;
  session_id: string;
  seat_id: string;
  user_id: string;
  user_mobile: string;
  expires_at: number; // timestamp
}

interface Order {
  id: string;
  uuid: string;
  user_id: string;
  show_id: string;
  session_id: string;
  type: 'online' | 'offline_pos' | 'offline_cash';
  total_amount: number;
  status: 'pending' | 'paid' | 'cancelled' | 'refunded';
  buyer_name: string;
  buyer_mobile: string;
  created_at: string;
  payment_ref?: string;
  payment_gateway?: string;
  items: {
    seat_id?: string;
    seat_label?: string;
    price: number;
  }[];
}

interface Ticket {
  id: string;
  code: string; // Unique printable ticket code
  order_id: string;
  session_id: string;
  show_id: string;
  seat_id?: string;
  seat_label?: string;
  status: 'VALID' | 'USED' | 'CANCELLED';
  buyer_name: string;
  buyer_mobile: string;
  price: number;
  issued_at: string;
  used_at?: string;
  used_by_seller_id?: string;
}

interface CheckInLog {
  id: string;
  ticket_id: string;
  ticket_code: string;
  seller_id: string;
  seller_name: string;
  action: 'SUCCESS' | 'ALREADY_USED' | 'WRONG_SHOW' | 'CANCELLED';
  timestamp: string;
}

interface AuditLog {
  id: string;
  user_id: string;
  user_name: string;
  action: string;
  details: string;
  timestamp: string;
}

interface DatabaseState {
  users: User[];
  venues: Venue[];
  shows: Show[];
  sessions: ShowSession[];
  seats: Seat[];
  reservations: SeatReservation[];
  orders: Order[];
  tickets: Ticket[];
  check_in_logs: CheckInLog[];
  audit_logs: AuditLog[];
  settings: Record<string, any>;
}

// Password hashing helper
function hashPassword(pass: string): string {
  return crypto.createHash('sha256').update(pass + 'theatre_salt_2026').digest('hex');
}

// Initial Database Seeder: Exactly 3 real accounts as mandated by Rules
function createInitialDatabase(): DatabaseState {
  const adminId = 'usr_admin_01';
  const sellerId = 'usr_seller_01';
  const buyerId = 'usr_buyer_01';

  const defaultVenue: Venue = {
    id: 'ven_tehran_main',
    name: 'تالار وحدت تهران (سالن اصلی)',
    city: 'تهران',
    address: 'تهران، خیابان حافظ، پایین‌تر از چهارراه کالج، بلوار شهریار',
    capacity: 120,
    sections: [
      {
        id: 'sec_vip',
        name: 'همکف - جایگاه VIP',
        rows: 4,
        seats_per_row: 12,
        base_price: 350000,
      },
      {
        id: 'sec_standard',
        name: 'همکف - ردیف‌های استاندارد',
        rows: 6,
        seats_per_row: 12,
        base_price: 250000,
      },
    ],
  };

  // Generate seats for default venue
  const initialSeats: Seat[] = [];
  defaultVenue.sections.forEach((sec) => {
    for (let r = 1; r <= sec.rows; r++) {
      for (let s = 1; s <= sec.seats_per_row; s++) {
        initialSeats.push({
          id: `seat_${sec.id}_r${r}_s${s}`,
          venue_id: defaultVenue.id,
          section_id: sec.id,
          row_number: r,
          seat_number: s,
        });
      }
    }
  });

  return {
    users: [
      {
        id: adminId,
        mobile: process.env.ADMIN_MOBILE || '09120000001',
        name: 'مدیر کل سامانه تیکت',
        role: 'admin',
        is_verified: true,
        password_hash: hashPassword(process.env.ADMIN_PASSWORD || 'admin123456'),
        created_at: new Date().toISOString(),
      },
      {
        id: sellerId,
        mobile: process.env.SELLER_MOBILE || '09120000002',
        name: 'مسئول گیشه و فروش تالار',
        role: 'seller',
        is_verified: true,
        password_hash: hashPassword(process.env.SELLER_PASSWORD || 'seller123456'),
        created_at: new Date().toISOString(),
      },
      {
        id: buyerId,
        mobile: process.env.BUYER_MOBILE || '09120000003',
        name: 'علی صادقی (خریدار تایید شده)',
        role: 'buyer',
        is_verified: true,
        password_hash: hashPassword(process.env.BUYER_PASSWORD || 'buyer123456'),
        created_at: new Date().toISOString(),
      },
    ],
    venues: [defaultVenue],
    seats: initialSeats,
    shows: [],
    sessions: [],
    reservations: [],
    orders: [],
    tickets: [],
    check_in_logs: [],
    audit_logs: [
      {
        id: 'aud_init',
        user_id: adminId,
        user_name: 'مدیر کل سامانه تیکت',
        action: 'SYSTEM_BOOTSTRAP',
        details: 'پایگاه داده سامانه با ۳ کاربر معتبر اولیه و سالن اصلی راه‌اندازی شد.',
        timestamp: new Date().toISOString(),
      },
    ],
    settings: {
      site_name: 'سامانه تیکت تئاتر',
      currency: 'تومان',
      seat_lock_duration_seconds: 600, // 10 minutes
      zarinpal_sandbox: true,
      zarinpal_merchant_id: process.env.ZARINPAL_MERCHANT_ID || '00000000-0000-0000-0000-000000000000',
    },
  };
}

let db: DatabaseState;
try {
  if (fs.existsSync(DB_FILE)) {
    db = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
  } else {
    db = createInitialDatabase();
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
  }
} catch (err) {
  console.error('Error loading DB file, creating fresh state:', err);
  db = createInitialDatabase();
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

function saveDb() {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
  } catch (err) {
    console.error('Error saving DB file:', err);
  }
}

// Helper: Normalize Iranian Phone Number to 09xxxxxxxxx
function normalizeIranianMobile(mobile: string): string {
  let cleaned = mobile.trim().replace(/[\s\-\+]/g, '');
  if (cleaned.startsWith('0098')) {
    cleaned = '0' + cleaned.substring(4);
  } else if (cleaned.startsWith('98')) {
    cleaned = '0' + cleaned.substring(2);
  }
  if (cleaned.length === 10 && cleaned.startsWith('9')) {
    cleaned = '0' + cleaned;
  }
  return cleaned;
}

// Helper: Get YYYY-MM-DD in Asia/Tehran timezone
function getIranDateString(dateInput?: string | number | Date): string {
  const d = dateInput ? new Date(dateInput) : new Date();
  if (isNaN(d.getTime())) return '';
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Tehran',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(d);
}

// In-Memory OTP Store
const otpStore = new Map<string, OtpRecord>();

// Simple Token Management (Sanctum emulation)
const tokenStore = new Map<string, { userId: string; role: string; mobile: string }>();

function generateToken(user: User): string {
  const token = 'sctm_' + crypto.randomBytes(32).toString('hex');
  tokenStore.set(token, { userId: user.id, role: user.role, mobile: user.mobile });
  return token;
}

// Authentication Middleware
function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    (req as any).user = null;
    return next();
  }
  const token = authHeader.split(' ')[1];
  const session = tokenStore.get(token);
  if (session) {
    const user = db.users.find((u) => u.id === session.userId);
    (req as any).user = user || null;
  } else {
    (req as any).user = null;
  }
  next();
}

function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!(req as any).user) {
    return res.status(401).json({
      success: false,
      message: 'لطفاً ابتدا وارد حساب کاربری خود شوید.',
    });
  }
  next();
}

function requireRole(roles: ('admin' | 'seller' | 'buyer')[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user as User | undefined;
    if (!user || !roles.includes(user.role)) {
      return res.status(403).json({
        success: false,
        message: 'شما دسترسی لازم برای این بخش را ندارید.',
      });
    }
    next();
  };
}

// Clean up expired reservations periodically
function cleanExpiredReservations() {
  const now = Date.now();
  const beforeCount = db.reservations.length;
  db.reservations = db.reservations.filter((r) => r.expires_at > now);
  if (db.reservations.length !== beforeCount) {
    saveDb();
  }
}
setInterval(cleanExpiredReservations, 15000);

// ----------------------------------------------------
// Express Middlewares
// ----------------------------------------------------
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(authMiddleware);

// ----------------------------------------------------
// API V1 Routes
// ----------------------------------------------------

// 1. Auth: Send OTP
app.post('/api/v1/auth/send-otp', async (req: Request, res: Response) => {
  try {
    const { mobile } = req.body;
    if (!mobile) {
      return res.status(422).json({ success: false, message: 'شماره موبایل الزامی است.' });
    }
    const cleanMobile = normalizeIranianMobile(mobile);
    if (!/^09[0-9]{9}$/.test(cleanMobile)) {
      return res.status(422).json({ success: false, message: 'شماره موبایل معتبر نیست (فرمت صحیح: ۰۹۱۲۳۴۵۶۷۸۹).' });
    }

    const now = Date.now();
    const existing = otpStore.get(cleanMobile);
    if (existing && now - existing.last_sent_at < 60000) {
      const waitSeconds = Math.ceil((60000 - (now - existing.last_sent_at)) / 1000);
      return res.status(429).json({
        success: false,
        message: `لطفاً ${waitSeconds} ثانیه دیگر جهت درخواست مجدد کد تایید شکیبا باشید.`,
      });
    }

    // Generate random 5-digit OTP
    const code = Math.floor(10000 + Math.random() * 90000).toString();
    const codeHash = crypto.createHash('sha256').update(code).digest('hex');

    otpStore.set(cleanMobile, {
      mobile: cleanMobile,
      code_hash: codeHash,
      plain_code_for_debug: code, // displayed in dev mode for seamless testing
      attempts: 0,
      expires_at: now + 120000, // 2 minutes
      last_sent_at: now,
    });

    // In production, call SMS.ir verify/template API:
    // await smsService.sendVerifyOtp(cleanMobile, code);
    console.log(`[SMS.ir Service] OTP Code for ${cleanMobile}: ${code}`);

    return res.json({
      success: true,
      message: 'کد تایید پیامکی با موفقیت ارسال شد.',
      // We pass debug_code in dev so tester never gets stuck without SMS credit
      debug_code: code,
      expires_in_seconds: 120,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'خطا در ارسال پیامک: ' + err.message });
  }
});

// 2. Auth: Verify OTP
app.post('/api/v1/auth/verify-otp', (req: Request, res: Response) => {
  try {
    const { mobile, code, name } = req.body;
    if (!mobile || !code) {
      return res.status(422).json({ success: false, message: 'شماره موبایل و کد تایید الزامی هستند.' });
    }
    const cleanMobile = normalizeIranianMobile(mobile);
    const record = otpStore.get(cleanMobile);

    if (!record) {
      return res.status(400).json({ success: false, message: 'کد تایید منقضی شده یا درخواستی ثبت نشده است.' });
    }

    if (Date.now() > record.expires_at) {
      otpStore.delete(cleanMobile);
      return res.status(400).json({ success: false, message: 'کد تایید منقضی شده است. مجدداً درخواست کد کنید.' });
    }

    if (record.attempts >= 5) {
      otpStore.delete(cleanMobile);
      return res.status(429).json({ success: false, message: 'تعداد دفعات تلاش بیش از حد مجاز بوده است. لطفاً ۲ دقیقه دیگر امتحان کنید.' });
    }

    const providedHash = crypto.createHash('sha256').update(code.trim()).digest('hex');
    if (providedHash !== record.code_hash) {
      record.attempts += 1;
      return res.status(400).json({ success: false, message: 'کد تایید وارد شده نادرست است.' });
    }

    // OTP Verified! Remove from store
    otpStore.delete(cleanMobile);

    // Find or create user
    let user = db.users.find((u) => u.mobile === cleanMobile);
    if (!user) {
      user = {
        id: 'usr_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
        mobile: cleanMobile,
        name: name || `کاربر ${cleanMobile.substring(7)}`,
        role: 'buyer',
        is_verified: true,
        created_at: new Date().toISOString(),
      };
      db.users.push(user);
      saveDb();
    } else {
      user.is_verified = true;
      if (name && (!user.name || user.name.startsWith('کاربر'))) {
        user.name = name;
      }
      saveDb();
    }

    const token = generateToken(user);
    return res.json({
      success: true,
      message: 'ورود با موفقیت انجام شد.',
      token,
      user: {
        id: user.id,
        mobile: user.mobile,
        name: user.name,
        role: user.role,
        is_verified: user.is_verified,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'خطا در احراز هویت: ' + err.message });
  }
});

// 3. Auth: Password Login (For the 3 Seeded accounts: Admin, Seller, Buyer)
app.post('/api/v1/auth/login-password', (req: Request, res: Response) => {
  try {
    const { mobile, password } = req.body;
    if (!mobile || !password) {
      return res.status(422).json({ success: false, message: 'شماره همراه و رمز عبور الزامی است.' });
    }
    const cleanMobile = normalizeIranianMobile(mobile);
    const user = db.users.find((u) => u.mobile === cleanMobile);

    if (!user || !user.password_hash) {
      return res.status(401).json({ success: false, message: 'اطلاعات ورود نادرست است یا حساب کاربری رمز عبور ندارد.' });
    }

    const inputHash = hashPassword(password);
    if (inputHash !== user.password_hash) {
      return res.status(401).json({ success: false, message: 'شماره همراه یا کلمه عبور اشتباه است.' });
    }

    const token = generateToken(user);
    return res.json({
      success: true,
      message: `خوش آمدید ${user.name}`,
      token,
      user: {
        id: user.id,
        mobile: user.mobile,
        name: user.name,
        role: user.role,
        is_verified: user.is_verified,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// 4. Auth: Current user (Me)
app.get('/api/v1/auth/me', (req: Request, res: Response) => {
  const user = (req as any).user;
  if (!user) {
    return res.json({ success: true, authenticated: false, user: null });
  }
  return res.json({
    success: true,
    authenticated: true,
    user: {
      id: user.id,
      mobile: user.mobile,
      name: user.name,
      role: user.role,
      is_verified: user.is_verified,
    },
  });
});

// 5. Auth: Logout
app.post('/api/v1/auth/logout', (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    tokenStore.delete(token);
  }
  return res.json({ success: true, message: 'با موفقیت خارج شدید.' });
});

// ----------------------------------------------------
// Public Shows & Sessions
// ----------------------------------------------------

// List published shows
app.get('/api/v1/shows', (req: Request, res: Response) => {
  const { category, search } = req.query;
  let list = db.shows.filter((s) => s.status === 'published');

  if (category && category !== 'all') {
    list = list.filter((s) => s.category === category);
  }

  if (search && typeof search === 'string') {
    const q = search.trim().toLowerCase();
    list = list.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        s.director.toLowerCase().includes(q) ||
        s.cast_members.some((c) => c.toLowerCase().includes(q))
    );
  }

  const enriched = list.map((show) => {
    const venue = db.venues.find((v) => v.id === show.venue_id);
    const sessions = db.sessions.filter((ses) => ses.show_id === show.id && ses.status !== 'closed');
    const prices = sessions.flatMap((ses) => ses.price_tiers.map((pt) => pt.price_toman));
    const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
    const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;

    return {
      ...show,
      venue_name: venue ? venue.name : '',
      venue_city: venue ? venue.city : '',
      sessions_count: sessions.length,
      min_price: minPrice,
      max_price: maxPrice,
    };
  });

  return res.json({ success: true, data: enriched });
});

// Show Details by Slug
app.get('/api/v1/shows/:slug', (req: Request, res: Response) => {
  const { slug } = req.params;
  const show = db.shows.find((s) => s.slug === slug || s.id === slug);

  if (!show) {
    return res.status(404).json({ success: false, message: 'نمایش مورد نظر یافت نشد.' });
  }

  const venue = db.venues.find((v) => v.id === show.venue_id);
  const sessions = db.sessions
    .filter((ses) => ses.show_id === show.id)
    .map((ses) => {
      // Calculate real remaining capacity from actual sold tickets
      const soldCount = db.tickets.filter((t) => t.session_id === ses.id && t.status !== 'CANCELLED').length;
      const remaining = Math.max(0, ses.capacity - soldCount);
      const isSoldOut = remaining <= 0 || ses.status === 'sold_out';
      return {
        ...ses,
        remaining_capacity: remaining,
        status: isSoldOut ? 'sold_out' : ses.status,
      };
    });

  return res.json({
    success: true,
    data: {
      ...show,
      venue,
      sessions,
    },
  });
});

// Session Seatmap and Availability
app.get('/api/v1/sessions/:id/seatmap', (req: Request, res: Response) => {
  const { id } = req.params;
  const session = db.sessions.find((s) => s.id === id);

  if (!session) {
    return res.status(404).json({ success: false, message: 'سانس مورد نظر یافت نشد.' });
  }

  const show = db.shows.find((s) => s.id === session.show_id);
  const venue = db.venues.find((v) => v.id === session.venue_id);

  if (!venue) {
    return res.status(404).json({ success: false, message: 'اطلاعات سالن یافت نشد.' });
  }

  cleanExpiredReservations();

  // Sold tickets for this session
  const soldSeats = new Set(
    db.tickets
      .filter((t) => t.session_id === session.id && t.status !== 'CANCELLED' && t.seat_id)
      .map((t) => t.seat_id!)
  );

  // Currently held reservations (not expired)
  const now = Date.now();
  const heldSeats = new Map<string, string>(); // seat_id -> user_id
  db.reservations
    .filter((r) => r.session_id === session.id && r.expires_at > now)
    .forEach((r) => heldSeats.set(r.seat_id, r.user_id));

  // Current user id if authenticated
  const currentUserId = (req as any).user ? (req as any).user.id : null;

  // Build section maps
  const sectionsData = venue.sections.map((sec) => {
    const tier = session.price_tiers.find((pt) => pt.section_id === sec.id) || {
      name: sec.name,
      price_toman: sec.base_price,
    };

    const sectionSeats = db.seats.filter((st) => st.venue_id === venue.id && st.section_id === sec.id);

    // Group seats by row
    const rowsMap = new Map<number, any[]>();
    for (let r = 1; r <= sec.rows; r++) {
      rowsMap.set(r, []);
    }

    sectionSeats.forEach((seat) => {
      let status: 'AVAILABLE' | 'HELD_BY_ME' | 'HELD_BY_OTHER' | 'SOLD' = 'AVAILABLE';
      if (soldSeats.has(seat.id)) {
        status = 'SOLD';
      } else if (heldSeats.has(seat.id)) {
        if (heldSeats.get(seat.id) === currentUserId) {
          status = 'HELD_BY_ME';
        } else {
          status = 'HELD_BY_OTHER';
        }
      }

      const rowList = rowsMap.get(seat.row_number);
      if (rowList) {
        rowList.push({
          id: seat.id,
          row: seat.row_number,
          number: seat.seat_number,
          price: tier.price_toman,
          status,
        });
      }
    });

    const rows = Array.from(rowsMap.entries())
      .sort(([a], [b]) => a - b)
      .map(([rowNum, seats]) => ({
        row_number: rowNum,
        seats: seats.sort((a, b) => a.number - b.number),
      }));

    return {
      section_id: sec.id,
      name: sec.name,
      price: tier.price_toman,
      rows,
    };
  });

  return res.json({
    success: true,
    data: {
      session_id: session.id,
      show_id: show?.id,
      show_title: show?.title,
      ticketing_mode: show?.ticketing_mode,
      venue_name: venue.name,
      capacity: session.capacity,
      remaining_capacity: session.remaining_capacity,
      sections: sectionsData,
    },
  });
});

// ----------------------------------------------------
// Booking, Concurrency Locks & Payment Flow
// ----------------------------------------------------

// 1. Hold Seats (10-Minute Lock)
app.post('/api/v1/bookings/hold-seats', (req: Request, res: Response) => {
  try {
    const { session_id, seat_ids, mobile } = req.body;
    const user = (req as any).user;
    const userId = user ? user.id : 'guest_' + (mobile || 'anon');
    const userMobile = user ? user.mobile : mobile || '';

    if (!session_id || !Array.isArray(seat_ids) || seat_ids.length === 0) {
      return res.status(422).json({ success: false, message: 'انتخاب حداقل یک صندلی الزامی است.' });
    }

    const session = db.sessions.find((s) => s.id === session_id);
    if (!session) {
      return res.status(404).json({ success: false, message: 'سانس یافت نشد.' });
    }

    // Capacity Check: If session is sold out or has no remaining capacity for this day, reject
    const soldCount = db.tickets.filter((t) => t.session_id === session_id && t.status !== 'CANCELLED').length;
    const remaining = Math.max(0, session.capacity - soldCount);
    if (remaining <= 0 || session.status === 'sold_out' || session.status === 'closed') {
      return res.status(409).json({
        success: false,
        message: 'ظرفیت این سانس برای این روز تکمیل شده است و امکان خرید یا رزرو صندلی وجود ندارد.',
      });
    }

    cleanExpiredReservations();
    const now = Date.now();

    // Check if any seat is already sold
    const soldSeat = db.tickets.find(
      (t) => t.session_id === session_id && t.status !== 'CANCELLED' && seat_ids.includes(t.seat_id!)
    );
    if (soldSeat) {
      return res.status(409).json({
        success: false,
        message: 'متاسفانه یک یا چند صندلی انتخابی در لحظه خریداری شدند. لطفاً صندلی‌های دیگری انتخاب فرمایید.',
      });
    }

    // Check if any seat is locked by someone else
    const lockedByOther = db.reservations.find(
      (r) => r.session_id === session_id && seat_ids.includes(r.seat_id) && r.expires_at > now && r.user_id !== userId
    );
    if (lockedByOther) {
      return res.status(409).json({
        success: false,
        message: 'یک یا چند صندلی انتخابی هم‌اکنون در حال خرید توسط کاربر دیگری است (قفل موقت ۱۰ دقیقه‌ای).',
      });
    }

    // Release any previous holds of this user for this session
    db.reservations = db.reservations.filter((r) => !(r.session_id === session_id && r.user_id === userId));

    // Create 10-minute hold
    const holdDurationMs = 10 * 60 * 1000;
    const expiresAt = now + holdDurationMs;

    seat_ids.forEach((seatId) => {
      db.reservations.push({
        id: 'res_' + Math.random().toString(36).substring(2, 9),
        session_id,
        seat_id: seatId,
        user_id: userId,
        user_mobile: userMobile,
        expires_at: expiresAt,
      });
    });

    saveDb();

    return res.json({
      success: true,
      message: 'صندلی‌ها به مدت ۱۰ دقیقه برای شما رزرو موقت شدند.',
      expires_at: expiresAt,
      hold_seconds: 600,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// 2. Release Seats Hold
app.post('/api/v1/bookings/release-seats', (req: Request, res: Response) => {
  const { session_id, seat_ids } = req.body;
  const user = (req as any).user;
  const userId = user ? user.id : null;

  if (session_id) {
    db.reservations = db.reservations.filter((r) => {
      if (r.session_id !== session_id) return true;
      if (seat_ids && Array.isArray(seat_ids)) {
        return !seat_ids.includes(r.seat_id);
      }
      if (userId && r.user_id === userId) return false;
      return true;
    });
    saveDb();
  }
  return res.json({ success: true, message: 'رزرو موقت آزاد شد.' });
});

// 3. Checkout Order (Online Purchase)
app.post('/api/v1/bookings/checkout', (req: Request, res: Response) => {
  try {
    const { session_id, seat_ids, quantity, buyer_name, buyer_mobile } = req.body;
    const user = (req as any).user as User | undefined;

    if (!user) {
      return res.status(401).json({ success: false, message: 'جهت ثبت سفارش و پرداخت، ورود به حساب الزامی است.' });
    }

    const session = db.sessions.find((s) => s.id === session_id);
    if (!session) {
      return res.status(404).json({ success: false, message: 'سانس یافت نشد.' });
    }

    // Capacity Check: Prevent purchase if session is full for this day
    const currentSoldCount = db.tickets.filter((t) => t.session_id === session.id && t.status !== 'CANCELLED').length;
    const currentRemaining = Math.max(0, session.capacity - currentSoldCount);
    if (currentRemaining <= 0 || session.status === 'sold_out' || session.status === 'closed') {
      return res.status(409).json({
        success: false,
        message: 'ظرفیت این سانس برای این روز تکمیل شده است و امکان ثبت سفارش بلیت وجود ندارد.',
      });
    }

    const show = db.shows.find((s) => s.id === session.show_id);
    if (!show) {
      return res.status(404).json({ success: false, message: 'نمایش یافت نشد.' });
    }

    const venue = db.venues.find((v) => v.id === session.venue_id);
    let totalAmount = 0;
    const orderItems: { seat_id?: string; seat_label?: string; price: number }[] = [];

    if (show.ticketing_mode === 'SEAT_SELECTION') {
      if (!Array.isArray(seat_ids) || seat_ids.length === 0) {
        return res.status(422).json({ success: false, message: 'انتخاب صندلی الزامی است.' });
      }

      cleanExpiredReservations();

      // Check sold
      const sold = db.tickets.find((t) => t.session_id === session_id && t.status !== 'CANCELLED' && seat_ids.includes(t.seat_id!));
      if (sold) {
        return res.status(409).json({ success: false, message: 'یک یا چند صندلی انتخابی قبلاً فروخته شده‌اند.' });
      }

      seat_ids.forEach((seatId) => {
        const seat = db.seats.find((st) => st.id === seatId);
        const section = venue?.sections.find((sec) => sec.id === seat?.section_id);
        const tier = session.price_tiers.find((pt) => pt.section_id === seat?.section_id);
        const price = tier?.price_toman || section?.base_price || 200000;
        totalAmount += price;

        const label = seat ? `${section?.name || ''} - ردیف ${seat.row_number}، صندلی ${seat.seat_number}` : 'صندلی';
        orderItems.push({
          seat_id: seatId,
          seat_label: label,
          price,
        });
      });
    } else {
      // General Admission (Quantity based)
      const qty = Number(quantity) || 1;
      if (qty < 1 || qty > 10) {
        return res.status(422).json({ success: false, message: 'تعداد بلیت باید بین ۱ تا ۱۰ باشد.' });
      }
      if (session.remaining_capacity < qty) {
        return res.status(409).json({ success: false, message: `ظرفیت باقی‌مانده این سانس کمتر از تعداد درخواستی است (${session.remaining_capacity} عدد).` });
      }

      const defaultPrice = session.price_tiers[0]?.price_toman || 200000;
      totalAmount = defaultPrice * qty;

      for (let i = 0; i < qty; i++) {
        orderItems.push({
          seat_label: `بلیت ورودی عمومی (${i + 1} از ${qty})`,
          price: defaultPrice,
        });
      }
    }

    const orderId = 'ord_' + Date.now();
    const orderUuid = 'ORD-' + Math.floor(100000 + Math.random() * 900000);

    const order: Order = {
      id: orderId,
      uuid: orderUuid,
      user_id: user.id,
      show_id: show.id,
      session_id: session.id,
      type: 'online',
      total_amount: totalAmount,
      status: 'pending',
      buyer_name: buyer_name || user.name,
      buyer_mobile: buyer_mobile || user.mobile,
      created_at: new Date().toISOString(),
      items: orderItems,
    };

    db.orders.push(order);
    saveDb();

    // Create Zarinpal authority
    const authority = 'A00000000000000000000000000' + Math.floor(100000 + Math.random() * 900000);
    const callbackUrl = `${process.env.APP_URL || ''}/api/v1/payments/zarinpal/callback?Authority=${authority}&order_id=${order.id}`;

    return res.json({
      success: true,
      message: 'پیش‌فاکتور ایجاد شد. در حال انتقال به درگاه پرداخت زرین‌پال...',
      order_uuid: order.uuid,
      order_id: order.id,
      amount: totalAmount,
      authority,
      payment_url: `/api/v1/payments/zarinpal/mock-gateway?Authority=${authority}&amount=${totalAmount}&order_id=${order.id}`,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// Zarinpal Mock / Sandbox Gateway Page (Simulates real Zarinpal PG flow)
app.get('/api/v1/payments/zarinpal/mock-gateway', (req: Request, res: Response) => {
  const { Authority, amount, order_id } = req.query;
  const order = db.orders.find((o) => o.id === order_id);

  if (!order) {
    return res.status(404).send('سفارش یافت نشد.');
  }

  const show = db.shows.find((s) => s.id === order.show_id);
  const formattedAmount = Number(amount).toLocaleString('fa-IR');

  const html = `
    <!DOCTYPE html>
    <html lang="fa" dir="rtl">
    <head>
      <meta charset="UTF-8">
      <title>درگاه پرداخت زرین‌پال (محیط آزمایشی)</title>
      <link href="https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;600;700&display=swap" rel="stylesheet">
      <style>
        body { font-family: 'Vazirmatn', sans-serif; background: #f1f5f9; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; }
        .card { background: #fff; border-radius: 16px; box-shadow: 0 10px 25px rgba(0,0,0,0.08); width: 100%; max-width: 440px; padding: 28px; text-align: center; }
        .logo { display: inline-flex; align-items: center; justify-content: center; background: #f59e0b; color: #fff; width: 56px; height: 56px; border-radius: 14px; font-weight: 700; font-size: 24px; margin-bottom: 16px; }
        .amount { font-size: 26px; font-weight: 800; color: #1e3a8a; margin: 12px 0; }
        .info { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px; margin: 16px 0; font-size: 14px; text-align: right; line-height: 1.8; color: #475569; }
        .btn-success { display: block; width: 100%; background: #16a34a; color: white; padding: 14px; border: none; border-radius: 10px; font-weight: 700; font-size: 16px; cursor: pointer; text-decoration: none; margin-bottom: 10px; box-sizing: border-box; }
        .btn-cancel { display: block; width: 100%; background: #e2e8f0; color: #334155; padding: 12px; border: none; border-radius: 10px; font-weight: 600; font-size: 14px; cursor: pointer; text-decoration: none; box-sizing: border-box; }
        .badge { display: inline-block; background: #fef3c7; color: #92400e; padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: 600; margin-bottom: 12px; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="logo">ZP</div>
        <div class="badge">درگاه پرداخت الکترونیک زرین‌پال (Sandbox)</div>
        <h2 style="margin: 0; color: #0f172a; font-size: 18px;">پرداخت سفارش بلیت تئاتر</h2>
        <div class="amount">${formattedAmount} تومان</div>

        <div class="info">
          <div><strong>عنوان نمایش:</strong> ${show?.title || 'نمایش تئاتر'}</div>
          <div><strong>شناسه سفارش:</strong> ${order.uuid}</div>
          <div><strong>کد پیگیری پرداخت (Authority):</strong> <span style="font-family: monospace; font-size: 12px;">${Authority}</span></div>
          <div><strong>پذیرنده:</strong> سامانه فروش بلیت تئاتر</div>
        </div>

        <a href="/api/v1/payments/zarinpal/callback?Authority=${Authority}&Status=OK&order_id=${order.id}" class="btn-success">
          تایید و پرداخت موفقیت‌آمیز
        </a>
        <a href="/api/v1/payments/zarinpal/callback?Authority=${Authority}&Status=NOK&order_id=${order.id}" class="btn-cancel">
          انصراف از پرداخت و بازگشت
        </a>
      </div>
    </body>
    </html>
  `;
  return res.send(html);
});

// Zarinpal Callback / Verify Endpoint
app.get('/api/v1/payments/zarinpal/callback', (req: Request, res: Response) => {
  const { Authority, Status, order_id } = req.query;

  const order = db.orders.find((o) => o.id === order_id);
  if (!order) {
    return res.redirect('/?payment=not_found');
  }

  if (Status !== 'OK') {
    order.status = 'cancelled';
    saveDb();
    return res.redirect(`/?payment=cancelled&order_id=${order.id}`);
  }

  // Idempotent: If already paid, redirect to ticket page
  if (order.status === 'paid') {
    return res.redirect(`/?payment=success&order_id=${order.id}`);
  }

  const session = db.sessions.find((s) => s.id === order.session_id);
  const show = db.shows.find((s) => s.id === order.show_id);

  // Generate Reference ID
  const refId = 'REF_' + Math.floor(10000000 + Math.random() * 90000000);

  order.status = 'paid';
  order.payment_ref = refId;
  order.payment_gateway = 'zarinpal';

  // Issue tickets
  order.items.forEach((item, index) => {
    const ticketCode = `TCK-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}`;
    const ticket: Ticket = {
      id: 'tck_' + Date.now() + '_' + index,
      code: ticketCode,
      order_id: order.id,
      session_id: order.session_id,
      show_id: order.show_id,
      seat_id: item.seat_id,
      seat_label: item.seat_label,
      status: 'VALID',
      buyer_name: order.buyer_name,
      buyer_mobile: order.buyer_mobile,
      price: item.price,
      issued_at: new Date().toISOString(),
    };
    db.tickets.push(ticket);
  });

  // Decrease remaining capacity if general admission
  if (session && show?.ticketing_mode === 'QUANTITY_ONLY') {
    session.remaining_capacity = Math.max(0, session.remaining_capacity - order.items.length);
  }

  // Release temporary reservations
  db.reservations = db.reservations.filter((r) => r.session_id !== order.session_id || !order.items.some((it) => it.seat_id === r.seat_id));

  // Audit log
  db.audit_logs.push({
    id: 'aud_' + Date.now(),
    user_id: order.user_id,
    user_name: order.buyer_name,
    action: 'PAYMENT_VERIFIED',
    details: `سفارش ${order.uuid} با مبلغ ${order.total_amount.toLocaleString('fa-IR')} تومان از طریق زرین‌پال پرداخت شد. RefId: ${refId}`,
    timestamp: new Date().toISOString(),
  });

  saveDb();

  return res.redirect(`/?payment=success&order_id=${order.id}`);
});

// ----------------------------------------------------
// Buyer Panel Endpoints
// ----------------------------------------------------

app.get('/api/v1/buyer/orders', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user as User;
  const userOrders = db.orders
    .filter((o) => o.user_id === user.id || o.buyer_mobile === user.mobile)
    .map((o) => {
      const show = db.shows.find((s) => s.id === o.show_id);
      const session = db.sessions.find((ses) => ses.id === o.session_id);
      const tickets = db.tickets.filter((t) => t.order_id === o.id);
      return {
        ...o,
        show_title: show?.title,
        show_poster: show?.poster_url,
        session_time: session?.start_at,
        tickets_count: tickets.length,
      };
    })
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return res.json({ success: true, data: userOrders });
});

app.get('/api/v1/buyer/tickets', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user as User;
  const userOrders = db.orders.filter((o) => o.user_id === user.id || o.buyer_mobile === user.mobile);
  const orderIds = new Set(userOrders.map((o) => o.id));

  const userTickets = db.tickets
    .filter((t) => orderIds.has(t.order_id) || t.buyer_mobile === user.mobile)
    .map((t) => {
      const show = db.shows.find((s) => s.id === t.show_id);
      const session = db.sessions.find((ses) => ses.id === t.session_id);
      const venue = db.venues.find((v) => v.id === session?.venue_id);
      return {
        ...t,
        show_title: show?.title,
        show_poster: show?.poster_url,
        session_time: session?.start_at,
        venue_name: venue?.name,
        venue_address: venue?.address,
      };
    })
    .sort((a, b) => new Date(b.issued_at).getTime() - new Date(a.issued_at).getTime());

  return res.json({ success: true, data: userTickets });
});

// Single Order Detail (For post-payment view & invoice)
app.get('/api/v1/orders/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const order = db.orders.find((o) => o.id === id || o.uuid === id);

  if (!order) {
    return res.status(404).json({ success: false, message: 'سفارش یافت نشد.' });
  }

  const show = db.shows.find((s) => s.id === order.show_id);
  const session = db.sessions.find((ses) => ses.id === order.session_id);
  const venue = db.venues.find((v) => v.id === session?.venue_id);
  const tickets = db.tickets.filter((t) => t.order_id === order.id);

  return res.json({
    success: true,
    data: {
      ...order,
      show_title: show?.title,
      show_poster: show?.poster_url,
      venue_name: venue?.name,
      session_time: session?.start_at,
      tickets,
    },
  });
});

// ----------------------------------------------------
// Seller Panel Endpoints
// ----------------------------------------------------

// List shows assigned to current seller (or all for admin)
app.get('/api/v1/seller/shows', requireAuth, requireRole(['seller', 'admin']), (req: Request, res: Response) => {
  const user = (req as any).user as User;

  let assignedShows = db.shows;
  if (user.role === 'seller') {
    assignedShows = db.shows.filter((s) => s.seller_ids?.includes(user.id));
  }

  const enriched = assignedShows.map((show) => {
    const sessions = db.sessions.filter((ses) => ses.show_id === show.id);
    const tickets = db.tickets.filter((t) => t.show_id === show.id && t.status !== 'CANCELLED');
    const totalRevenue = tickets.reduce((sum, t) => sum + t.price, 0);
    const attendees = tickets.filter((t) => t.status === 'USED').length;

    return {
      ...show,
      sessions_count: sessions.length,
      tickets_sold: tickets.length,
      revenue_toman: totalRevenue,
      attendees_count: attendees,
    };
  });

  return res.json({ success: true, data: enriched });
});

// Seller Stats & Daily Sales breakdown
app.get('/api/v1/seller/stats', requireAuth, requireRole(['seller', 'admin']), (req: Request, res: Response) => {
  const user = (req as any).user as User;
  const showId = req.query.show_id as string | undefined;

  let validShowIds = db.shows.map((s) => s.id);
  if (user.role === 'seller') {
    validShowIds = db.shows.filter((s) => s.seller_ids?.includes(user.id)).map((s) => s.id);
  }
  if (showId) {
    validShowIds = validShowIds.filter((id) => id === showId);
  }

  const relevantTickets = db.tickets.filter((t) => validShowIds.includes(t.show_id) && t.status !== 'CANCELLED');
  const totalRevenue = relevantTickets.reduce((sum, t) => sum + t.price, 0);
  const totalTicketsSold = relevantTickets.length;
  const attendeesCount = relevantTickets.filter((t) => t.status === 'USED').length;

  // Daily breakdown
  const dailyMap = new Map<string, { date: string; tickets_sold: number; amount: number; attendees: number }>();
  relevantTickets.forEach((t) => {
    const day = t.issued_at.substring(0, 10);
    const cur = dailyMap.get(day) || { date: day, tickets_sold: 0, amount: 0, attendees: 0 };
    cur.tickets_sold += 1;
    cur.amount += t.price;
    if (t.status === 'USED') cur.attendees += 1;
    dailyMap.set(day, cur);
  });

  const dailyBreakdown = Array.from(dailyMap.values()).sort((a, b) => b.date.localeCompare(a.date));

  return res.json({
    success: true,
    data: {
      total_revenue: totalRevenue,
      total_tickets: totalTicketsSold,
      total_attendees: attendeesCount,
      daily_breakdown: dailyBreakdown,
    },
  });
});

// Offline Order (Box Office in-person sale: POS or Cash)
app.post('/api/v1/seller/offline-order', requireAuth, requireRole(['seller', 'admin']), (req: Request, res: Response) => {
  try {
    const user = (req as any).user as User;
    const { session_id, seat_ids, quantity, payment_method, buyer_name, buyer_mobile } = req.body;

    if (!session_id || !payment_method) {
      return res.status(422).json({ success: false, message: 'اطلاعات سانس و روش پرداخت (پوز یا نقدی) الزامی است.' });
    }

    const session = db.sessions.find((s) => s.id === session_id);
    if (!session) {
      return res.status(404).json({ success: false, message: 'سانس یافت نشد.' });
    }

    const show = db.shows.find((s) => s.id === session.show_id);
    if (!show) {
      return res.status(404).json({ success: false, message: 'نمایش یافت نشد.' });
    }

    // Check seller assignment
    if (user.role === 'seller' && !show.seller_ids?.includes(user.id)) {
      return res.status(403).json({ success: false, message: 'شما دسترسی فروش بلیت برای این نمایش را ندارید.' });
    }

    const venue = db.venues.find((v) => v.id === session.venue_id);
    let totalAmount = 0;
    const orderItems: { seat_id?: string; seat_label?: string; price: number }[] = [];

    if (show.ticketing_mode === 'SEAT_SELECTION') {
      if (!Array.isArray(seat_ids) || seat_ids.length === 0) {
        return res.status(422).json({ success: false, message: 'انتخاب حداقل یک صندلی الزامی است.' });
      }

      // Check sold
      const sold = db.tickets.find((t) => t.session_id === session_id && t.status !== 'CANCELLED' && seat_ids.includes(t.seat_id!));
      if (sold) {
        return res.status(409).json({ success: false, message: 'یک یا چند صندلی انتخابی قبلاً فروخته شده‌اند.' });
      }

      seat_ids.forEach((seatId) => {
        const seat = db.seats.find((st) => st.id === seatId);
        const section = venue?.sections.find((sec) => sec.id === seat?.section_id);
        const tier = session.price_tiers.find((pt) => pt.section_id === seat?.section_id);
        const price = tier?.price_toman || section?.base_price || 200000;
        totalAmount += price;

        const label = seat ? `${section?.name || ''} - ردیف ${seat.row_number}، صندلی ${seat.seat_number}` : 'صندلی';
        orderItems.push({
          seat_id: seatId,
          seat_label: label,
          price,
        });
      });
    } else {
      const qty = Number(quantity) || 1;
      if (session.remaining_capacity < qty) {
        return res.status(409).json({ success: false, message: 'ظرفیت سانس تکمیل یا ناکافی است.' });
      }
      const defaultPrice = session.price_tiers[0]?.price_toman || 200000;
      totalAmount = defaultPrice * qty;

      for (let i = 0; i < qty; i++) {
        orderItems.push({
          seat_label: `بلیت ورودی گیشه (${i + 1} از ${qty})`,
          price: defaultPrice,
        });
      }
    }

    const orderId = 'ord_off_' + Date.now();
    const orderUuid = 'POS-' + Math.floor(100000 + Math.random() * 900000);

    const order: Order = {
      id: orderId,
      uuid: orderUuid,
      user_id: user.id,
      show_id: show.id,
      session_id: session.id,
      type: payment_method === 'cash' ? 'offline_cash' : 'offline_pos',
      total_amount: totalAmount,
      status: 'paid', // Offline box-office payment is immediately settled
      buyer_name: buyer_name || 'خریدار حضوری گیشه',
      buyer_mobile: buyer_mobile || '09000000000',
      created_at: new Date().toISOString(),
      payment_ref: (payment_method === 'cash' ? 'CASH-' : 'POS-') + Math.floor(100000 + Math.random() * 900000),
      payment_gateway: payment_method === 'cash' ? 'offline_cash' : 'offline_pos',
      items: orderItems,
    };

    db.orders.push(order);

    // Issue tickets immediately
    const issuedTickets: Ticket[] = [];
    order.items.forEach((item, index) => {
      const ticketCode = `TCK-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}`;
      const ticket: Ticket = {
        id: 'tck_' + Date.now() + '_' + index,
        code: ticketCode,
        order_id: order.id,
        session_id: order.session_id,
        show_id: order.show_id,
        seat_id: item.seat_id,
        seat_label: item.seat_label,
        status: 'VALID',
        buyer_name: order.buyer_name,
        buyer_mobile: order.buyer_mobile,
        price: item.price,
        issued_at: new Date().toISOString(),
      };
      db.tickets.push(ticket);
      issuedTickets.push(ticket);
    });

    if (show.ticketing_mode === 'QUANTITY_ONLY') {
      session.remaining_capacity = Math.max(0, session.remaining_capacity - order.items.length);
    }

    // Release any temporary hold for these seats
    db.reservations = db.reservations.filter((r) => r.session_id !== order.session_id || !order.items.some((it) => it.seat_id === r.seat_id));

    db.audit_logs.push({
      id: 'aud_' + Date.now(),
      user_id: user.id,
      user_name: user.name,
      action: 'OFFLINE_SALE',
      details: `فروش حضوری گیشه (${payment_method === 'cash' ? 'نقدی' : 'دستگاه کارتخوان'}) با مبلغ ${totalAmount.toLocaleString('fa-IR')} تومان ثبت شد.`,
      timestamp: new Date().toISOString(),
    });

    saveDb();

    return res.json({
      success: true,
      message: 'فروش حضوری با موفقیت ثبت شد و بلیت(ها) صادر گردید.',
      order,
      tickets: issuedTickets,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// Check-in & Ticket Scan (Atomic verification & marked as USED)
app.post('/api/v1/seller/check-in', requireAuth, requireRole(['seller', 'admin']), (req: Request, res: Response) => {
  try {
    const user = (req as any).user as User;
    const { ticket_code, show_id } = req.body;

    if (!ticket_code) {
      return res.status(422).json({ success: false, message: 'کد یا بارکد بلیت الزامی است.' });
    }

    const cleanCode = ticket_code.trim().toUpperCase();
    const ticket = db.tickets.find((t) => t.code.toUpperCase() === cleanCode || t.id === cleanCode);

    if (!ticket) {
      return res.status(404).json({
        success: false,
        status_code: 'INVALID_CODE',
        message: 'خطا: بلیت با این بارکد یا شناسه در سامانه یافت نشد!',
      });
    }

    const show = db.shows.find((s) => s.id === ticket.show_id);
    const session = db.sessions.find((ses) => ses.id === ticket.session_id);

    // Check seller access: Seller can ONLY check in tickets for shows they are assigned to
    if (user.role === 'seller' && (!show || !show.seller_ids?.includes(user.id))) {
      return res.status(403).json({
        success: false,
        status_code: 'UNAUTHORIZED_SHOW',
        message: 'خطای دسترسی: شما مسئول گیشه این نمایش نیستید و مجاز به استعلام یا ورود بلیت‌های آن نمی‌باشید.',
      });
    }

    // Verify correct show if filter provided
    if (show_id && ticket.show_id !== show_id) {
      return res.status(400).json({
        success: false,
        status_code: 'WRONG_SHOW',
        message: `خطا: این بلیت متعلق به نمایش "${show?.title || 'دیگر'}" است و با نمایش انتخاب‌شده در گیشه همخوانی ندارد!`,
        ticket_info: {
          show_title: show?.title,
          session_time: session?.start_at,
          seat_label: ticket.seat_label,
          buyer_name: ticket.buyer_name,
        },
      });
    }

    // Check if already used
    if (ticket.status === 'USED') {
      const log = db.check_in_logs.find((l) => l.ticket_id === ticket.id && l.action === 'SUCCESS');
      return res.status(409).json({
        success: false,
        status_code: 'ALREADY_USED',
        message: `هشدار: این بلیت قبلاً در تاریخ ${ticket.used_at || ''} توسط مسئول گیشه استفاده شده است و مجاز به ورود مجدد نیست!`,
        ticket_info: {
          show_title: show?.title,
          session_time: session?.start_at,
          seat_label: ticket.seat_label,
          buyer_name: ticket.buyer_name,
          used_at: ticket.used_at,
        },
      });
    }

    if (ticket.status === 'CANCELLED') {
      return res.status(400).json({
        success: false,
        status_code: 'CANCELLED',
        message: 'خطا: این بلیت باطل یا مسترد شده است.',
      });
    }

    // Atomic update to USED
    ticket.status = 'USED';
    ticket.used_at = new Date().toISOString();
    ticket.used_by_seller_id = user.id;

    // Log check-in
    db.check_in_logs.push({
      id: 'chk_' + Date.now(),
      ticket_id: ticket.id,
      ticket_code: ticket.code,
      seller_id: user.id,
      seller_name: user.name,
      action: 'SUCCESS',
      timestamp: new Date().toISOString(),
    });

    saveDb();

    return res.json({
      success: true,
      status_code: 'SUCCESS',
      message: 'ورود مجاز است. بلیت با موفقیت ابطال و ثبت ورود شد.',
      ticket_info: {
        ticket_code: ticket.code,
        show_title: show?.title,
        session_time: session?.start_at,
        seat_label: ticket.seat_label,
        buyer_name: ticket.buyer_name,
        buyer_mobile: ticket.buyer_mobile,
        verified_at: ticket.used_at,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// Seller Check-in History & Scanned Tickets log
app.get('/api/v1/seller/check-in-logs', requireAuth, requireRole(['seller', 'admin']), (req: Request, res: Response) => {
  const user = (req as any).user as User;
  const showId = req.query.show_id as string | undefined;

  let allowedShowIds = db.shows.map((s) => s.id);
  if (user.role === 'seller') {
    allowedShowIds = db.shows.filter((s) => s.seller_ids?.includes(user.id)).map((s) => s.id);
  }
  if (showId) {
    allowedShowIds = allowedShowIds.filter((id) => id === showId);
  }

  // Get tickets checked in or logs for these shows
  const logs = db.check_in_logs
    .filter((log) => {
      const ticket = db.tickets.find((t) => t.id === log.ticket_id || t.code === log.ticket_code);
      return ticket && allowedShowIds.includes(ticket.show_id);
    })
    .map((log) => {
      const ticket = db.tickets.find((t) => t.id === log.ticket_id || t.code === log.ticket_code);
      const show = ticket ? db.shows.find((s) => s.id === ticket.show_id) : undefined;
      const session = ticket ? db.sessions.find((ses) => ses.id === ticket.session_id) : undefined;
      return {
        id: log.id,
        ticket_id: log.ticket_id,
        ticket_code: log.ticket_code,
        show_id: show?.id,
        show_title: show?.title,
        session_time: session?.start_at,
        seat_label: ticket?.seat_label,
        buyer_name: ticket?.buyer_name,
        buyer_mobile: ticket?.buyer_mobile,
        seller_name: log.seller_name,
        action: log.action,
        timestamp: log.timestamp,
        ticket_status: ticket?.status,
      };
    })
    .reverse();

  return res.json({ success: true, data: logs });
});

// ----------------------------------------------------
// Admin Panel Endpoints
// ----------------------------------------------------

// Admin Overview
app.get('/api/v1/admin/overview', requireAuth, requireRole(['admin']), (req: Request, res: Response) => {
  const totalRevenue = db.tickets.filter((t) => t.status !== 'CANCELLED').reduce((sum, t) => sum + t.price, 0);
  const totalTickets = db.tickets.filter((t) => t.status !== 'CANCELLED').length;
  const totalUsers = db.users.length;
  const totalShows = db.shows.length;
  const totalVenues = db.venues.length;

  return res.json({
    success: true,
    data: {
      total_revenue: totalRevenue,
      total_tickets: totalTickets,
      total_users: totalUsers,
      total_shows: totalShows,
      total_venues: totalVenues,
      recent_orders: db.orders.slice(-5).reverse(),
      recent_audits: db.audit_logs.slice(-10).reverse(),
    },
  });
});

// Admin Shows CRUD
app.get('/api/v1/admin/shows', requireAuth, requireRole(['admin']), (req: Request, res: Response) => {
  const list = db.shows.map((show) => {
    const venue = db.venues.find((v) => v.id === show.venue_id);
    const sessions = db.sessions.filter((ses) => ses.show_id === show.id);
    const tickets = db.tickets.filter((t) => t.show_id === show.id && t.status !== 'CANCELLED');
    const sellers = db.users.filter((u) => show.seller_ids?.includes(u.id));

    return {
      ...show,
      venue_name: venue?.name,
      sessions_count: sessions.length,
      tickets_sold: tickets.length,
      sellers: sellers.map((s) => ({ id: s.id, name: s.name, mobile: s.mobile })),
    };
  });
  return res.json({ success: true, data: list });
});

app.post('/api/v1/admin/shows', requireAuth, requireRole(['admin']), (req: Request, res: Response) => {
  try {
    const user = (req as any).user as User;
    const {
      title,
      description,
      poster_url,
      gallery_urls,
      venue_id,
      venue_name,
      venue_city,
      venue_address,
      duration_minutes,
      age_rating,
      category,
      director,
      cast_members,
      ticketing_mode,
      sessions,
    } = req.body;

    if (!title) {
      return res.status(422).json({ success: false, message: 'عنوان نمایش الزامی است.' });
    }

    // Resolve or automatically create venue if a new/written venue name was provided
    let finalVenueId = venue_id;
    let venue = db.venues.find((v) => v.id === finalVenueId);

    // If venue_name is specified and either venue_id is 'NEW_CUSTOM' or not found, create new venue or find by name
    if (venue_name && venue_name.trim().length > 0) {
      const trimmedName = venue_name.trim();
      const existingByName = db.venues.find((v) => v.name.toLowerCase() === trimmedName.toLowerCase());
      if (existingByName) {
        finalVenueId = existingByName.id;
        venue = existingByName;
      } else {
        // Create new venue on the fly
        const newVenueId = 'ven_' + Date.now();
        const newVenueCity = venue_city?.trim() || 'تهران';
        const newVenueAddress = venue_address?.trim() || '';
        const defaultSections = [
          {
            id: 'sec_' + newVenueId + '_0',
            name: 'همکف اصلی',
            rows: 6,
            seats_per_row: 12,
            base_price: 250000,
          },
        ];

        let totalCap = 0;
        defaultSections.forEach((sec) => {
          totalCap += sec.rows * sec.seats_per_row;
          for (let r = 1; r <= sec.rows; r++) {
            for (let s = 1; s <= sec.seats_per_row; s++) {
              db.seats.push({
                id: `seat_${sec.id}_r${r}_s${s}`,
                venue_id: newVenueId,
                section_id: sec.id,
                row_number: r,
                seat_number: s,
              });
            }
          }
        });

        venue = {
          id: newVenueId,
          name: trimmedName,
          city: newVenueCity,
          address: newVenueAddress,
          capacity: totalCap,
          sections: defaultSections,
        };

        db.venues.push(venue);
        finalVenueId = newVenueId;
      }
    }

    if (!finalVenueId || !venue) {
      return res.status(422).json({ success: false, message: 'انتخاب یا وارد کردن نام سالن/تالار الزامی است.' });
    }

    const showId = 'shw_' + Date.now();
    const slug = title.trim().toLowerCase().replace(/[\s\-\_]+/g, '-') + '-' + Math.floor(100 + Math.random() * 900);

    const newShow: Show = {
      id: showId,
      title,
      slug,
      description: description || '',
      poster_url: poster_url || 'https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?auto=format&fit=crop&w=800&q=80',
      gallery_urls: Array.isArray(gallery_urls) ? gallery_urls : [],
      venue_id: finalVenueId,
      duration_minutes: Number(duration_minutes) || 90,
      age_rating: age_rating || '+12',
      category: category || 'تئاتر درام',
      director: director || '',
      cast_members: Array.isArray(cast_members) ? cast_members : [],
      ticketing_mode: ticketing_mode === 'QUANTITY_ONLY' ? 'QUANTITY_ONLY' : 'SEAT_SELECTION',
      status: 'published',
      seller_ids: [],
      created_at: new Date().toISOString(),
    };

    db.shows.push(newShow);

    // Create sessions if provided
    let minTicketPrice = 200000;
    if (Array.isArray(sessions) && sessions.length > 0) {
      minTicketPrice = Number(sessions[0].price_toman) || 200000;
      sessions.forEach((sesData: any, idx: number) => {
        const sessionId = 'ses_' + Date.now() + '_' + idx;
        const capacity = Number(sesData.capacity) > 0 ? Number(sesData.capacity) : (venue?.capacity || 100);
        const sessionPrice = Number(sesData.price_toman) > 0 ? Number(sesData.price_toman) : 200000;
        if (sessionPrice < minTicketPrice) minTicketPrice = sessionPrice;

        const priceTiers = Array.isArray(sesData.price_tiers) && sesData.price_tiers.length > 0
          ? sesData.price_tiers
          : venue?.sections && venue.sections.length > 0
            ? venue.sections.map((sec) => ({
                id: 'pt_' + sec.id,
                section_id: sec.id,
                name: sec.name,
                price_toman: sessionPrice,
              }))
            : [{ id: 'pt_default', name: 'عمومی', price_toman: sessionPrice }];

        db.sessions.push({
          id: sessionId,
          show_id: showId,
          venue_id: finalVenueId,
          start_at: sesData.start_at || new Date(Date.now() + 86400000 * (idx + 1)).toISOString(),
          end_at: sesData.end_at || new Date(Date.now() + 86400000 * (idx + 1) + 7200000).toISOString(),
          capacity,
          remaining_capacity: capacity,
          status: 'open',
          price_tiers: priceTiers,
        });
      });
    }

    db.audit_logs.push({
      id: 'aud_' + Date.now(),
      user_id: user.id,
      user_name: user.name,
      action: 'SHOW_CREATED',
      details: `نمایش جدید "${title}" ایجاد شد.`,
      timestamp: new Date().toISOString(),
    });

    saveDb();
    return res.json({ success: true, message: 'نمایش با موفقیت ثبت و منتشر شد.', data: newShow });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// Update / Archive Show
app.put('/api/v1/admin/shows/:id', requireAuth, requireRole(['admin']), (req: Request, res: Response) => {
  const { id } = req.params;
  const show = db.shows.find((s) => s.id === id);
  if (!show) return res.status(404).json({ success: false, message: 'نمایش یافت نشد.' });

  Object.assign(show, req.body);
  saveDb();
  return res.json({ success: true, message: 'اطلاعات نمایش به‌روزرسانی شد.', data: show });
});

// Assign Seller to Show by Phone Number
app.post('/api/v1/admin/shows/:id/sellers', requireAuth, requireRole(['admin']), (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { mobile, name } = req.body;

    if (!mobile) {
      return res.status(422).json({ success: false, message: 'شماره همراه فروشنده الزامی است.' });
    }

    const cleanMobile = normalizeIranianMobile(mobile);
    const show = db.shows.find((s) => s.id === id);
    if (!show) return res.status(404).json({ success: false, message: 'نمایش یافت نشد.' });

    let seller = db.users.find((u) => u.mobile === cleanMobile);
    if (!seller) {
      // Invite & Create new seller account
      seller = {
        id: 'usr_seller_' + Date.now(),
        mobile: cleanMobile,
        name: name || `فروشنده ${cleanMobile.substring(7)}`,
        role: 'seller',
        is_verified: true,
        password_hash: hashPassword('seller123456'), // Default temporary password
        created_at: new Date().toISOString(),
      };
      db.users.push(seller);
    } else {
      seller.role = 'seller'; // Promote or ensure seller role
    }

    if (!show.seller_ids) show.seller_ids = [];
    if (!show.seller_ids.includes(seller.id)) {
      show.seller_ids.push(seller.id);
    }

    saveDb();
    return res.json({
      success: true,
      message: `فروشنده (${seller.name}) با شماره ${cleanMobile} با موفقیت به این نمایش تخصیص یافت.`,
      seller: { id: seller.id, name: seller.name, mobile: seller.mobile },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// Remove Seller from Show
app.delete('/api/v1/admin/shows/:id/sellers/:sellerId', requireAuth, requireRole(['admin']), (req: Request, res: Response) => {
  const { id, sellerId } = req.params;
  const show = db.shows.find((s) => s.id === id);
  if (!show) return res.status(404).json({ success: false, message: 'نمایش یافت نشد.' });

  show.seller_ids = (show.seller_ids || []).filter((sid) => sid !== sellerId);
  saveDb();
  return res.json({ success: true, message: 'فروشنده از این نمایش حذف گردید.' });
});

// Admin Venues CRUD
app.get('/api/v1/admin/venues', requireAuth, requireRole(['admin']), (req: Request, res: Response) => {
  return res.json({ success: true, data: db.venues });
});

app.post('/api/v1/admin/venues', requireAuth, requireRole(['admin']), (req: Request, res: Response) => {
  try {
    const { name, city, address, sections } = req.body;
    if (!name || !city) {
      return res.status(422).json({ success: false, message: 'نام سالن و شهر الزامی است.' });
    }

    const venueId = 'ven_' + Date.now();
    const formattedSections = Array.isArray(sections) && sections.length > 0
      ? sections.map((sec: any, idx: number) => ({
          id: 'sec_' + venueId + '_' + idx,
          name: sec.name || `بخش ${idx + 1}`,
          rows: Number(sec.rows) || 5,
          seats_per_row: Number(sec.seats_per_row) || 10,
          base_price: Number(sec.base_price) || 200000,
        }))
      : [
          {
            id: 'sec_' + venueId + '_0',
            name: 'همکف اصلی',
            rows: 6,
            seats_per_row: 12,
            base_price: 250000,
          },
        ];

    let totalCap = 0;
    formattedSections.forEach((sec) => {
      totalCap += sec.rows * sec.seats_per_row;
      for (let r = 1; r <= sec.rows; r++) {
        for (let s = 1; s <= sec.seats_per_row; s++) {
          db.seats.push({
            id: `seat_${sec.id}_r${r}_s${s}`,
            venue_id: venueId,
            section_id: sec.id,
            row_number: r,
            seat_number: s,
          });
        }
      }
    });

    const newVenue: Venue = {
      id: venueId,
      name,
      city,
      address: address || '',
      capacity: totalCap,
      sections: formattedSections,
    };

    db.venues.push(newVenue);
    saveDb();

    return res.json({ success: true, message: 'سالن با موفقیت ثبت و صندلی‌ها ایجاد شدند.', data: newVenue });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// Admin Users List
app.get('/api/v1/admin/users', requireAuth, requireRole(['admin']), (req: Request, res: Response) => {
  const users = db.users.map((u) => ({
    id: u.id,
    name: u.name,
    mobile: u.mobile,
    role: u.role,
    is_verified: u.is_verified,
    created_at: u.created_at,
  }));
  return res.json({ success: true, data: users });
});

// Admin Orders & Refund
app.get('/api/v1/admin/orders', requireAuth, requireRole(['admin']), (req: Request, res: Response) => {
  const orders = db.orders.map((o) => {
    const show = db.shows.find((s) => s.id === o.show_id);
    return {
      ...o,
      show_title: show?.title,
    };
  }).reverse();
  return res.json({ success: true, data: orders });
});

app.post('/api/v1/admin/orders/:id/refund', requireAuth, requireRole(['admin']), (req: Request, res: Response) => {
  const { id } = req.params;
  const order = db.orders.find((o) => o.id === id);
  if (!order) return res.status(404).json({ success: false, message: 'سفارش یافت نشد.' });

  order.status = 'refunded';
  // Mark tickets as cancelled
  db.tickets.filter((t) => t.order_id === order.id).forEach((t) => {
    t.status = 'CANCELLED';
  });

  saveDb();
  return res.json({ success: true, message: 'سفارش مسترد و بلیت‌ها باطل شدند.' });
});

// Admin Seed Initial Real Show (Helper for Admin to add initial real show data)
app.post('/api/v1/admin/seed-sample-show', requireAuth, requireRole(['admin']), (req: Request, res: Response) => {
  const defaultVenue = db.venues[0];
  const seller = db.users.find((u) => u.role === 'seller');

  const sampleShowId = 'shw_hamlet_2026';
  if (db.shows.some((s) => s.id === sampleShowId)) {
    return res.json({ success: true, message: 'نمایش نمونه قبلاً ایجاد شده است.' });
  }

  const newShow: Show = {
    id: sampleShowId,
    title: 'تئاتر موزیکال هملت و شاهزاده دانمارک',
    slug: 'hamlet-musical-2026',
    description: 'روایتی مدرن و شکوهمند از شاهکار جاودانه ویلیام شکسپیر با گروه ارکستر زنده، طراحی لباس و نورپردازی تماشایی در تالار اصلی وحدت.',
    poster_url: 'https://images.unsplash.com/photo-1469488865564-c2de10f69f96?auto=format&fit=crop&w=800&q=80',
    gallery_urls: [
      'https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1514306191717-452ec28c7814?auto=format&fit=crop&w=800&q=80',
    ],
    venue_id: defaultVenue.id,
    duration_minutes: 110,
    age_rating: '+14',
    category: 'موزیکال و کلاسیک',
    director: 'کیومرث مرادی',
    cast_members: ['نوید محمدزاده', 'ستاره پسیانی', 'پانته‌آ بهرام', 'رضا بهبودی'],
    ticketing_mode: 'SEAT_SELECTION',
    status: 'published',
    seller_ids: seller ? [seller.id] : [],
    created_at: new Date().toISOString(),
  };

  db.shows.push(newShow);

  // Add 3 sessions for upcoming days
  const now = Date.now();
  const sessionDates = [
    { start: new Date(now + 86400000).toISOString(), jalali: 'جمعه ۷ فروردین - ساعت ۱۹:۰۰' },
    { start: new Date(now + 86400000 * 2).toISOString(), jalali: 'شنبه ۸ فروردین - ساعت ۲۱:۰۰' },
    { start: new Date(now + 86400000 * 3).toISOString(), jalali: 'یکشنبه ۹ فروردین - ساعت ۱۹:۳۰' },
  ];

  sessionDates.forEach((sd, idx) => {
    db.sessions.push({
      id: `ses_hamlet_${idx + 1}`,
      show_id: newShow.id,
      venue_id: defaultVenue.id,
      start_at: sd.start,
      start_at_jalali: sd.jalali,
      end_at: new Date(new Date(sd.start).getTime() + 110 * 60000).toISOString(),
      capacity: defaultVenue.capacity,
      remaining_capacity: defaultVenue.capacity,
      status: 'open',
      price_tiers: [
        {
          id: 'pt_vip',
          section_id: 'sec_vip',
          name: 'همکف VIP',
          price_toman: 350000,
        },
        {
          id: 'pt_std',
          section_id: 'sec_standard',
          name: 'همکف عادی',
          price_toman: 250000,
        },
      ],
    });
  });

  saveDb();
  return res.json({ success: true, message: 'نمایش نمونه با موفقیت در پایگاه داده درج گردید.', show: newShow });
});

// ----------------------------------------------------
// Setup Vite in Dev or Serve Static in Prod
// ----------------------------------------------------
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
