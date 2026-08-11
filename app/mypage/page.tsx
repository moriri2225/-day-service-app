'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Heart, Calendar, MapPin, Trash2, ArrowLeft, Building2, 
  CheckCircle2, LogOut, User, Edit2, Save, X, Plus, CheckSquare, Square, Baby
} from 'lucide-react';
import { getLocalBookmarks, toggleLocalBookmark, getLocalInquiries } from '@/lib/storage';
import { Facility, InquiryHistory } from '@/types';
import { createClient } from '@/utils/supabase/client';
import { User as SupabaseUser } from '@supabase/supabase-js';

// お子様ごとの情報（受給者証情報を含む）
interface ChildInfo {
  name: string;
  age_grade: string;
  beneficiary_number: string; // 各お子様の受給者証番号
  available_services: string[]; // 各お子様の受給者証で利用できるサービス
}

// プロフィール情報全体の型定義
interface Profile {
  parent_name: string;
  phone_number: string;
  address: string;
  children: ChildInfo[];
}

// 選択可能な受給者証サービス一覧
const SERVICE_OPTIONS = [
  '児童発達支援',
  '放課後等デイサービス',
  '障害児相談支援',
  '居宅訪問型児童発達支援',
  '保育所等訪問支援'
];

export default function MyPage() {
  const router = useRouter();
  const supabase = createClient();

  const [activeTab, setActiveTab] = useState<'bookmarks' | 'inquiries'>('bookmarks');
  const [bookmarkedFacilities, setBookmarkedFacilities] = useState<Facility[]>([]);
  const [inquiries, setInquiries] = useState<InquiryHistory[]>([]);
  const [loading, setLoading] = useState(true);

  // ログインユーザー情報
  const [currentUser, setCurrentUser] = useState<SupabaseUser | null>(null);

  // プロフィール情報・編集ステート
  const [profile, setProfile] = useState<Profile>({
    parent_name: '',
    phone_number: '',
    address: '',
    children: [
      { name: '', age_grade: '', beneficiary_number: '', available_services: [] }
    ],
  });
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState('');

  useEffect(() => {
    checkUserAndLoadData();
  }, []);

  const checkUserAndLoadData = async () => {
    setLoading(true);

    // 1. Current User
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUser(user);

    // 2. Fetch Profile
    if (user) {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      // DBになければ Auth メタデータから名前を取得
      const fallbackName = user.user_metadata?.parent_name || '';

      if (profileData) {
        let childrenData: ChildInfo[] = profileData.children || [];
        
        if (childrenData.length === 0) {
          childrenData = [{
            name: '',
            age_grade: '',
            beneficiary_number: profileData.beneficiary_number || '',
            available_services: profileData.available_services || []
          }];
        } else {
          childrenData = childrenData.map((child: any) => ({
            name: child.name || '',
            age_grade: child.age_grade || '',
            beneficiary_number: child.beneficiary_number || '',
            available_services: child.available_services || []
          }));
        }

        setProfile({
          parent_name: profileData.parent_name || fallbackName,
          phone_number: profileData.phone_number || '',
          address: profileData.address || '',
          children: childrenData,
        });
      } else {
        // DBにプロファイルが未作成の場合、初期値としてAuthのメタデータを設定
        setProfile((prev) => ({
          ...prev,
          parent_name: fallbackName,
        }));
      }
    }

    // 3. Fetch Bookmarks
    const bookmarkIds = getLocalBookmarks();
    if (bookmarkIds.length > 0) {
      const { data } = await supabase
        .from('facilities')
        .select('*')
        .in('id', bookmarkIds);

      if (data) setBookmarkedFacilities(data);
    } else {
      setBookmarkedFacilities([]);
    }

    // 4. Fetch Inquiries
    const history = getLocalInquiries();
    setInquiries(history);

    setLoading(false);
  };

  // お子様のフォーム追加
  const handleAddChild = () => {
    setProfile(prev => ({
      ...prev,
      children: [
        ...prev.children, 
        { name: '', age_grade: '', beneficiary_number: '', available_services: [] }
      ]
    }));
  };

  // お子様のフォーム削除
  const handleRemoveChild = (index: number) => {
    if (profile.children.length <= 1) return;
    setProfile(prev => ({
      ...prev,
      children: prev.children.filter((_, i) => i !== index)
    }));
  };

  // お子様の基本情報入力変更
  const handleChildChange = (index: number, field: 'name' | 'age_grade' | 'beneficiary_number', value: string) => {
    const updatedChildren = [...profile.children];
    updatedChildren[index][field] = value;
    setProfile(prev => ({ ...prev, children: updatedChildren }));
  };

  // 各お子様のサービス選択切り替え
  const handleChildServiceToggle = (childIndex: number, service: string) => {
    const updatedChildren = [...profile.children];
    const targetChild = updatedChildren[childIndex];
    const exists = targetChild.available_services.includes(service);

    if (exists) {
      targetChild.available_services = targetChild.available_services.filter(s => s !== service);
    } else {
      targetChild.available_services = [...targetChild.available_services, service];
    }

    setProfile(prev => ({ ...prev, children: updatedChildren }));
  };

  // プロフィール保存処理
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    setSavingProfile(true);
    setProfileMessage('');

    const { error } = await supabase.from('profiles').upsert({
      id: currentUser.id,
      parent_name: profile.parent_name,
      phone_number: profile.phone_number,
      address: profile.address,
      children: profile.children,
      updated_at: new Date().toISOString(),
    });

    setSavingProfile(false);

    if (error) {
      console.error('Profile Save Error:', error);
      setProfileMessage('プロフィールの保存に失敗しました。');
    } else {
      setProfileMessage('会員情報を更新しました！');
      setIsEditingProfile(false);
      setTimeout(() => setProfileMessage(''), 3000);
    }
  };

  // ログアウト処理
  const handleLogout = async () => {
    await supabase.auth.signOut();
    setCurrentUser(null);
    router.push('/login');
    router.refresh();
  };

  const handleRemoveBookmark = (id: number) => {
    toggleLocalBookmark(id);
    setBookmarkedFacilities((prev) => prev.filter((item) => item.id !== id));
  };

  return (
    <div className="min-h-screen bg-[#FFFDF9] text-gray-800 pb-16">
      {/* 1. ヘッダーナビゲーション */}
      <header className="bg-white/90 backdrop-blur-md sticky top-0 z-10 border-b border-rose-100/60 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-2 flex items-center justify-between">
          <Link href="/" className="flex items-center text-[#D96B85] hover:text-[#C4526D] font-bold text-xs sm:text-sm transition">
            <ArrowLeft className="w-4 h-4 mr-1" />
            検索トップへ戻る
          </Link>
          <h1 className="text-base sm:text-lg font-bold text-gray-800">保護者マイページ</h1>
          <div className="w-16"></div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 pt-6 space-y-6">
        {/* 2. ユーザーヘッダーエリア */}
        <div className="bg-gradient-to-r from-[#FFF0F3] to-[#F0F9F8] rounded-3xl p-5 border border-rose-100/80 shadow-sm flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <span className="w-12 h-12 rounded-2xl bg-[#E88CA2] text-white flex items-center justify-center font-bold text-xl shadow-sm">
              {currentUser ? '👤' : '👶'}
            </span>
            <div>
              {currentUser ? (
                <>
                  <p className="font-bold text-gray-800 text-sm sm:text-base flex items-center gap-2">
                    {profile.parent_name ? `${profile.parent_name} 様` : '保護者様'}
                    <span className="bg-[#F0F9F8] text-[#2C9381] border border-[#BCE3DD] text-[10px] px-2 py-0.5 rounded-full font-bold">
                      会員アカウント
                    </span>
                  </p>
                  <p className="text-xs text-gray-500 font-mono mt-0.5">{currentUser.email}</p>
                </>
              ) : (
                <>
                  <p className="font-bold text-gray-800 text-sm sm:text-base">ゲスト（お試し）で利用中</p>
                  <p className="text-xs text-gray-500">お気に入りや見学申込履歴はこのブラウザに保存されています。</p>
                </>
              )}
            </div>
          </div>

          {currentUser ? (
            <button
              onClick={handleLogout}
              className="bg-white hover:bg-rose-50 text-rose-600 border border-rose-200 text-xs font-bold px-4 py-2 rounded-xl transition shadow-sm flex items-center gap-1.5"
            >
              <LogOut className="w-3.5 h-3.5" />
              ログアウト
            </button>
          ) : (
            <Link
              href="/login"
              className="bg-gradient-to-r from-[#E88CA2] to-[#D96B85] hover:from-[#D96B85] hover:to-[#C4526D] text-white text-xs font-bold px-4 py-2 rounded-xl transition shadow-sm inline-block"
            >
              会員登録・ログイン
            </Link>
          )}
        </div>

        {/* 3. ログイン会員専用：詳細会員情報編集カード */}
        {currentUser && (
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-rose-100/80 shadow-sm">
            <div className="flex items-center justify-between mb-4 border-b border-rose-100/50 pb-3">
              <h2 className="font-bold text-gray-800 text-base flex items-center gap-2">
                <User className="w-5 h-5 text-[#D96B85]" />
                ご登録・受給者証情報
              </h2>
              {!isEditingProfile && (
                <button
                  onClick={() => setIsEditingProfile(true)}
                  className="text-xs text-[#D96B85] hover:text-[#C4526D] font-bold flex items-center gap-1 bg-[#FFF5F7] px-3.5 py-2 rounded-xl border border-[#FCD8E1] transition"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  編集する
                </button>
              )}
            </div>

            {profileMessage && (
              <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-700 font-bold">
                {profileMessage}
              </div>
            )}

            {isEditingProfile ? (
              <form onSubmit={handleSaveProfile} className="space-y-6 text-xs">
                {/* 保護者情報 */}
                <div className="space-y-3">
                  <h3 className="font-bold text-gray-700 text-xs border-l-4 border-[#D96B85] pl-2">保護者様情報</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-gray-600 mb-1">保護者お名前</label>
                      <input
                        type="text"
                        placeholder="例: 山田 太郎"
                        value={profile.parent_name}
                        onChange={(e) => setProfile({ ...profile, parent_name: e.target.value })}
                        className="w-full p-2.5 rounded-xl border border-gray-200 focus:outline-none focus:border-[#E88CA2] focus:ring-2 focus:ring-[#FCD8E1]"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-gray-600 mb-1">電話番号</label>
                      <input
                        type="tel"
                        placeholder="例: 090-1234-5678"
                        value={profile.phone_number}
                        onChange={(e) => setProfile({ ...profile, phone_number: e.target.value })}
                        className="w-full p-2.5 rounded-xl border border-gray-200 focus:outline-none focus:border-[#E88CA2] focus:ring-2 focus:ring-[#FCD8E1]"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block font-bold text-gray-600 mb-1">ご住所</label>
                    <input
                      type="text"
                      placeholder="例: 東京都渋谷区神南1-2-3 ○○マンション101"
                      value={profile.address}
                      onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-gray-200 focus:outline-none focus:border-[#E88CA2] focus:ring-2 focus:ring-[#FCD8E1]"
                    />
                  </div>
                </div>

                {/* お子様・受給者証情報（お子様ごとにセット） */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-gray-700 text-xs border-l-4 border-[#D96B85] pl-2">お子様・受給者証情報</h3>
                    <button
                      type="button"
                      onClick={handleAddChild}
                      className="text-[#D96B85] hover:text-[#C4526D] font-bold flex items-center gap-1 bg-[#FFF5F7] px-2.5 py-1 rounded-lg border border-[#FCD8E1] transition text-xs"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      お子様を追加
                    </button>
                  </div>

                  {profile.children.map((child, childIdx) => (
                    <div key={childIdx} className="bg-[#FFF5F7]/50 p-4 rounded-2xl border border-rose-100 relative space-y-4">
                      <div className="flex items-center justify-between border-b border-rose-100/60 pb-2">
                        <span className="font-bold text-gray-800 text-xs flex items-center gap-1.5">
                          <Baby className="w-4 h-4 text-[#D96B85]" />
                          お子様 {childIdx + 1} の情報
                        </span>
                        {profile.children.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveChild(childIdx)}
                            className="text-gray-400 hover:text-rose-500 transition flex items-center gap-1 text-[11px]"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            削除
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block font-medium text-gray-600 mb-1">お子様のお名前</label>
                          <input
                            type="text"
                            placeholder="例: 山田 花子"
                            value={child.name}
                            onChange={(e) => handleChildChange(childIdx, 'name', e.target.value)}
                            className="w-full p-2.5 rounded-xl border border-gray-200 bg-white focus:outline-none focus:border-[#E88CA2]"
                          />
                        </div>
                        <div>
                          <label className="block font-medium text-gray-600 mb-1">学年 / 年齢</label>
                          <input
                            type="text"
                            placeholder="例: 小学2年生 / 7歳"
                            value={child.age_grade}
                            onChange={(e) => handleChildChange(childIdx, 'age_grade', e.target.value)}
                            className="w-full p-2.5 rounded-xl border border-gray-200 bg-white focus:outline-none focus:border-[#E88CA2]"
                          />
                        </div>
                      </div>

                      <div className="bg-white p-3.5 rounded-xl border border-rose-100/80 space-y-3">
                        <div>
                          <label className="block font-bold text-gray-700 mb-1">障害児通所受給者証番号（受給者証をお持ちの場合）</label>
                          <input
                            type="text"
                            placeholder="例: 10桁の受給者証番号 (例: 1234567890)"
                            value={child.beneficiary_number}
                            onChange={(e) => handleChildChange(childIdx, 'beneficiary_number', e.target.value)}
                            className="w-full p-2 rounded-lg border border-gray-200 focus:outline-none focus:border-[#E88CA2] text-xs"
                          />
                        </div>

                        <div>
                          <label className="block font-bold text-gray-700 mb-1.5">利用できるサービス（受給者証記載）</label>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {SERVICE_OPTIONS.map((service) => {
                              const checked = child.available_services.includes(service);
                              return (
                                <button
                                  type="button"
                                  key={service}
                                  onClick={() => handleChildServiceToggle(childIdx, service)}
                                  className={`p-2 rounded-xl border text-left transition flex items-center gap-2 text-xs ${
                                    checked
                                      ? 'border-[#E88CA2] bg-[#FFF5F7] text-[#C4526D] font-bold'
                                      : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                                  }`}
                                >
                                  {checked ? <CheckSquare className="w-4 h-4 text-[#D96B85] flex-shrink-0" /> : <Square className="w-4 h-4 text-gray-300 flex-shrink-0" />}
                                  <span>{service}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t border-rose-100">
                  <button
                    type="button"
                    onClick={() => setIsEditingProfile(false)}
                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl font-bold transition flex items-center gap-1"
                  >
                    <X className="w-3.5 h-3.5" />
                    キャンセル
                  </button>
                  <button
                    type="submit"
                    disabled={savingProfile}
                    className="px-5 py-2 bg-gradient-to-r from-[#E88CA2] to-[#D96B85] hover:from-[#D96B85] hover:to-[#C4526D] text-white rounded-xl font-bold transition shadow-sm flex items-center gap-1 disabled:opacity-50"
                  >
                    <Save className="w-3.5 h-3.5" />
                    {savingProfile ? '保存中...' : '保存する'}
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-[#FFF5F7]/60 p-3.5 rounded-2xl border border-rose-100/60">
                  <div>
                    <span className="text-gray-400 block mb-0.5">保護者氏名</span>
                    <span className="font-bold text-gray-800">{profile.parent_name || '未設定'}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block mb-0.5">電話番号</span>
                    <span className="font-bold text-gray-800">{profile.phone_number || '未設定'}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block mb-0.5">住所</span>
                    <span className="font-bold text-gray-800 truncate block">{profile.address || '未設定'}</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <span className="text-gray-500 font-bold block">お子様・受給者証情報</span>
                  <div className="grid grid-cols-1 gap-3">
                    {profile.children.map((child, idx) => (
                      <div key={idx} className="bg-[#F0F9F8]/40 p-4 rounded-2xl border border-[#BCE3DD]/50 space-y-3">
                        <div className="flex items-center justify-between border-b border-[#BCE3DD]/40 pb-2">
                          <span className="font-bold text-gray-800 text-sm flex items-center gap-1.5">
                            <Baby className="w-4 h-4 text-[#2C9381]" />
                            {child.name || `お子様 ${idx + 1}`}
                          </span>
                          <span className="text-xs bg-white px-2.5 py-1 rounded-md border border-[#BCE3DD] text-gray-600 font-medium">
                            {child.age_grade || '学年/年齢未設定'}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                          <div>
                            <span className="text-gray-400 block mb-0.5">受給者証番号:</span>
                            <span className="font-mono font-bold text-gray-800">{child.beneficiary_number || '未登録'}</span>
                          </div>
                          <div>
                            <span className="text-gray-400 block mb-1">利用できるサービス:</span>
                            {child.available_services && child.available_services.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {child.available_services.map((s) => (
                                  <span key={s} className="bg-[#FFF0F3] text-[#C4526D] text-[10px] font-bold px-2 py-0.5 rounded-md border border-[#FCD8E1]">
                                    {s}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-gray-400">未選択</span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 4. タブ切り替え */}
        <div className="flex border-b border-rose-100">
          <button
            onClick={() => setActiveTab('bookmarks')}
            className={`flex items-center gap-2 py-3 px-6 font-bold text-sm border-b-2 transition ${
              activeTab === 'bookmarks'
                ? 'border-[#D96B85] text-[#D96B85]'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Heart className={`w-4 h-4 ${activeTab === 'bookmarks' ? 'fill-[#D96B85] text-[#D96B85]' : ''}`} />
            お気に入り施設 ({bookmarkedFacilities.length})
          </button>
          <button
            onClick={() => setActiveTab('inquiries')}
            className={`flex items-center gap-2 py-3 px-6 font-bold text-sm border-b-2 transition ${
              activeTab === 'inquiries'
                ? 'border-[#D96B85] text-[#D96B85]'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Calendar className="w-4 h-4" />
            見学申込・問合せ履歴 ({inquiries.length})
          </button>
        </div>

        {/* 5. タブコンテンツ */}
        {loading ? (
          <div className="text-center py-12 text-gray-400 text-xs">情報を読み込んでいます...</div>
        ) : (
          <>
            {activeTab === 'bookmarks' && (
              <div>
                {bookmarkedFacilities.length === 0 ? (
                  <div className="bg-white rounded-3xl p-10 text-center border border-rose-100 shadow-sm">
                    <Heart className="w-12 h-12 text-rose-200 mx-auto mb-3" />
                    <p className="font-bold text-gray-700 mb-1">お気に入りの施設はまだありません</p>
                    <p className="text-xs text-gray-500 mb-6">気になる施設を「♥ お気に入り」に登録すると一覧で比較できます。</p>
                    <Link
                      href="/"
                      className="inline-block bg-gradient-to-r from-[#E88CA2] to-[#D96B85] hover:from-[#D96B85] hover:to-[#C4526D] text-white font-bold text-xs px-6 py-3 rounded-xl transition shadow-md"
                    >
                      施設を探す
                    </Link>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {bookmarkedFacilities.map((facility) => (
                      <div
                        key={facility.id}
                        className="bg-white rounded-3xl p-4 border border-rose-100/80 shadow-sm hover:shadow-md transition relative flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex gap-3 mb-3">
                            <img
                              src={facility.image_url || '/placeholder.png'}
                              alt={facility.name}
                              className="w-20 h-20 rounded-2xl object-cover border border-rose-100"
                            />
                            <div className="flex-1 min-w-0">
                              <h3 className="font-bold text-gray-800 truncate mb-1">{facility.name}</h3>
                              <p className="text-xs text-gray-500 flex items-center gap-1 truncate mb-1">
                                <MapPin className="w-3 h-3 text-[#E88CA2] flex-shrink-0" />
                                {facility.address}
                              </p>
                              {facility.has_pickup && (
                                <span className="inline-block bg-[#F0F9F8] text-[#2C9381] border border-[#BCE3DD] text-[10px] font-bold px-2 py-0.5 rounded-full">
                                  送迎あり
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="pt-3 border-t border-rose-50 flex items-center justify-between gap-2">
                          <button
                            onClick={() => handleRemoveBookmark(facility.id)}
                            className="text-xs text-gray-400 hover:text-rose-500 flex items-center gap-1 py-1 px-2 rounded-lg hover:bg-rose-50 transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            削除
                          </button>
                          <Link
                            href={`/facility/${facility.id}`}
                            className="bg-[#E88CA2] hover:bg-[#D96B85] text-white text-xs font-bold px-4 py-2 rounded-xl transition shadow-sm"
                          >
                            詳細を見る
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'inquiries' && (
              <div>
                {inquiries.length === 0 ? (
                  <div className="bg-white rounded-3xl p-10 text-center border border-rose-100 shadow-sm">
                    <Calendar className="w-12 h-12 text-rose-200 mx-auto mb-3" />
                    <p className="font-bold text-gray-700 mb-1">見学申し込みの履歴はありません</p>
                    <p className="text-xs text-gray-500 mb-6">施設詳細ページから簡単にWeb申込・問い合わせができます。</p>
                    <Link
                      href="/"
                      className="inline-block bg-gradient-to-r from-[#E88CA2] to-[#D96B85] hover:from-[#D96B85] hover:to-[#C4526D] text-white font-bold text-xs px-6 py-3 rounded-xl transition shadow-md"
                    >
                      施設を探す
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {inquiries.map((inq) => (
                      <div
                        key={inq.id}
                        className="bg-white rounded-3xl p-5 border border-rose-100/80 shadow-sm relative"
                      >
                        <div className="flex items-center justify-between mb-3 border-b border-rose-50 pb-2">
                          <div className="flex items-center gap-2">
                            <span className="bg-[#F0F9F8] text-[#2C9381] border border-[#BCE3DD] text-xs font-bold px-2.5 py-0.5 rounded-lg flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              送信完了
                            </span>
                            <span className="text-xs text-gray-400">
                              {new Date(inq.created_at).toLocaleDateString('ja-JP')}
                            </span>
                          </div>
                          <Link
                            href={`/facility/${inq.facility_id}`}
                            className="text-xs text-[#D96B85] hover:underline font-bold"
                          >
                            施設ページへ ↗
                          </Link>
                        </div>

                        <h3 className="font-bold text-gray-800 text-base mb-2 flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-[#2C9381]" />
                          {inq.facility_name}
                        </h3>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-[#FFF5F7]/50 p-3 rounded-2xl text-xs text-gray-600 mb-3 border border-rose-100/50">
                          <div>
                            <span className="text-gray-400">保護者氏名:</span> {inq.applicant_name} 様
                          </div>
                          <div>
                            <span className="text-gray-400">お子様の学年:</span> {inq.child_age || '未回答'}
                          </div>
                          <div>
                            <span className="text-gray-400">連絡先電話:</span> {inq.phone_number}
                          </div>
                          <div>
                            <span className="text-gray-400">第一希望日時:</span> {inq.preferred_date || '希望なし'}
                          </div>
                        </div>

                        {inq.message && (
                          <div className="text-xs text-gray-600 bg-gray-50 p-3 rounded-xl border border-gray-100">
                            <span className="font-bold text-gray-500 block mb-1">ご相談・メモ:</span>
                            <p className="whitespace-pre-wrap">{inq.message}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
