'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { Lock, Loader2, Paperclip, Heart, Eye, EyeOff, CheckCircle2 } from 'lucide-react'
import Link from 'next/link'

function ResetPasswordContent() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null)

  const router = useRouter()
  const supabase = createClient()

  // パスワード更新処理
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (password !== confirmPassword) {
      setMessage({ type: 'error', text: 'パスワードが一致しません。もう一度ご確認ください。' })
      return
    }

    if (password.length < 12) {
      setMessage({ type: 'error', text: 'パスワードは12文字以上で入力してください。' })
      return
    }

    setLoading(true)
    setMessage(null)

    try {
      const { error } = await supabase.auth.updateUser({
        password: password,
      })

      if (error) throw error

      setIsSuccess(true)
      setMessage({
        type: 'success',
        text: 'パスワードの更新が完了しました！新しいパスワードでログインしてください。',
      })
    } catch (error: any) {
      console.error('Update Password Error:', error)
      setMessage({
        type: 'error',
        text: error.message || 'パスワードの更新中にエラーが発生しました。',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#F3ECE0] text-gray-800 p-4 sm:p-8 font-sans relative overflow-x-hidden flex flex-col justify-center items-center">
      {/* 背景ドット柄 */}
      <div 
        className="absolute inset-0 opacity-15 pointer-events-none z-0" 
        style={{ 
          backgroundImage: 'radial-gradient(#D96B85 0.75px, transparent 0.75px)', 
          backgroundSize: '16px 16px' 
        }} 
      />

      <div className="w-full max-w-md relative z-10 space-y-5">
        
        {/* メインカード */}
        <div className="bg-[#FAF8F5] rounded-3xl border-2 border-[#D8CEBF] shadow-md p-6 sm:p-8 relative overflow-hidden">
          
          {/* クリップ飾り */}
          <div className="absolute top-2 left-6 text-[#C0546E] filter drop-shadow-[1px_2px_2px_rgba(0,0,0,0.15)] z-20">
            <Paperclip className="w-7 h-7 -rotate-12 transform" />
          </div>

          {/* ロゴ・タイトルエリア */}
          <div className="text-center pt-2 mb-6">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-[#FFF0F3] border-2 border-[#F8C3CE] text-[#D96B85] mb-3 shadow-xs">
              <Heart className="w-6 h-6 fill-current" />
            </div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">
              カケハシファイル
            </h1>
            <p className="mt-1 text-xs font-bold text-gray-500">
              新しいパスワードの設定
            </p>
          </div>

          {/* メッセージ表示 */}
          {message && (
            <div
              className={`p-3.5 rounded-xl mb-5 text-xs font-bold border ${
                message.type === 'error'
                  ? 'bg-rose-50 text-rose-700 border-rose-200'
                  : 'bg-[#EAF7F4] text-[#2C9381] border-[#A8DDD3]'
              }`}
            >
              {message.text}
            </div>
          )}

          {isSuccess ? (
            /* パスワード変更完了時の表示 */
            <div className="space-y-4 text-center pt-2">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[#EAF7F4] text-[#2C9381] border border-[#A8DDD3]">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <p className="text-xs font-bold text-gray-600 leading-relaxed">
                新しいパスワードが登録されました。<br />ログイン画面から新しいパスワードでお進みください。
              </p>
              <Link
                href="/login"
                className="w-full mt-3 py-3 px-4 bg-[#D96B85] hover:bg-[#C0546E] text-white rounded-xl text-xs font-black shadow-xs transition-all flex justify-center items-center gap-1.5 cursor-pointer block"
              >
                ログイン画面へ移動する
              </Link>
            </div>
          ) : (
            /* 新しいパスワード入力フォーム */
            <form className="space-y-4" onSubmit={handleUpdatePassword}>
              <p className="text-xs text-gray-600 font-medium leading-relaxed bg-[#FFFEEF] p-3 rounded-xl border border-[#E5DDD0]">
                新しく使用するパスワードを12文字以上で入力してください。
              </p>

              <div>
                <label className="block text-xs font-black text-gray-700 mb-1 pl-1">
                  新しいパスワード
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-4 w-4 text-gray-400" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={12}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full pl-9 pr-10 py-2.5 bg-white border-2 border-[#E5DDD0] rounded-xl text-xs font-bold text-gray-800 focus:outline-none focus:border-[#D96B85] transition-all"
                    placeholder="12文字以上のパスワード"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-gray-700 mb-1 pl-1">
                  新しいパスワード（確認）
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-4 w-4 text-gray-400" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={12}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="block w-full pl-9 pr-10 py-2.5 bg-white border-2 border-[#E5DDD0] rounded-xl text-xs font-bold text-gray-800 focus:outline-none focus:border-[#D96B85] transition-all"
                    placeholder="もう一度入力してください"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-3 py-3 px-4 bg-[#D96B85] hover:bg-[#C0546E] text-white rounded-xl text-xs font-black shadow-xs transition-all flex justify-center items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  'パスワードを変更する'
                )}
              </button>
            </form>
          )}

        </div>
      </div>
    </main>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#F3ECE0] flex items-center justify-center text-xs font-bold text-gray-500">
          ファイルを読み込み中...
        </div>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  )
}