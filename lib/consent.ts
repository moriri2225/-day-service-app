import type { SupabaseClient } from '@supabase/supabase-js'

// 同意取得時に提示している利用規約・プライバシーポリシーのバージョン識別子。
// /terms・/privacyの内容を改定した場合は、総務・法務部の正式版確定に合わせて
// このバージョン文字列も更新し、再同意フローの起点として使えるようにする。
export const CONSENT_POLICY_VERSION = '2026-08-27-draft-v1'

export type ConsentType = 'general' | 'sensitive_info'

/**
 * consentsテーブルに同意記録をinsertする。
 *
 * 注意: consentsテーブルは代表がSupabaseダッシュボードで別途作成する前提のため、
 * テーブル未作成の間はinsertが失敗しうる。その場合も呼び出し元の本来の処理
 * (会員登録・プロフィール保存)はブロックせず、失敗のログのみ残す。
 * 同意記録の内容自体はログに出力しない(data-privacy-compliance.md準拠)。
 */
export async function recordConsent(
  supabase: SupabaseClient,
  userId: string,
  consentType: ConsentType
): Promise<void> {
  const { error } = await supabase.from('consents').insert({
    user_id: userId,
    consent_type: consentType,
    policy_version: CONSENT_POLICY_VERSION,
  })

  if (error) {
    console.error(
      `[consent] 同意記録(${consentType})のinsertに失敗しました。consentsテーブルが未作成の可能性があります。`,
      error.message
    )
  }
}
