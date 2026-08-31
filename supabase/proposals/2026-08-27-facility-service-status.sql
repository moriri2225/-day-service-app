-- 2026-08-27: 代表決定によりステータス管理機能自体を撤回したため、本提案SQLは適用不要。
-- (訪問系・相談支援系は「事業所情報+問い合わせ」のみのシンプル仕様に変更。詳細は
--  outputs/kakehashi-project/2026-08-27-visit-consultation-simplify-yua.md を参照)
--
-- 追記(2026-09-01): 代表決定によりサービス種別「in_home_developmental_support」
-- (居宅訪問型児童発達支援)自体を廃止した(lib/serviceTypes.ts等から削除済み)。
-- 本ファイルは元々未適用のため追加対応は不要だが、万一将来これを参考に適用する場合は
-- 下記check制約から'in_home_developmental_support'を除外すること。
--
-- 提案SQL: 訪問系2種別・相談支援系1種別の対応状況テーブル新設
-- 起票: PRD開発部 ゆうあ / 2026-08-27
-- 元設計: outputs/kakehashi-project/2026-08-27-ux-design-4-3-honoka.md 3〜5章
-- 前提となる代表決定事項(2026-08-27、設計書「代表・PM確認事項」への回答):
--   3. 「空きが多い順」ソートは通所系のみに適用する(訪問系・相談支援系向けの統一ロジックは作らない)
--   4. 訪問系の対応状況は曜日単位で持たない(全体で1つのステータスのみ)
--
-- 注意: このファイルはゆうあが「提案」として作成したものであり、
-- ゆうあ自身はテーブル作成権限(service_role等)を持たない。
-- 代表がSupabaseダッシュボード(SQL Editor)で内容を確認の上、適用すること。
-- 未適用の間、アプリコード側はこのテーブルへの読み書きが失敗する前提で
-- 「情報がありません」表示にフォールバックする設計にしてあるため、
-- 適用タイミングを急ぐ必要はない(UXをブロックしない)。

-- ============================================================
-- 1. テーブル本体
-- ============================================================
-- 通所系2種別(既存schedules)とは異なり、曜日×○/▲/×のグリッドを持たない。
-- 施設×サービス種別ごとに1レコードのみ(unique制約)。
create table if not exists public.facility_service_status (
  id                bigserial primary key,
  facility_id       integer not null references public.facilities(id) on delete cascade,
  service_type      text not null check (service_type in (
                       'home_visit_support',
                       'in_home_developmental_support',
                       'consultation_support'
                     )),
  -- statusは既存schedules.statusと同じ語彙(available/few/full)をあえて再流用する。
  -- 理由: 管理画面のボタン(◯/▲/×)の見た目・実装をそのまま流用でき、事業所スタッフの
  -- 学習コストを増やさないため(設計書5章)。ラベル文言はUI側で「空き」ではなく
  -- 「対応状況」「受付状況」に置き換える。相談支援系はfewを使わず2値(available/full)
  -- のみで運用する想定だが、DBレベルでservice_typeごとに許容値を分けるcheck制約は
  -- 過剰設計と判断し設けていない(アプリ側のUIで2択ボタンに絞ることで担保する)。
  status            text not null default 'available' check (status in ('available', 'few', 'full')),
  -- 「現在対応可能な新規件数」(訪問系のみ入力を想定。任意)
  available_count   integer,
  -- 「対応可能エリア・特記事項」(訪問系)/「受付にあたっての備考」(相談支援系)。任意の自由記述。
  -- 文字数上限はアプリ側のtextarea maxLengthで500文字程度に抑える想定(DBレベルでは制限しない)。
  note              text,
  updated_at        timestamptz not null default now(),

  unique (facility_id, service_type)
);

comment on table public.facility_service_status is
  '訪問系2種別・相談支援系1種別の「対応状況」。通所系のschedules(曜日×○/▲/×)とは別構造で、施設×サービス種別ごとに1レコードのみ持つ。';

