'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Building2, Mail, Lock, Phone, User, FileText, MapPin, Building, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function ProviderSignUp() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // フォームステート（法人名・法人番号・住所を追加）
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    facilityName: '',
    companyName: '',    // 法人名
    companyNumber: '',  // 法人番号
    providerNumber: '', // 事業所番号（指定番号）
    contactName: '',    // 担当者名
    phone: '',
    address: '',        // 住所
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage('');

    try {
      // 1. Supabase Auth に事業者アカウントを作成 (role: 'provider' をメタデータに付与)
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            role: 'provider',
            facility_name: formData.facilityName,
            company_name: formData.companyName,
            company_number: formData.companyNumber,
            provider_number: formData.providerNumber,
            contact_name: formData.contactName,
            phone: formData.phone,
            address: formData.address,
          },
        },
      });

      if (authError) throw authError;

      if (authData.user) {
        // 2. facilities テーブルに新規施設レコードを作成
        const { error: facilityError } = await supabase.from('facilities').insert([
          {
            name: formData.facilityName,
            phone_number: formData.phone,
            address: formData.address,
          },
        ]);

        if (facilityError) {
          console.error('施設初期データの作成エラー:', facilityError);
        }

        // 登録完了後、管理者画面へ遷移
        router.push('/admin');
      }
    } catch (error: any) {
      setErrorMessage(error.message || '登録に失敗しました。');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#F3ECE0] text-gray-800 p-4 sm:p-8 flex items-center justify-center font-sans">
      <div className="max-w-md w-full bg-[#FAF8F5] p-6 sm:p-8 rounded-3xl border-2 border-[#D8CEBF] shadow-md space-y-6 my-8">
        
        {/* ヘッダー */}
        <div className="text-center space-y-2">
          <div className="inline-flex p-3 bg-[#EAF7F4] text-[#2C9381] rounded-2xl border border-[#A8DDD3] mb-1">
            <Building2 className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-black text-gray-900">事業者アカウント新規登録</h1>
          <p className="text-xs text-gray-500 font-bold">
            施設情報や空き状況（◯▲×）の管理・更新を行うためのページです。
          </p>
        </div>

        {errorMessage && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-xl text-xs font-bold text-center">
            {errorMessage}
          </div>
        )}

        {/* 登録フォーム */}
        <form onSubmit={handleSignUp} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              施設名 <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Building2 className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
              <input
                type="text"
                name="facilityName"
                required
                placeholder="例: 放課後等デイサービス かけはし"
                value={formData.facilityName}
                onChange={handleChange}
                className="w-full pl-9 pr-3 py-2 bg-white border-2 border-[#E5DDD0] rounded-xl text-xs font-bold focus:outline-none focus:border-[#2C9381]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              事業所番号（指定番号）
            </label>
            <div className="relative">
              <FileText className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
              <input
                type="text"
                name="providerNumber"
                placeholder="例: 137xxxxxxxx"
                value={formData.providerNumber}
                onChange={handleChange}
                className="w-full pl-9 pr-3 py-2 bg-white border-2 border-[#E5DDD0] rounded-xl text-xs font-bold focus:outline-none focus:border-[#2C9381]"
              />
            </div>
          </div>

          {/* ★ 追加：法人名 */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              法人名 <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Building className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
              <input
                type="text"
                name="companyName"
                required
                placeholder="例: 株式会社カケハシ福祉会"
                value={formData.companyName}
                onChange={handleChange}
                className="w-full pl-9 pr-3 py-2 bg-white border-2 border-[#E5DDD0] rounded-xl text-xs font-bold focus:outline-none focus:border-[#2C9381]"
              />
            </div>
          </div>

          {/* ★ 追加：法人番号 */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              法人番号（13桁）
            </label>
            <div className="relative">
              <FileText className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
              <input
                type="text"
                name="companyNumber"
                maxLength={13}
                placeholder="例: 1234567890123"
                value={formData.companyNumber}
                onChange={handleChange}
                className="w-full pl-9 pr-3 py-2 bg-white border-2 border-[#E5DDD0] rounded-xl text-xs font-bold focus:outline-none focus:border-[#2C9381]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              ご担当者名 <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
              <input
                type="text"
                name="contactName"
                required
                placeholder="例: 山田 太郎"
                value={formData.contactName}
                onChange={handleChange}
                className="w-full pl-9 pr-3 py-2 bg-white border-2 border-[#E5DDD0] rounded-xl text-xs font-bold focus:outline-none focus:border-[#2C9381]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              電話番号 <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
              <input
                type="tel"
                name="phone"
                required
                placeholder="例: 03-1234-5678"
                value={formData.phone}
                onChange={handleChange}
                className="w-full pl-9 pr-3 py-2 bg-white border-2 border-[#E5DDD0] rounded-xl text-xs font-bold focus:outline-none focus:border-[#2C9381]"
              />
            </div>
          </div>

          {/* ★ 追加：住所 */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              住所 <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <MapPin className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
              <input
                type="text"
                name="address"
                required
                placeholder="例: 東京都新宿区西新宿1-1-1"
                value={formData.address}
                onChange={handleChange}
                className="w-full pl-9 pr-3 py-2 bg-white border-2 border-[#E5DDD0] rounded-xl text-xs font-bold focus:outline-none focus:border-[#2C9381]"
              />
            </div>
          </div>

          <div className="pt-2 border-t border-dashed border-[#E5DDD0]">
            <label className="block text-xs font-bold text-gray-700 mb-1">
              ログイン用メールアドレス <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
              <input
                type="email"
                name="email"
                required
                placeholder="info@facility.example.com"
                value={formData.email}
                onChange={handleChange}
                className="w-full pl-9 pr-3 py-2 bg-white border-2 border-[#E5DDD0] rounded-xl text-xs font-bold focus:outline-none focus:border-[#2C9381]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              パスワード（8文字以上） <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
              <input
                type="password"
                name="password"
                required
                minLength={8}
                placeholder="••••••••"
                value={formData.password}
                onChange={handleChange}
                className="w-full pl-9 pr-3 py-2 bg-white border-2 border-[#E5DDD0] rounded-xl text-xs font-bold focus:outline-none focus:border-[#2C9381]"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-[#2C9381] hover:bg-[#237869] text-white rounded-xl text-xs font-black shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer mt-4"
          >
            {loading ? '登録中...' : '事業者登録を完了する'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* ログイン・保護者ページへのリンク */}
        <div className="text-center space-y-2 pt-2 border-t border-[#E5DDD0]">
          <p className="text-xs text-gray-500">
            すでにアカウントをお持ちの方は{' '}
            <Link href="/login" className="text-[#2C9381] font-bold underline">
              事業者ログインへ
            </Link>
          </p>
          <p className="text-xs text-gray-400">
            保護者の方の登録は{' '}
            <Link href="/signup" className="text-[#D96B85] font-bold underline">
              こちら（一般ユーザー登録）
            </Link>
          </p>
        </div>

      </div>
    </main>
  );
}
