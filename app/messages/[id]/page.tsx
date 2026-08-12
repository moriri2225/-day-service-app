'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Send, Lock } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { User } from '@supabase/supabase-js';

interface Message {
  id: string;
  sender_id: string;
  content: string;
  created_at: string;
}

interface Conversation {
  id: string;
  facility_id: number;
  user_id: string;
  facilities: {
    name: string;
    image_url: string;
  };
}

export default function ChatPage() {
  const params = useParams();
  const conversationId = params.id as string;

  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const supabase = createClient();

  useEffect(() => {
    fetchConversationAndMessages();
  }, [conversationId]);

  useEffect(() => {
    // 新しいメッセージが追加されたら最下部へ自動スクロール
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchConversationAndMessages = async () => {
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);

    if (!user) {
      setLoading(false);
      return;
    }

    // 会話データと施設情報の取得
    const { data: convData } = await supabase
      .from('conversations')
      .select(`
        id,
        facility_id,
        user_id,
        facilities (
          name,
          image_url
        )
      `)
      .eq('id', conversationId)
      .single();

    if (convData) {
      setConversation(convData as unknown as Conversation);
    }

    // メッセージ履歴の取得
    const { data: msgData } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (msgData) {
      setMessages(msgData as Message[]);
    }

    setLoading(false);
  };

  // メッセージ送信処理
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user || !conversationId) return;

    const textToSend = newMessage;
    setNewMessage('');

    const { data, error } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: user.id,
        content: textToSend,
      })
      .select()
      .single();

    if (!error && data) {
      setMessages((prev) => [...prev, data as Message]);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
  };

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

      <div className="max-w-md mx-auto bg-[#FAF8F5] h-[90vh] rounded-3xl border-2 border-[#D8CEBF] shadow-md flex flex-col relative z-10 overflow-hidden">
        
        {/* チャットヘッダー */}
        <header className="bg-white border-b-2 border-[#E5DDD0] px-4 py-3 flex items-center justify-between sticky top-0 z-30 shadow-2xs">
          <Link
            href="/messages"
            className="flex items-center text-xs font-black text-[#D96B85] hover:text-[#C0546E] transition-colors gap-1"
          >
            <ArrowLeft className="w-4 h-4" />
            一覧
          </Link>
          <div className="flex items-center gap-2 truncate px-2">
            {conversation?.facilities?.image_url && (
              <img
                src={conversation.facilities.image_url}
                alt=""
                className="w-7 h-7 rounded-full object-cover border border-[#D8CEBF]"
              />
            )}
            <h1 className="font-black text-sm text-gray-800 truncate">
              {conversation?.facilities?.name || 'チャット'}
            </h1>
          </div>
          <div className="w-10"></div>
        </header>

        {/* トーク表示エリア */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading ? (
            <div className="py-20 text-center text-xs font-bold text-gray-400">
              メッセージを読み込み中...
            </div>
          ) : !user ? (
            <div className="p-8 text-center space-y-3 pt-20">
              <Lock className="w-8 h-8 text-[#D96B85] mx-auto" />
              <p className="text-xs font-black text-gray-700">ログインが必要です</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-10 text-xs text-gray-400 font-bold">
              メッセージを送信してやり取りを開始しましょう
            </div>
          ) : (
            messages.map((msg) => {
              const isMine = msg.sender_id === user.id;

              return (
                <div
                  key={msg.id}
                  className={`flex items-end gap-1.5 ${
                    isMine ? 'justify-end' : 'justify-start'
                  }`}
                >
                  {/* 時刻（自分の場合は左、相手の場合は右） */}
                  {isMine && (
                    <span className="text-[9px] font-bold text-gray-400 shrink-0 mb-0.5">
                      {formatTime(msg.created_at)}
                    </span>
                  )}

                  {/* 吹き出し */}
                  <div
                    className={`max-w-[75%] px-3.5 py-2 rounded-2xl text-xs font-bold leading-relaxed break-words shadow-2xs ${
                      isMine
                        ? 'bg-[#D96B85] text-white rounded-br-xs'
                        : 'bg-white text-gray-800 border-2 border-[#E5DDD0] rounded-bl-xs'
                    }`}
                  >
                    {msg.content}
                  </div>

                  {!isMine && (
                    <span className="text-[9px] font-bold text-gray-400 shrink-0 mb-0.5">
                      {formatTime(msg.created_at)}
                    </span>
                  )}
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* メッセージ入力エリア */}
        {user && (
          <form
            onSubmit={handleSendMessage}
            className="p-3 bg-white border-t-2 border-[#E5DDD0] flex items-center gap-2"
          >
            <input
              type="text"
              placeholder="メッセージを入力..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              className="flex-1 px-4 py-2 bg-[#FAF8F5] border-2 border-[#E5DDD0] rounded-full text-xs font-bold text-gray-800 outline-none focus:border-[#D96B85] transition-colors"
            />
            <button
              type="submit"
              disabled={!newMessage.trim()}
              className="p-2.5 bg-[#D96B85] hover:bg-[#C0546E] disabled:bg-gray-200 text-white rounded-full transition-all shadow-2xs shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        )}

      </div>
    </main>
  );
}
