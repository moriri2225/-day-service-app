'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase'; // パスエラーが出る場合は '../lib/supabase' などに変更
import Auth from '@/components/Auth';

type Facility = {
  id: number;
  name: string;
  area: string;
  status: string;
  count: number;
  badge_color: string;
};

export default function Home() {
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);

  // 検索・絞り込み用
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedArea, setSelectedArea] = useState('すべて');

  // 新規登録フォーム用
  const [name, setName] = useState('');
  const [area, setArea] = useState('渋谷区');
  const [status, setStatus] = useState('空きあり');
  const [count, setCount] = useState(1);

  // 編集モーダル用
  const [editingFacility, setEditingFacility] = useState<Facility | null>(null);

  useEffect(() => {
    fetchFacilities();

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchFacilities = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('facilities')
      .select('*')
      .order('id', { ascending: true });

    if (error) console.error('データ取得エラー:', error);
    else if (data) setFacilities(data);
    setLoading(false);
  };

  // バッジカラー自動決定ロジック
  const getBadgeColor = (statusText: string) => {
    if (statusText === '残りわずか') return 'bg-amber-100 text-amber-800';
    if (statusText === '満員') return 'bg-rose-100 text-rose-800';
    return 'bg-emerald-100 text-emerald-800';
  };

  // 施設追加
  const handleAddFacility = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const badgeColor = getBadgeColor(status);

    const { error } = await supabase.from('facilities').insert([
      {
        name,
        area,
        status,
        count: status === '満員' ? 0 : count,
        badge_color: badgeColor,
      },
    ]);

    if (error) {
      alert('追加に失敗しました');
    } else {
      setName('');
      fetchFacilities();
    }
  };

  // 施設削除
  const handleDeleteFacility = async (id: number, facilityName: string) => {
    if (!confirm(`「${facilityName}」を削除してもよろしいですか？`)) return;

    const { error } = await supabase.from('facilities').delete().eq('id', id);

    if (error) {
      alert('削除に失敗しました');
      console.error(error);
    } else {
      fetchFacilities();
    }
  };

  // 施設更新（編集の保存）
  const handleUpdateFacility = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingFacility) return;

    const badgeColor = getBadgeColor(editingFacility.status);

    const { error } = await supabase
      .from('facilities')
      .update({
        name: editingFacility.name,
        area: editingFacility.area,
        status: editingFacility.status,
        count: editingFacility.status === '満員' ? 0 : editingFacility.count,
        badge_color: badgeColor,
      })
      .eq('id', editingFacility.id);

    if (error) {
      alert('更新に失敗しました');
      console.error(error);
    } else {
      setEditingFacility(null);
      fetchFacilities();
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const filteredFacilities = facilities.filter((f) => {
    const matchesSearch = f.name.includes(searchTerm);
    const matchesArea = selectedArea === 'すべて' || f.area === selectedArea;
    return matchesSearch && matchesArea;
  });

  return (
    <main className="max-w-4xl mx-auto p-6 space-y-8">
      {/* ヘッダー */}
      <div className="flex justify-between items-center border-b pb-4">
        <h1 className="text-2xl font-bold text-gray-800">放課後等デイサービス 施設検索</h1>
        <div>
          {user ? (
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-500">{user.email} (管理者)</span>
              <button
                onClick={handleLogout}
                className="text-sm bg-gray-200 hover:bg-gray-300 text-gray-700 px-3 py-1.5 rounded-md"
              >
                ログアウト
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowAuthModal(!showAuthModal)}
              className="text-sm bg-slate-800 hover:bg-slate-900 text-white px-4 py-2 rounded-md font-medium"
            >
              {showAuthModal ? '閉じる' : '管理者ログイン'}
            </button>
          )}
        </div>
      </div>

      {/* ログインフォーム */}
      {showAuthModal && !user && (
        <Auth onLoginSuccess={() => setShowAuthModal(false)} />
      )}

      {/* 新規施設追加フォーム (管理者のみ) */}
      {user ? (
        <section className="bg-blue-50/50 border border-blue-200 p-6 rounded-xl shadow-sm">
          <h2 className="text-lg font-semibold text-blue-900 mb-4">＋ 新しい施設を追加（管理者機能）</h2>
          <form onSubmit={handleAddFacility} className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <input
              type="text"
              placeholder="施設名"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="p-2 border rounded-md border-gray-300 md:col-span-2"
              required
            />
            <select
              value={area}
              onChange={(e) => setArea(e.target.value)}
              className="p-2 border rounded-md border-gray-300"
            >
              <option value="渋谷区">渋谷区</option>
              <option value="新宿区">新宿区</option>
              <option value="世田谷区">世田谷区</option>
            </select>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="p-2 border rounded-md border-gray-300"
            >
              <option value="空きあり">空きあり</option>
              <option value="残りわずか">残りわずか</option>
              <option value="満員">満員</option>
            </select>
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium p-2 rounded-md transition"
            >
              追加する
            </button>
          </form>
        </section>
      ) : (
        <p className="text-sm text-gray-500 bg-gray-100 p-3 rounded-lg text-center">
          💡 施設の追加・編集・削除を行うには右上から「管理者ログイン」を行ってください。
        </p>
      )}

      {/* 検索＆エリア絞り込み */}
      <section className="flex flex-col sm:flex-row gap-4 items-center bg-gray-50 p-4 rounded-lg">
        <input
          type="text"
          placeholder="施設名で検索..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="p-2 border border-gray-300 rounded-md w-full sm:w-1/2"
        />
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-sm font-medium text-gray-600 shrink-0">エリア:</span>
          <select
            value={selectedArea}
            onChange={(e) => setSelectedArea(e.target.value)}
            className="p-2 border border-gray-300 rounded-md w-full"
          >
            <option value="すべて">すべて</option>
            <option value="渋谷区">渋谷区</option>
            <option value="新宿区">新宿区</option>
            <option value="世田谷区">世田谷区</option>
          </select>
        </div>
      </section>

      {/* 施設一覧 */}
      <section>
        {loading ? (
          <p className="text-gray-500 text-center py-8">読み込み中...</p>
        ) : filteredFacilities.length === 0 ? (
          <p className="text-gray-500 text-center py-8">該当する施設が見つかりませんでした。</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredFacilities.map((f) => (
              <div key={f.id} className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-lg text-gray-900">{f.name}</h3>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${f.badge_color}`}>
                      {f.status}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600 space-y-1 mb-4">
                    <p>📍 エリア: {f.area}</p>
                    <p>👥 空き枠数: {f.count}名</p>
                  </div>
                </div>

                {/* 管理者用操作ボタン */}
                {user && (
                  <div className="flex gap-2 border-t pt-3 mt-2 justify-end">
                    <button
                      onClick={() => setEditingFacility(f)}
                      className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded"
                    >
                      ✏️ 編集
                    </button>
                    <button
                      onClick={() => handleDeleteFacility(f.id, f.name)}
                      className="text-xs bg-rose-50 hover:bg-rose-100 text-rose-600 px-3 py-1.5 rounded"
                    >
                      🗑️ 削除
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 編集モーダル */}
      {editingFacility && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full space-y-4 shadow-xl">
            <h3 className="text-lg font-bold text-gray-800">施設の情報を編集</h3>
            <form onSubmit={handleUpdateFacility} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">施設名</label>
                <input
                  type="text"
                  value={editingFacility.name}
                  onChange={(e) => setEditingFacility({ ...editingFacility, name: e.target.value })}
                  className="w-full p-2 border rounded-md border-gray-300 text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">エリア</label>
                <select
                  value={editingFacility.area}
                  onChange={(e) => setEditingFacility({ ...editingFacility, area: e.target.value })}
                  className="w-full p-2 border rounded-md border-gray-300 text-sm"
                >
                  <option value="渋谷区">渋谷区</option>
                  <option value="新宿区">新宿区</option>
                  <option value="世田谷区">世田谷区</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">ステータス</label>
                  <select
                    value={editingFacility.status}
                    onChange={(e) => setEditingFacility({ ...editingFacility, status: e.target.value })}
                    className="w-full p-2 border rounded-md border-gray-300 text-sm"
                  >
                    <option value="空きあり">空きあり</option>
                    <option value="残りわずか">残りわずか</option>
                    <option value="満員">満員</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">空き枠数（名）</label>
                  <input
                    type="number"
                    min="0"
                    value={editingFacility.count}
                    onChange={(e) => setEditingFacility({ ...editingFacility, count: Number(e.target.value) })}
                    className="w-full p-2 border rounded-md border-gray-300 text-sm"
                    disabled={editingFacility.status === '満員'}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setEditingFacility(null)}
                  className="px-4 py-2 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-md"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-md font-medium"
                >
                  保存する
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
