const BOOKMARKS_KEY = 'daycare_bookmarks';

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
