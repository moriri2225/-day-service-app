import { InquiryHistory } from '@/types';

const BOOKMARKS_KEY = 'daycare_bookmarks';
const INQUIRIES_KEY = 'daycare_inquiries';

// --- お気に入り (Bookmark) 操作 ---
export const getLocalBookmarks = (): number[] => {
  if (typeof window === 'undefined') return [];
  const data = localStorage.getItem(BOOKMARKS_KEY);
  return data ? JSON.parse(data) : [];
};

export const isLocalBookmarked = (facilityId: number): boolean => {
  const current = getLocalBookmarks();
  return current.includes(facilityId);
};

export const toggleLocalBookmark = (facilityId: number): number[] => {
  const current = getLocalBookmarks();
  const exists = current.includes(facilityId);
  const updated = exists
    ? current.filter((id) => id !== facilityId)
    : [...current, facilityId];
  localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(updated));
  return updated;
};

// --- 見学申込・問合せ履歴 (Inquiry) 操作 ---
export const getLocalInquiries = (): InquiryHistory[] => {
  if (typeof window === 'undefined') return [];
  const data = localStorage.getItem(INQUIRIES_KEY);
  return data ? JSON.parse(data) : [];
};

export const addLocalInquiry = (
  inquiry: Omit<InquiryHistory, 'id' | 'created_at' | 'status'>
): InquiryHistory => {
  const current = getLocalInquiries();
  const newInquiry: InquiryHistory = {
    ...inquiry,
    id: `inq_${Date.now()}`,
    created_at: new Date().toISOString(),
    status: 'pending',
  };
  const updated = [newInquiry, ...current];
  localStorage.setItem(INQUIRIES_KEY, JSON.stringify(updated));
  return newInquiry;
};
