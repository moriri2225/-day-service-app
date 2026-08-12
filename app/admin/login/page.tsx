'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { Mail, Lock, Loader2, ArrowLeft, Building2 } from 'lucide-react'
import Link from 'next/link'

function AdminLoginFormContent() {
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [facilityName, setFacilityName] = useState('')
  const [address, setAddress] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null)

  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  const redirectTo = searchParams.get('redirectTo') || '/admin'

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error

      if (!data.user) {
        throw new Error('ユーザー情報の取得に失敗しました。')
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .maybeSingle()

      if (profile && profile.role === 'parent') {
        await supabase.auth.signOut()
        throw new Error('保護者アカウントでは事業者管理画面にログインできません。保護者様用ページをご利用ください。')
      }

      router.push(redirectTo)
      router.refresh()
    } catch (error: any) {
      console.error('Admin Auth Error:', error)
      setMessage({
        type: 'error',
        text: error.message || 'ログイン処理中にエラーが発生しました。',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleAdminSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    try {
      if (!facilityName.trim()) {
        throw new Error('施設名を入力してください。')
      }

      // 1. Supabase Authでユーザー作成
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      })

      if (signUpError) throw signUpError

      // セッションが確立していない場合は自動ログイン
      if (!signUpData.session) {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (signInError) throw signInError
      }

      const user = signUpData.user || (await supabase.auth.getUser()).data.user

      if (!user) {
        throw new Error('ユーザー情報の取得に失敗しました。')
      }

      // 2. profilesテーブルに事業者権限（role: 'facility'）としてレコードを作成
      const { error: profileError } = await supabase.from('profiles').upsert({
        id: user.id,
        email: user.email,
        role: 'facility',
      })

      if (profileError) throw profileError

      // 3. facilitiesテーブルにowner_id付きで自施設を新規作成
      const { error: facilityError } = await supabase.from('facilities').insert({
        name: facilityName,
        address: address || null,
        phone_number: phoneNumber || null,
        owner_id: user.id,
      })

      if (facilityError) throw facilityError

      router.push('/admin')
      router.refresh()
    } catch (error: any) {
      console.error('Admin SignUp Error:', error)
      setMessage({
        type: 'error',
        text: error.message || error.error_description || '登録処理中にエラーが発生しました。',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex items-center justify-between mb-6 px-4 sm:px-0">
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-xs font-bold text-gray-500 hover:text-gray-800 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            トップへ戻る
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-teal-200 text-teal-700 hover:bg-teal-50 rounded-lg text-xs font-bold transition-all shadow-xs"
          >
            保護者様はこちら
          </Link>
        </div>

        <div className="flex justify-center items-center gap-2 text-teal-600 font-bold text-2xl">
          <Building2 className="w-7 h-7" />
          <span>カケハシファイル</span>
        </div>
        <h2 className="mt-3 text-center text-2xl font-bold tracking-tight text-gray-900">
          {isSignUp ? '施設事業者様 新規登録' : '施設事業者様 ログイン'}
        </h2>
        <p className="mt-1 text-center text-xs text-gray-500 font-medium">
          空き状況の変更や施設情報の管理はこちらからログインしてください。
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-sm rounded-xl sm:px-10 border border-slate-200">
          <div className="flex border-b border-gray-200 mb-6">
            <button
              type="button"
              className={`w-1/2 pb-3 text-center text-sm font-medium border-b-2 transition-all ${
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
              className={`w-1/2 pb-3 text-center text-sm font-medium border-b-2 transition-all ${
                isSignUp
                  ? 'border-teal-500 text-teal-600 font-bold'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => {
                setIsSignUp(true)
                setMessage(null)
              }}
            >
              新規登録
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

          <form className="space-y-5" onSubmit={isSignUp ? handleAdminSignUp : handleAdminLogin}>
            {isSignUp && (
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  施設名 <span className="text-red-500">*</span>
                </label>
                <div className="mt-1">
                  <input
                    type="text"
                    required
                    value={facilityName}
                    onChange={(e) => setFacilityName(e.target.value)}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-teal-500 focus:border-teal-500 text-sm"
                    placeholder="例: スマイルキッズ渋谷"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700">
                事業者用メールアドレス
              </label>
              <div className="mt-1 relative rounded-md shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-teal-500 focus:border-teal-500 text-sm"
                  placeholder="facility@example.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                パスワード
              </label>
              <div className="mt-1 relative rounded-md shadow-xs">
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
                  placeholder={isSignUp ? '6文字以上のパスワード' : '••••••••'}
                />
              </div>
            </div>

            {isSignUp && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    住所（任意）
                  </label>
                  <div className="mt-1">
                    <input
                      type="text"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-teal-500 focus:border-teal-500 text-sm"
                      placeholder="例: 東京都渋谷区神南1-2-3"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    電話番号（任意）
                  </label>
                  <div className="mt-1">
                    <input
                      type="text"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-teal-500 focus:border-teal-500 text-sm"
                      placeholder="例: 03-1234-5678"
                    />
                  </div>
                </div>
              </>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-md shadow-xs text-sm font-bold text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 disabled:opacity-50 cursor-pointer transition-colors"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : isSignUp ? (
                '施設を登録してはじめる'
              ) : (
                '事業者管理画面へログイン'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

// ★最下部で `export default` していることを確認
export default function AdminLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center text-xs font-bold text-gray-400">
          読み込み中...
        </div>
      }
    >
      <AdminLoginFormContent />
    </Suspense>
  )
}
