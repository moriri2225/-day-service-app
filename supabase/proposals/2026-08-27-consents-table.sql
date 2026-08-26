-- 提案SQL: consentsテーブル(利用規約・要配慮個人情報の同意記録)
-- 起票: PRD開発部 ゆうあ / 2026-08-27
-- 元設計: outputs/kakehashi-project/2026-08-26-consent-flow-aika.md 3章
--
-- 注意: このファイルはゆうあが「提案」として作成したものであり、
-- ゆうあ自身はテーブル作成・RLS設定を実行する権限(service_role等)を持たない。
-- 代表がSupabaseダッシュボード(SQL Editor)で内容を確認の上、実際に適用すること。

-- 1. テーブル本体
create table if not exists public.consents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  -- 'general'     = 利用規約・プライバシーポリシーへの包括同意(Step1)
  -- 'sensitive_info' = 受給者証番号・支給決定サービス種別に関する要配慮情報同意(Step2/マイページ)
  consent_type text not null check (consent_type in ('general', 'sensitive_info')),
  -- 同意した規約・ポリシーのバージョン(lib/consent.ts の CONSENT_POLICY_VERSION と対応)
  policy_version text not null,
  -- 同意日時。アプリ側からは明示的にセットせず、insert時刻をそのまま正とする。
  consented_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

comment on table public.consents is
  'アプリ画面上のチェックボックス操作による能動的な同意のみを記録するテーブル。黙示の同意は記録しない。';

create index if not exists consents_user_id_idx on public.consents (user_id);

-- 2. RLS有効化
alter table public.consents enable row level security;

-- 3. RLSポリシー: 本人のみ自分の同意記録をinsert/selectできる。updateもdeleteも不可。
--    (update/deleteのポリシーを意図的に作成しない。RLS有効化下でポリシーが存在しない操作は
--     全て拒否されるため、これによりupdate/deleteは常に拒否される。)

drop policy if exists consents_select_own on public.consents;
create policy consents_select_own
  on public.consents
  for select
  using (auth.uid() = user_id);

drop policy if exists consents_insert_own on public.consents;
create policy consents_insert_own
  on public.consents
  for insert
  with check (auth.uid() = user_id);

-- update/delete用のポリシーは意図的に作成しない(同意記録は後から書き換え・削除できない設計とする)。
