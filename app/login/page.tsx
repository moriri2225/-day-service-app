'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { Mail, Lock, Loader2, Heart } from 'lucide-react'

// ★ searchParams を使用するコンポーネントを分離
function LoginFormContent() {
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null)

  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  const redirectTo = searchParams.get('redirectTo')

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    try {
      if (isSignUp) {
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

        router.push(redirectTo || '/register/profile')
        router.refresh()
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (error) throw error

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
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center items-center gap-2 text-teal-600 font-bold text-2xl">
          <span>カケハシファイル</span>
        </div>
        <h2 className="mt-4 text-center text-2xl font-bold tracking-tight text-gray-900">
          {isSignUp ? '新規会員登録' : '保護者ログイン'}
        </h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow rounded-lg sm:px-10 border border-slate-100">
          <div className="flex border-b border-gray-200 mb-6">
            <button
              type="button"
              className={`w-1/2 pb-3 text-center text-sm font-medium border-b-2 ${
                !isSignUp
                  ? 'border-teal-500 text-teal-600 font-bold'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
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
              className={`w-1/2 pb-3 text-center text-sm font-medium border-b-2 ${
                isSignUp
                  ? 'border-teal-500 text-teal-600 font-bold'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => {
                setIsSignUp(true)
                setMessage(null)
              }}
            >
              新規会員登録
            </button>
          </div>

          {message && (
            <div
              className={`p-3 rounded-md mb-6 text-sm ${
                message.type === 'error'
                  ? 'bg-red-50 text-red-700 border border-red-200'
                  : 'bg-teal-50 text-teal-700 border border-teal-200'
              }`}
            >
              {message.text}
            </div>
          )}

          <form className="space-y-5" onSubmit={handleAuth}>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                メールアドレス
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-teal-500 focus:border-teal-500 text-sm"
                  placeholder="example@mail.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                パスワード
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-teal-500 focus:border-teal-500 text-sm"
                  placeholder="6文字以上のパスワード"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-bold text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : isSignUp ? (
                '次へ（会員情報の入力）'
              ) : (
                'ログインする'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

// ★ メインのLoginPageコンポーネントで Suspense を適用
export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-xs font-bold text-gray-400">
        読み込み中...
      </div>
    }>
      <LoginFormContent />
    </Suspense>
  )
}
