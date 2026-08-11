import type { Metadata, Viewport } from 'next';
import './globals.css'; // 既存のスタイル読み込み

// 1. アプリ情報・PWA（ホーム画面追加時）の設定
export const metadata: Metadata = {
  title: '施設空き状況ナビ',
  description: '放課後等デイサービス・児童発達支援の空き状況確認アプリ',
  manifest: '/manifest.json', // 1で作った設定ファイルを読み込む
  appleWebApp: {
    capable: true, // iPhoneでアプリのようにフルスクリーン表示を許可
    statusBarStyle: 'default',
    title: '施設ナビ',
  },
};

// 2. スマホ表示用の画面サイズ・テーマカラー設定
export const viewport: Viewport = {
  themeColor: '#2C9381', // アプリの上部バーの色
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1, // 勝手なズームを防ぎアプリ感を出す
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <head>
        {/* 文字化けを絶対に防ぐ宣言 */}
        <meta charSet="utf-8" />
        {/* iPhone用のアイコン設定 */}
        <link rel="apple-touch-icon" href="/icon-192.png" />
      </head>
      <body>{children}</body>
    </html>
  );
}
