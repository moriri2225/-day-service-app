// サービス種別5種の定義とグループ分け（通所/訪問/相談支援）。
// 検索画面・施設詳細ページ・管理画面の3箇所で同じ区分・表記・配色を使うための共通定義。
// 参照元設計: outputs/kakehashi-project/2026-08-27-ux-design-4-3-honoka.md 0章
//
// value名（home_visit_support等）は設計書の暫定案をそのまま採用している。

export type ServiceGroup = 'commute' | 'visit' | 'consultation';

export interface ServiceTypeDef {
  id: string;
  label: string;
  shortLabel: string; // リスト表示用の略称
  group: ServiceGroup;
  colorClass: string; // バッジ用（bg/text/border）
}

export const SERVICE_TYPES: ServiceTypeDef[] = [
  {
    id: 'after_school',
    label: '放課後等デイサービス',
    shortLabel: '放デイ',
    group: 'commute',
    colorClass: 'bg-[#FFF0F3] text-[#D96B85] border-[#F8C3CE]',
  },
  {
    id: 'developmental_support',
    label: '児童発達支援',
    shortLabel: '児発',
    group: 'commute',
    colorClass: 'bg-[#EAF7F4] text-[#2C9381] border-[#A8DDD3]',
  },
  {
    id: 'home_visit_support',
    label: '保育所等訪問支援',
    shortLabel: '訪問（保育所等）',
    group: 'visit',
    colorClass: 'bg-[#EEF2FB] text-[#4A72C9] border-[#C7D5F0]',
  },
  {
    id: 'in_home_developmental_support',
    label: '居宅訪問型児童発達支援',
    shortLabel: '訪問（居宅）',
    group: 'visit',
    colorClass: 'bg-[#EEF2FB] text-[#4A72C9] border-[#C7D5F0]',
  },
  {
    id: 'consultation_support',
    label: '障害児相談支援',
    shortLabel: '相談支援',
    group: 'consultation',
    colorClass: 'bg-[#F3EEFB] text-[#8A5FC9] border-[#D9C7F0]',
  },
];

export const GROUP_LABEL: Record<ServiceGroup, string> = {
  commute: '通所',
  visit: '訪問',
  consultation: '相談',
};

export const GROUP_OPTGROUP_LABEL: Record<ServiceGroup, string> = {
  commute: '通所で利用するサービス',
  visit: '訪問で利用するサービス',
  consultation: 'ご相談を受け付けるサービス',
};

// フィルタの(?)アイコンで出す一言解説（通所系は既存UIで名称から用途が明らかなため用意しない）
export const SERVICE_DESCRIPTION: Partial<Record<string, string>> = {
  home_visit_support: '支援員が、お子さまが通う保育所や学校などを訪問して支援するサービスです',
  in_home_developmental_support: '支援員が、ご自宅を訪問して支援するサービスです',
  consultation_support: '日々の支援そのものではなく、お子さまに合った支援の利用計画を一緒に考えるご相談窓口です',
};

export const getServiceType = (id: string): ServiceTypeDef | undefined =>
  SERVICE_TYPES.find((s) => s.id === id);

export const getServiceGroup = (id: string): ServiceGroup | undefined => getServiceType(id)?.group;

export const SERVICE_TYPES_BY_GROUP: Record<ServiceGroup, ServiceTypeDef[]> = {
  commute: SERVICE_TYPES.filter((s) => s.group === 'commute'),
  visit: SERVICE_TYPES.filter((s) => s.group === 'visit'),
  consultation: SERVICE_TYPES.filter((s) => s.group === 'consultation'),
};

// 施設が提供するサービス種別一覧から、該当グループを1つでも含むかどうかを判定
export const facilityHasGroup = (offeredServices: string[] | undefined | null, group: ServiceGroup): boolean => {
  if (!offeredServices) return false;
  return offeredServices.some((id) => getServiceGroup(id) === group);
};

// 訪問系・相談支援系の対応状況表示文言（設計書6章のマイクロコピーをそのまま採用）
export const VISIT_STATUS_TEXT: Record<'available' | 'few' | 'full', string> = {
  available: '対応相談を受付中',
  few: '混み合っており、ご案内までお時間をいただく場合があります',
  full: '新規のご相談は一時停止中',
};

export const VISIT_STATUS_COLOR: Record<'available' | 'few' | 'full', string> = {
  available: 'text-emerald-600',
  few: 'text-amber-600',
  full: 'text-gray-400',
};

export const VISIT_STATUS_NOTE =
  '「対応状況」は施設の混み具合の目安です。ご利用の可否は施設に直接ご確認ください。';

export const CONSULTATION_STATUS_TEXT: Record<'available' | 'full', string> = {
  available: '現在、新しいご相談を受け付けています',
  full: '現在、新規のご相談受付を一時的にお休みしています',
};

export const CONSULTATION_STATUS_COLOR: Record<'available' | 'full', string> = {
  available: 'text-emerald-600',
  full: 'text-gray-400',
};

export const CONSULTATION_STATUS_NOTE =
  'ご利用には手続きが必要な場合があります。詳しくは施設にお問い合わせください。';

// facility_service_statusテーブルがまだ未適用の環境向け：取得失敗時にUIをブロックしないための文言
export const SERVICE_STATUS_UNAVAILABLE_NOTICE = '現在、対応状況の情報がありません。施設に直接お問い合わせください。';
