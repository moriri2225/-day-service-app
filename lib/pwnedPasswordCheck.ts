/**
 * Have I Been Pwned の Pwned Passwords API（k-匿名性方式）を使って、
 * パスワードが既知の漏えいパスワードと一致していないかを確認するユーティリティ。
 *
 * - パスワード本体や SHA-1 ハッシュの全体は外部に送信しない。
 *   ハッシュの先頭5文字（prefix）のみを送信し、レスポンスに含まれる
 *   候補群（残り35文字＝suffix の一覧）とクライアント側で突き合わせる
 *   （k-匿名性: https://haveibeenpwned.com/API/v3#PwnedPasswords）。
 * - APIキー不要・無料の公開APIで、外部npmパッケージには依存しない
 *   （SHA-1計算はブラウザ標準の Web Crypto API を使用）。
 * - API呼び出しが失敗・タイムアウトした場合は、登録・パスワード変更処理
 *   自体をブロックしないフェイルオープン方針とする（可用性を優先）。
 *   失敗はconsole.errorに記録するが、パスワードの値は一切出力しない。
 */

const HIBP_RANGE_API_BASE = 'https://api.pwnedpasswords.com/range/'
const REQUEST_TIMEOUT_MS = 5000

async function sha1Hex(text: string): Promise<string> {
  const data = new TextEncoder().encode(text)
  const hashBuffer = await crypto.subtle.digest('SHA-1', data)
  return Array.from(new Uint8Array(hashBuffer))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase()
}

/**
 * 指定したパスワードが Have I Been Pwned の漏えいパスワード一覧に
 * 含まれているかどうかを確認する。
 *
 * @returns 漏えい確認済みパスワードなら true、未確認 or チェック不能（フェイルオープン）なら false
 */
export async function checkPasswordPwned(password: string): Promise<boolean> {
  try {
    const hash = await sha1Hex(password)
    const prefix = hash.slice(0, 5)
    const suffix = hash.slice(5)

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

    let response: Response
    try {
      response = await fetch(`${HIBP_RANGE_API_BASE}${prefix}`, {
        signal: controller.signal,
      })
    } finally {
      clearTimeout(timeoutId)
    }

    if (!response.ok) {
      console.error('HIBP Pwned Passwords API がエラーを返しました（フェイルオープンで続行）:', response.status)
      return false
    }

    const body = await response.text()
    return body
      .split('\n')
      .some((line) => line.split(':')[0]?.trim() === suffix)
  } catch (error) {
    // ネットワークエラー・タイムアウト等。パスワードの値はログに出さない。
    console.error(
      'HIBP Pwned Passwords API の呼び出しに失敗しました（フェイルオープンで続行）:',
      error instanceof Error ? error.message : error
    )
    return false
  }
}
