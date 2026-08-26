'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Heart, Calendar, MapPin, Trash2, ArrowLeft, Building2, 
  CheckCircle2, LogOut, User, Edit2, Save, X, Plus, CheckSquare, Square, Baby, Paperclip,
  FileCheck, AlertCircle, Clock
} from 'lucide-react';
import { getLocalBookmarks, toggleLocalBookmark, getLocalInquiries } from '@/lib/storage';
import { recordConsent } from '@/lib/consent';
import SensitiveInfoConsent from '@/components/SensitiveInfoConsent';
import { Facility, InquiryHistory } from '@/types';
import { createClient } from '@/utils/supabase/client';
import { User as SupabaseUser } from '@supabase/supabase-js';

// お子様ごとの情報（生年月日・自動計算学年・更新年月）
interface ChildInfo {
  name: string;
  birthday: string; // YYYY-MM-DD
  age: string;      // 自動算出 (例: "7歳")
  grade: string;    // 自動算出 (例: "小学2年生")
  beneficiary_number: string;
  renewal_year_month: string; // 受給者証更新年月 (例: "2027-08")
  available_services: string[];
}

// プロフィール情報全体の型定義
interface Profile {
  parent_name: string;
  phone_number: string;
  address: string;
  children: ChildInfo[];
}

// 契約・利用中施設の情報
interface ContractFacility {
  id: string;
  child_name: string;
  facility_name: string;
  service_type: string;
  days_of_week: string[];
  granted_days: number;
  memo: string;
}

// 選択可能な受給者証サービス一覧
const SERVICE_OPTIONS = [
  '児童発達支援',
  '放課後等デイサービス',
  '障害児相談支援',
  '居宅訪問型児童発達支援',
  '保育所等訪問支援'
];

const WEEKDAYS = ['月', '火', '水', '木', '金', '土', '日'];

// 生年月日から満年齢と学年（4/1区切り・早生まれ対応）を自動計算する関数
function calculateAgeAndGrade(birthdayStr: string): { age: string; grade: string } {
  if (!birthdayStr) return { age: '', grade: '' };

  const birthDate = new Date(birthdayStr);
  const today = new Date();

  if (isNaN(birthDate.getTime())) return { age: '', grade: '' };

  // 1. 満年齢の計算
  let ageNum = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    ageNum--;
  }

  // 2. 学年の計算（日本の4月1日〜翌4月2日区切り）
  const currentFiscalYear = today.getMonth() >= 3 ? today.getFullYear() : today.getFullYear() - 1;

  const birthMonth = birthDate.getMonth() + 1;
  const birthDay = birthDate.getDate();
  const isEarlyBorn = (birthMonth < 4) || (birthMonth === 4 && birthDay === 1);
  const birthFiscalYear = isEarlyBorn ? birthDate.getFullYear() - 1 : birthDate.getFullYear();

  const schoolAge = currentFiscalYear - birthFiscalYear;

  let gradeStr = '';
  if (schoolAge < 0) {
    gradeStr = '未誕生';
  } else if (schoolAge === 0) {
    gradeStr = '未就学（0歳児）';
  } else if (schoolAge === 1) {
    gradeStr = '未就学（1歳児）';
  } else if (schoolAge === 2) {
    gradeStr = '未就学（2歳児）';
  } else if (schoolAge === 3) {
    gradeStr = '年少（3歳児）';
  } else if (schoolAge === 4) {
    gradeStr = '年中';
  } else if (schoolAge === 5) {
    gradeStr = '年長';
  } else if (schoolAge === 6) {
    gradeStr = '小学1年生';
  } else if (schoolAge === 7) {
    gradeStr = '小学2年生';
  } else if (schoolAge === 8) {
    gradeStr = '小学3年生';
  } else if (schoolAge === 9) {
    gradeStr = '小学4年生';
  } else if (schoolAge === 10) {
    gradeStr = '小学5年生';
  } else if (schoolAge === 11) {
    gradeStr = '小学6年生';
  } else if (schoolAge === 12) {
    gradeStr = '中学1年生';
  } else if (schoolAge === 13) {
    gradeStr = '中学2年生';
  } else if (schoolAge === 14) {
    gradeStr = '中学3年生';
  } else if (schoolAge === 15) {
    gradeStr = '高校1年生';
  } else if (schoolAge === 16) {
    gradeStr = '高校2年生';
  } else if (schoolAge === 17) {
    gradeStr = '高校3年生';
  } else {
    gradeStr = '高校卒業以上';
  }

  return {
    age: `${ageNum}歳`,
    grade: gradeStr
  };
}

