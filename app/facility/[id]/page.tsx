'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, MapPin, Phone, Clock, Bus, Calendar, 
  Heart, Send, Baby 
} from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { isLocalBookmarked, toggleLocalBookmark } from '@/lib/storage';
import { Facility, Schedule, FacilityServiceStatus } from '@/types';
import {
  getLatestUpdatedAt,
  formatUpdatedAtLong,
  isScheduleStale,
  STALE_SCHEDULE_NOTICE,
} from '@/lib/scheduleFreshness';
import {
  SERVICE_TYPES_BY_GROUP,
  facilityHasGroup,
  VISIT_STATUS_TEXT,
  VISIT_STATUS_COLOR,
  VISIT_STATUS_NOTE,
  CONSULTATION_STATUS_TEXT,
  CONSULTATION_STATUS_COLOR,
  CONSULTATION_STATUS_NOTE,
  SERVICE_STATUS_UNAVAILABLE_NOTICE,
} from '@/lib/serviceTypes';

interface ChildInfo {
  name: string;
  age_grade: string;
  beneficiary_number?: string;
  available_services?: string[];
}

export default function FacilityDetailPage({ params }: { params: { id: string } | Promise<{ id: string }> }) {
  const router = useRouter();
  const [facilityId, setFacilityId] = useState<number | null>(null);
  const [facility, setFacility] = useState<Facility | null>(null);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [serviceStatuses, setServiceStatuses] = useState<FacilityServiceStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [isBookmarked, setIsBookmarked] = useState(false);

  // フォーム用ステート
  const [applicantName, setApplicantName] = useState('');
  const [childAge, setChildAge] = useState('');
  const [childName, setChildName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [preferredDate, setPreferredDate] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // マイページ連携用ステート
  const [childrenList, setChildrenList] = useState<ChildInfo[]>([]);
  const [selectedChildIndex, setSelectedChildIndex] = useState<number>(0);

  // params の解決
  useEffect(() => {
    Promise.resolve(params).then((resolved) => {
      const id = Number(resolved.id);
      setFacilityId(id);
      setIsBookmarked(isLocalBookmarked(id));
    });
  }, [params]);

  // facilityId 確定後にデータ取得
  useEffect(() => {
    if (facilityId !== null) {
      fetchFacilityData(facilityId);
      fetchUserProfile();
    }
  }, [facilityId]);

  // マイページの登録情報を自動ロード
  const fetchUserProfile = async () => {
    try {
      const supabaseClient = createClient();
      
      const { data: { user } } = await supabaseClient.auth.getUser();
      if (!user) return;

      if (user.email) setEmail(user.email);

      const { data: profile } = await supabaseClient
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (profile) {
        if (profile.parent_name) setApplicantName(profile.parent_name);
        if (profile.phone_number) setPhoneNumber(profile.phone_number);

        const children: ChildInfo[] = profile.children || [];
        setChildrenList(children);

        if (children.length > 0) {
          setChildName(children[0].name || '');
          setChildAge(children[0].age_grade || '');
        }
      }
    } catch (e) {
      console.error('プロフィール取得エラー:', e);
    }
  };

  const handleSelectChild = (index: number) => {
    setSelectedChildIndex(index);
    const targetChild = childrenList[index];
    if (targetChild) {
      setChildName(targetChild.name || '');
      setChildAge(targetChild.age_grade || '');
    }
  };

  const fetchFacilityData = async (id: number) => {
    setLoading(true);
    const supabaseClient = createClient();

    const { data: facilityData } = await supabaseClient
      .from('facilities')
      .select('*')
      .eq('id', id)
      .single();

    if (facilityData) {
      setFacility(facilityData);
    }

    const { data: scheduleData } = await supabaseClient
      .from('schedules')
      .select('*')
      .eq('facility_id', id);

    if (scheduleData) {
      setSchedules(scheduleData);
    }

    // 訪問系・相談支援系の対応状況（提案SQL未適用の環境ではエラーになるため、
    // その場合は握りつぶして空配列のまま扱う＝「情報がありません」表示にフォールバック）
    try {
      const { data: statusData, error: statusError } = await supabaseClient
        .from('facility_service_status')
        .select('*')
        .eq('facility_id', id);
      if (statusError) {
        console.warn('facility_service_status取得エラー（未適用の可能性）:', statusError.message);
      } else if (statusData) {
        setServiceStatuses(statusData as FacilityServiceStatus[]);
      }
    } catch (e) {
      console.warn('facility_service_status取得に失敗しました:', e);
    }

    setLoading(false);
  };

  const getServiceStatus = (serviceType: string) =>
    serviceStatuses.find((s) => s.service_type === serviceType);

  const handleToggleBookmark = () => {
    if (facilityId === null) return;
    const updated = toggleLocalBookmark(facilityId);
    setIsBookmarked(updated.includes(facilityId));
  };

  // ★ お問い合わせ送信（Supabaseのconversations & messagesテーブルへ保存しチャット画面へ遷移）
  const handleSubmitInquiry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!facility) return;

    setIsSubmitting(true);
    const supabaseClient = createClient();

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      alert('見学申込をするにはログインが必要です。');
      setIsSubmitting(false);
      return;
    }

    const childInfoText = childName ? `${childName}（${childAge}）` : childAge;

    // 1. 会話（conversation）の作成
    const { data: conv, error: convError } = await supabaseClient
      .from('conversations')
      .insert({
        facility_id: facility.id,
        user_id: user.id,
        applicant_name: applicantName,
        child_info: childInfoText,
        email: email,
        phone_number: phoneNumber,
        preferred_date: preferredDate,
      })
      .select()
      .single();

    if (convError) {
      console.error('会話作成エラー:', convError);
      alert('見学申込の送信に失敗しました。');
      setIsSubmitting(false);
      return;
    }

    // 2. 最初のメッセージ（お問い合わせ本文）の登録
    const initialMessage = `【見学希望日時】\n${preferredDate || '指定なし'}\n\n【ご相談・お問い合わせ内容】\n${message || '特になし'}`;

    const { error: msgError } = await supabaseClient.from('messages').insert({
      conversation_id: conv.id,
      sender_type: 'user',
      sender_id: user.id,
      content: initialMessage,
    });

    if (msgError) {
      console.error('メッセージ登録エラー:', msgError);
    }

    setIsSubmitting(false);

    // 3. メッセージチャット画面へ遷移
    router.push(`/messages/${conv.id}`);
  };

  if (loading || facilityId === null) {
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
  const lastUpdatedAt = getLatestUpdatedAt(schedules);
  const isLastUpdatedStale = isScheduleStale(lastUpdatedAt);

  // 通所系を提供しない（訪問系・相談支援系のみの）施設は「見学」という体験に当てはまらないため、
  // お問い合わせフォームの文言を「ご相談」ベースに差し替える(設計書6章)
  const isVisitOrConsultationOnly =
    !facilityHasGroup(facility.offered_services, 'commute') &&
    (facilityHasGroup(facility.offered_services, 'visit') || facilityHasGroup(facility.offered_services, 'consultation'));

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

              {facility.description && (
                <div className="bg-orange-50/60 p-3.5 rounded-xl border border-orange-100/80 text-xs text-gray-700 leading-relaxed mt-2">
                  <p className="font-bold text-orange-800 mb-1">💡 施設のアピールポイント</p>
                  <p className="whitespace-pre-wrap">{facility.description}</p>
                </div>
              )}
            </div>
          </div>

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

        {/* 通所サービスの空き状況（通所系を1つでも提供している場合のみ表示） */}
        {facilityHasGroup(facility.offered_services, 'commute') && (
          <div className="bg-white rounded-2xl p-6 border border-orange-100 shadow-sm">
            <h2 className="text-base font-bold text-gray-800 mb-1 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-orange-500" />
              曜日別リアルタイム空き状況
            </h2>

            {lastUpdatedAt && (
              <p className={`text-sm font-bold mb-4 ${isLastUpdatedStale ? 'text-gray-500' : 'text-gray-400'}`}>
                更新: {formatUpdatedAtLong(lastUpdatedAt)}
                {isLastUpdatedStale && `。${STALE_SCHEDULE_NOTICE}`}
              </p>
            )}

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
                  {SERVICE_TYPES_BY_GROUP.commute
                    .filter((s) => facility.offered_services?.includes(s.id))
                    .map((s) => (
                      <tr key={s.id}>
                        <td className="p-3 text-left font-bold text-gray-700">{s.label}</td>
                        {daysOfWeek.map((day) => {
                          const sch = schedules.find((sc) => sc.service_type === s.id && sc.day_of_week === day);
                          return <td key={day} className="p-3">{renderStatusBadge(sch?.status, sch?.available_count)}</td>;
                        })}
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 訪問サービスの対応状況（訪問系を1つでも提供している場合のみ表示） */}
        {facilityHasGroup(facility.offered_services, 'visit') && (
          <div className="bg-white rounded-2xl p-6 border border-orange-100 shadow-sm space-y-4">
            <h2 className="text-base font-bold text-gray-800 mb-1 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-orange-500" />
              訪問サービスの対応状況について
            </h2>

            {SERVICE_TYPES_BY_GROUP.visit
              .filter((s) => facility.offered_services?.includes(s.id))
              .map((s) => {
                const status = getServiceStatus(s.id);
                return (
                  <div key={s.id} className="bg-[#EEF2FB] p-4 rounded-xl border border-[#C7D5F0]">
                    <p className="text-xs font-black text-[#4A72C9] mb-1.5">[訪問] {s.label}</p>
                    {status ? (
                      <>
                        <p className={`text-sm font-bold ${VISIT_STATUS_COLOR[status.status]}`}>
                          ● {VISIT_STATUS_TEXT[status.status]}
                        </p>
                        {status.note && (
                          <p className="text-xs text-gray-600 mt-1.5">対応可能エリア: {status.note}</p>
                        )}
                        {status.available_count !== null && status.available_count !== undefined && (
                          <p className="text-xs text-gray-600 mt-1">現在対応可能な新規件数: {status.available_count}件</p>
                        )}
                        <p className="text-[11px] text-gray-500 mt-2">{VISIT_STATUS_NOTE}</p>
                        <p className="text-[11px] font-bold text-gray-400 mt-1">
                          更新: {formatUpdatedAtLong(status.updated_at)}
                        </p>
                      </>
                    ) : (
                      <p className="text-xs text-gray-500">{SERVICE_STATUS_UNAVAILABLE_NOTICE}</p>
                    )}
                  </div>
                );
              })}
          </div>
        )}

        {/* ご相談の受付について（相談支援系を提供している場合のみ表示） */}
        {facilityHasGroup(facility.offered_services, 'consultation') && (
          <div className="bg-white rounded-2xl p-6 border border-orange-100 shadow-sm space-y-4">
            <h2 className="text-base font-bold text-gray-800 mb-1 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-orange-500" />
              ご相談の受付について
            </h2>

            {SERVICE_TYPES_BY_GROUP.consultation
              .filter((s) => facility.offered_services?.includes(s.id))
              .map((s) => {
                const status = getServiceStatus(s.id);
                const consultationStatus = status?.status === 'full' ? 'full' : 'available';
                return (
                  <div key={s.id} className="bg-[#F3EEFB] p-4 rounded-xl border border-[#D9C7F0]">
                    <p className="text-xs font-black text-[#8A5FC9] mb-1.5">[相談] {s.label}</p>
                    {status ? (
                      <>
                        <p className={`text-sm font-bold ${CONSULTATION_STATUS_COLOR[consultationStatus]}`}>
                          ● {CONSULTATION_STATUS_TEXT[consultationStatus]}
                        </p>
                        {status.note && (
                          <p className="text-xs text-gray-600 mt-1.5">備考: {status.note}</p>
                        )}
                        <p className="text-[11px] text-gray-500 mt-2">{CONSULTATION_STATUS_NOTE}</p>
                        <p className="text-[11px] font-bold text-gray-400 mt-1">
                          更新: {formatUpdatedAtLong(status.updated_at)}
                        </p>
                      </>
                    ) : (
                      <p className="text-xs text-gray-500">{SERVICE_STATUS_UNAVAILABLE_NOTICE}</p>
                    )}
                  </div>
                );
              })}
          </div>
        )}

        {/* お問い合わせフォーム */}
        <div className="bg-white rounded-2xl p-6 border border-orange-100 shadow-sm" id="inquiry-form">
          <h2 className="text-base font-bold text-gray-800 mb-1 flex items-center gap-2">
            <Send className="w-5 h-5 text-orange-500" />
            Web簡単見学申込・お問い合わせ
          </h2>
          <p className="text-xs text-gray-500 mb-6">送信後は施設とのメッセージ画面でチャット形式でやり取りできます。</p>

          <form onSubmit={handleSubmitInquiry} className="space-y-4 text-xs">
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

            <div className="bg-orange-50/70 p-4 rounded-xl border border-orange-100 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="font-bold text-orange-800 flex items-center gap-1.5">
                  <Baby className="w-4 h-4 text-orange-500" />
                  お子様の情報（マイページ連携）
                </span>
              </div>

              {childrenList.length > 1 && (
                <div className="flex items-center gap-2 pt-1">
                  <span className="font-bold text-gray-600 text-[11px]">対象のお子様:</span>
                  <div className="flex gap-1.5 overflow-x-auto">
                    {childrenList.map((child, idx) => (
                      <button
                        type="button"
                        key={idx}
                        onClick={() => handleSelectChild(idx)}
                        className={`text-[11px] px-3 py-1 rounded-lg font-bold transition border ${
                          selectedChildIndex === idx
                            ? 'bg-orange-500 text-white border-orange-500'
                            : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        {child.name || `お子様 ${idx + 1}`}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">お子様のお名前</label>
                  <input
                    type="text"
                    value={childName}
                    onChange={(e) => setChildName(e.target.value)}
                    placeholder="例: 山田 花子"
                    className="w-full p-2.5 rounded-xl border border-gray-200 bg-white focus:outline-none focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">学年 / 年齢</label>
                  <input
                    type="text"
                    value={childAge}
                    onChange={(e) => setChildAge(e.target.value)}
                    placeholder="例: 小学2年生 / 7歳"
                    className="w-full p-2.5 rounded-xl border border-gray-200 bg-white focus:outline-none focus:border-orange-500"
                  />
                </div>
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
              <label className="block font-bold text-gray-700 mb-1">
                {isVisitOrConsultationOnly ? 'ご相談希望の日時（第1〜3希望など）' : '見学希望日時（第1〜3希望など）'}
              </label>
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
              {isSubmitting
                ? '送信中...'
                : isVisitOrConsultationOnly
                ? 'この内容でご相談・お問い合わせを送る'
                : 'この内容で見学申し込み・チャットを開始'}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
