import Link from 'next/link'
import { ArrowLeft, AlertTriangle } from 'lucide-react'

// 実装検証用の暫定ページ。正式な利用規約本文の作成・確定は総務・法務部の別タスクであり、
// このページの文言をもって正式な利用規約とはしない。
export default function TermsPage() {
  return (
    <main className="min-h-screen bg-[#F3ECE0] text-gray-800 p-4 sm:p-8 font-sans">
      <div className="max-w-2xl mx-auto space-y-5">
        <Link
          href="/login"
          className="inline-flex px-3.5 py-1.5 bg-white hover:bg-[#FFF0F3] text-gray-700 hover:text-[#D96B85] border-2 border-[#D8CEBF] hover:border-[#F8C3CE] rounded-xl text-xs font-black transition-all items-center gap-1.5 shadow-xs"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          戻る
        </Link>

        <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-4 flex items-start gap-2.5 text-xs text-amber-900 font-bold">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <span>
            本ページは実装検証用の暫定版であり、総務・法務部による正式な文言確定前のものです。記載内容は今後変更される可能性があります。
          </span>
        </div>

        <div className="bg-[#FAF8F5] rounded-3xl border-2 border-[#D8CEBF] shadow-md p-6 sm:p-8 space-y-5 text-xs leading-relaxed text-gray-700">
          <h1 className="text-xl font-black text-gray-900">利用規約（暫定版）</h1>

          <section className="space-y-1.5">
            <h2 className="font-black text-gray-900 text-sm">1. サービス概要</h2>
            <p>
              本サービス「カケハシファイル」は、保護者様と障害児通所支援事業所をつなぐ施設検索・見学申込・メッセージ機能を提供します。
            </p>
          </section>

          <section className="space-y-1.5">
            <h2 className="font-black text-gray-900 text-sm">2. 個人情報の取扱い</h2>
            <p>
              個人情報の取得目的・取扱いの詳細は
              <Link href="/privacy" className="text-[#D96B85] font-black underline mx-1">
                プライバシーポリシー
              </Link>
              をご確認ください。
            </p>
          </section>

          <section className="space-y-1.5">
            <h2 className="font-black text-gray-900 text-sm">3. 禁止事項・免責事項等</h2>
            <p>
              禁止事項・免責事項・準拠法等の具体的な条項は、総務・法務部による正式版の確定をもって別途掲載します。
            </p>
          </section>
        </div>
      </div>
    </main>
  )
}
