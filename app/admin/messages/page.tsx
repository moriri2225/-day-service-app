'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, MessageSquare, ChevronRight, RefreshCw } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';

interface ConversationItem {
  id: string;
  facility_id: number;
  applicant_name: string;
  created_at: string;
  facilities: {
    name: string;
  };
  messages?: {
    content: string;
    created_at: string;
  }[];
}

export default function AdminMessagesListPage() {
  const router = useRouter();
  const supabase = createClient();

  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchConversations();
  }, []);

  const fetchConversations = async () => {
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/admin/login');
      return;
    }

    // 自分が所有する施設のIDを取得（他事業者の問い合わせが見えないようにする）
    const { data: myFacilities } = await supabase
      .from('facilities')
      .select('id')
      .eq('owner_id', user.id);

    const facilityIds = (myFacilities || []).map((f) => f.id);

    if (facilityIds.length === 0) {
      setConversations([]);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('conversations')
      .select(`
        id,
        facility_id,
        applicant_name,
        created_at,
        facilities ( name ),
        messages ( content, created_at )
      `)
      .in('facility_id', facilityIds)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setConversations(data as unknown as ConversationItem[]);
    }
    setLoading(false);
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const isToday =
      date.getFullYear() === now.getFullYear() &&
      date.getMonth() === now.getMonth() &&
      date.getDate() === now.getDate();

    return isToday
      ? date.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })
      : `${date.getMonth() + 1}/${date.getDate()}`;
  };

  return (
    <main className="min-h-screen bg-[#F3ECE0] text-gray-800 font-sans p-3 sm:p-8 relative overflow-x-hidden">
      <div
        className="absolute inset-0 opacity-15 pointer-events-none z-0"
        style={{
          backgroundImage: 'radial-gradient(#2C9381 0.75px, transparent 0.75px)',
          backgroundSize: '16px 16px',
        }}
      />

      <div className="max-w-md mx-auto bg-[#FAF8F5] min-h-[85vh] rounded-3xl border-2 border-[#D8CEBF] shadow-md flex flex-col relative z-10 overflow-hidden">
        <header className="bg-white border-b-2 border-[#E5DDD0] px-4 py-3.5 flex items-center justify-between sticky top-0 z-30 shadow-2xs">
          <Link
            href="/admin"
            className="flex items-center text-xs font-black text-[#2C9381] hover:text-[#237768] transition-colors gap-1"
          >
            <ArrowLeft className="w-4 h-4" />
            管理画面
          </Link>
          <h1 className="font-black text-sm text-gray-800 flex items-center gap-1.5">
            <MessageSquare className="w-4 h-4 text-[#2C9381]" />
            お問い合わせ一覧
          </h1>
          <div className="w-16"></div>
        </header>

        <div className="flex-1">
          {loading ? (
            <div className="py-20 text-center text-xs font-bold text-gray-500 flex flex-col items-center gap-2">
              <RefreshCw className="w-5 h-5 animate-spin text-[#2C9381]" />
              読み込み中...
            </div>
          ) : conversations.length === 0 ? (
            <div className="p-10 text-center space-y-3 pt-20">
              <div className="w-14 h-14 rounded-full bg-[#EAF7F4] border-2 border-[#A8DDD3] text-[#2C9381] flex items-center justify-center mx-auto">
                <MessageSquare className="w-6 h-6" />
              </div>
              <p className="text-sm font-black text-gray-700">お問い合わせはまだありません</p>
              <p className="text-xs text-gray-500">
                保護者様から見学申込・お問い合わせが届くと、ここに表示されます。
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[#E5DDD0]">
              {conversations.map((conv) => {
                const latestMsg =
                  conv.messages && conv.messages.length > 0
                    ? conv.messages[conv.messages.length - 1]
                    : null;

                const displayTime = latestMsg?.created_at
                  ? formatTime(latestMsg.created_at)
                  : formatTime(conv.created_at);

                return (
                  <Link
                    key={conv.id}
                    href={`/admin/messages/${conv.id}`}
                    className="flex items-center gap-3 px-4 py-3.5 hover:bg-[#EAF7F4]/50 active:bg-[#EAF7F4] transition-colors group"
                  >
                    <div className="w-11 h-11 rounded-full bg-[#EAF7F4] border-2 border-[#A8DDD3] text-[#2C9381] flex items-center justify-center shrink-0 font-black text-sm">
                      {(conv.applicant_name || '？').charAt(0)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <h2 className="font-black text-sm text-gray-900 truncate group-hover:text-[#2C9381] transition-colors">
                          {conv.applicant_name || '名前未設定'} 様
                        </h2>
                        <span className="text-[10px] font-bold text-gray-400 shrink-0 ml-2">
                          {displayTime}
                        </span>
                      </div>
                      <p className="text-[10px] font-bold text-[#2C9381] truncate mb-0.5">
                        {conv.facilities?.name || '施設名未設定'}
                      </p>
                      <p className="text-xs font-bold text-gray-500 truncate leading-relaxed">
                        {latestMsg ? latestMsg.content : 'お問い合わせを受け付けました'}
                      </p>
                    </div>

                    <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-[#2C9381] shrink-0 transition-colors" />
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
