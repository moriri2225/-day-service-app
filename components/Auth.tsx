'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase'; // パスが合わない場合は調整してください
import { checkPasswordPwned } from '@/lib/pwnedPasswordCheck';

export default function Auth({ onLoginSuccess }: { onLoginSuccess: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    if (isSignUp) {
      // 新規登録
      if (password.length < 12) {
        setMessage('エラー: パスワードは12文字以上で入力してください。');
        setLoading(false);
        return;
      }
      const isPwned = await checkPasswordPwned(password);
      if (isPwned) {
        setMessage(
          'エラー: このパスワードは、過去に漏えいの記録があるものと一致しました。恐れ入りますが、別のパスワードをお試しください。'
        );
        setLoading(false);
        return;
      }
      const { error } = await supabase.auth.signUp({
        email,
        password,
      });
      if (error) {
        setMessage(`エラー: ${error.message}`);
      } else {
        setMessage('登録完了！メールを確認するか、そのままログインしてください。');
      }
    } else {
      // ログイン
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        setMessage(`ログインエラー: ${error.message}`);
      } else {
        setMessage('ログインしました！');
        onLoginSuccess();
      }
    }
    setLoading(false);
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 max-w-md mx-auto my-4">
      <h2 className="text-xl font-bold text-gray-800 mb-4 text-center">
        {isSignUp ? '管理者 アカウント作成' : '管理者 ログイン'}
      </h2>

      <form onSubmit={handleAuth} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">メールアドレス</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full p-2 border rounded-md border-gray-300"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">パスワード</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-2 border rounded-md border-gray-300"
            minLength={12}
            required
          />
        </div>

        {message && <p className="text-sm text-blue-600 font-medium">{message}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium p-2 rounded-md transition disabled:opacity-50"
        >
          {loading ? '処理中...' : isSignUp ? '新規登録' : 'ログイン'}
        </button>
      </form>

      <button
        onClick={() => setIsSignUp(!isSignUp)}
        className="mt-4 text-xs text-gray-500 hover:underline w-full text-center block"
      >
        {isSignUp ? 'すでにアカウントをお持ちの方（ログインへ）' : 'アカウント作成はこちら'}
      </button>
    </div>
  );
}
