'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Mail, Send, Baby, CheckCircle2 } from 'lucide-react';

interface ChildInfo {
  name: string;
  age_grade: string;
  beneficiary_number?: string;
  available_services?: string[];
}

export default function ContactForm({ facilityId }: { facilityId?: string }) {
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [childrenList, setChildrenList] = useState<ChildInfo[]>([]);
  const [selectedChildIndex, setSelectedChildIndex] = useState<number>(0);

  // フォームの入力項目
  const [formData, setFormData] = useState({
    parentName: '',
    email: '',
    phone: '',
    childName: '',
    childAge: '',
    message: '',
  });

  useEffect(() => {
    loadUserProfile();
  }, []);

  // ★ マイページのプロファイル情報から自動ロード
  const loadUserProfile = async () => {
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      // Supabaseの profiles テーブルから情報取得
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      const parentName = profile?.parent_name || user.user_metadata?.parent_name || '';
      const phone = profile?.phone_number || '';
      const email = user.email || '';

      // マイページに登録されているお子様リスト
      const children: ChildInfo[] = profile?.children || [];
      setChildrenList(children);

      const firstChild = children[0] || {};

      setFormData((prev) => ({
        ...prev,
        parentName: parentName,
        email: email,
        phone: phone,
        childName: firstChild.name || '',
        childAge: firstChild.age_grade || '',
      }));
    }

    setLoading(false);
  };

  // お子様が複数人登録されている場合、ボタンで切り替え
  const handleSelectChild = (index: number) => {
    setSelectedChildIndex(index);
    const targetChild = childrenList[index];
    if (targetChild) {
      setFormData((prev) => ({
        ...prev,
        childName: targetChild.name || '',
        childAge: targetChild.age_grade || '',
      }));
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // ここでお問い合わせの送信処理（保存など）を行います
    alert('お問い合わせを送信しました！');
  };

  return (
    <form onSubmit={handleSubmit} className="bg-[#FAF8F5] p-6 rounded-3xl border-2 border-[#D8CEBF] space-y-4 font-sans text-gray-800">
      <h3 className="text-sm font-black text-gray-800 flex items-center gap-1.5 border-b border-[#E5DDD0] pb-3">
        <Mail className="w-4 h-4 text-[#D96B85]" />
        お問い合わせ・見学申し込み
      </h3>

      {/* 保護者のお名前 */}
      <div>
        <label className="block text-xs font-bold text-gray-700 mb-1">
          保護者様お名前 <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          name="parentName"
          value={formData.parentName}
          onChange={handleChange}
          required
          placeholder="例: 山田 太郎"
          className="w-full px-3 py-2 bg-white border-2 border-[#E5DDD0] rounded-xl text-xs font-bold focus:outline-none focus:border-[#D96B85]"
        />
      </div>

      {/* 連絡先情報 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1">
            メールアドレス <span className="text-red-500">*</span>
          </label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 bg-white border-2 border-[#E5DDD0] rounded-xl text-xs font-bold focus:outline-none focus:border-[#D96B85]"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1">
            電話番号 <span className="text-red-500">*</span>
          </label>
          <input
            type="tel"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            required
            placeholder="例: 090-1234-5678"
            className="w-full px-3 py-2 bg-white border-2 border-[#E5DDD0] rounded-xl text-xs font-bold focus:outline-none focus:border-[#D96B85]"
          />
        </div>
      </div>

      {/* ★ 自動入力・切り替えエリア */}
      <div className="bg-[#FFF0F3]/70 p-4 rounded-2xl border border-[#F8C3CE] space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <span className="text-xs font-black text-[#D96B85] flex items-center gap-1.5">
            <Baby className="w-4 h-4" />
            お子様の情報（マイページ連携）
          </span>
          {childrenList.length > 0 && (
            <span className="text-[10px] bg-white text-[#D96B85] font-bold px-2.5 py-0.5 rounded-full border border-[#F8C3CE] flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-[#D96B85]" />
              自動入力適用中
            </span>
          )}
        </div>

        {/* 登録お子様が複数いる場合の切り替えボタン */}
        {childrenList.length > 1 && (
          <div className="flex items-center gap-2 pt-1">
            <span className="text-[11px] font-bold text-gray-600">対象のお子様を選択:</span>
            <div className="flex gap-1.5 overflow-x-auto">
              {childrenList.map((child, idx) => (
                <button
                  type="button"
                  key={idx}
                  onClick={() => handleSelectChild(idx)}
                  className={`text-[11px] px-3 py-1 rounded-lg font-bold transition border ${
                    selectedChildIndex === idx
                      ? 'bg-[#D96B85] text-white border-[#D96B85]'
                      : 'bg-white text-gray-600 border-[#E5DDD0] hover:bg-gray-50'
                  }`}
                >
                  {child.name || `お子様 ${idx + 1}`}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <div>
            <label className="block text-[11px] font-bold text-gray-700 mb-1">お子様のお名前</label>
            <input
              type="text"
              name="childName"
              value={formData.childName}
              onChange={handleChange}
              placeholder="例: 山田 花子"
              className="w-full px-3 py-2 bg-white border-2 border-[#E5DDD0] rounded-xl text-xs font-bold focus:outline-none focus:border-[#D96B85]"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-gray-700 mb-1">学年 / 年齢</label>
            <input
              type="text"
              name="childAge"
              value={formData.childAge}
              onChange={handleChange}
              placeholder="例: 小学2年生 / 7歳"
              className="w-full px-3 py-2 bg-white border-2 border-[#E5DDD0] rounded-xl text-xs font-bold focus:outline-none focus:border-[#D96B85]"
            />
          </div>
        </div>
      </div>

      {/* ご相談・本文 */}
      <div>
        <label className="block text-xs font-bold text-gray-700 mb-1">
          お問い合わせ内容 <span className="text-red-500">*</span>
        </label>
        <textarea
          name="message"
          rows={4}
          value={formData.message}
          onChange={handleChange}
          required
          placeholder="見学のご希望日程やご相談内容をご記入ください。"
          className="w-full px-3 py-2 bg-white border-2 border-[#E5DDD0] rounded-xl text-xs font-bold focus:outline-none focus:border-[#D96B85]"
        />
      </div>

      <button
        type="submit"
        className="w-full py-3 bg-[#D96B85] hover:bg-[#C0546E] text-white rounded-xl text-xs font-black shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer mt-2"
      >
        <Send className="w-4 h-4" />
        お問い合わせを送信する
      </button>
    </form>
  );
}
