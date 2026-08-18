'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Send, User as UserIcon, Baby, Mail, Phone, CalendarDays } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';

interface Message {
  id: string;
  sender_id: string;
  sender_type: string | null;
  content: string;
  created_at: string;
}

interface Conversation {
  id: string;
  facility_id: number;
  user_id: string;
  applicant_name: string;
  child_info: string;
  email: string;
  phone_number: string;
  preferred_date: string;
  facilities: {
    name: string;
  };
}

export default function AdminChatPage() {
  const params = useParams();
  const router = useRouter();
  const conversationId = params.id as string;
  const supabase = createClient();

  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [notAllowed, setNotAllowed] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [showApplicantInfo, setShowApplicantInfo] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchConversationAndMessages();
  }, [conversationId]);

  useEffect(() => {
    if (!conversationId) return;

    // 相手（保護者）からの新着メッセージをリアルタイムで反映する
    const channel = supabase
      .channel(`admin-messages-${conversationId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
        (payload) => {
          setMessages((prev) => {
            const incoming = payload.new as Message;
            if (prev.some((m) => m.id === incoming.id)) return prev;
            return [...prev, incoming];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchConversationAndMessages = async () => {
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/admin/login');
      return;
    }
    setCurrentUserId(user.id);

    // 自分が所有する施設のIDを取得し、この会話が自分の施設宛てかを確認する
    // （URL直打ちで他事業者宛てのお問い合わせを覗けないようにする防御）
    const { data: myFacilities } = await supabase
      .from('facilities')
      .select('id')
      .eq('owner_id', user.id);

    const facilityIds = (myFacilities || []).map((f) => f.id);

    const { data: convData, error: convError } = await supabase
      .from('conversations')
      .select(`
        id,
        facility_id,
        user_id,
        applicant_name,
        child_info,
        email,
        phone_number,
        preferred_date,
        facilities ( name )
      `)
      .eq('id', conversationId)
      .single();

    if (convError || !convData || !facilityIds.includes((convData as unknown as Conversation).facility_id)) {
      setNotAllowed(true);
      setLoading(false);
      return;
    }

    setConversation(convData as unknown as Conversation);

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

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !currentUserId || !conversationId) return;

    const textToSend = newMessage;
    setNewMessage('');

    const { data, error } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_type: 'facility',
        sender_id: currentUserId,
        content: textToSend,
      })
      .select()
      .single();

    if (!error && data) {
      setMessages((prev) => (prev.some((m) => m.id === data.id) ? prev : [...prev, data as Message]));
    } else if (error) {
      console.error('返信の送信に失敗しました:', error);
      setNewMessage(textToSend);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
  };

  if (notAllowed) {
    return (
      <main className="min-h-screen bg-[#F3ECE0] flex items-center justify-center p-6">
        <div className="bg-[#FAF8F5] border-2 border-[#D8CEBF] rounded-3xl p-8 text-center space-y-4 max-w-sm shadow-md">
          <p className="text-sm font-black text-gray-800">このお問い合わせは表示できません。</p>
          <p className="text-xs text-gray-500">自分が管理する施設宛てのお問い合わせのみ閲覧できます。</p>
          <Link
            href="/admin/messages"
            className="inline-block px-5 py-2 bg-[#2C9381] hover:bg-[#237768] text-white font-black text-xs rounded-xl transition-all"
          >
            一覧へ戻る
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F3ECE0] text-gray-800 font-sans p-3 sm:p-8 relative overflow-x-hidden">
      <div
        className="absolute inset-0 opacity-15 pointer-events-none z-0"
        style={{
          backgroundImage: 'radial-gradient(#2C9381 0.75px, transparent 0.75px)',
          backgroundSize: '16px 16px',
        }}
      />

      <div className="max-w-md mx-auto bg-[#FAF8F5] h-[90vh] rounded-3xl border-2 border-[#D8CEBF] shadow-md flex flex-col relative z-10 overflow-hidden">
        <header className="bg-white border-b-2 border-[#E5DDD0] px-4 py-3 flex items-center justify-between sticky top-0 z-30 shadow-2xs shrink-0">
          <Link
            href="/admin/messages"
            className="flex items-center text-xs font-black text-[#2C9381] hover:text-[#237768] transition-colors gap-1"
          >
            <ArrowLeft className="w-4 h-4" />
            一覧
          </Link>
          <div className="truncate px-2 text-center">
            <h1 className="font-black text-sm text-gray-800 truncate">
              {conversation?.applicant_name || '保護者様'} 様
            </h1>
            <p className="text-[10px] font-bold text-gray-400 truncate">
              {conversation?.facilities?.name}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowApplicantInfo((v) => !v)}
            className="text-[10px] font-black text-[#2C9381] px-2 py-1 rounded-lg hover:bg-[#EAF7F4] transition-colors shrink-0"
          >
            {showApplicantInfo ? '閉じる' : '詳細'}
          </button>
        </header>

        {showApplicantInfo && conversation && (
          <div className="bg-white border-b-2 border-[#E5DDD0] px-4 py-3 space-y-1.5 shrink-0 text-xs">
            <div className="flex items-center gap-2 text-gray-700">
              <UserIcon className="w-3.5 h-3.5 text-[#2C9381] shrink-0" />
              <span className="font-bold">{conversation.applicant_name || '未入力'}</span>
            </div>
            {conversation.child_info && (
              <div className="flex items-center gap-2 text-gray-700">
                <Baby className="w-3.5 h-3.5 text-[#2C9381] shrink-0" />
                <span className="font-bold">{conversation.child_info}</span>
              </div>
            )}
            {conversation.email && (
              <div className="flex items-center gap-2 text-gray-700">
                <Mail className="w-3.5 h-3.5 text-[#2C9381] shrink-0" />
                <span className="font-bold">{conversation.email}</span>
              </div>
            )}
            {conversation.phone_number && (
              <div className="flex items-center gap-2 text-gray-700">
                <Phone className="w-3.5 h-3.5 text-[#2C9381] shrink-0" />
                <span className="font-bold">{conversation.phone_number}</span>
              </div>
            )}
            {conversation.preferred_date && (
              <div className="flex items-center gap-2 text-gray-700">
                <CalendarDays className="w-3.5 h-3.5 text-[#2C9381] shrink-0" />
                <span className="font-bold">見学希望: {conversation.preferred_date}</span>
              </div>
            )}
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading ? (
            <div className="py-20 text-center text-xs font-bold text-gray-400">
              メッセージを読み込み中...
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-10 text-xs text-gray-400 font-bold">
              まだメッセージはありません
            </div>
          ) : (
            messages.map((msg) => {
              const isMine = msg.sender_id === currentUserId;

              return (
                <div
                  key={msg.id}
                  className={`flex items-end gap-1.5 ${isMine ? 'justify-end' : 'justify-start'}`}
                >
                  {isMine && (
                    <span className="text-[9px] font-bold text-gray-400 shrink-0 mb-0.5">
                      {formatTime(msg.created_at)}
                    </span>
                  )}
                  <div
                    className={`max-w-[75%] px-3.5 py-2 rounded-2xl text-xs font-bold leading-relaxed break-words shadow-2xs whitespace-pre-wrap ${
                      isMine
                        ? 'bg-[#2C9381] text-white rounded-br-xs'
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

        <form
          onSubmit={handleSendMessage}
          className="p-3 bg-white border-t-2 border-[#E5DDD0] flex items-center gap-2 shrink-0"
        >
          <input
            type="text"
            placeholder="返信を入力..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            className="flex-1 px-4 py-2 bg-[#FAF8F5] border-2 border-[#E5DDD0] rounded-full text-xs font-bold text-gray-800 outline-none focus:border-[#2C9381] transition-colors"
          />
          <button
            type="submit"
            disabled={!newMessage.trim()}
            className="p-2.5 bg-[#2C9381] hover:bg-[#237768] disabled:bg-gray-200 text-white rounded-full transition-all shadow-2xs shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </main>
  );
}
