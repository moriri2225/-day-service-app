// サービス種別4種の定義とグループ分け（通所/訪問/相談支援）。
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
