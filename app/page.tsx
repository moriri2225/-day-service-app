'use client';

import { useState, useEffect, useMemo } from 'react';
// ★ Supabaseクライアントの参照元を @/utils/supabase/client に統一
import { createClient } from '@/utils/supabase/client';
import { Facility, Schedule } from '@/types';
import { 
  Search, MapPin, Phone, Clock, Car, Calendar, 
  Bookmark, Paperclip, Tag, LayoutGrid, List, ArrowUpDown, ChevronRight, MessageSquare, Lock, RotateCcw 
} from 'lucide-react';
import Link from 'next/link';
import { User } from '@supabase/supabase-js';

export default function Home() {
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);

  // ログインユーザーの状態を保持
  const [user, setUser] = useState<User | null>(null);

  // フィルター用ステート
  const [selectedService, setSelectedService] = useState<string>('all');
  const [selectedDay, setSelectedDay] = useState<string>('all');
  const [searchKeyword, setSearchKeyword] = useState<string>('');

  // 表示切替・ソート用ステート
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<'availability' | 'opening_hours' | 'address'>('availability');

  const days = ['月', '火', '水', '木', '金', '土'];

  // ★ Supabaseクライアント初期化
  const supabase = createClient();

  useEffect(() => {
    fetchData();
    checkUser();
  }, []);

  // ログイン状態の確認とリアルタイム監視
  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);

    // ログイン状態の変更を監視
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  };

  const fetchData = async () => {
    setLoading(true);
    const { data: facilitiesData } = await supabase.from('facilities').select('*').order('id');
    const { data: schedulesData } = await supabase.from('schedules').select('*');

    if (facilitiesData) setFacilities(facilitiesData as Facility[]);
    if (schedulesData) setSchedules(schedulesData as Schedule[]);
    setLoading(false);
  };

  // 検索条件リセット処理
  const handleReset = () => {
    setSelectedService('all');
    setSelectedDay('all');
    setSearchKeyword('');
  };

  const isFiltered = selectedService !== 'all' || selectedDay !== 'all' || searchKeyword.trim() !== '';

  const getAvailabilityCount = (facilityId: number) => {
    return schedules
      .filter((s) => s.facility_id === facilityId)
      .reduce((acc, s) => {
        if (s.status === 'available') return acc + 2;
        if (s.status === 'few') return acc + 1;
        return acc;
      }, 0);
  };

  const processedFacilities = useMemo(() => {
    const filtered = facilities.filter((facility) => {
      if (selectedService !== 'all' && !facility.offered_services?.includes(selectedService)) {
        return false;
      }

      if (searchKeyword.trim() !== '') {
        const kw = searchKeyword.toLowerCase();
        const matchName = facility.name?.toLowerCase().includes(kw);
        const matchAddress = facility.address?.toLowerCase().includes(kw);
        if (!matchName && !matchAddress) return false;
      }

      if (selectedDay !== 'all') {
        const hasAvailable = schedules.some((s) => {
          if (s.facility_id !== facility.id) return false;
          if (s.day_of_week !== selectedDay) return false;
          if (selectedService !== 'all' && s.service_type !== selectedService) return false;
          return s.status === 'available' || s.status === 'few';
        });
        if (!hasAvailable) return false;
      }

      return true;
    });

    return filtered.sort((a, b) => {
      if (sortBy === 'availability') {
        const countA = getAvailabilityCount(a.id);
        const countB = getAvailabilityCount(b.id);
        return countB - countA;
      }

      if (sortBy === 'opening_hours') {
        const timeA = a.opening_hours || '99:99';
        const timeB = b.opening_hours || '99:99';
        return timeA.localeCompare(timeB);
      }

      if (sortBy === 'address') {
        const addrA = a.address || '';
        const addrB = b.address || '';
        return addrA.localeCompare(addrB, 'ja');
      }

      return 0;
    });
  }, [facilities, schedules, selectedService, selectedDay, searchKeyword, sortBy]);

  return (
    <main className="min-h-screen bg-[#F3ECE0] text-gray-800 p-3 sm:p-8 font-sans relative overflow-x-hidden">
      <div 
        className="absolute inset-0 opacity-15 pointer-events-none z-0" 
        style={{ 
          backgroundImage: 'radial-gradient(#D96B85 0.75px, transparent 0.75px)', 
          backgroundSize: '16px 16px' 
        }} 
      />

      <div className="max-w-5xl mx-auto space-y-6 sm:space-y-8 relative z-10 w-full min-w-0">
        
        {/* --- ヘッダー --- */}
        <header className="bg-[#FAF8F5] p-4 sm:p-6 rounded-t-3xl rounded-b-xl border-2 border-[#D8CEBF] shadow-md relative overflow-hidden">
          <div className="hidden sm:flex flex-col justify-between absolute left-3 top-4 bottom-4 w-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="w-3 h-3 rounded-full bg-[#E5DDD0] border border-[#BDB09E] shadow-inner" />
            ))}
          </div>

          <div className="sm:pl-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="w-full sm:w-auto flex justify-center items-center py-1 sm:py-0">
              <img 
                src="/kakehashi_file_wordmark_logo.svg" 
                alt="カケハシファイル" 
                className="w-full max-w-[280px] sm:max-w-none sm:h-16 md:h-20 h-auto object-contain drop-shadow-sm"
              />
            </div>

            {/* ボタンエリア */}
            <div className="flex flex-wrap items-center justify-center sm:justify-end gap-2 w-full sm:w-auto">
              <Link
                href="/messages"
                className="flex-1 sm:flex-none px-3 py-2 sm:px-4 sm:py-2 bg-white hover:bg-[#FFF0F3] text-[#D96B85] border-2 border-[#F8C3CE] rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 shrink-0 shadow-sm"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                メッセージ
              </Link>

              <Link
                href="/mypage"
                className="flex-1 sm:flex-none px-3 py-2 sm:px-4 sm:py-2 bg-[#FFF0F3] hover:bg-[#FFE4E8] text-[#D96B85] border-2 border-[#F8C3CE] rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 shrink-0 shadow-sm"
              >
                <Bookmark className="w-3.5 h-3.5 fill-current" />
                マイページ
              </Link>

              {user ? (
                <Link
                  href="/admin"
                  className="flex-1 sm:flex-none px-3 py-2 sm:px-4 sm:py-2 bg-[#EAF7F4] hover:bg-[#DBF0EB] text-[#2C9381] border-2 border-[#A8DDD3] rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 shrink-0 shadow-sm"
                >
                  <Lock className="w-3.5 h-3.5" />
                  事業者画面
                </Link>
              ) : (
                <Link
                  href="/login"
                  className="flex-1 sm:flex-none px-3 py-2 sm:px-4 sm:py-2 bg-white hover:bg-gray-50 text-gray-600 border-2 border-[#D8CEBF] rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 shrink-0 shadow-sm"
                >
                  <Lock className="w-3.5 h-3.5 text-gray-400" />
                  事業者ログイン
                </Link>
              )}
            </div>
          </div>
        </header>

        {/* --- 絞り込み検索エリア --- */}
        <div className="relative pt-4 mt-6">
          <div className="absolute -top-3 left-4 z-20 bg-[#D96B85] text-white text-[11px] font-black px-4 py-1.5 rounded-t-xl shadow-sm flex items-center gap-1.5 border-t-2 border-x-2 border-[#C0546E]">
            <Tag className="w-3 h-3" />
            条件検索
          </div>

          <div className="bg-[#FAF8F5] rounded-b-2xl rounded-tr-2xl border-2 border-[#D8CEBF] shadow-md p-4 sm:p-6 pt-6 sm:pt-7 space-y-4 relative z-10">
            <div className="flex items-center justify-between border-b-2 border-dashed border-[#E5DDD0] pb-2">
              <div className="flex items-center gap-2">
                <Search className="w-4 h-4 text-[#D96B85] shrink-0" />
                <h2 className="text-xs sm:text-sm font-black text-gray-800">絞り込み条件を入力</h2>
              </div>

              <button
                onClick={handleReset}
                disabled={!isFiltered}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-black transition-all flex items-center gap-1 border ${
                  isFiltered
                    ? 'bg-white text-gray-700 border-[#D8CEBF] hover:bg-[#FFF0F3] hover:text-[#D96B85] hover:border-[#F8C3CE] shadow-xs cursor-pointer'
                    : 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed opacity-60'
                }`}
              >
                <RotateCcw className="w-3 h-3" />
                リセット
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-gray-600 mb-1">サービス種別</label>
                <select
                  value={selectedService}
                  onChange={(e) => setSelectedService(e.target.value)}
                  className="w-full px-3 py-2 bg-white border-2 border-[#E5DDD0] rounded-xl text-xs font-bold text-gray-700 focus:outline-none focus:border-[#D96B85]"
                >
                  <option value="all">すべてのサービス</option>
                  <option value="after_school">放課後等デイサービス</option>
                  <option value="developmental_support">児童発達支援</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-600 mb-1">空きのある曜日（◯・▲のみ）</label>
                <select
                  value={selectedDay}
                  onChange={(e) => setSelectedDay(e.target.value)}
                  className="w-full px-3 py-2 bg-white border-2 border-[#E5DDD0] rounded-xl text-xs font-bold text-gray-700 focus:outline-none focus:border-[#D96B85]"
                >
                  <option value="all">すべての曜日</option>
                  {days.map((d) => (
                    <option key={d} value={d}>{d}曜日</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-600 mb-1">フリーワード（施設名・住所）</label>
                <input
                  type="text"
                  placeholder="例: 渋谷, スマイル"
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  className="w-full px-3 py-2 bg-white border-2 border-[#E5DDD0] rounded-xl text-xs font-bold text-gray-700 focus:outline-none focus:border-[#D96B85]"
                />
              </div>
            </div>
          </div>
        </div>

        {/* --- 検索結果件数 & ソート & 表示切替ツールバー --- */}
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <p className="text-xs font-black text-gray-700">
              検索結果: <span className="text-base text-[#D96B85] font-black">{processedFacilities.length}</span> 件
            </p>
            {selectedDay !== 'all' && (
              <span className="text-[11px] font-bold bg-[#EAF7F4] text-[#2C9381] border border-[#A8DDD3] px-3 py-0.5 rounded-full shadow-2xs">
                「{selectedDay}曜日」に空き（◯/▲）がある施設を表示中
              </span>
            )}
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#FAF8F5] p-3 px-4 rounded-xl border-2 border-[#D8CEBF] shadow-xs">
            <div className="flex items-center gap-2">
              <ArrowUpDown className="w-3.5 h-3.5 text-[#D96B85] shrink-0" />
              <span className="text-xs font-black text-gray-700 shrink-0">並び替え:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-3 py-1.5 bg-white border-2 border-[#E5DDD0] rounded-lg text-xs font-black text-gray-700 focus:outline-none focus:border-[#D96B85]"
              >
                <option value="availability">空きが多い順</option>
                <option value="opening_hours">開所時間順</option>
                <option value="address">住所順（50音）</option>
              </select>
            </div>

            <div className="flex items-center justify-end gap-1.5 bg-[#E5DDD0]/50 p-1 rounded-lg">
              <button
                onClick={() => setViewMode('grid')}
                className={`px-3 py-1.5 rounded-md text-xs font-black flex items-center gap-1.5 transition-all ${
                  viewMode === 'grid'
                    ? 'bg-white text-[#D96B85] shadow-xs border border-[#D8CEBF]'
                    : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                画像付き
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-1.5 rounded-md text-xs font-black flex items-center gap-1.5 transition-all ${
                  viewMode === 'list'
                    ? 'bg-white text-[#D96B85] shadow-xs border border-[#D8CEBF]'
                    : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                <List className="w-3.5 h-3.5" />
                リスト表示
              </button>
            </div>
          </div>
        </div>

        {/* --- 施設一覧表示エリア --- */}
        {loading ? (
          <div className="text-center py-12 text-xs font-bold text-gray-500 bg-[#FAF8F5] rounded-2xl border-2 border-[#D8CEBF]">
            ファイルを読み込み中...
          </div>
        ) : processedFacilities.length === 0 ? (
          <div className="bg-[#FAF8F5] rounded-2xl border-2 border-[#D8CEBF] p-8 text-center space-y-3">
            <p className="text-sm font-bold text-gray-600">該当するファイル（施設）が見つかりませんでした。</p>
            <p className="text-xs text-gray-400">条件（曜日やサービス・フリーワード）を変更してお試しください。</p>
            {isFiltered && (
              <button
                onClick={handleReset}
                className="mt-2 px-4 py-2 bg-[#D96B85] hover:bg-[#C0546E] text-white rounded-xl text-xs font-black shadow-xs transition-all"
              >
                検索条件をクリアする
              </button>
            )}
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {processedFacilities.map((facility) => (
              <div
                key={facility.id}
                className="bg-white rounded-2xl border-2 border-[#D8CEBF] shadow-sm hover:shadow-md transition-all relative overflow-hidden flex flex-col justify-between"
              >
                <div className="absolute top-1 left-5 z-20 text-[#C0546E] filter drop-shadow-[1px_2px_2px_rgba(0,0,0,0.15)]">
                  <Paperclip className="w-6 h-6 -rotate-12 transform" />
                </div>

                <div>
                  {facility.image_url && (
                    <div className="h-44 w-full bg-[#F5F0E6] overflow-hidden relative p-2 pt-3">
                      <div className="w-full h-full rounded-xl overflow-hidden border border-[#E5DDD0] relative">
                        <img
                          src={facility.image_url}
                          alt={facility.name || '施設画像'}
                          className="w-full h-full object-cover"
                        />
                        {facility.has_pickup && (
                          <span className="absolute top-2 right-2 bg-white/95 backdrop-blur-sm text-[#2C9381] border-2 border-[#A8DDD3] text-[10px] font-black px-2.5 py-0.5 rounded-lg shadow-sm flex items-center gap-1">
                            <Car className="w-3 h-3" />
                            送迎あり
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="p-5 sm:p-6 space-y-4">
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {facility.offered_services?.includes('after_school') && (
                        <span className="bg-[#FFF0F3] text-[#D96B85] text-[10px] font-black px-2.5 py-0.5 rounded-md border border-[#F8C3CE] shadow-xs">
                          # 放課後等デイサービス
                        </span>
                      )}
                      {facility.offered_services?.includes('developmental_support') && (
                        <span className="bg-[#EAF7F4] text-[#2C9381] text-[10px] font-black px-2.5 py-0.5 rounded-md border border-[#A8DDD3] shadow-xs">
                          # 児童発達支援
                        </span>
                      )}
                    </div>

                    <h2 className="text-base sm:text-lg font-black text-gray-900 leading-snug border-b-2 border-dotted border-[#E5DDD0] pb-2">
                      {facility.name || '施設名未設定'}
                    </h2>

                    {facility.description && (
                      <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed font-medium">
                        {facility.description}
                      </p>
                    )}

                    <div className="space-y-1.5 text-xs text-gray-600 pt-1 bg-[#FAF8F5] p-3 rounded-xl border border-[#E5DDD0]">
                      {facility.address && (
                        <div className="flex items-center gap-2">
                          <MapPin className="w-3.5 h-3.5 text-[#D96B85] shrink-0" />
                          <span className="truncate">{facility.address}</span>
                        </div>
                      )}
                      {facility.phone_number && (
                        <div className="flex items-center gap-2">
                          <Phone className="w-3.5 h-3.5 text-[#D96B85] shrink-0" />
                          <span>{facility.phone_number}</span>
                        </div>
                      )}
                      {facility.opening_hours && (
                        <div className="flex items-center gap-2">
                          <Clock className="w-3.5 h-3.5 text-[#D96B85] shrink-0" />
                          <span>{facility.opening_hours}</span>
                        </div>
                      )}
                    </div>

                    <div className="pt-1">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-[#2C9381]" />
                          <span className="text-[11px] font-black text-gray-700">週間空き状況シート</span>
                        </div>
                        {selectedDay !== 'all' && (
                          <span className="text-[10px] text-[#2C9381] font-bold">
                            {selectedDay}曜日を強調中
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-6 gap-1 bg-[#FFFEEF] p-2 rounded-xl border-2 border-[#E5DDD0] text-center shadow-inner">
                        {days.map((day) => {
                          const daySchedules = schedules.filter(
                            (s) => s.facility_id === facility.id && 
                                   s.day_of_week === day &&
                                   (selectedService === 'all' || s.service_type === selectedService)
                          );
                          const isAvailable = daySchedules.some((s) => s.status === 'available');
                          const isFew = daySchedules.some((s) => s.status === 'few');
                          const isTargetDay = selectedDay === day;

                          return (
                            <div 
                              key={day} 
                              className={`space-y-0.5 p-1 rounded-lg transition-all ${
                                isTargetDay 
                                  ? 'bg-[#EAF7F4] border-2 border-[#2C9381] font-black shadow-2xs' 
                                  : ''
                              }`}
                            >
                              <span className={`text-[10px] block border-b border-[#E5DDD0] pb-0.5 ${
                                isTargetDay ? 'text-[#2C9381] font-black' : 'text-gray-400 font-bold'
                              }`}>
                                {day}
                              </span>
                              <div className="py-0.5 text-xs font-black leading-none">
                                {isAvailable ? (
                                  <span className="text-emerald-600">◯</span>
                                ) : isFew ? (
                                  <span className="text-amber-600">▲</span>
                                ) : (
                                  <span className="text-gray-300">×</span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                  </div>
                </div>

                <div className="p-4 bg-[#FAF8F5] border-t-2 border-[#E5DDD0] flex items-center gap-2">
                  <a
                    href={facility.phone_number ? `tel:${facility.phone_number}` : `/facility/${facility.id}`}
                    className="flex-1 py-2.5 px-3 bg-white hover:bg-[#FFF0F3] text-[#D96B85] border-2 border-[#F8C3CE] rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 shadow-xs"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    お問い合わせ
                  </a>

                  <Link
                    href={`/facility/${facility.id}`}
                    className="flex-1 py-2.5 px-3 bg-[#D96B85] hover:bg-[#C0546E] text-white rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1 shadow-xs"
                  >
                    詳細を見る
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>

              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {processedFacilities.map((facility) => (
              <div
                key={facility.id}
                className="bg-white rounded-2xl border-2 border-[#D8CEBF] p-3.5 sm:p-5 shadow-sm hover:shadow-md transition-all relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-3"
              >
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {facility.offered_services?.includes('after_school') && (
                      <span className="bg-[#FFF0F3] text-[#D96B85] text-[10px] font-black px-2 py-0.5 rounded border border-[#F8C3CE]">
                        放デイ
                      </span>
                    )}
                    {facility.offered_services?.includes('developmental_support') && (
                      <span className="bg-[#EAF7F4] text-[#2C9381] text-[10px] font-black px-2 py-0.5 rounded border border-[#A8DDD3]">
                        児発
                      </span>
                    )}
                    {facility.has_pickup && (
                      <span className="bg-[#FAF8F5] text-[#2C9381] text-[10px] font-black px-2 py-0.5 rounded border border-[#E5DDD0] flex items-center gap-0.5">
                        <Car className="w-3 h-3" />
                        送迎可
                      </span>
                    )}
                  </div>

                  <h2 className="text-base font-black text-gray-900 truncate">
                    {facility.name || '施設名未設定'}
                  </h2>

                  <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-gray-500">
                    {facility.address && (
                      <div className="flex items-center gap-1 truncate max-w-xs">
                        <MapPin className="w-3.5 h-3.5 text-[#D96B85] shrink-0" />
                        <span className="truncate">{facility.address}</span>
                      </div>
                    )}
                    {facility.phone_number && (
                      <div className="flex items-center gap-1 shrink-0">
                        <Phone className="w-3.5 h-3.5 text-[#D96B85] shrink-0" />
                        <span>{facility.phone_number}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-[#FFFEEF] px-2.5 py-1.5 rounded-xl border-2 border-[#E5DDD0] shrink-0 w-full md:w-auto">
                  <div className="grid grid-cols-6 gap-1 text-center w-full">
                    {days.map((day) => {
                      const daySchedules = schedules.filter(
                        (s) => s.facility_id === facility.id && 
                               s.day_of_week === day &&
                               (selectedService === 'all' || s.service_type === selectedService)
                      );
                      const isAvailable = daySchedules.some((s) => s.status === 'available');
                      const isFew = daySchedules.some((s) => s.status === 'few');
                      const isTargetDay = selectedDay === day;

                      return (
                        <div 
                          key={day} 
                          className={`flex flex-col items-center justify-center min-w-0 p-1 rounded-md transition-all ${
                            isTargetDay ? 'bg-[#EAF7F4] border border-[#2C9381]' : ''
                          }`}
                        >
                          <span className={`text-[10px] leading-none mb-1 ${
                            isTargetDay ? 'text-[#2C9381] font-black' : 'text-gray-400 font-bold'
                          }`}>
                            {day}
                          </span>
                          <span className="text-xs font-black leading-none">
                            {isAvailable ? (
                              <span className="text-emerald-600">◯</span>
                            ) : isFew ? (
                              <span className="text-amber-600">▲</span>
                            ) : (
                              <span className="text-gray-300">×</span>
                            )}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 pt-1 md:pt-0">
                  <a
                    href={facility.phone_number ? `tel:${facility.phone_number}` : `/facility/${facility.id}`}
                    className="flex-1 md:flex-none py-2 px-3 bg-[#FFF0F3] hover:bg-[#FFE4E8] text-[#D96B85] border-2 border-[#F8C3CE] rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1 shrink-0"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    問合せ
                  </a>

                  <Link
                    href={`/facility/${facility.id}`}
                    className="flex-1 md:flex-none py-2 px-3 bg-[#D96B85] hover:bg-[#C0546E] text-white rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1 shrink-0"
                  >
                    詳細
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>

              </div>
            ))}
          </div>
        )}

      </div>
    </main>
  );
}
