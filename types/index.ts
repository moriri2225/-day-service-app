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

