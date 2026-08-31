'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { recordConsent } from '@/lib/consent';
import SensitiveInfoConsent from '@/components/SensitiveInfoConsent';
import { User, Phone, MapPin, Baby, Plus, Trash2, CheckSquare, Square, ArrowRight, Loader2 } from 'lucide-react';

interface ChildInfo {
  name: string;
  age_grade: string;
  beneficiary_number: string;
  available_services: string[];
}

const SERVICE_OPTIONS = [
  '児童発達支援',
  '放課後等デイサービス',
  '障害児相談支援',
  '保育所等訪問支援'
];

export default function ProfileSetupPage() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const [parentName, setParentName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [address, setAddress] = useState('');
  const [children, setChildren] = useState<ChildInfo[]>([
    { name: '', age_grade: '', beneficiary_number: '', available_services: [] }
  ]);
  const [sensitiveConsent, setSensitiveConsent] = useState(false); // 受給者証番号・サービス種別の要配慮情報同意

  const handleAddChild = () => {
    setChildren([
      ...children,
      { name: '', age_grade: '', beneficiary_number: '', available_services: [] }
    ]);
  };

  const handleRemoveChild = (index: number) => {
    if (children.length <= 1) return;
    setChildren(children.filter((_, i) => i !== index));
  };

  const handleChildChange = (index: number, field: keyof ChildInfo, value: any) => {
    const updated = [...children];
    updated[index][field] = value;
    setChildren(updated);
  };

  const handleServiceToggle = (childIndex: number, service: string) => {
    const updated = [...children];
    const target = updated[childIndex];
    const exists = target.available_services.includes(service);
    if (exists) {
      target.available_services = target.available_services.filter(s => s !== service);
    } else {
      target.available_services = [...target.available_services, service];
    }
    setChildren(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        throw new Error('ユーザーセッションが見つかりません。再度ログインしてください。');
      }

      const { error } = await supabase.from('profiles').upsert({
        id: user.id,
        parent_name: parentName,
        phone_number: phoneNumber,
        address: address,
        children: children,
        updated_at: new Date().toISOString(),
      });

      if (error) throw error;

      if (sensitiveConsent) {
        // 受給者証番号・サービス種別の要配慮情報同意を記録する。
        // consentsテーブル未作成時は失敗しうるが、プロフィール保存自体はブロックしない。
        await recordConsent(supabase, user.id, 'sensitive_info');
      }

      router.push('/mypage');
      router.refresh();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || '保存中にエラーが発生しました。');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto bg-white p-6 sm:p-10 rounded-2xl shadow-sm border border-slate-100">
        <div className="text-center mb-8">
          <span className="bg-teal-100 text-teal-800 text-xs font-bold px-3 py-1 rounded-full">STEP 2 / 2</span>
          <h1 className="text-2xl font-bold text-gray-900 mt-2">会員情報の登録</h1>
          <p className="text-xs text-gray-500 mt-1">マイページや見学予約時に使用する情報を入力してください。</p>
        </div>

        {errorMsg && (
          <div className="mb-6 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6 text-xs">
          {/* 保護者情報 */}
          <div className="space-y-4">
            <h2 className="font-bold text-sm text-gray-800 border-l-4 border-teal-500 pl-2">保護者様情報</h2>
            
            <div>
              <label className="block font-medium text-gray-700 mb-1">保護者お名前 <span className="text-red-500">*</span></label>
              <div className="relative">
                <User className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                <input
                  type="text"
                  required
                  placeholder="例: 山田 太郎"
                  value={parentName}
                  onChange={(e) => setParentName(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-300 focus:outline-none focus:border-teal-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-medium text-gray-700 mb-1">電話番号</label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                  <input
                    type="tel"
                    placeholder="例: 090-1234-5678"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-300 focus:outline-none focus:border-teal-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-gray-700 mb-1">ご住所</label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    placeholder="例: 東京都渋谷区..."
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-300 focus:outline-none focus:border-teal-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* お子様情報 */}
          <div className="space-y-4 pt-4 border-t border-gray-100">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-sm text-gray-800 border-l-4 border-teal-500 pl-2">お子様・受給者証情報</h2>
              <button
                type="button"
                onClick={handleAddChild}
                className="text-teal-600 font-bold flex items-center gap-1 bg-teal-50 px-2.5 py-1 rounded-lg border border-teal-200"
              >
                <Plus className="w-3.5 h-3.5" /> お子様を追加
              </button>
            </div>

            <SensitiveInfoConsent checked={sensitiveConsent} onChange={setSensitiveConsent} />

            {children.map((child, idx) => (
              <div key={idx} className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                  <span className="font-bold text-gray-700 flex items-center gap-1">
                    <Baby className="w-4 h-4 text-teal-600" /> お子様 {idx + 1}
                  </span>
                  {children.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveChild(idx)}
                      className="text-red-500 hover:underline flex items-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> 削除
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
                      onChange={(e) => handleChildChange(idx, 'name', e.target.value)}
                      className="w-full p-2.5 rounded-lg border border-gray-300 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-gray-600 mb-1">学年 / 年齢</label>
                    <input
                      type="text"
                      placeholder="例: 小学2年生 / 7歳"
                      value={child.age_grade}
                      onChange={(e) => handleChildChange(idx, 'age_grade', e.target.value)}
                      className="w-full p-2.5 rounded-lg border border-gray-300 bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-medium text-gray-600 mb-1">受給者証番号（任意）</label>
                  <input
                    type="text"
                    placeholder="例: 1234567890"
                    value={child.beneficiary_number}
                    disabled={!sensitiveConsent}
                    onChange={(e) => handleChildChange(idx, 'beneficiary_number', e.target.value)}
                    className={`w-full p-2 rounded-lg border border-gray-300 bg-white ${
                      !sensitiveConsent ? 'opacity-40 cursor-not-allowed bg-gray-100' : ''
                    }`}
                  />
                </div>

                <div>
                  <label className="block font-medium text-gray-600 mb-1">利用可能サービス</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {SERVICE_OPTIONS.map((service) => {
                      const checked = child.available_services.includes(service);
                      return (
                        <button
                          type="button"
                          key={service}
                          disabled={!sensitiveConsent}
                          onClick={() => handleServiceToggle(idx, service)}
                          className={`p-2 rounded-lg border text-left flex items-center gap-2 ${
                            checked ? 'border-teal-500 bg-teal-50 text-teal-800 font-bold' : 'border-gray-200 bg-white text-gray-600'
                          } ${!sensitiveConsent ? 'opacity-40 cursor-not-allowed' : ''}`}
                        >
                          {checked ? <CheckSquare className="w-4 h-4 text-teal-600" /> : <Square className="w-4 h-4 text-gray-300" />}
                          <span>{service}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl shadow-md transition flex items-center justify-center gap-2 disabled:opacity-50 text-sm mt-6"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>登録を完了してマイページへ <ArrowRight className="w-4 h-4" /></>}
          </button>
        </form>
      </div>
    </div>
  );
}