export default function MyPage() {
  const router = useRouter();
  const supabase = createClient();

  const [activeTab, setActiveTab] = useState<'contracts' | 'bookmarks' | 'inquiries'>('contracts');
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
      { name: '', birthday: '', age: '', grade: '', beneficiary_number: '', renewal_year_month: '', available_services: [] }
    ],
  });
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState('');
  const [sensitiveConsent, setSensitiveConsent] = useState(false); // 受給者証番号・サービス種別の要配慮情報同意

  // 契約中施設リストのステート
  const [contracts, setContracts] = useState<ContractFacility[]>([]);
  const [isEditingContracts, setIsEditingContracts] = useState(false);

  useEffect(() => {
    checkUserAndLoadData();
  }, []);

  const checkUserAndLoadData = async () => {
    setLoading(true);

    // 1. Current User
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUser(user);

    // 2. Fetch Profile & Contracts
    if (user) {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      const fallbackName = user.user_metadata?.parent_name || '';

      if (profileData) {
        let childrenData: ChildInfo[] = profileData.children || [];
        
        if (childrenData.length === 0) {
          childrenData = [{
            name: '',
            birthday: '',
            age: '',
            grade: '',
            beneficiary_number: profileData.beneficiary_number || '',
            renewal_year_month: '',
            available_services: profileData.available_services || []
          }];
        } else {
          childrenData = childrenData.map((child: any) => {
            const bday = child.birthday || '';
            const computed = calculateAgeAndGrade(bday);
            return {
              name: child.name || '',
              birthday: bday,
              age: child.age || computed.age,
              grade: child.grade || computed.grade,
              beneficiary_number: child.beneficiary_number || '',
              renewal_year_month: child.renewal_year_month || child.renewal_month || '',
              available_services: child.available_services || []
            };
          });
        }

        setProfile({
          parent_name: profileData.parent_name || fallbackName,
          phone_number: profileData.phone_number || '',
          address: profileData.address || '',
          children: childrenData,
        });

        if (profileData.contracts) {
          setContracts(profileData.contracts);
        }
      } else {
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

  // お子様のフォーム操作
  const handleAddChild = () => {
    setProfile(prev => ({
      ...prev,
      children: [
        ...prev.children, 
        { name: '', birthday: '', age: '', grade: '', beneficiary_number: '', renewal_year_month: '', available_services: [] }
      ]
    }));
  };

  const handleRemoveChild = (index: number) => {
    if (profile.children.length <= 1) return;
    setProfile(prev => ({
      ...prev,
      children: prev.children.filter((_, i) => i !== index)
    }));
  };

  const handleChildChange = (index: number, field: keyof ChildInfo, value: any) => {
    const updatedChildren = [...profile.children];
    (updatedChildren[index] as any)[field] = value;

    // 生年月日が変更されたら、年齢と学年を自動で更新計算
    if (field === 'birthday') {
      const computed = calculateAgeAndGrade(value);
      updatedChildren[index].age = computed.age;
      updatedChildren[index].grade = computed.grade;
    }

    setProfile(prev => ({ ...prev, children: updatedChildren }));
  };

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

  // 契約施設の操作
  const handleAddContract = () => {
    const defaultChild = profile.children[0]?.name || 'お子様';
    const newContract: ContractFacility = {
      id: Date.now().toString(),
      child_name: defaultChild,
      facility_name: '',
      service_type: '放課後等デイサービス',
      days_of_week: [],
      granted_days: 10,
      memo: '',
    };
    setContracts(prev => [...prev, newContract]);
  };

  const handleRemoveContract = (id: string) => {
    setContracts(prev => prev.filter(c => c.id !== id));
  };

  const handleContractChange = (id: string, field: keyof ContractFacility, value: any) => {
    setContracts(prev => prev.map(c => c.id === id ? { ...c, [field]: value } : c));
  };

  const handleDayToggle = (id: string, day: string) => {
    setContracts(prev => prev.map(c => {
      if (c.id === id) {
        const exists = c.days_of_week.includes(day);
        const newDays = exists 
          ? c.days_of_week.filter(d => d !== day)
          : [...c.days_of_week, day];
        return { ...c, days_of_week: newDays };
      }
      return c;
    }));
  };

  // プロフィール＆契約情報の保存
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
      contracts: contracts,
      updated_at: new Date().toISOString(),
    });

    // handleSaveProfileは契約情報編集フォーム(isEditingContracts)とも共用のため、
    // プロフィール編集フォーム経由の保存時のみ同意記録の対象とする。
    if (!error && sensitiveConsent && isEditingProfile) {
      // 受給者証番号・サービス種別の要配慮情報同意を記録する。
      // consentsテーブル未作成時は失敗しうるが、プロフィール保存自体はブロックしない。
      await recordConsent(supabase, currentUser.id, 'sensitive_info');
    }

    setSavingProfile(false);

    if (error) {
      console.error('Profile Save Error:', error);
      setProfileMessage('保存に失敗しました。DBのテーブル構成を確認してください。');
    } else {
      setProfileMessage('情報を更新しました！');
      setIsEditingProfile(false);
      setIsEditingContracts(false);
      setTimeout(() => setProfileMessage(''), 3000);
    }
  };

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
    <main className="min-h-screen bg-[#F3ECE0] text-gray-800 p-3 sm:p-8 font-sans relative overflow-x-hidden">
      {/* 背景ドット柄 */}
      <div 
        className="absolute inset-0 opacity-15 pointer-events-none z-0" 
        style={{ 
          backgroundImage: 'radial-gradient(#D96B85 0.75px, transparent 0.75px)', 
          backgroundSize: '16px 16px' 
        }} 
      />

      <div className="max-w-4xl mx-auto space-y-6 relative z-10 w-full pb-12">
        {/* ヘッダー */}
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="px-3.5 py-1.5 bg-white hover:bg-[#FFF0F3] text-gray-700 hover:text-[#D96B85] border-2 border-[#D8CEBF] hover:border-[#F8C3CE] rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shadow-xs"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            検索トップへ戻る
          </Link>
          <h1 className="text-sm sm:text-base font-black text-gray-800">保護者マイページ</h1>
        </div>

        {/* ユーザーカード */}
        <div className="bg-[#FAF8F5] rounded-3xl border-2 border-[#D8CEBF] shadow-md p-5 sm:p-6 relative overflow-hidden flex items-center justify-between flex-wrap gap-4">
          <div className="absolute top-2 left-6 text-[#C0546E] filter drop-shadow-[1px_2px_2px_rgba(0,0,0,0.15)] z-20">
            <Paperclip className="w-7 h-7 -rotate-12 transform" />
          </div>

          <div className="flex items-center gap-3.5 pt-2 sm:pt-0">
            <div className="w-14 h-14 rounded-2xl bg-[#FFF0F3] border-2 border-[#F8C3CE] text-[#D96B85] flex items-center justify-center shrink-0 shadow-xs">
              <User className="w-7 h-7" />
            </div>
            <div>
              {currentUser ? (
                <>
                  <div className="flex items-center gap-2">
                    <p className="font-black text-gray-900 text-base">
                      {profile.parent_name ? `${profile.parent_name} 様` : '保護者様'}
                    </p>
                    <span className="bg-[#EAF7F4] text-[#2C9381] border border-[#A8DDD3] text-[10px] font-black px-2 py-0.5 rounded-full">
                      保護者会員
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 font-bold mt-0.5">{currentUser.email}</p>
                </>
              ) : (
                <>
                  <p className="font-black text-gray-900 text-base">ゲスト（お試し）で利用中</p>
                  <p className="text-xs text-gray-500 font-bold">お気に入りや見学申込履歴はこのブラウザに保存されています。</p>
                </>
              )}
            </div>
          </div>

          {currentUser ? (
            <button
              onClick={handleLogout}
              className="px-3.5 py-1.5 bg-white hover:bg-rose-50 text-rose-600 border-2 border-[#D8CEBF] hover:border-rose-200 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shadow-xs cursor-pointer ml-auto"
            >
              <LogOut className="w-3.5 h-3.5" />
              ログアウト
            </button>
          ) : (
            <Link
              href="/login"
              className="px-4 py-2 bg-[#D96B85] hover:bg-[#C0546E] text-white rounded-xl text-xs font-black shadow-xs transition-all ml-auto"
            >
              会員登録・ログイン
            </Link>
          )}
        </div>

        {/* 基本プロフィールカード */}
        {currentUser && (
          <div className="bg-[#FAF8F5] rounded-3xl border-2 border-[#D8CEBF] shadow-md p-5 sm:p-6 relative overflow-hidden">
            <div className="flex items-center justify-between mb-4 border-b-2 border-[#E5DDD0] pb-3">
              <h2 className="font-black text-gray-900 text-sm sm:text-base flex items-center gap-2">
                <User className="w-5 h-5 text-[#D96B85]" />
                ご登録・受給者証基本情報
              </h2>
              {!isEditingProfile && (
                <button
                  onClick={() => setIsEditingProfile(true)}
                  className="text-xs text-[#D96B85] hover:text-[#C0546E] font-black flex items-center gap-1 bg-[#FFF0F3] px-3.5 py-1.5 rounded-xl border border-[#F8C3CE] transition cursor-pointer"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  編集する
                </button>
              )}
            </div>

            {profileMessage && (
              <div className="mb-4 p-3 bg-[#EAF7F4] border border-[#A8DDD3] text-[#2C9381] rounded-xl text-xs font-black">
                {profileMessage}
              </div>
            )}

            {isEditingProfile ? (
              <form onSubmit={handleSaveProfile} className="space-y-6 text-xs">
                {/* 保護者情報 */}
                <div className="space-y-3">
                  <h3 className="font-black text-gray-800 text-xs border-l-4 border-[#D96B85] pl-2">保護者様情報</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-black text-gray-700 mb-1">保護者お名前</label>
                      <input
                        type="text"
                        placeholder="例: 山田 太郎"
                        value={profile.parent_name}
                        onChange={(e) => setProfile({ ...profile, parent_name: e.target.value })}
                        className="w-full p-2.5 bg-white rounded-xl border-2 border-[#E5DDD0] font-bold text-gray-800 focus:outline-none focus:border-[#D96B85]"
                      />
                    </div>
                    <div>
                      <label className="block font-black text-gray-700 mb-1">電話番号</label>
                      <input
                        type="tel"
                        placeholder="例: 090-1234-5678"
                        value={profile.phone_number}
                        onChange={(e) => setProfile({ ...profile, phone_number: e.target.value })}
                        className="w-full p-2.5 bg-white rounded-xl border-2 border-[#E5DDD0] font-bold text-gray-800 focus:outline-none focus:border-[#D96B85]"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block font-black text-gray-700 mb-1">ご住所</label>
                    <input
                      type="text"
                      placeholder="例: 東京都渋谷区神南1-2-3"
                      value={profile.address}
                      onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                      className="w-full p-2.5 bg-white rounded-xl border-2 border-[#E5DDD0] font-bold text-gray-800 focus:outline-none focus:border-[#D96B85]"
                    />
                  </div>
                </div>

                {/* お子様・受給者証情報 */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-black text-gray-800 text-xs border-l-4 border-[#D96B85] pl-2">お子様・受給者証情報</h3>
                    <button
                      type="button"
                      onClick={handleAddChild}
                      className="text-[#D96B85] hover:text-[#C0546E] font-black flex items-center gap-1 bg-[#FFF0F3] px-2.5 py-1 rounded-xl border border-[#F8C3CE] transition text-xs cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      お子様を追加
                    </button>
                  </div>

                  <SensitiveInfoConsent checked={sensitiveConsent} onChange={setSensitiveConsent} />

                  {profile.children.map((child, childIdx) => (
                    <div key={childIdx} className="bg-[#FFFEEF] p-4 rounded-2xl border-2 border-[#E5DDD0] space-y-4">
                      <div className="flex items-center justify-between border-b border-[#E5DDD0] pb-2">
                        <span className="font-black text-gray-800 text-xs flex items-center gap-1.5">
                          <Baby className="w-4 h-4 text-[#D96B85]" />
                          お子様 {childIdx + 1} の情報
                        </span>
                        {profile.children.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveChild(childIdx)}
                            className="text-rose-600 hover:text-rose-800 font-bold transition flex items-center gap-1 text-[11px] cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            削除
                          </button>
                        )}
                      </div>

                      {/* お名前 ＆ 生年月日 */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block font-bold text-gray-700 mb-1">お子様のお名前</label>
                          <input
                            type="text"
                            placeholder="例: 山田 花子"
                            value={child.name}
                            onChange={(e) => handleChildChange(childIdx, 'name', e.target.value)}
                            className="w-full p-2.5 bg-white rounded-xl border-2 border-[#E5DDD0] font-bold text-gray-800 focus:outline-none focus:border-[#D96B85]"
                          />
                        </div>
                        <div>
                          <label className="block font-bold text-gray-700 mb-1">生年月日</label>
                          <input
                            type="date"
                            value={child.birthday}
                            onChange={(e) => handleChildChange(childIdx, 'birthday', e.target.value)}
                            className="w-full p-2.5 bg-white rounded-xl border-2 border-[#E5DDD0] font-bold text-gray-800 focus:outline-none focus:border-[#D96B85]"
                          />
                        </div>
                      </div>

                      {/* 生年月日から自動計算された 年齢 ＆ 学年 */}
                      <div className="grid grid-cols-2 gap-3 bg-[#F4EFE6] p-3 rounded-xl border border-[#E5DDD0]">
                        <div>
                          <label className="block font-bold text-gray-500 text-[11px] mb-0.5">年齢（自動算出）</label>
                          <input
                            type="text"
                            readOnly
                            value={child.age}
                            placeholder="生年月日を選ぶと表示"
                            className="w-full p-1.5 bg-gray-100 rounded-lg border border-[#D8CEBF] font-black text-gray-700 cursor-not-allowed"
                          />
                        </div>
                        <div>
                          <label className="block font-bold text-gray-500 text-[11px] mb-0.5">学年（自動算出）</label>
                          <input
                            type="text"
                            readOnly
                            value={child.grade}
                            placeholder="生年月日を選ぶと表示"
                            className="w-full p-1.5 bg-gray-100 rounded-lg border border-[#D8CEBF] font-black text-gray-700 cursor-not-allowed"
                          />
                        </div>
                      </div>

                      {/* 受給者証番号 ＆ 更新年月（Month Picker） */}
                      <div className="bg-white p-3.5 rounded-xl border-2 border-[#E5DDD0] space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block font-black text-gray-700 mb-1">障害児通所受給者証番号</label>
                            <input
                              type="text"
                              placeholder="例: 10桁の受給者証番号"
                              value={child.beneficiary_number}
                              disabled={!sensitiveConsent}
                              onChange={(e) => handleChildChange(childIdx, 'beneficiary_number', e.target.value)}
                              className={`w-full p-2 bg-white rounded-lg border border-[#E5DDD0] font-bold text-gray-800 focus:outline-none focus:border-[#D96B85] text-xs ${
                                !sensitiveConsent ? 'opacity-40 cursor-not-allowed bg-gray-100' : ''
                              }`}
                            />
                          </div>
                          <div>
                            <label className="block font-black text-gray-700 mb-1 flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5 text-amber-600" />
                              受給者証 更新年月（カレンダー選択）
                            </label>
                            <input
                              type="month"
                              value={child.renewal_year_month}
                              onChange={(e) => handleChildChange(childIdx, 'renewal_year_month', e.target.value)}
                              className="w-full p-2 bg-white rounded-lg border border-[#E5DDD0] font-bold text-gray-800 focus:outline-none focus:border-[#D96B85] text-xs"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block font-black text-gray-700 mb-1.5">支給決定されているサービス</label>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {SERVICE_OPTIONS.map((service) => {
                              const checked = child.available_services.includes(service);
                              return (
                                <button
                                  type="button"
                                  key={service}
                                  disabled={!sensitiveConsent}
                                  onClick={() => handleChildServiceToggle(childIdx, service)}
                                  className={`p-2 rounded-xl border-2 text-left transition flex items-center gap-2 text-xs cursor-pointer ${
                                    checked
                                      ? 'border-[#D96B85] bg-[#FFF0F3] text-[#D96B85] font-black'
                                      : 'border-[#E5DDD0] bg-white text-gray-600 hover:bg-gray-50'
                                  } ${!sensitiveConsent ? 'opacity-40 cursor-not-allowed' : ''}`}
                                >
                                  {checked ? <CheckSquare className="w-4 h-4 text-[#D96B85] shrink-0" /> : <Square className="w-4 h-4 text-gray-300 shrink-0" />}
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

                <div className="flex justify-end gap-2 pt-4 border-t-2 border-[#E5DDD0]">
                  <button
                    type="button"
                    onClick={() => setIsEditingProfile(false)}
                    className="px-4 py-2 bg-white hover:bg-gray-100 text-gray-600 border-2 border-[#D8CEBF] rounded-xl font-black transition flex items-center gap-1 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                    キャンセル
                  </button>
                  <button
                    type="submit"
                    disabled={savingProfile}
                    className="px-5 py-2 bg-[#D96B85] hover:bg-[#C0546E] text-white rounded-xl font-black shadow-xs transition flex items-center gap-1 disabled:opacity-50 cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5" />
                    {savingProfile ? '保存中...' : '保存する'}
                  </button>
                </div>
              </form>
            ) : (
              /* 通常表示時 */
              <div className="space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-white p-3.5 rounded-2xl border-2 border-[#E5DDD0]">
                  <div>
                    <span className="text-gray-400 font-bold block mb-0.5">保護者氏名</span>
                    <span className="font-black text-gray-800">{profile.parent_name || '未設定'}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 font-bold block mb-0.5">電話番号</span>
                    <span className="font-black text-gray-800">{profile.phone_number || '未設定'}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 font-bold block mb-0.5">住所</span>
                    <span className="font-black text-gray-800 truncate block">{profile.address || '未設定'}</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <span className="text-gray-600 font-black block">お子様・受給者証情報</span>
                  <div className="grid grid-cols-1 gap-3">
                    {profile.children.map((child, idx) => (
                      <div key={idx} className="bg-[#FFFEEF] p-4 rounded-2xl border-2 border-[#E5DDD0] space-y-3">
                        <div className="flex items-center justify-between border-b border-[#E5DDD0] pb-2">
                          <span className="font-black text-gray-900 text-sm flex items-center gap-1.5">
                            <Baby className="w-4 h-4 text-[#2C9381]" />
                            {child.name || `お子様 ${idx + 1}`}
                          </span>
                          <div className="flex items-center gap-2 flex-wrap">
                            {child.age && (
                              <span className="text-xs bg-white px-2.5 py-0.5 rounded-lg border border-[#D8CEBF] text-gray-700 font-bold">
                                {child.age}
                              </span>
                            )}
                            {child.grade && (
                              <span className="text-xs bg-emerald-50 text-emerald-800 border border-emerald-300 px-2.5 py-0.5 rounded-lg font-bold">
                                {child.grade}
                              </span>
                            )}
                            {child.renewal_year_month && (
                              <span className="text-xs font-bold text-amber-800 bg-amber-100 border border-amber-300 px-2.5 py-0.5 rounded-lg flex items-center gap-1">
                                <Clock className="w-3 h-3 text-amber-600" />
                                更新年月: {child.renewal_year_month}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                          <div>
                            <span className="text-gray-400 font-bold block mb-0.5">生年月日:</span>
                            <span className="font-mono font-black text-gray-800">{child.birthday || '未登録'}</span>
                          </div>
                          <div>
                            <span className="text-gray-400 font-bold block mb-0.5">受給者証番号:</span>
                            <span className="font-mono font-black text-gray-800">{child.beneficiary_number || '未登録'}</span>
                          </div>
                          <div className="sm:col-span-2">
                            <span className="text-gray-400 font-bold block mb-1">利用可能サービス:</span>
                            {child.available_services && child.available_services.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {child.available_services.map((s) => (
                                  <span key={s} className="bg-[#FFF0F3] text-[#D96B85] text-[10px] font-black px-2 py-0.5 rounded-md border border-[#F8C3CE]">
                                    {s}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-gray-400 font-bold">未選択</span>
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

        {/* タブ切り替えバー */}
        <div className="flex items-center gap-2 border-b-2 border-[#D8CEBF] pb-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab('contracts')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
              activeTab === 'contracts'
                ? 'bg-[#2C9381] text-white shadow-xs'
                : 'bg-white text-gray-600 hover:bg-[#EAF7F4] border-2 border-[#D8CEBF]'
            }`}
          >
            <FileCheck className="w-3.5 h-3.5" />
            契約中施設・スケジュール ({contracts.length})
          </button>
          <button
            onClick={() => setActiveTab('bookmarks')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
              activeTab === 'bookmarks'
                ? 'bg-[#D96B85] text-white shadow-xs'
                : 'bg-white text-gray-600 hover:bg-[#FFF0F3] border-2 border-[#D8CEBF]'
            }`}
          >
            <Heart className={`w-3.5 h-3.5 ${activeTab === 'bookmarks' ? 'fill-current' : ''}`} />
            お気に入り ({bookmarkedFacilities.length})
          </button>
          <button
            onClick={() => setActiveTab('inquiries')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
              activeTab === 'inquiries'
                ? 'bg-[#D96B85] text-white shadow-xs'
                : 'bg-white text-gray-600 hover:bg-[#FFF0F3] border-2 border-[#D8CEBF]'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            見学・問合せ履歴 ({inquiries.length})
          </button>
        </div>

        {/* メインコンテンツ */}
        {loading ? (
          <div className="text-center py-12 text-gray-500 font-bold text-xs">バインダーを開いています...</div>
        ) : (
          <>
            {/* === 契約中施設・スケジュール === */}
            {activeTab === 'contracts' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-black text-gray-600">
                    現在通所・契約している施設の一覧と週間スケジュールです。
                  </p>
                  {currentUser && !isEditingContracts && (
                    <button
                      onClick={() => setIsEditingContracts(true)}
                      className="text-xs text-[#2C9381] hover:text-[#1E685B] font-black flex items-center gap-1 bg-[#EAF7F4] px-3 py-1.5 rounded-xl border border-[#A8DDD3] transition cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      契約情報を編集
                    </button>
                  )}
                </div>

                {!currentUser && (
                  <div className="bg-[#FFFEEF] border-2 border-[#E5DDD0] p-4 rounded-2xl text-xs text-gray-600 font-bold flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-[#D96B85] shrink-0" />
                    <span>ログインすると、契約施設や通所スケジュールの登録・管理ができるようになります。</span>
                  </div>
                )}

                {isEditingContracts ? (
                  /* 契約情報の編集フォーム */
                  <form onSubmit={handleSaveProfile} className="bg-[#FAF8F5] p-5 rounded-3xl border-2 border-[#D8CEBF] space-y-5 text-xs">
                    <div className="flex items-center justify-between border-b-2 border-[#E5DDD0] pb-2">
                      <h3 className="font-black text-gray-900 text-sm flex items-center gap-2">
                        <FileCheck className="w-4 h-4 text-[#2C9381]" />
                        契約中施設の編集
                      </h3>
                      <button
                        type="button"
                        onClick={handleAddContract}
                        className="bg-[#EAF7F4] text-[#2C9381] border border-[#A8DDD3] px-3 py-1 rounded-xl font-black text-xs flex items-center gap-1 hover:bg-[#D4F0EA] transition cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        施設を追加
                      </button>
                    </div>

                    {contracts.length === 0 ? (
                      <p className="text-center py-6 text-gray-400 font-bold">上のボタンから契約施設を追加してください。</p>
                    ) : (
                      contracts.map((contract, cIdx) => (
                        <div key={contract.id} className="bg-white p-4 rounded-2xl border-2 border-[#E5DDD0] space-y-3 relative">
                          <div className="flex items-center justify-between border-b border-[#E5DDD0] pb-2">
                            <span className="font-black text-gray-800">契約施設 {cIdx + 1}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveContract(contract.id)}
                              className="text-rose-600 hover:text-rose-800 font-bold flex items-center gap-1 text-[11px] cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              削除
                            </button>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label className="block font-bold text-gray-700 mb-1">対象のお子様</label>
                              <select
                                value={contract.child_name}
                                onChange={(e) => handleContractChange(contract.id, 'child_name', e.target.value)}
                                className="w-full p-2 bg-white rounded-xl border-2 border-[#E5DDD0] font-bold text-gray-800 focus:outline-none focus:border-[#2C9381]"
                              >
                                {profile.children.map((c, i) => (
                                  <option key={i} value={c.name || `お子様 ${i+1}`}>
                                    {c.name || `お子様 ${i+1}`}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div>
                              <label className="block font-bold text-gray-700 mb-1">施設名</label>
                              <input
                                type="text"
                                placeholder="例: ハッピーキッズ放デイ"
                                value={contract.facility_name}
                                onChange={(e) => handleContractChange(contract.id, 'facility_name', e.target.value)}
                                className="w-full p-2 bg-white rounded-xl border-2 border-[#E5DDD0] font-bold text-gray-800 focus:outline-none focus:border-[#2C9381]"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label className="block font-bold text-gray-700 mb-1">サービス種別</label>
                              <select
                                value={contract.service_type}
                                onChange={(e) => handleContractChange(contract.id, 'service_type', e.target.value)}
                                className="w-full p-2 bg-white rounded-xl border-2 border-[#E5DDD0] font-bold text-gray-800 focus:outline-none focus:border-[#2C9381]"
                              >
                                {SERVICE_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                              </select>
                            </div>

                            <div>
                              <label className="block font-bold text-gray-700 mb-1">月あたりの契約日数 (日)</label>
                              <input
                                type="number"
                                value={contract.granted_days}
                                onChange={(e) => handleContractChange(contract.id, 'granted_days', Number(e.target.value))}
                                className="w-full p-2 bg-white rounded-xl border-2 border-[#E5DDD0] font-bold text-gray-800 focus:outline-none focus:border-[#2C9381]"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block font-bold text-gray-700 mb-1">通所曜日</label>
                            <div className="flex flex-wrap gap-1.5">
                              {WEEKDAYS.map(day => {
                                const checked = contract.days_of_week.includes(day);
                                return (
                                  <button
                                    type="button"
                                    key={day}
                                    onClick={() => handleDayToggle(contract.id, day)}
                                    className={`w-9 h-9 rounded-xl font-black text-xs transition cursor-pointer flex items-center justify-center ${
                                      checked
                                        ? 'bg-[#2C9381] text-white shadow-xs'
                                        : 'bg-gray-100 text-gray-400 border border-[#E5DDD0]'
                                    }`}
                                  >
                                    {day}
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          <div>
                            <label className="block font-bold text-gray-700 mb-1">メモ・連絡事項</label>
                            <input
                              type="text"
                              placeholder="例: 月曜は送迎あり、水曜は自主送迎"
                              value={contract.memo}
                              onChange={(e) => handleContractChange(contract.id, 'memo', e.target.value)}
                              className="w-full p-2 bg-white rounded-xl border-2 border-[#E5DDD0] font-bold text-gray-800 focus:outline-none focus:border-[#2C9381]"
                            />
                          </div>
                        </div>
                      ))
                    )}

                    <div className="flex justify-end gap-2 pt-2 border-t-2 border-[#E5DDD0]">
                      <button
                        type="button"
                        onClick={() => setIsEditingContracts(false)}
                        className="px-4 py-2 bg-white hover:bg-gray-100 text-gray-600 border-2 border-[#D8CEBF] rounded-xl font-black transition flex items-center gap-1 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                        キャンセル
                      </button>
                      <button
                        type="submit"
                        disabled={savingProfile}
                        className="px-5 py-2 bg-[#2C9381] hover:bg-[#1E685B] text-white rounded-xl font-black shadow-xs transition flex items-center gap-1 disabled:opacity-50 cursor-pointer"
                      >
                        <Save className="w-3.5 h-3.5" />
                        {savingProfile ? '保存中...' : '契約情報を保存'}
                      </button>
                    </div>
                  </form>
                ) : (
                  /* 契約情報の通常表示 */
                  <div className="space-y-4">
                    {contracts.length === 0 ? (
                      <div className="bg-[#FAF8F5] rounded-3xl border-2 border-[#D8CEBF] p-10 text-center space-y-2">
                        <FileCheck className="w-10 h-10 text-gray-300 mx-auto" />
                        <p className="font-black text-gray-700">契約中の施設情報は未登録です</p>
                        <p className="text-xs text-gray-500 font-bold mb-4">通っている施設や契約日数を登録しておくと、週間スケジュールの管理に便利です。</p>
                        {currentUser && (
                          <button
                            onClick={() => setIsEditingContracts(true)}
                            className="bg-[#2C9381] hover:bg-[#1E685B] text-white font-black text-xs px-5 py-2.5 rounded-xl shadow-xs transition-all cursor-pointer"
                          >
                            ＋ 契約施設を登録する
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-4">
                        {contracts.map((contract) => (
                          <div
                            key={contract.id}
                            className="bg-white rounded-3xl border-2 border-[#D8CEBF] p-5 shadow-xs relative overflow-hidden"
                          >
                            <div className="flex items-center justify-between border-b border-[#E5DDD0] pb-3 mb-3">
                              <div className="flex items-center gap-2">
                                <span className="bg-[#EAF7F4] text-[#2C9381] border border-[#A8DDD3] text-xs font-black px-2.5 py-0.5 rounded-lg flex items-center gap-1">
                                  <Baby className="w-3.5 h-3.5" />
                                  {contract.child_name}
                                </span>
                                <span className="bg-[#FFF0F3] text-[#D96B85] border border-[#F8C3CE] text-xs font-black px-2.5 py-0.5 rounded-lg">
                                  {contract.service_type}
                                </span>
                              </div>
                              <span className="text-xs font-black text-gray-600 bg-gray-100 border border-[#E5DDD0] px-2.5 py-0.5 rounded-lg">
                                月契約: {contract.granted_days} 日
                              </span>
                            </div>

                            <h3 className="font-black text-gray-900 text-base mb-3 flex items-center gap-2">
                              <Building2 className="w-5 h-5 text-[#2C9381]" />
                              {contract.facility_name || '施設名未設定'}
                            </h3>

                            {/* 週間利用曜日バッジ */}
                            <div className="bg-[#FAF8F5] p-3 rounded-2xl border border-[#E5DDD0] mb-3 flex items-center justify-between flex-wrap gap-2">
                              <span className="text-xs font-black text-gray-600">利用曜日:</span>
                              <div className="flex gap-1">
                                {WEEKDAYS.map(day => {
                                  const isUsed = contract.days_of_week.includes(day);
                                  return (
                                    <span
                                      key={day}
                                      className={`w-7 h-7 rounded-lg text-xs font-black flex items-center justify-center ${
                                        isUsed 
                                          ? 'bg-[#2C9381] text-white shadow-xs' 
                                          : 'bg-gray-100 text-gray-300'
                                      }`}
                                    >
                                      {day}
                                    </span>
                                  );
                                })}
                              </div>
                            </div>

                            {contract.memo && (
                              <div className="bg-[#FFFEEF] p-2.5 rounded-xl border border-[#E5DDD0] text-xs font-bold text-gray-600">
                                <span className="text-gray-400 block mb-0.5">メモ:</span>
                                <span className="text-gray-800">{contract.memo}</span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* === お気に入り一覧 === */}
            {activeTab === 'bookmarks' && (
              <div>
                {bookmarkedFacilities.length === 0 ? (
                  <div className="bg-[#FAF8F5] rounded-3xl border-2 border-[#D8CEBF] p-10 text-center space-y-2">
                    <Heart className="w-10 h-10 text-gray-300 mx-auto" />
                    <p className="font-black text-gray-700">お気に入りの施設はまだありません</p>
                    <p className="text-xs text-gray-500 font-bold mb-4">気になる施設を「お気に入り」に登録すると一覧で比較できます。</p>
                    <Link
                      href="/"
                      className="inline-block bg-[#D96B85] hover:bg-[#C0546E] text-white font-black text-xs px-5 py-2.5 rounded-xl shadow-xs transition-all"
                    >
                      施設を探しに行く ➔
                    </Link>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {bookmarkedFacilities.map((facility) => (
                      <div
                        key={facility.id}
                        className="bg-white rounded-2xl border-2 border-[#D8CEBF] p-4 shadow-xs hover:shadow-md transition-all relative flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex gap-3 mb-3">
                            <img
                              src={facility.image_url || '/placeholder.png'}
                              alt={facility.name}
                              className="w-20 h-20 rounded-xl object-cover border border-[#E5DDD0] shrink-0"
                            />
                            <div className="flex-1 min-w-0">
                              <h3 className="font-black text-gray-900 truncate mb-1">{facility.name}</h3>
                              <p className="text-xs text-gray-500 font-bold flex items-center gap-1 truncate mb-1.5">
                                <MapPin className="w-3 h-3 text-[#D96B85] shrink-0" />
                                {facility.address}
                              </p>
                              {facility.has_pickup && (
                                <span className="inline-block bg-[#EAF7F4] text-[#2C9381] border border-[#A8DDD3] text-[10px] font-black px-2 py-0.5 rounded-full">
                                  送迎あり
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="pt-3 border-t border-[#E5DDD0] flex items-center justify-between gap-2">
                          <button
                            onClick={() => handleRemoveBookmark(facility.id)}
                            className="text-xs font-bold text-gray-400 hover:text-rose-600 flex items-center gap-1 py-1 px-2 rounded-lg hover:bg-rose-50 transition cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            削除
                          </button>
                          <Link
                            href={`/facility/${facility.id}`}
                            className="bg-[#D96B85] hover:bg-[#C0546E] text-white text-xs font-black px-4 py-2 rounded-xl transition shadow-xs"
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

            {/* === 問合せ履歴 === */}
            {activeTab === 'inquiries' && (
              <div>
                {inquiries.length === 0 ? (
                  <div className="bg-[#FAF8F5] rounded-3xl border-2 border-[#D8CEBF] p-10 text-center space-y-2">
                    <Calendar className="w-10 h-10 text-gray-300 mx-auto" />
                    <p className="font-black text-gray-700">見学申し込みの履歴はありません</p>
                    <p className="text-xs text-gray-500 font-bold mb-4">施設詳細ページから簡単にWeb申込・問い合わせができます。</p>
                    <Link
                      href="/"
                      className="inline-block bg-[#D96B85] hover:bg-[#C0546E] text-white font-black text-xs px-5 py-2.5 rounded-xl shadow-xs transition-all"
                    >
                      施設を探しに行く ➔
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {inquiries.map((inq) => (
                      <div
                        key={inq.id}
                        className="bg-white rounded-2xl border-2 border-[#D8CEBF] p-5 shadow-xs relative"
                      >
                        <div className="flex items-center justify-between mb-3 border-b border-[#E5DDD0] pb-2">
                          <div className="flex items-center gap-2">
                            <span className="bg-[#EAF7F4] text-[#2C9381] border border-[#A8DDD3] text-xs font-black px-2.5 py-0.5 rounded-lg flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              送信完了
                            </span>
                            <span className="text-xs font-bold text-gray-400">
                              {new Date(inq.created_at).toLocaleDateString('ja-JP')}
                            </span>
                          </div>
                          <Link
                            href={`/facility/${inq.facility_id}`}
                            className="text-xs text-[#D96B85] hover:underline font-black"
                          >
                            施設ページへ ↗
                          </Link>
                        </div>

                        <h3 className="font-black text-gray-900 text-base mb-2 flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-[#2C9381]" />
                          {inq.facility_name}
                        </h3>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-[#FFFEEF] p-3 rounded-xl text-xs font-bold text-gray-700 mb-3 border border-[#E5DDD0]">
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
                          <div className="text-xs font-bold text-gray-600 bg-gray-50 p-3 rounded-xl border border-[#E5DDD0]">
                            <span className="font-black text-gray-500 block mb-1">ご相談・メモ:</span>
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
      </div>
    </main>
  );
}