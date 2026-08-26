import Link from 'next/link'
import { ArrowLeft, AlertTriangle } from 'lucide-react'

// 実装検証用の暫定ページ。正式なプライバシーポリシー本文の作成・確定は総務・法務部の
// 別タスク(2026-08-24チェック結果の申し送り事項2)であり、このページの文言をもって
// 正式なプライバシーポリシーとはしない。記載項目は総務・法務部あいかの
// 同意取得フロー設計案(2026-08-26)2-3を基にした最小限のものである。
export default function PrivacyPage() {
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
          <h1 className="text-xl font-black text-gray-900">プライバシーポリシー（暫定版）</h1>

          <section className="space-y-1.5">
            <h2 className="font-black text-gray-900 text-sm">1. 取得する個人情報と利用目的</h2>
            <p>
              本サービスは、保護者様およびお子様に関する個人情報（受給者証番号・支給決定サービス等の要配慮個人情報を含みます）を、施設検索・見学申込・施設とのメッセージのやり取りのために取得・利用します。
            </p>
            <p className="font-black text-gray-800 mt-2">取得する個人情報の項目（例）</p>
            <ul className="list-disc list-inside space-y-0.5">
              <li>保護者氏名・連絡先・住所</li>
              <li>児童氏名・生年月日</li>
              <li>受給者証番号・支給決定されているサービス種別</li>
              <li>施設とのメッセージ本文</li>
            </ul>
          </section>

          <section className="space-y-1.5">
            <h2 className="font-black text-gray-900 text-sm">2. 要配慮個人情報について</h2>
            <p>
              受給者証番号・支給決定されているサービス種別は、個人情報保護法上の要配慮個人情報に該当し得る情報として扱います。これらの情報は任意入力であり、入力にあたっては別途チェックボックスによる同意をお願いしています。
            </p>
          </section>

          <section className="space-y-1.5">
            <h2 className="font-black text-gray-900 text-sm">3. 第三者提供</h2>
            <p>
              見学申込・メッセージ機能を通じてご入力・送信いただいた情報は、お問い合わせ先の施設スタッフに開示されます。これは保護者様ご自身の能動的なご操作による開示であり、当該情報は運営会社を経由して保存・処理されます。
            </p>
          </section>

          <section className="space-y-1.5">
            <h2 className="font-black text-gray-900 text-sm">4. 保存期間</h2>
            <p>保存期間の具体的な考え方は、総務・法務部による確定後に別途掲載します。</p>
          </section>

          <section className="space-y-1.5">
            <h2 className="font-black text-gray-900 text-sm">5. 開示・訂正・利用停止のご請求</h2>
            <p>
              保有する個人情報の開示・訂正・利用停止等をご希望の場合の窓口については、総務・法務部による確定後に別途掲載します。
            </p>
          </section>

          <section className="space-y-1.5">
            <h2 className="font-black text-gray-900 text-sm">6. 関連ページ</h2>
            <p>
              <Link href="/terms" className="text-[#D96B85] font-black underline">
                利用規約
              </Link>
              もあわせてご確認ください。
            </p>
          </section>
        </div>
      </div>
    </main>
  )
}
