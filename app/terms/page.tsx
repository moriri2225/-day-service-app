import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

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

        <div className="bg-[#FAF8F5] rounded-3xl border-2 border-[#D8CEBF] shadow-md p-6 sm:p-8 space-y-5 text-xs leading-relaxed text-gray-700">
          <div className="space-y-1">
            <h1 className="text-xl font-black text-gray-900">利用規約</h1>
            <p className="text-[11px] font-bold text-gray-400">最終更新日: 2026年8月28日</p>
          </div>

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

          <section className="space-y-3">
            <h2 className="font-black text-gray-900 text-sm">3. 禁止事項・免責事項等</h2>

            <div className="space-y-1.5">
              <h3 className="font-black text-gray-800 text-xs">3-1. 禁止事項</h3>
              <p>
                ご利用者様には、本サービスのご利用にあたり、以下の行為を禁止いたします。
              </p>
              <ol className="list-decimal list-inside space-y-1">
                <li>法令又は公序良俗に違反する行為</li>
                <li>不正アクセス、他のご利用者になりすます行為</li>
                <li>他者（お子様を含みます）の個人情報を、本人又は法定代理人の同意なく無断で投稿・共有する行為</li>
                <li>事業所又は他のご利用者に対する迷惑行為、誹謗中傷、威圧的な言動</li>
                <li>施設情報、受給者証番号、支給決定サービスの種別その他本サービスに登録する情報について、虚偽の内容を登録する行為</li>
                <li>法定代理人としての正当な権限なく、お子様に関する情報を登録する行為</li>
                <li>施設とのメッセージのやり取りを通じて知り得た他のご利用者の情報を、目的外に利用し、又は本人の同意なく第三者に提供する行為</li>
                <li>本サービス（施設検索・見学申込・施設とのメッセージのやり取り）の本来の目的以外での利用（勧誘・営業目的での無断利用等）</li>
                <li>本サービスのシステムに過度な負荷をかける行為、不正なプログラムを送信する行為、リバースエンジニアリングその他本サービスの解析を試みる行為</li>
                <li>その他、運営会社が本サービスの運営上不適切と合理的に判断する行為</li>
              </ol>
            </div>

            <div className="space-y-1.5">
              <h3 className="font-black text-gray-800 text-xs">3-2. 免責事項</h3>
              <ol className="list-decimal list-inside space-y-1">
                <li>
                  本サービスに掲載する施設情報（空き状況、最終更新日時、施設基本情報等）は、各事業所からのご入力に基づくものです。運営会社は、当該情報の正確性・最新性・完全性を保証するものではありません。ご利用にあたっては、必ず施設に直接ご確認ください。
                </li>
                <li>施設からの回答の有無・速度、見学対応の可否等は施設ごとに異なり、運営会社が保証するものではありません。</li>
                <li>
                  保護者様と施設との間で行われる見学・お問い合わせへの対応・契約・サービス利用開始等のやり取りは、当事者間の責任において行われるものとします。運営会社は、双方の情報連携の場を提供するものであり、当事者間の契約関係の当事者にはなりません。
                </li>
                <li>
                  運営会社は、通信障害、本サービスのシステム障害、天災その他の不可抗力により本サービスの全部又は一部がご利用いただけなかったことについて、運営会社の故意又は重過失による場合を除き、責任を負わないものとします。
                </li>
                <li>
                  運営会社が損害賠償責任を負う場合であっても、その責任の範囲は、運営会社の故意又は重過失による場合を除き、法令上許容される範囲に限定されるものとします。ただし、消費者契約法その他の強行法規に反する場合は、この限りではありません。
                </li>
              </ol>
            </div>

            <div className="space-y-1.5">
              <h3 className="font-black text-gray-800 text-xs">3-3. 準拠法・管轄裁判所</h3>
              <p>
                本規約の準拠法は日本法とします。本サービスに関して運営会社とご利用者様との間に生じた紛争については、東京地方裁判所を第一審の専属的合意管轄裁判所とします。
              </p>
            </div>
          </section>

          <section className="space-y-1.5">
            <h2 className="font-black text-gray-900 text-sm">4. 事業者情報</h2>
            <dl className="space-y-1">
              <div className="flex gap-2">
                <dt className="font-black text-gray-800 shrink-0 w-28">運営会社</dt>
                <dd>合同会社Aluka</dd>
              </div>
              <div className="flex gap-2">
                <dt className="font-black text-gray-800 shrink-0 w-28">所在地</dt>
                <dd>大阪市浪速区稲荷2-7-1-606</dd>
              </div>
              <div className="flex gap-2">
                <dt className="font-black text-gray-800 shrink-0 w-28">代表者</dt>
                <dd>森 康平</dd>
              </div>
              <div className="flex gap-2">
                <dt className="font-black text-gray-800 shrink-0 w-28">お問い合わせ窓口</dt>
                <dd>電話 070-2620-3064 / メール info@aluka.co.jp</dd>
              </div>
            </dl>
          </section>
        </div>
      </div>
    </main>
  )
}
