'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { 
  ArrowLeft, MapPin, Phone, Clock, Bus, Calendar, 
  CheckCircle2, Heart, Send, Building2 
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { isLocalBookmarked, toggleLocalBookmark, addLocalInquiry } from '@/lib/storage';
import { Facility, Schedule } from '@/types';

export default function FacilityDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const facilityId = Number(resolvedParams.id);

  const [facility, setFacility] = useState<Facility | null>(null);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [isBookmarked, setIsBookmarked] = useState(false);

  // フォーム用ステート
  const [applicantName, setApplicantName] = useState('');
  const [childAge, setChildAge] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [preferredDate, setPreferredDate] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  useEffect(() => {
    fetchFacilityData();
    setIsBookmarked(isLocalBookmarked(facilityId));
  }, [facilityId]);

  const fetchFacilityData = async () => {
    setLoading(true);

    // 施設スペック情報取得
    const { data: facilityData, error: facilityError } = await supabase
      .from('facilities')
      .select('*')
      .eq('id', facilityId)
      .single();

    if (!facilityError && facilityData) {
      setFacility(facilityData);
    }

    // 曜日別空き状況取得
    const { data: scheduleData, error: scheduleError } = await supabase
      .from('schedules')
      .select('*')
      .eq('facility_id', facilityId);

    if (!scheduleError && scheduleData) {
      setSchedules(scheduleData);
    }

    setLoading(false);
  };

  // ブックマーク（お気に入り）トグル
  const handleToggleBookmark = () => {
    const updated = toggleLocalBookmark(facilityId);
    setIsBookmarked(updated.includes(facilityId));
  };

  // 見学申込フォーム送信処理
  const handleSubmitInquiry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!facility) return;

    setIsSubmitting(true);

    // LocalStorage (マイページ履歴) に保存
    addLocalInquiry({
      facility_id: facility.id,
      facility_name: facility.name,
      applicant_name: applicantName,
      child_age: childAge,
      email: email,
      phone_number: phoneNumber,
      preferred_date: preferredDate,
      message: message,
    });

    setIsSubmitting(false);
    setIsSubmitted(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FFFDF9] flex items-center justify-center text-gray-400">
        施設情報を読み込んでいます...
      </div>
    );
  }

  if (!facility) {
    return (
      <div className="min-h-screen bg-[#FFFDF9] p-8 text-center">
        <p className="text-gray-600 mb-4">施設が見つかりませんでした。</p>
        <Link href="/" className="text-orange-600 font-bold hover:underline">
          ← トップへ戻る
        </Link>
      </div>
    );
  }

  const daysOfWeek = ['月', '火', '水', '木', '金', '土', '日'];

  const renderStatusBadge = (status?: string, count?: number) => {
    if (status === 'available') return <span className="text-green-600 font-bold">◯ 空きあり ({count})</span>;
    if (status === 'few') return <span className="text-amber-600 font-bold">▲ 残りわずか ({count})</span>;
    if (status === 'full') return <span className="text-red-400 font-bold">× 満員</span>;
    return <span className="text-gray-300">-</span>;
  };

  return (
    <div className="min-h-screen bg-[#FFFDF9] text-gray-800 pb-16">
      {/* ヘッダーナビ */}
      <header className="bg-white border-b border-orange-100 sticky top-0 z-10 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center text-orange-600 hover:text-orange-700 font-medium text-sm">
            <ArrowLeft className="w-4 h-4 mr-1" />
            検索結果へ戻る
          </Link>
          <div className="flex items-center gap-3">
            <button
              onClick={handleToggleBookmark}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition ${
                isBookmarked
                  ? 'bg-red-50 border-red-200 text-red-500'
                  : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Heart className={`w-4 h-4 ${isBookmarked ? 'fill-red-500 text-red-500' : ''}`} />
              {isBookmarked ? 'お気に入り済み' : 'お気に入り'}
            </button>
            <Link
              href="/mypage"
              className="bg-orange-100 text-orange-700 hover:bg-orange-200 font-bold text-xs px-3 py-1.5 rounded-full transition"
            >
              マイページ ↗
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 pt-6 space-y-6">
        {/* メインカード */}
        <div className="bg-white rounded-2xl p-6 border border-orange-100 shadow-sm">
          <div className="flex flex-col md:flex-row gap-6 mb-6">
            <img
              src={facility.image_url || '/placeholder.png'}
              alt={facility.name}
              className="w-full md:w-80 h-52 object-cover rounded-2xl border border-orange-100"
            />
            <div className="flex-1 space-y-3">
              <h1 className="text-2xl font-bold text-gray-800">{facility.name}</h1>
              <p className="text-xs text-gray-500 flex items-center gap-1">
                <MapPin className="w-4 h-4 text-orange-400 flex-shrink-0" />
                {facility.address}
              </p>

              <div className="flex flex-wrap gap-2 pt-1">
                {facility.has_pickup && (
                  <span className="bg-orange-100 text-orange-700 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
                    <Bus className="w-3.5 h-3.5" /> 送迎対応あり
                  </span>
                )}
                {facility.target_ages && (
                  <span className="bg-amber-100 text-amber-800 text-xs font-bold px-3 py-1 rounded-full">
                    対象: {facility.target_ages}
                  </span>
                )}
              </div>

              {/* 施設概要 (description) の表示 */}
              {facility.description && (
                <div className="bg-orange-50/60 p-3.5 rounded-xl border border-orange-100/80 text-xs text-gray-700 leading-relaxed mt-2">
                  <p className="font-bold text-orange-800 mb-1">💡 施設のアピールポイント</p>
                  <p className="whitespace-pre-wrap">{facility.description}</p>
                </div>
              )}
            </div>
          </div>

          {/* スペック基本情報 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4 border-t border-orange-50 text-xs text-gray-600">
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-orange-400" />
              <span>電話番号: <strong>{facility.phone_number || '未設定'}</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-orange-400" />
              <span>営業時間: <strong>{facility.opening_hours || '未設定'}</strong></span>
            </div>
          </div>
        </div>

        {/* 曜日別 リアルタイム空き状況 */}
        <div className="bg-white rounded-2xl p-6 border border-orange-100 shadow-sm">
          <h2 className="text-base font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-orange-500" />
            曜日別リアルタイム空き状況
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full text-center text-xs border-collapse">
              <thead>
                <tr className="bg-orange-50 border-b border-orange-100">
                  <th className="p-2 text-left font-bold text-gray-700">サービス種別</th>
                  {daysOfWeek.map((day) => (
                    <th key={day} className="p-2 font-bold text-gray-700">{day}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-orange-50">
                <tr>
                  <td className="p-3 text-left font-bold text-gray-700">放課後等デイサービス</td>
                  {daysOfWeek.map((day) => {
                    const sch = schedules.find(s => s.service_type === 'after_school' && s.day_of_week === day);
                    return <td key={day} className="p-3">{renderStatusBadge(sch?.status, sch?.available_count)}</td>;
                  })}
                </tr>
                <tr>
                  <td className="p-3 text-left font-bold text-gray-700">児童発達支援</td>
                  {daysOfWeek.map((day) => {
                    const sch = schedules.find(s => s.service_type === 'developmental_support' && s.day_of_week === day);
                    return <td key={day} className="p-3">{renderStatusBadge(sch?.status, sch?.available_count)}</td>;
                  })}
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* 見学申込・問い合わせフォーム */}
        <div className="bg-white rounded-2xl p-6 border border-orange-100 shadow-sm" id="inquiry-form">
          <h2 className="text-base font-bold text-gray-800 mb-1 flex items-center gap-2">
            <Send className="w-5 h-5 text-orange-500" />
            Web簡単見学申込・お問い合わせ
          </h2>
          <p className="text-xs text-gray-500 mb-6">送信内容は保護者マイページの「問合せ履歴」から確認できます。</p>

          {isSubmitted ? (
            <div className="bg-green-50 border border-green-200 rounded-2xl p-8 text-center space-y-3">
              <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto" />
              <h3 className="font-bold text-green-800 text-base">見学申込を送信しました！</h3>
              <p className="text-xs text-gray-600">
                施設担当者より連絡がありますので今しばらくお待ちください。<br />
                送信内容はマイページからいつでもご確認いただけます。
              </p>
              <div className="pt-2 flex justify-center gap-3">
                <Link
                  href="/mypage"
                  className="bg-green-600 hover:bg-green-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition shadow-sm"
                >
                  マイページで確認する
                </Link>
                <button
                  onClick={() => setIsSubmitted(false)}
                  className="text-xs text-gray-500 hover:underline px-3 py-2.5"
                >
                  続けて送信する
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmitInquiry} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">保護者お名前 <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    required
                    value={applicantName}
                    onChange={(e) => setApplicantName(e.target.value)}
                    placeholder="例: 山田 太郎"
                    className="w-full p-2.5 rounded-xl border border-gray-200 focus:outline-none focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">お子様の学年/年齢</label>
                  <input
                    type="text"
                    value={childAge}
                    onChange={(e) => setChildAge(e.target.value)}
                    placeholder="例: 小学2年生 / 4歳"
                    className="w-full p-2.5 rounded-xl border border-gray-200 focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">メールアドレス <span className="text-red-500">*</span></label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="例: example@email.com"
                    className="w-full p-2.5 rounded-xl border border-gray-200 focus:outline-none focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">電話番号 <span className="text-red-500">*</span></label>
                  <input
                    type="tel"
                    required
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="例: 090-1234-5678"
                    className="w-full p-2.5 rounded-xl border border-gray-200 focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">見学希望日時（第1〜3希望など）</label>
                <input
                  type="text"
                  value={preferredDate}
                  onChange={(e) => setPreferredDate(e.target.value)}
                  placeholder="例: 10/15(水) 15:00以降 希望"
                  className="w-full p-2.5 rounded-xl border border-gray-200 focus:outline-none focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">ご相談・お問い合わせ内容</label>
                <textarea
                  rows={3}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="例: 送迎エリアについて詳しく知りたいです。"
                  className="w-full p-2.5 rounded-xl border border-gray-200 focus:outline-none focus:border-orange-500 resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 rounded-xl transition shadow-md flex items-center justify-center gap-2 text-sm disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                {isSubmitting ? '送信中...' : 'この内容で見学申し込みをする'}
              </button>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}
