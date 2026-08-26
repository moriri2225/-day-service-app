'use client'

import { ShieldAlert } from 'lucide-react'

interface SensitiveInfoConsentProps {
  checked: boolean
  onChange: (checked: boolean) => void
}

// 受給者証番号・支給決定サービスの入力欄の直前に表示する要配慮個人情報の同意ブロック。
// 文言は総務・法務部(あいか)の同意取得フロー設計案(2026-08-26)2-2の文言案をそのまま使用。
// register/profile(Step2)・mypage編集フォームの両方で共通利用する。
export default function SensitiveInfoConsent({ checked, onChange }: SensitiveInfoConsentProps) {
  return (
    <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-4 space-y-2.5 text-xs">
      <p className="font-black text-gray-800 flex items-center gap-1.5">
        <ShieldAlert className="w-4 h-4 text-amber-600" />
        受給者証番号・ご利用サービスの登録について
      </p>
      <p className="text-gray-600 leading-relaxed">
        受給者証番号や支給決定されているサービスの種別は、個人情報保護法上「要配慮個人情報」に該当する情報です（お子様が障害福祉サービスの支給決定を受けている事実を示すためです）。
      </p>
      <p className="text-gray-600 leading-relaxed">登録すると、以下の目的で利用されます。</p>
      <ul className="list-disc list-inside text-gray-600 space-y-0.5">
        <li>保護者様に代わって、施設への見学申込・お問い合わせ内容に含めるため</li>
        <li>登録施設とのメッセージのやり取りで、お子様の状況を正確にお伝えいただくため</li>
      </ul>
      <p className="text-gray-600 leading-relaxed">
        これらの情報の入力は任意です。入力されない場合も、施設検索・お気に入り登録などの基本的な機能はご利用いただけます。
      </p>
      <label className="flex items-start gap-2 pt-1 cursor-pointer">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="mt-0.5 w-4 h-4 accent-amber-600 cursor-pointer shrink-0"
        />
        <span className="font-bold text-gray-800">
          上記の内容を確認し、受給者証番号・ご利用サービスの情報を登録することに同意します。
        </span>
      </label>
      <p className="text-[11px] text-gray-500 leading-relaxed">
        ※ 未成年のお子様に関する情報のため、この同意は法定代理人（保護者）としての同意として取り扱われます。
      </p>
    </div>
  )
}
