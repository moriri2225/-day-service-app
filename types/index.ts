export interface Facility {
  id: number;
  name: string;
  address: string;
  phone_number: string;
  description: string;
  target_ages: string;
  has_pickup: boolean;
  opening_hours: string;
  image_url: string;
  offered_services: string[];
  owner_id?: string | null;
}

export interface Schedule {
  id: number;
  facility_id: number;
  service_type: 'after_school' | 'developmental_support';
  day_of_week: '月' | '火' | '水' | '木' | '金' | '土' | '日';
  status: 'available' | 'few' | 'full';
  available_count: number;
  updated_at: string;
}

// 訪問系2種別・相談支援系1種別（曜日単位を持たない、施設×種別で1レコード）の対応状況。
// statusはschedulesと同じ語彙(available/few/full)を再利用しつつ、UI側の表示文言・色は
// 「空き状況」ではなく「対応状況」「受付状況」という別の言葉に置き換える
// (2026-08-27-ux-design-4-3-honoka.md 3章)。相談支援系はfewを使わず2値運用とする。
export interface FacilityServiceStatus {
  id: number;
  facility_id: number;
  service_type: 'home_visit_support' | 'in_home_developmental_support' | 'consultation_support';
  status: 'available' | 'few' | 'full';
  available_count: number | null;
  note: string | null;
  updated_at: string;
}

