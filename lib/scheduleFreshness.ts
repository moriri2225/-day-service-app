import { Schedule } from '@/types';

// 未更新ラベルを表示するまでの日数のしきい値（初期値・後で調整可能な設定値）。
// 運用実績がまだ無いため、通所系の空き状況更新サイクル（週次想定）を2回分
// 見送った状態を「念のため確認を促す」目安として14日とした。短すぎると
// 更新頻度の低い施設を過剰に警告扱いしてしまうため、まずはこの値で運用し、
// 実際の更新頻度の分布を見ながら調整する想定。
export const STALE_SCHEDULE_THRESHOLD_DAYS = 14;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

// 施設に紐づく複数のSchedule行から、最新のupdated_atを1件だけ取り出す
// （施設単位の「最終更新日時」は曜日×サービス単位の最新値を採用する）
export const getLatestUpdatedAt = (
  schedules: Pick<Schedule, 'updated_at'>[]
): string | null => {
  return schedules.reduce<string | null>((latest, s) => {
    if (!s.updated_at) return latest;
    if (!latest || new Date(s.updated_at).getTime() > new Date(latest).getTime()) {
      return s.updated_at;
    }
    return latest;
  }, null);
};

export const getDaysSince = (updatedAt: string): number => {
  const diffMs = Date.now() - new Date(updatedAt).getTime();
  return Math.max(0, Math.floor(diffMs / MS_PER_DAY));
};

export const isScheduleStale = (
  updatedAt: string | null,
  thresholdDays: number = STALE_SCHEDULE_THRESHOLD_DAYS
): boolean => {
  if (!updatedAt) return false;
  return getDaysSince(updatedAt) >= thresholdDays;
};

// 検索結果カード用の表記: 例「8/20(3日前)」「8/23(本日)」
export const formatUpdatedAtShort = (updatedAt: string): string => {
  const date = new Date(updatedAt);
  const dateLabel = `${date.getMonth() + 1}/${date.getDate()}`;
  const days = getDaysSince(updatedAt);
  return days === 0 ? `${dateLabel}(本日)` : `${dateLabel}(${days}日前)`;
};

// 施設詳細ページ用の表記: 例「8月20日 14時」
export const formatUpdatedAtLong = (updatedAt: string): string => {
  const date = new Date(updatedAt);
  return `${date.getMonth() + 1}月${date.getDate()}日 ${date.getHours()}時`;
};

// 未更新ラベルの行動喚起文言（不安を煽らず、事業所への確認を促すトーンで統一）
export const STALE_SCHEDULE_NOTICE = '念のため空き状況を事業所にご確認ください';
