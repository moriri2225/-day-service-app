'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { recordConsent } from '@/lib/consent'
import { Mail, Lock, Loader2, ArrowLeft, Building2, Sparkles, Heart, Eye, EyeOff, Paperclip, HelpCircle, Send } from 'lucide-react'
import Link from 'next/link'

function LoginFormContent() {
  const [isSignUp, setIsSignUp] = useState(false)
  const [isResetMode, setIsResetMode] = useState(false) // パスワード再設定モードの判定
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [agreedToTerms, setAgreedToTerms] = useState(false) // 利用規約・プライバシーポリシーへの包括同意
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null)

  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  const redirectTo = searchParams.get('redirectTo')

  // パスワード再設定メール送信処理
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })

      if (error) throw error

      setMessage({
        type: 'success',
        text: 'パスワード再設定用のメールを送信しました。メールボックスをご確認ください。',
      })
    } catch (error: any) {
      console.error('Reset Password Error:', error)
      setMessage({
        type: 'error',
        text: error.message || 'メール送信中にエラーが発生しました。',
      })
    } finally {
      setLoading(false)
    }
  }

  // 通常のログイン・新規登録処理
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    try {
      if (isSignUp) {
        if (!agreedToTerms) {
          throw new Error('利用規約およびプライバシーポリシーへの同意が必要です。')
        }

        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
        })
        if (signUpError) throw signUpError

        if (!signUpData.session) {
          const { error: signInError } = await supabase.auth.signInWithPassword({
            email,
            password,
          })
          if (signInError) throw signInError
        }

        const user = signUpData.user || (await supabase.auth.getUser()).data.user
        if (user) {
          await supabase.from('profiles').upsert({
            id: user.id,
            email: user.email,
            role: 'parent',
          })

          // 利用規約・プライバシーポリシーへの包括同意を記録する。
          // consentsテーブル未作成時は失敗しうるが、会員登録自体はブロックしない。
          await recordConsent(supabase, user.id, 'general')
        }

        router.push(redirectTo || '/register/profile')
        router.refresh()
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (error) throw error

        if (data.user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', data.user.id)
            .maybeSingle()

          if (profile && profile.role === 'facility') {
            alert('事業者アカウントでログインされました。事業者用管理画面へ移動します。')
            router.push('/admin')
            router.refresh()
            return
          }
        }

        router.push(redirectTo || '/mypage')
        router.refresh()
      }
    } catch (error: any) {
      console.error('Auth Error Details:', error)
      setMessage({
        type: 'error',
        text: error.message || error.error_description || '処理中にエラーが発生しました。',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#F3ECE0] text-gray-800 p-4 sm:p-8 font-sans relative overflow-x-hidden flex flex-col justify-center items-center">
      <div 
        className="absolute inset-0 opacity-15 pointer-events-none z-0" 
        style={{ 
          backgroundImage: 'radial-gradient(#D96B85 0.75px, transparent 0.75px)', 
          backgroundSize: '16px 16px' 
        }} 
      />

      <div className="w-full max-w-md relative z-10 space-y-5">
        
        {/* ナビゲーションリンクボタン */}
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="px-3.5 py-1.5 bg-white hover:bg-[#FFF0F3] text-gray-700 hover:text-[#D96B85] border-2 border-[#D8CEBF] hover:border-[#F8C3CE] rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shadow-xs"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            トップへ戻る
          </Link>
          <Link
            href="/admin/login"
            className="px-3.5 py-1.5 bg-[#EAF7F4] hover:bg-[#DBF0EB] text-[#2C9381] border-2 border-[#A8DDD3] rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shadow-xs"
          >
            <Building2 className="w-3.5 h-3.5" />
            事業者様はこちら
          </Link>
        </div>

        {/* メインカード */}
        <div className="bg-[#FAF8F5] rounded-3xl border-2 border-[#D8CEBF] shadow-md p-6 sm:p-8 relative overflow-hidden">
          
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
              {isResetMode
                ? 'パスワードの再設定'
                : isSignUp
                ? '保護者様 アカウント作成'
                : '保護者様 ログイン'}
            </p>
          </div>

          {/* モード切替タブ（再設定モード時は非表示） */}
          {!isResetMode && (
            <div className="p-1 bg-[#E5DDD0]/50 rounded-2xl flex mb-6 border border-[#D8CEBF]">
              <button
                type="button"
                className={`w-1/2 py-2 text-xs font-black rounded-xl transition-all cursor-pointer ${
                  !isSignUp
                    ? 'bg-white text-[#D96B85] shadow-xs border border-[#D8CEBF]'
                    : 'text-gray-500 hover:text-gray-800'
                }`}
                onClick={() => {
                  setIsSignUp(false)
                  setMessage(null)
                }}
              >
                ログイン
              </button>
              <button
                type="button"
                className={`w-1/2 py-2 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-1 cursor-pointer ${
                  isSignUp
                    ? 'bg-white text-[#D96B85] shadow-xs border border-[#D8CEBF]'
                    : 'text-gray-500 hover:text-gray-800'
                }`}
                onClick={() => {
                  setIsSignUp(true)
                  setMessage(null)
                }}
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                新規会員登録
              </button>
            </div>
          )}

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

          {/* --- A. パスワード再設定フォーム --- */}
          {isResetMode ? (
            <form className="space-y-4" onSubmit={handleResetPassword}>
              <p className="text-xs text-gray-600 font-medium leading-relaxed bg-[#FFFEEF] p-3 rounded-xl border border-[#E5DDD0]">
                ご登録中のメールアドレスを入力してください。パスワード再設定用のリンクをお送りします。
              </p>

              <div>
                <label className="block text-xs font-black text-gray-700 mb-1 pl-1">
                  メールアドレス
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-4 w-4 text-gray-400" />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full pl-9 pr-3 py-2.5 bg-white border-2 border-[#E5DDD0] rounded-xl text-xs font-bold text-gray-800 focus:outline-none focus:border-[#D96B85] transition-all"
                    placeholder="example@mail.com"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-3 px-4 bg-[#D96B85] hover:bg-[#C0546E] text-white rounded-xl text-xs font-black shadow-xs transition-all flex justify-center items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    再設定用メールを送信する
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsResetMode(false)
                  setMessage(null)
                }}
                className="w-full text-center text-xs font-bold text-gray-500 hover:text-gray-800 pt-2 transition-colors cursor-pointer"
              >
                ログイン画面に戻る
              </button>
            </form>
          ) : (
            /* --- B. 通常のログイン / 新規登録フォーム --- */
            <form className="space-y-4" onSubmit={handleAuth}>
              <div>
                <label className="block text-xs font-black text-gray-700 mb-1 pl-1">
                  メールアドレス
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-4 w-4 text-gray-400" />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full pl-9 pr-3 py-2.5 bg-white border-2 border-[#E5DDD0] rounded-xl text-xs font-bold text-gray-800 focus:outline-none focus:border-[#D96B85] transition-all"
                    placeholder="example@mail.com"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1 pl-1 pr-0.5">
                  <label className="block text-xs font-black text-gray-700">
                    パスワード
                  </label>
                  {!isSignUp && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsResetMode(true)
                        setMessage(null)
                      }}
                      className="text-[11px] font-bold text-[#D96B85] hover:text-[#C0546E] transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <HelpCircle className="w-3 h-3" />
                      お忘れですか？
                    </button>
                  )}
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-4 w-4 text-gray-400" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full pl-9 pr-10 py-2.5 bg-white border-2 border-[#E5DDD0] rounded-xl text-xs font-bold text-gray-800 focus:outline-none focus:border-[#D96B85] transition-all"
                    placeholder="6文字以上のパスワード"
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

              {isSignUp && (
                <label className="flex items-start gap-2 pt-1 pl-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={agreedToTerms}
                    onChange={(e) => setAgreedToTerms(e.target.checked)}
                    className="mt-0.5 w-4 h-4 accent-[#D96B85] cursor-pointer shrink-0"
                  />
                  <span className="text-xs font-bold text-gray-700 leading-relaxed">
                    利用規約およびプライバシーポリシーの内容を確認し、これに同意します。
                    <br />
                    （
                    <Link href="/terms" target="_blank" rel="noopener noreferrer" className="text-[#D96B85] underline">
                      利用規約はこちら
                    </Link>
                    ）（
                    <Link href="/privacy" target="_blank" rel="noopener noreferrer" className="text-[#D96B85] underline">
                      プライバシーポリシーはこちら
                    </Link>
                    ）
                  </span>
                </label>
              )}

              <button
                type="submit"
                disabled={loading || (isSignUp && !agreedToTerms)}
                className="w-full mt-3 py-3 px-4 bg-[#D96B85] hover:bg-[#C0546E] text-white rounded-xl text-xs font-black shadow-xs transition-all flex justify-center items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : isSignUp ? (
                  '次へ（会員情報の入力）'
                ) : (
                  'ログインする'
                )}
              </button>
            </form>
          )}

        </div>
      </div>
    </main>
  )
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#F3ECE0] flex items-center justify-center text-xs font-bold text-gray-500">
          ファイルを読み込み中...
        </div>
      }
    >
      <LoginFormContent />
    </Suspense>
  )
}