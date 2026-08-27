'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Facility, Schedule } from '@/types';
import {
  Building2, Calendar, Save, ArrowLeft, RefreshCw, Sparkles, AlertCircle, Edit3, Image, MapPin, Phone, Clock, FileText, Car, Plus, ChevronDown, ChevronUp, Lock, MessageSquare
} from 'lucide-react';
import Link from 'next/link';
import { SERVICE_TYPES, SERVICE_TYPES_BY_GROUP } from '@/lib/serviceTypes';

const DAYS = ['月', '火', '水', '木', '金', '土'];

// 通所系（既存の曜日×○/▲/×グリッドで管理する2種別）
const SERVICES = SERVICE_TYPES_BY_GROUP.commute.map((s) => ({ id: s.id, label: s.label, color: s.colorClass }));

export default function AdminPage() {
  const router = useRouter();

  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [selectedFacilityId, setSelectedFacilityId] = useState<number | null>(null);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  // DB取得時点のスケジュール（差分検出用。保存時にこれと比較し、実際に変更された行だけをupsertする）
  const [savedSchedules, setSavedSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [savingSchedule, setSavingSchedule] = useState<boolean>(false);
  const [savingFacility, setSavingFacility] = useState<boolean>(false);
  const [creatingFacility, setCreatingFacility] = useState<boolean>(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // 新規施設作成エリアの開閉フラグ（初期は最小化/閉じた状態）
  const [isAddOpen, setIsAddOpen] = useState<boolean>(false);

  // 施設編集用フォームステート
  const [facilityForm, setFacilityForm] = useState<Partial<Facility>>({
    name: '',
    description: '',
    address: '',
    phone_number: '',
    opening_hours: '',
    image_url: '',
    has_pickup: false,
    offered_services: [],
  });

  // 新規施設登録用フォームステート
  const [newFacilityForm, setNewFacilityForm] = useState<Partial<Facility>>({
    name: '',
    description: '',
    address: '',
    phone_number: '',
    opening_hours: '',
    image_url: '',
    has_pickup: false,
    offered_services: ['after_school'],
  });

  // 初期データ取得 ＆ 認証チェック
  useEffect(() => {
    checkAuthAndFetchData();
  }, []);

  const checkAuthAndFetchData = async () => {
    setLoading(true);

    // 1. ユーザーのログイン状態確認
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      // 未ログインなら事業者専用ログインページへ
      router.push('/admin/login');
      return;
    }

    // 2. 権限チェック（ホワイトリスト方式。role === 'facility' のみ許可。
    // middleware.tsのサーバーサイドチェックと同じ基準に揃える）
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    if (profile?.role !== 'facility') {
      alert('事業者アカウントのみアクセス可能です。');
      router.push('/mypage');
      return;
    }

    setCurrentUserId(user.id);

    // 3. データ取得（自分が所有する施設のみに限定。owner_idで絞らないと
    // 他事業者の施設まで見えて編集できてしまうため必須）
    const { data: facilitiesData, error: facError } = await supabase
      .from('facilities')
      .select('*')
      .eq('owner_id', user.id)
      .order('id');

    if (facError) {
      console.error('施設データの取得に失敗しました:', facError);
      setMessage({ type: 'error', text: '施設データの取得に失敗しました。' });
      setLoading(false);
      return;
    }

    if (facilitiesData && facilitiesData.length > 0) {
      setFacilities(facilitiesData as Facility[]);
      const firstFac = facilitiesData[0] as Facility;
      setSelectedFacilityId(firstFac.id);
      initFacilityForm(firstFac);
      await fetchSchedules(firstFac.id);
    }
    setLoading(false);
  };

  // 施設情報フォームの初期化
  const initFacilityForm = (fac: Facility) => {
    setFacilityForm({
      name: fac.name || '',
      description: fac.description || '',
      address: fac.address || '',
      phone_number: fac.phone_number || '',
      opening_hours: fac.opening_hours || '',
      image_url: fac.image_url || '',
      has_pickup: fac.has_pickup || false,
      offered_services: fac.offered_services || [],
    });
  };

  // 選択された施設のスケジュール取得
  const fetchSchedules = async (facilityId: number) => {
    const { data, error } = await supabase
      .from('schedules')
      .select('*')
      .eq('facility_id', facilityId);

    if (error) {
      console.error('スケジュールデータの取得に失敗しました:', error);
      setMessage({ type: 'error', text: 'スケジュールデータの取得に失敗しました。' });
      return;
    }

    const fetched = (data as Schedule[]) || [];
    setSchedules(fetched);
    setSavedSchedules(fetched);
  };

  // 施設切替ハンドラー
  const handleFacilityChange = async (facilityId: number) => {
    setSelectedFacilityId(facilityId);
    setMessage(null);
    setLoading(true);

    const target = facilities.find((f) => f.id === facilityId);
    if (target) {
      initFacilityForm(target);
    }

    await fetchSchedules(facilityId);
    setLoading(false);
  };

  // 特定の曜日・サービスのステータスを取得（未存在なら 'full'）
  const getStatus = (serviceType: string, day: string): 'available' | 'few' | 'full' => {
    const item = schedules.find(
      (s) => s.service_type === serviceType && s.day_of_week === day
    );
    return (item?.status as 'available' | 'few' | 'full') || 'full';
  };

  // DB保存時点のステータスを取得（保存差分の比較用。未存在なら getStatus と同じ'full'扱い）
  const getSavedStatus = (serviceType: string, day: string): 'available' | 'few' | 'full' => {
    const item = savedSchedules.find(
      (s) => s.service_type === serviceType && s.day_of_week === day
    );
    return (item?.status as 'available' | 'few' | 'full') || 'full';
  };

  // ローカルステートでのステータス変更
  const handleStatusChange = (serviceType: string, day: string, newStatus: 'available' | 'few' | 'full') => {
    setSchedules((prev) => {
      const existingIndex = prev.findIndex(
        (s) => s.service_type === serviceType && s.day_of_week === day
      );

      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = { ...updated[existingIndex], status: newStatus };
        return updated;
      } else {
        return [
          ...prev,
          {
            id: Date.now(),
            facility_id: selectedFacilityId!,
            service_type: serviceType,
            day_of_week: day,
            status: newStatus,
          } as Schedule,
        ];
      }
    });
  };

  // 1. 空き状況の一括保存
  const handleSaveSchedules = async () => {
    if (!selectedFacilityId) return;

    setSavingSchedule(true);
    setMessage(null);

    const currentFacility = facilities.find((f) => f.id === selectedFacilityId);
    const offeredServices = currentFacility?.offered_services || ['after_school', 'developmental_support'];

    const upsertData: Array<{ facility_id: number; service_type: string; day_of_week: string; status: string }> = [];

    // 実際にステータスが変わった曜日×サービスの行だけを保存対象にする。
    // 変更のない行までまとめてupsertすると、その行のupdated_atまで更新されてしまい
    // 「最終更新日時」の信頼性が損なわれるため。
    offeredServices.forEach((serviceType) => {
      DAYS.forEach((day) => {
        const status = getStatus(serviceType, day);
        if (status === getSavedStatus(serviceType, day)) return;

        upsertData.push({
          facility_id: selectedFacilityId,
          service_type: serviceType,
          day_of_week: day,
          status,
        });
      });
    });

    if (upsertData.length === 0) {
      setSavingSchedule(false);
      setMessage({ type: 'success', text: '変更がなかったため、保存をスキップしました。' });
      return;
    }

    const { error } = await supabase
      .from('schedules')
      .upsert(upsertData, { onConflict: 'facility_id,service_type,day_of_week' });

    setSavingSchedule(false);

    if (error) {
      console.error('保存中にエラーが発生しました:', error);
      setMessage({ type: 'error', text: '空き状況の保存に失敗しました。' });
    } else {
      setMessage({ type: 'success', text: '空き状況を正常に保存・更新しました！' });
      fetchSchedules(selectedFacilityId);
    }
  };

  // 編集フォーム：提供サービスのチェックボックス切り替え
  const handleServiceToggle = (serviceId: string) => {
    const currentServices = facilityForm.offered_services || [];
    if (currentServices.includes(serviceId)) {
      setFacilityForm({
        ...facilityForm,
        offered_services: currentServices.filter((s) => s !== serviceId),
      });
    } else {
      setFacilityForm({
        ...facilityForm,
        offered_services: [...currentServices, serviceId],
      });
    }
  };

  // 新規フォーム：提供サービスのチェックボックス切り替え
  const handleNewServiceToggle = (serviceId: string) => {
    const currentServices = newFacilityForm.offered_services || [];
    if (currentServices.includes(serviceId)) {
      setNewFacilityForm({
        ...newFacilityForm,
        offered_services: currentServices.filter((s) => s !== serviceId),
      });
    } else {
      setNewFacilityForm({
        ...newFacilityForm,
        offered_services: [...currentServices, serviceId],
      });
    }
  };

  // 2. 既存施設詳細情報の保存
  const handleSaveFacility = async () => {
    if (!selectedFacilityId || !currentUserId) return;

    setSavingFacility(true);
    setMessage(null);

    const { error } = await supabase
      .from('facilities')
      .update({
        name: facilityForm.name,
        description: facilityForm.description,
        address: facilityForm.address,
        phone_number: facilityForm.phone_number,
        opening_hours: facilityForm.opening_hours,
        image_url: facilityForm.image_url,
        has_pickup: facilityForm.has_pickup,
        offered_services: facilityForm.offered_services,
      })
      .eq('id', selectedFacilityId)
      // 一覧取得は owner_id で絞っているので selectedFacilityId は既に自分の施設のはずだが、
      // 更新クエリ自体にも owner_id 条件を付けて多重に防御する
      .eq('owner_id', currentUserId);

    setSavingFacility(false);

    if (error) {
      console.error('施設情報の更新に失敗しました:', error);
      setMessage({ type: 'error', text: '施設情報の更新に失敗しました。' });
    } else {
      setMessage({ type: 'success', text: '施設詳細情報を正常に更新しました！' });
      setFacilities((prev) =>
        prev.map((f) => (f.id === selectedFacilityId ? { ...f, ...facilityForm } : f))
      );
    }
  };

  // 3. 新規施設の追加処理
  const handleCreateFacility = async () => {
    if (!newFacilityForm.name?.trim()) {
      setMessage({ type: 'error', text: '施設名を入力してください。' });
      return;
    }
    if (!currentUserId) return;

    setCreatingFacility(true);
    setMessage(null);

    const { data, error } = await supabase
      .from('facilities')
      .insert([
        {
          name: newFacilityForm.name,
          description: newFacilityForm.description,
          address: newFacilityForm.address,
          phone_number: newFacilityForm.phone_number,
          opening_hours: newFacilityForm.opening_hours,
          image_url: newFacilityForm.image_url,
          has_pickup: newFacilityForm.has_pickup,
          offered_services: newFacilityForm.offered_services,
          owner_id: currentUserId,
        },
      ])
      .select();

    setCreatingFacility(false);

    if (error || !data || data.length === 0) {
      console.error('新規施設の追加に失敗しました:', error);
      setMessage({ type: 'error', text: '新規施設の追加に失敗しました。' });
    } else {
      const createdFac = data[0] as Facility;
      setMessage({ type: 'success', text: `「${createdFac.name}」を新規登録しました！` });
      
      setFacilities((prev) => [...prev, createdFac]);
      setSelectedFacilityId(createdFac.id);
      initFacilityForm(createdFac);
      await fetchSchedules(createdFac.id);

      setNewFacilityForm({
        name: '',
        description: '',
        address: '',
        phone_number: '',
        opening_hours: '',
        image_url: '',
        has_pickup: false,
        offered_services: ['after_school'],
      });
      setIsAddOpen(false);
    }
  };

  const selectedFacility = facilities.find((f) => f.id === selectedFacilityId);

  return (
    <main className="min-h-screen bg-[#F3ECE0] text-gray-800 p-3 sm:p-8 font-sans relative overflow-x-hidden">
      {/* 背景のドットモチーフ */}
      <div 
        className="absolute inset-0 opacity-15 pointer-events-none z-0" 
        style={{ 
          backgroundImage: 'radial-gradient(#2C9381 0.75px, transparent 0.75px)', 
          backgroundSize: '16px 16px' 
        }} 
      />

      <div className="max-w-4xl mx-auto space-y-6 relative z-10 w-full min-w-0">
        
        {/* --- ヘッダーナビゲーション --- */}
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="px-3.5 py-2 bg-white hover:bg-[#FAF8F5] text-gray-700 border-2 border-[#D8CEBF] rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shadow-sm"
          >
            <ArrowLeft className="w-4 h-4 text-[#2C9381]" />
            トップページに戻る
          </Link>
          <div className="flex items-center gap-2">
            <Link
              href="/admin/messages"
              className="px-3.5 py-2 bg-white hover:bg-[#FAF8F5] text-[#2C9381] border-2 border-[#A8DDD3] rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shadow-sm"
            >
              <MessageSquare className="w-4 h-4" />
              お問い合わせ管理
            </Link>
            <div className="flex items-center gap-1.5 text-xs font-black bg-[#EAF7F4] text-[#2C9381] border-2 border-[#A8DDD3] px-3 py-1.5 rounded-xl shadow-xs">
              <Building2 className="w-4 h-4" />
              事業者管理画面
            </div>
          </div>
        </div>

        {/* --- メインコンテンツパネル --- */}
        <div className="bg-[#FAF8F5] rounded-3xl border-2 border-[#D8CEBF] shadow-md p-5 sm:p-8 space-y-8">
          
          {/* タイトルエリア */}
          <div className="border-b-2 border-dashed border-[#E5DDD0] pb-4">
            <h1 className="text-xl sm:text-2xl font-black text-gray-900 flex items-center gap-2">
              <Building2 className="w-6 h-6 text-[#2C9381]" />
              施設情報の管理・更新
            </h1>
            <p className="text-xs font-bold text-gray-500 mt-1">
              管理対象の施設を選択し、週間空き状況や施設基本情報を更新できます。
            </p>
          </div>

          {loading ? (
            <div className="text-center py-12 text-xs font-bold text-gray-500 bg-white rounded-2xl border-2 border-[#E5DDD0]">
              <RefreshCw className="w-6 h-6 animate-spin text-[#2C9381] mx-auto mb-2" />
              アクセス権限とデータを確認中...
            </div>
          ) : (
            <>
              {/* --- 1. 施設選択ドロップダウン ＆ 新規施設追加（最小化アコーディオン） --- */}
              <div className="space-y-3">
                <div className="bg-white p-4 rounded-2xl border-2 border-[#E5DDD0] space-y-2">
                  <label className="block text-xs font-black text-gray-700">管理対象の施設を選択:</label>
                  <select
                    value={selectedFacilityId || ''}
                    onChange={(e) => handleFacilityChange(Number(e.target.value))}
                    className="w-full px-4 py-2.5 bg-[#FAF8F5] border-2 border-[#D8CEBF] rounded-xl text-sm font-black text-gray-800 focus:outline-none focus:border-[#2C9381]"
                  >
                    {facilities.map((fac) => (
                      <option key={fac.id} value={fac.id}>
                        {fac.name || `施設 ID: ${fac.id}`} ({fac.address || '住所未設定'})
                      </option>
                    ))}
                  </select>
                </div>

                {/* 折りたたみ（最小化）できる新規施設追加アコーディオン */}
                <div className="bg-white rounded-2xl border-2 border-[#E5DDD0] overflow-hidden transition-all">
                  <button
                    type="button"
                    onClick={() => setIsAddOpen(!isAddOpen)}
                    className="w-full px-4 py-3 bg-white hover:bg-[#EAF7F4]/40 flex items-center justify-between text-xs font-black text-[#2C9381] transition-colors cursor-pointer"
                  >
                    <span className="flex items-center gap-1.5">
                      <Plus className="w-4 h-4" />
                      新規施設を追加する
                    </span>
                    {isAddOpen ? (
                      <ChevronUp className="w-4 h-4 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-gray-400" />
                    )}
                  </button>

                  {/* 開閉コンテンツ */}
                  {isAddOpen && (
                    <div className="p-4 sm:p-6 border-t-2 border-[#E5DDD0] bg-[#FAF8F5] space-y-4">
                      <h3 className="text-xs font-black text-gray-800 border-b border-[#E5DDD0] pb-2">新規施設の基本入力</h3>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-bold text-gray-600 mb-1">施設名 *</label>
                          <input
                            type="text"
                            value={newFacilityForm.name || ''}
                            onChange={(e) => setNewFacilityForm({ ...newFacilityForm, name: e.target.value })}
                            placeholder="例: スマイルキッズ恵比寿"
                            className="w-full px-3 py-2 bg-white border border-[#D8CEBF] rounded-xl text-xs font-bold text-gray-800 focus:outline-none focus:border-[#2C9381]"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-gray-600 mb-1">電話番号</label>
                          <input
                            type="text"
                            value={newFacilityForm.phone_number || ''}
                            onChange={(e) => setNewFacilityForm({ ...newFacilityForm, phone_number: e.target.value })}
                            placeholder="例: 03-9876-5432"
                            className="w-full px-3 py-2 bg-white border border-[#D8CEBF] rounded-xl text-xs font-bold text-gray-800 focus:outline-none focus:border-[#2C9381]"
                          />
                        </div>

                        <div className="sm:col-span-2">
                          <label className="block text-[11px] font-bold text-gray-600 mb-1">住所</label>
                          <input
                            type="text"
                            value={newFacilityForm.address || ''}
                            onChange={(e) => setNewFacilityForm({ ...newFacilityForm, address: e.target.value })}
                            placeholder="例: 東京都渋谷区恵比寿1-1-1"
                            className="w-full px-3 py-2 bg-white border border-[#D8CEBF] rounded-xl text-xs font-bold text-gray-800 focus:outline-none focus:border-[#2C9381]"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-gray-600 mb-1">開所時間</label>
                          <input
                            type="text"
                            value={newFacilityForm.opening_hours || ''}
                            onChange={(e) => setNewFacilityForm({ ...newFacilityForm, opening_hours: e.target.value })}
                            placeholder="例: 平日 13:00 - 18:00"
                            className="w-full px-3 py-2 bg-white border border-[#D8CEBF] rounded-xl text-xs font-bold text-gray-800 focus:outline-none focus:border-[#2C9381]"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-gray-600 mb-1">画像URL</label>
                          <input
                            type="text"
                            value={newFacilityForm.image_url || ''}
                            onChange={(e) => setNewFacilityForm({ ...newFacilityForm, image_url: e.target.value })}
                            placeholder="例: https://..."
                            className="w-full px-3 py-2 bg-white border border-[#D8CEBF] rounded-xl text-xs font-bold text-gray-800 focus:outline-none focus:border-[#2C9381]"
                          />
                        </div>

                        <div className="sm:col-span-2 space-y-2 pt-1">
                          <label className="block text-[11px] font-bold text-gray-600">提供サービス & 送迎</label>
                          <div className="flex flex-wrap gap-3">
                            {SERVICE_TYPES.map((s) => (
                              <label key={s.id} className="flex items-center gap-1.5 text-xs font-bold text-gray-700 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={newFacilityForm.offered_services?.includes(s.id) || false}
                                  onChange={() => handleNewServiceToggle(s.id)}
                                  className="w-4 h-4 text-[#2C9381] rounded"
                                />
                                {s.label}
                              </label>
                            ))}
                            <label className="flex items-center gap-1.5 text-xs font-bold text-gray-700 cursor-pointer border-l border-gray-300 pl-3">
                              <input
                                type="checkbox"
                                checked={newFacilityForm.has_pickup || false}
                                onChange={(e) => setNewFacilityForm({ ...newFacilityForm, has_pickup: e.target.checked })}
                                className="w-4 h-4 text-[#2C9381] rounded"
                              />
                              送迎あり
                            </label>
                          </div>
                        </div>

                        <div className="sm:col-span-2">
                          <label className="block text-[11px] font-bold text-gray-600 mb-1">アピールポイント・概要</label>
                          <textarea
                            rows={2}
                            value={newFacilityForm.description || ''}
                            onChange={(e) => setNewFacilityForm({ ...newFacilityForm, description: e.target.value })}
                            placeholder="施設の特徴などを簡単に入力..."
                            className="w-full px-3 py-2 bg-white border border-[#D8CEBF] rounded-xl text-xs font-bold text-gray-800 focus:outline-none focus:border-[#2C9381]"
                          />
                        </div>
                      </div>

                      <div className="pt-2 flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setIsAddOpen(false)}
                          className="px-4 py-2 bg-white border border-gray-300 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-50"
                        >
                          キャンセル
                        </button>
                        <button
                          type="button"
                          onClick={handleCreateFacility}
                          disabled={creatingFacility}
                          className="px-5 py-2 bg-[#2C9381] hover:bg-[#237768] text-white rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shadow-xs disabled:opacity-50"
                        >
                          {creatingFacility ? (
                            <>
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              登録中...
                            </>
                          ) : (
                            <>
                              <Plus className="w-3.5 h-3.5" />
                              登録を確定する
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* メッセージ通知（成功/失敗） */}
              {message && (
                <div
                  className={`p-4 rounded-2xl border-2 flex items-center gap-2.5 text-xs font-black ${
                    message.type === 'success'
                      ? 'bg-[#EAF7F4] text-[#2C9381] border-[#A8DDD3]'
                      : 'bg-[#FFF0F3] text-[#D96B85] border-[#F8C3CE]'
                  }`}
                >
                  {message.type === 'success' ? (
                    <Sparkles className="w-4 h-4 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0" />
                  )}
                  <span>{message.text}</span>
                </div>
              )}

              {/* --- 2. 空き状況編集マトリクス --- */}
              {selectedFacility && (
                <div className="space-y-6 pt-2">
                  <div className="flex items-center gap-2 border-b-2 border-[#E5DDD0] pb-2">
                    <Calendar className="w-5 h-5 text-[#2C9381]" />
                    <h2 className="text-base font-black text-gray-800">1. 週間空き状況の更新</h2>
                  </div>

                  {SERVICES.map((service) => {
                    const isOffered = selectedFacility.offered_services?.includes(service.id);
                    if (!isOffered) return null;

                    return (
                      <div key={service.id} className="bg-white p-4 sm:p-6 rounded-2xl border-2 border-[#E5DDD0] space-y-4">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-black px-3 py-1 rounded-lg border ${service.color}`}>
                            {service.label}
                          </span>
                        </div>

                        {/* 曜日ごとのステート選択グリッド */}
                        <div className="grid grid-cols-2 sm:grid-cols-6 gap-2.5">
                          {DAYS.map((day) => {
                            const currentStatus = getStatus(service.id, day);

                            return (
                              <div
                                key={day}
                                className="bg-[#FAF8F5] p-3 rounded-xl border-2 border-[#E5DDD0] flex flex-col items-center justify-between space-y-2 text-center"
                              >
                                <span className="text-xs font-black text-gray-700 bg-[#E5DDD0]/60 px-2 py-0.5 rounded-md w-full">
                                  {day}曜日
                                </span>

                                <div className="flex items-center justify-center gap-1 w-full pt-1">
                                  <button
                                    type="button"
                                    onClick={() => handleStatusChange(service.id, day, 'available')}
                                    className={`flex-1 py-1.5 rounded-lg text-sm font-black border transition-all ${
                                      currentStatus === 'available'
                                        ? 'bg-emerald-500 text-white border-emerald-600 shadow-xs scale-105'
                                        : 'bg-white text-emerald-600 border-gray-200 hover:bg-emerald-50'
                                    }`}
                                    title="空きあり (◯)"
                                  >
                                    ◯
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleStatusChange(service.id, day, 'few')}
                                    className={`flex-1 py-1.5 rounded-lg text-sm font-black border transition-all ${
                                      currentStatus === 'few'
                                        ? 'bg-amber-500 text-white border-amber-600 shadow-xs scale-105'
                                        : 'bg-white text-amber-600 border-gray-200 hover:bg-amber-50'
                                    }`}
                                    title="残りわずか (▲)"
                                  >
                                    ▲
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleStatusChange(service.id, day, 'full')}
                                    className={`flex-1 py-1.5 rounded-lg text-sm font-black border transition-all ${
                                      currentStatus === 'full'
                                        ? 'bg-gray-400 text-white border-gray-500 shadow-xs scale-105'
                                        : 'bg-white text-gray-400 border-gray-200 hover:bg-gray-100'
                                    }`}
                                    title="空きなし (×)"
                                  >
                                    ×
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}

                  <div className="pt-1 flex justify-end">
                    <button
                      onClick={handleSaveSchedules}
                      disabled={savingSchedule}
                      className="w-full sm:w-auto px-6 py-3 bg-[#2C9381] hover:bg-[#237768] text-white rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer disabled:opacity-50"
                    >
                      {savingSchedule ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          保存中...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4" />
                          空き状況を保存する
                        </>
                      )}
                    </button>
                  </div>

                </div>
              )}

              {/* --- 3. 施設詳細情報の編集フォーム --- */}
              {selectedFacility && (
                <div className="space-y-6 pt-6 border-t-2 border-dashed border-[#E5DDD0]">
                  <div className="flex items-center gap-2 border-b-2 border-[#E5DDD0] pb-2">
                    <Edit3 className="w-5 h-5 text-[#2C9381]" />
                    <h2 className="text-base font-black text-gray-800">2. 施設詳細情報の編集</h2>
                  </div>

                  <div className="bg-white p-5 sm:p-7 rounded-2xl border-2 border-[#E5DDD0] space-y-5">
                    
                    {/* 施設名 */}
                    <div>
                      <label className="block text-xs font-black text-gray-700 mb-1.5 flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-[#2C9381]" />
                        施設名
                      </label>
                      <input
                        type="text"
                        value={facilityForm.name || ''}
                        onChange={(e) => setFacilityForm({ ...facilityForm, name: e.target.value })}
                        placeholder="例: スマイルキッズ渋谷"
                        className="w-full px-3.5 py-2 bg-[#FAF8F5] border-2 border-[#E5DDD0] rounded-xl text-xs font-bold text-gray-800 focus:outline-none focus:border-[#2C9381]"
                      />
                    </div>

                    {/* 提供サービス & 送迎有無 */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                      <div>
                        <label className="block text-xs font-black text-gray-700 mb-2">提供サービス（複数選択可）</label>
                        <div className="space-y-2">
                          {SERVICE_TYPES.map((s) => (
                            <label key={s.id} className="flex items-center gap-2 cursor-pointer bg-[#FAF8F5] p-2.5 rounded-xl border border-[#E5DDD0]">
                              <input
                                type="checkbox"
                                checked={facilityForm.offered_services?.includes(s.id) || false}
                                onChange={() => handleServiceToggle(s.id)}
                                className="w-4 h-4 text-[#2C9381] rounded focus:ring-0"
                              />
                              <span className="text-xs font-bold text-gray-700">{s.label}</span>
                            </label>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-black text-gray-700 mb-2 flex items-center gap-1.5">
                          <Car className="w-3.5 h-3.5 text-[#2C9381]" />
                          送迎対応
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer bg-[#FAF8F5] p-2.5 rounded-xl border border-[#E5DDD0] mt-0.5">
                          <input
                            type="checkbox"
                            checked={facilityForm.has_pickup || false}
                            onChange={(e) => setFacilityForm({ ...facilityForm, has_pickup: e.target.checked })}
                            className="w-4 h-4 text-[#2C9381] rounded focus:ring-0"
                          />
                          <span className="text-xs font-bold text-gray-700">送迎サービスあり</span>
                        </label>
                      </div>
                    </div>

                    {/* 住所 & 電話番号 */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-black text-gray-700 mb-1.5 flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-[#2C9381]" />
                          住所
                        </label>
                        <input
                          type="text"
                          value={facilityForm.address || ''}
                          onChange={(e) => setFacilityForm({ ...facilityForm, address: e.target.value })}
                          placeholder="例: 東京都渋谷区神南1-2-3"
                          className="w-full px-3.5 py-2 bg-[#FAF8F5] border-2 border-[#E5DDD0] rounded-xl text-xs font-bold text-gray-800 focus:outline-none focus:border-[#2C9381]"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-black text-gray-700 mb-1.5 flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-[#2C9381]" />
                          電話番号
                        </label>
                        <input
                          type="text"
                          value={facilityForm.phone_number || ''}
                          onChange={(e) => setFacilityForm({ ...facilityForm, phone_number: e.target.value })}
                          placeholder="例: 03-1234-5678"
                          className="w-full px-3.5 py-2 bg-[#FAF8F5] border-2 border-[#E5DDD0] rounded-xl text-xs font-bold text-gray-800 focus:outline-none focus:border-[#2C9381]"
                        />
                      </div>
                    </div>

                    {/* 開所時間 & 画像URL */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-black text-gray-700 mb-1.5 flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-[#2C9381]" />
                          開所時間
                        </label>
                        <input
                          type="text"
                          value={facilityForm.opening_hours || ''}
                          onChange={(e) => setFacilityForm({ ...facilityForm, opening_hours: e.target.value })}
                          placeholder="例: 平日 13:00 - 18:00 / 土曜 10:00 - 17:00"
                          className="w-full px-3.5 py-2 bg-[#FAF8F5] border-2 border-[#E5DDD0] rounded-xl text-xs font-bold text-gray-800 focus:outline-none focus:border-[#2C9381]"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-black text-gray-700 mb-1.5 flex items-center gap-1.5">
                          <Image className="w-3.5 h-3.5 text-[#2C9381]" />
                          画像URL
                        </label>
                        <input
                          type="text"
                          value={facilityForm.image_url || ''}
                          onChange={(e) => setFacilityForm({ ...facilityForm, image_url: e.target.value })}
                          placeholder="例: https://images.unsplash.com/..."
                          className="w-full px-3.5 py-2 bg-[#FAF8F5] border-2 border-[#E5DDD0] rounded-xl text-xs font-bold text-gray-800 focus:outline-none focus:border-[#2C9381]"
                        />
                      </div>
                    </div>

                    {/* 画像プレビュー */}
                    {facilityForm.image_url && (
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-gray-500">画像プレビュー:</span>
                        <div className="h-32 w-full rounded-xl overflow-hidden border-2 border-[#E5DDD0] bg-[#FAF8F5]">
                          <img
                            src={facilityForm.image_url}
                            alt="プレビュー"
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = 'https://via.placeholder.com/400x200?text=Image+Load+Error';
                            }}
                          />
                        </div>
                      </div>
                    )}

                    {/* 施設説明文 */}
                    <div>
                      <label className="block text-xs font-black text-gray-700 mb-1.5 flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-[#2C9381]" />
                        施設の説明・アピールポイント
                      </label>
                      <textarea
                        rows={4}
                        value={facilityForm.description || ''}
                        onChange={(e) => setFacilityForm({ ...facilityForm, description: e.target.value })}
                        placeholder="施設の特徴や雰囲気を入力してください..."
                        className="w-full px-3.5 py-2 bg-[#FAF8F5] border-2 border-[#E5DDD0] rounded-xl text-xs font-bold text-gray-800 focus:outline-none focus:border-[#2C9381]"
                      />
                    </div>

                    {/* 保存ボタン */}
                    <div className="pt-2 flex justify-end">
                      <button
                        onClick={handleSaveFacility}
                        disabled={savingFacility}
                        className="w-full sm:w-auto px-8 py-3.5 bg-[#2C9381] hover:bg-[#237768] text-white rounded-2xl text-sm font-black transition-all flex items-center justify-center gap-2 shadow-md cursor-pointer disabled:opacity-50 active:scale-95"
                      >
                        {savingFacility ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            更新中...
                          </>
                        ) : (
                          <>
                            <Save className="w-4 h-4" />
                            施設情報を保存する
                          </>
                        )}
                      </button>
                    </div>

                  </div>
                </div>
              )}
            </>
          )}

        </div>
      </div>
    </main>
  );
}
