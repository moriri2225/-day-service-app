-- 提案SQL: 法人管理者/施設スタッフ権限モデル(フェーズA-1: テーブル本体)
-- 起票: PRD開発部 ゆうあ / 2026-08-27
-- 元設計: outputs/kakehashi-project/2026-08-26-org-migration-and-inquiry-consolidation-yua.md 2章
-- 前提となる代表決定事項(2026-08-27): 法人管理者(org_admin)の閲覧範囲は
--   「自法人内の全施設を横断閲覧可能」で確定(設計書6章 論点1)。
--
-- 注意: このファイルはゆうあが「提案」として作成したものであり、
-- ゆうあ自身はテーブル作成権限(service_role等)を持たない。
-- 代表がSupabaseダッシュボード(SQL Editor)で内容を確認の上、適用すること。
--
-- 型の確定について: facilities.id の型はこのリポジトリからは直接確認できない
-- (マイグレーションファイル・スキーマ定義ファイルがリポジトリ内に存在しないため)。
-- types/index.ts の Facility.id / Schedule.facility_id が number 型であること、
-- および設計書2章がその前提で書かれていることから bigint と判断し、
-- organization_members.facility_id / 関数引数を bigint で統一した。
-- 【代表・PM確認事項】適用前に、Supabaseダッシュボードで
--   select column_name, data_type from information_schema.columns
--   where table_name = 'facilities' and column_name = 'id';
-- を実行し、実際の型が bigint (int8) であることを確認してください。
-- もし uuid 等の別型だった場合、本ファイルおよび backfill/rls の両ファイルの
-- bigint 指定を一括で修正する必要があります。

-- 1. 法人(組織)テーブル
create table if not exists public.organizations (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  created_at  timestamptz not null default now()
);

comment on table public.organizations is
  '法人単位のエンティティ。既存owner_idベースの施設所有とは別に、法人管理者/施設スタッフの所属先として新設。';

-- 2. 法人への所属(法人管理者 or 施設スタッフ)テーブル
create table if not exists public.organization_members (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  user_id          uuid not null references auth.users(id) on delete cascade,
  role             text not null check (role in ('org_admin', 'facility_staff')),
  facility_id      bigint references public.facilities(id) on delete cascade,
  created_at       timestamptz not null default now(),

  -- org_admin は facility_id を持たない(法人内全施設が対象)、
  -- facility_staff は facility_id が必須(自施設のみ)
  constraint role_facility_consistency check (
    (role = 'org_admin'      and facility_id is null)
    or
    (role = 'facility_staff' and facility_id is not null)
  ),
  unique (organization_id, user_id, facility_id)
);

comment on table public.organization_members is
  '法人への所属レコード。roleがorg_adminなら法人内全施設、facility_staffならfacility_id指定施設のみアクセス可。';

create index if not exists organization_members_user_id_idx
  on public.organization_members (user_id);
create index if not exists organization_members_organization_id_idx
  on public.organization_members (organization_id);
create index if not exists organization_members_facility_id_idx
  on public.organization_members (facility_id)
  where facility_id is not null;

-- 3. facilities に法人への参照を追加
--    既存owner_id列は残したまま行う追加型(additive)の変更。NULL許容のため
--    既存行・既存アプリコードへの影響はない(バックフィル前は全行NULL)。
alter table public.facilities
  add column if not exists organization_id uuid references public.organizations(id);

create index if not exists facilities_organization_id_idx
  on public.facilities (organization_id)
  where organization_id is not null;

-- 4. RLS有効化(新設テーブルのみ。facilitiesの既存RLS設定には触れない)
alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;

-- organizations: 自分が所属する法人のみ閲覧可能。作成・更新・削除は今回対象外
-- (法人新規作成・名称編集のUI自体がまだ存在しないため、書き込みポリシーは
--  意図的に作成しない。RLS有効化下でポリシーが存在しない操作は全て拒否される)。
drop policy if exists organizations_select_own on public.organizations;
create policy organizations_select_own
  on public.organizations
  for select
  using (
    exists (
      select 1 from public.organization_members m
      where m.organization_id = organizations.id
        and m.user_id = auth.uid()
    )
  );

-- organization_members: 自分自身の所属レコードのみ閲覧可能。
-- 「同じ法人の他メンバー一覧を見る」機能はフェーズC(招待機能)の管理画面で
-- 必要になった時点で別途ポリシーを追加する(今回のスコープ外、YAGNI)。
-- 書き込み(招待・追加)ポリシーも同様にフェーズC対象のため今回は作成しない。
drop policy if exists organization_members_select_own on public.organization_members;
create policy organization_members_select_own
  on public.organization_members
  for select
  using (user_id = auth.uid());

-- 【代表・PM確認事項】上記2テーブルのRLSは「フェーズA(データモデル追加)」の
-- 一部として今回の適用に含めた。4章の is_authorized_for_facility 関数や
-- facilities/schedules/conversations/messages側の新ポリシー(フェーズB)は
-- 2026-08-27-organizations-rls.sql に分離してあるため、本ファイルの適用と
-- 同時でなくても良い(本ファイル単独で適用してもorganizationsを閲覧できる
-- 人がまだ0人の状態になるだけで、既存機能への影響はない)。