create index if not exists facility_service_status_facility_id_idx
  on public.facility_service_status (facility_id);

-- ============================================================
-- 2. RLS有効化
-- ============================================================
alter table public.facility_service_status enable row level security;

-- SELECT: 検索画面・施設詳細ページは未ログインの保護者からも閲覧できる必要があるため、
-- 既存schedulesと同じ方針で全公開とする。
drop policy if exists facility_service_status_select_public on public.facility_service_status;
create policy facility_service_status_select_public
  on public.facility_service_status
  for select
  using (true);

-- INSERT/UPDATE/DELETE (旧owner_idベース。既存facilities/schedulesの
-- 書き込みポリシーと同じ考え方。法人管理者/施設スタッフ権限モデルの
-- 提案(organizations-rls.sql)が未適用の環境でもこのポリシーだけで動作する)。
drop policy if exists facility_service_status_insert_owner on public.facility_service_status;
create policy facility_service_status_insert_owner
  on public.facility_service_status
  for insert
  with check (
    exists (
      select 1 from public.facilities f
      where f.id = facility_service_status.facility_id
        and f.owner_id = auth.uid()
    )
  );

drop policy if exists facility_service_status_update_owner on public.facility_service_status;
create policy facility_service_status_update_owner
  on public.facility_service_status
  for update
  using (
    exists (
      select 1 from public.facilities f
      where f.id = facility_service_status.facility_id
        and f.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.facilities f
      where f.id = facility_service_status.facility_id
        and f.owner_id = auth.uid()
    )
  );

drop policy if exists facility_service_status_delete_owner on public.facility_service_status;
create policy facility_service_status_delete_owner
  on public.facility_service_status
  for delete
  using (
    exists (
      select 1 from public.facilities f
      where f.id = facility_service_status.facility_id
        and f.owner_id = auth.uid()
    )
  );

-- ============================================================
-- 3. 【依存注意】法人管理者(org_admin)/施設スタッフ(facility_staff)の書き込み権限
-- ============================================================
-- 下記3ポリシーは 2026-08-27-organizations-rls.sql が定義する
-- public.is_authorized_for_facility(integer) 関数に依存する。
-- そのため、この3ブロックは organizations-schema.sql → organizations-rls.sql の
-- 適用が完了した後に実行すること(関数が存在しない状態で実行するとエラーになる)。
-- 上記2章の owner_id ベースポリシーとは併存させる方針(既存の許可範囲は狭めない)。
drop policy if exists facility_service_status_insert_org_authorized on public.facility_service_status;
create policy facility_service_status_insert_org_authorized
  on public.facility_service_status
  for insert
  with check (public.is_authorized_for_facility(facility_id));

drop policy if exists facility_service_status_update_org_authorized on public.facility_service_status;
create policy facility_service_status_update_org_authorized
  on public.facility_service_status
  for update
  using (public.is_authorized_for_facility(facility_id))
  with check (public.is_authorized_for_facility(facility_id));

drop policy if exists facility_service_status_delete_org_authorized on public.facility_service_status;
create policy facility_service_status_delete_org_authorized
  on public.facility_service_status
  for delete
  using (public.is_authorized_for_facility(facility_id));

-- ============================================================
-- 【代表・PM確認事項】
-- ============================================================
-- 1. 上記3章(法人管理者/施設スタッフ向けポリシー)は organizations-rls.sql の適用有無に
--    応じて分けて適用できるよう分離した。organizations-rls.sql が未適用の場合は
--    1〜2章のみ適用すれば既存owner(個人施設オーナー)の書き込みは動作する。
-- 2. available_count・noteの保存内容は事業所が入力する範囲情報であり、児童個人の
--    情報は含まれない設計としている(data-privacy-compliance.mdの最小化原則に沿い、
--    個人情報を持たせない構造にしてある)。
