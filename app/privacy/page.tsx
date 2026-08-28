import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

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

        <div className="bg-[#FAF8F5] rounded-3xl border-2 border-[#D8CEBF] shadow-md p-6 sm:p-8 space-y-5 text-xs leading-relaxed text-gray-700">
          <div className="space-y-1">
            <h1 className="text-xl font-black text-gray-900">プライバシーポリシー</h1>
            <p className="text-[11px] font-bold text-gray-400">最終更新日: 2026年8月28日</p>
          </div>

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
            <p>
              運営会社は、取得した個人情報（要配慮個人情報を含みます）について、利用目的の達成に必要な範囲を超えて保有しないよう努めます（個人情報保護法22条）。具体的な保存の考え方は以下のとおりです。
            </p>
            <ul className="list-disc list-inside space-y-1">
              <li>
                アカウント情報・お子様に関する情報（受給者証番号・支給決定サービス種別を含みます）、施設とのメッセージ本文: 保護者様のアカウントが存在し、施設検索・見学申込・施設とのメッセージのやり取りという利用目的が継続する限り保存します。アカウントの削除をお申し出いただいた場合は、法令に基づき保存が必要な場合を除き、アカウント削除後6ヶ月以内に削除又は個人を特定できない形式への加工（匿名化）を行います。
              </li>
              <li>
                施設情報の変更履歴ログ（空き状況等の変更履歴）: 保護者様個人に関する情報ではなく施設運営データですが、監査対応・記録の正確性確保という目的の性質上、上記より長期の保存を想定しています。具体的な保存年数は、今後の運用状況を踏まえて確定し、確定次第本ポリシーを改定してお知らせします。
              </li>
              <li>法令の定めにより保存が義務付けられている情報は、当該法令の定める期間保存します。</li>
            </ul>
            <p>上記は本ポリシー作成時点（2026年8月）における運用方針です。</p>
          </section>

          <section className="space-y-1.5">
            <h2 className="font-black text-gray-900 text-sm">5. 開示・訂正・利用停止のご請求</h2>
            <p>
              ご本人（お子様に関する情報については、法定代理人であるご本人の保護者様）は、運営会社が保有する個人データについて、個人情報保護法の定めるところにより、利用目的の通知、開示、内容の訂正・追加・削除、利用停止・消去、第三者提供の停止等をご請求いただけます。
            </p>
            <p>
              ご請求をいただく場合は、下記の窓口までご連絡ください。運営会社にてご本人確認をさせていただいたうえで、法令に従い合理的な期間内に対応いたします。お子様に関する情報のご請求は、法定代理人（保護者）様からのご請求として受け付けます。
            </p>
            <p className="font-black text-gray-800">お問い合わせ窓口: 電話 070-2620-3064 / メール info@aluka.co.jp</p>
            <p>
              なお、ご請求の内容によっては、本サービスの一部機能（施設とのメッセージのやり取り等）がご利用いただけなくなる場合があります。
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

          <section className="space-y-1.5">
            <h2 className="font-black text-gray-900 text-sm">7. 事業者情報</h2>
            <dl className="space-y-1">
              <div className="flex gap-2">
                <dt className="font-black text-gray-800 shrink-0 w-40">運営会社</dt>
                <dd>合同会社Aluka</dd>
              </div>
              <div className="flex gap-2">
                <dt className="font-black text-gray-800 shrink-0 w-40">所在地</dt>
                <dd>大阪市浪速区稲荷2-7-1-606</dd>
              </div>
              <div className="flex gap-2">
                <dt className="font-black text-gray-800 shrink-0 w-40">代表者</dt>
                <dd>森 康平</dd>
              </div>
              <div className="space-y-0.5">
                <dt className="font-black text-gray-800">個人情報の取扱いに関するお問い合わせ窓口</dt>
                <dd>電話 070-2620-3064 / メール info@aluka.co.jp</dd>
              </div>
            </dl>
          </section>
        </div>
      </div>
    </main>
  )
}
