'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, MessageSquare, Lock, ChevronRight, Search } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { User } from '@supabase/supabase-js';

interface ConversationItem {
  id: string;
  facility_id: number;
  applicant_name: string;
  created_at: string;
  facilities: {
    name: string;
    image_url: string;
  };
  messages?: {
    content: string;
    created_at: string;
  }[];
}

export default function MessagesListPage() {
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const supabase = createClient();

  useEffect(() => {
    checkUserAndFetch();
  }, []);

  const checkUserAndFetch = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);

    if (!user) {
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
        facilities (
          name,
          image_url
        ),
        messages (
          content,
          created_at
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setConversations(data as unknown as ConversationItem[]);
    }
    setLoading(false);
  };

  // 時刻フォーマット（LINE風: 今日なら「14:30」、昨日以前なら「8/11」）
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const isToday =
      date.getFullYear() === now.getFullYear() &&
      date.getMonth() === now.getMonth() &&
      date.getDate() === now.getDate();

    if (isToday) {
      return date.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
    } else {
      return `${date.getMonth() + 1}/${date.getDate()}`;
    }
  };

  // 検索フィルタリング
  const filteredConversations = conversations.filter((conv) => {
    if (!searchQuery.trim()) return true;
    const name = conv.facilities?.name || '';
    return name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <main className="min-h-screen bg-[#F3ECE0] text-gray-800 font-sans p-3 sm:p-8 relative overflow-x-hidden">
      {/* 背景ドット装飾 */}
      <div 
        className="absolute inset-0 opacity-15 pointer-events-none z-0" 
        style={{ 
          backgroundImage: 'radial-gradient(#D96B85 0.75px, transparent 0.75px)', 
          backgroundSize: '16px 16px' 
        }} 
      />

      <div className="max-w-md mx-auto bg-[#FAF8F5] min-h-[85vh] rounded-3xl border-2 border-[#D8CEBF] shadow-md flex flex-col relative z-10 overflow-hidden">
        
        {/* --- カケハシカラーのLINE風ヘッダー --- */}
        <header className="bg-white border-b-2 border-[#E5DDD0] px-4 py-3.5 flex items-center justify-between sticky top-0 z-30 shadow-2xs">
          <Link
            href="/"
            className="flex items-center text-xs font-black text-[#D96B85] hover:text-[#C0546E] transition-colors gap-1"
          >
            <ArrowLeft className="w-4 h-4" />
            トップ
          </Link>
          <h1 className="font-black text-sm text-gray-800 flex items-center gap-1.5">
            <MessageSquare className="w-4 h-4 text-[#D96B85]" />
            トーク履歴
          </h1>
          <div className="w-12"></div>
        </header>

        {/* --- 検索バー --- */}
        {user && conversations.length > 0 && (
          <div className="p-3 bg-[#FAF8F5] border-b border-[#E5DDD0]">
            <div className="relative flex items-center bg-white border-2 border-[#E5DDD0] rounded-full px-3.5 py-1.5 text-xs text-gray-700 shadow-inner">
              <Search className="w-3.5 h-3.5 text-[#D96B85] mr-2 shrink-0" />
              <input
                type="text"
                placeholder="施設名でトークを検索"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent border-none outline-none w-full placeholder-gray-400 font-bold"
              />
            </div>
          </div>
        )}

        {/* --- メインコンテンツ --- */}
        <div className="flex-1">
          {loading ? (
            <div className="py-20 text-center text-xs font-bold text-gray-500">
              トーク履歴を読み込み中...
            </div>
          ) : !user ? (
            /* 未ログイン表示 */
            <div className="p-8 text-center space-y-4 my-auto pt-20">
              <div className="w-14 h-14 rounded-full bg-[#FFF0F3] border-2 border-[#F8C3CE] text-[#D96B85] flex items-center justify-center mx-auto shadow-sm">
                <Lock className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-black text-gray-800">ログインが必要です</p>
                <p className="text-xs text-gray-500">トーク画面を確認するにはログインしてください。</p>
              </div>
              <Link
                href="/login?redirectTo=/messages"
                className="inline-block px-6 py-2.5 bg-[#D96B85] hover:bg-[#C0546E] text-white font-black text-xs rounded-xl transition-all shadow-xs"
              >
                ログイン画面へ
              </Link>
            </div>
          ) : filteredConversations.length === 0 ? (
            /* 履歴なし表示 */
            <div className="p-10 text-center space-y-3 pt-20">
              <div className="w-14 h-14 rounded-full bg-[#FFF0F3] border-2 border-[#F8C3CE] text-[#D96B85] flex items-center justify-center mx-auto">
                <MessageSquare className="w-6 h-6" />
              </div>
              <p className="text-sm font-black text-gray-700">トーク履歴はありません</p>
              <p className="text-xs text-gray-500">施設にお問い合わせを送信すると、ここにチャットが表示されます。</p>
              <div className="pt-3">
                <Link
                  href="/"
                  className="inline-block px-5 py-2 bg-[#D96B85] hover:bg-[#C0546E] text-white font-black text-xs rounded-xl transition-all shadow-xs"
                >
                  施設を探す
                </Link>
              </div>
            </div>
          ) : (
            /* LINE風トークリスト（カケハシ配色） */
            <div className="divide-y divide-[#E5DDD0]">
              {filteredConversations.map((conv) => {
                const latestMsg = conv.messages && conv.messages.length > 0 
                  ? conv.messages[conv.messages.length - 1] 
                  : null;

                const displayTime = latestMsg?.created_at 
                  ? formatTime(latestMsg.created_at)
                  : formatTime(conv.created_at);

                return (
                  <Link
                    key={conv.id}
                    href={`/messages/${conv.id}`}
                    className="flex items-center gap-3 px-4 py-3.5 hover:bg-[#FFF0F3]/50 active:bg-[#FFF0F3] transition-colors group"
                  >
                    {/* アイコン（丸型アバター） */}
                    <div className="relative shrink-0">
                      <img
                        src={conv.facilities?.image_url || '/placeholder.png'}
                        alt=""
                        className="w-12 h-12 rounded-full object-cover border-2 border-[#D8CEBF] bg-white shadow-2xs"
                      />
                    </div>

                    {/* 中央：施設名 & 最新メッセージ */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h2 className="font-black text-sm text-gray-900 truncate group-hover:text-[#D96B85] transition-colors">
                          {conv.facilities?.name || '施設名未設定'}
                        </h2>
                        <span className="text-[10px] font-bold text-gray-400 shrink-0 ml-2">
                          {displayTime}
                        </span>
                      </div>
                      <p className="text-xs font-bold text-gray-500 truncate leading-relaxed">
                        {latestMsg ? latestMsg.content : 'お問い合わせを受け付けました'}
                      </p>
                    </div>

                    <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-[#D96B85] shrink-0 transition-colors" />
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
