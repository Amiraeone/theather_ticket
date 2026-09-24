export type UserRole = 'admin' | 'seller' | 'buyer';

export interface CastMember {
  role: string;
  name: string;
}

export interface User {
  id: string;
  mobile: string;
  name: string;
  role: UserRole;
  is_verified: boolean;
}

export interface VenueSection {
  id: string;
  name: string;
  rows: number;
  seats_per_row: number;
  base_price: number;
}

export interface Venue {
  id: string;
  name: string;
  city: string;
  address: string;
  capacity: number;
  sections: VenueSection[];
}

export interface Seat {
  id: string;
  venue_id: string;
  section_id: string;
  row_number: number;
  seat_number: number;
}

export interface PriceTier {
  id: string;
  section_id?: string;
  name: string;
  price_toman: number;
}

export interface ShowSession {
  id: string;
  show_id: string;
  venue_id: string;
  start_at: string;
  start_at_jalali?: string;
  end_at: string;
  capacity: number;
  remaining_capacity: number;
  status: 'open' | 'closed' | 'sold_out';
  price_tiers: PriceTier[];
}

export interface Show {
  id: string;
  title: string;
  slug: string;
  description: string;
  poster_url: string;
  gallery_urls: string[];
  venue_id: string;
  venue_name?: string;
  venue_city?: string;
  duration_minutes: number;
  age_rating: string;
  category: string;
  director: string;
  cast_members: (string | CastMember)[];
  ticketing_mode: 'SEAT_SELECTION' | 'QUANTITY_ONLY';
  status: 'published' | 'draft' | 'archived';
  seller_ids: string[];
  sessions_count?: number;
  min_price?: number;
  max_price?: number;
  created_at: string;
}

export interface OrderItem {
  seat_id?: string;
  seat_label?: string;
  price: number;
}

export interface Order {
  id: string;
  uuid: string;
  user_id: string;
  show_id: string;
  session_id: string;
  show_title?: string;
  show_poster?: string;
  venue_name?: string;
  session_time?: string;
  type: 'online' | 'offline_pos' | 'offline_cash';
  total_amount: number;
  status: 'pending' | 'paid' | 'cancelled' | 'refunded';
  buyer_name: string;
  buyer_mobile: string;
  created_at: string;
  payment_ref?: string;
  payment_gateway?: string;
  items?: OrderItem[];
  tickets_count?: number;
  tickets?: Ticket[];
}

export interface Ticket {
  id: string;
  code: string;
  order_id: string;
  session_id: string;
  show_id: string;
  show_title?: string;
  show_poster?: string;
  venue_name?: string;
  venue_address?: string;
  session_time?: string;
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

export interface SeatMapSeat {
  id: string;
  row: number;
  number: number;
  price: number;
  status: 'AVAILABLE' | 'HELD_BY_ME' | 'HELD_BY_OTHER' | 'SOLD';
}

export interface SeatMapSection {
  section_id: string;
  name: string;
  price: number;
  rows: {
    row_number: number;
    seats: SeatMapSeat[];
  }[];
}

export interface SeatMapData {
  session_id: string;
  show_id: string;
  show_title: string;
  ticketing_mode: 'SEAT_SELECTION' | 'QUANTITY_ONLY';
  venue_name: string;
  capacity: number;
  remaining_capacity: number;
  sections: SeatMapSection[];
}
