-- 提案SQL: 既存owner_idユーザーの法人管理者へのバックフィル(フェーズA-2)
-- 起票: PRD開発部 ゆうあ / 2026-08-27
-- 元設計: outputs/kakehashi-project/2026-08-26-org-migration-and-inquiry-consolidation-yua.md 3章
--
-- 前提: 2026-08-27-organizations-schema.sql が適用済みであること
--   (organizations / organization_members テーブル、facilities.organization_id列が存在すること)。
-- 実行者: 代表がSupabaseダッシュボード(SQL Editor)で実行する。ゆうあ自身は実行権限を持たない。
--
-- 内容: 既存の facilities.owner_id ごとに1つの組織(organizations)を作成し、
--   そのowner本人を当該組織の org_admin として organization_members に登録する。
--   施設スタッフ(facility_staff)は今回のバックフィル対象外(移行元データが存在しないため)。
--
-- 安全性:
--   - 単一トランザクション(BEGIN〜COMMIT)。途中でエラーが起きれば全体がロールバックされ、
--     facilities.organization_id は元のNULLのまま、新設テーブルも空のままになる。
--   - 既存owner_idベースのRLS・アプリケーションコードには一切触れない、純粋な追加(INSERT/UPDATE)のみ。
--   - このスクリプトは一度だけ実行する前提。再実行するとowner_idごとに重複した組織が
--     再作成されるため、再実行が必要な場合は事前に3-3節の手順で
--     (organization_members, organizations を TRUNCATE、facilities.organization_id を NULL に戻す)
--     完全に巻き戻してから実行すること。

BEGIN;

-- 1. owner_id → organization_id の対応表を一時テーブルに作成
--    (トランザクション終了時に自動的に破棄される。同一owner_idには同一のuuidを
--     以降のINSERT/UPDATEで一貫して使うためにテーブル化している)
CREATE TEMP TABLE owner_org_mapping (
  owner_id         uuid PRIMARY KEY,
  organization_id  uuid NOT NULL
) ON COMMIT DROP;

INSERT INTO owner_org_mapping (owner_id, organization_id)
SELECT DISTINCT owner_id, gen_random_uuid()
FROM public.facilities
WHERE owner_id IS NOT NULL;

-- 2. 組織を作成(名称は代表施設名の暫定値。事業者自身が後で編集する想定)
INSERT INTO public.organizations (id, name)
SELECT
  m.organization_id,
  COALESCE(
    (
      SELECT f2.name
      FROM public.facilities f2
      WHERE f2.owner_id = m.owner_id
      ORDER BY f2.id
      LIMIT 1
    ),
    '未設定の法人'
  )
FROM owner_org_mapping m;

-- 3. facilities.organization_id を対応する組織に紐付け
UPDATE public.facilities f
SET organization_id = m.organization_id
FROM owner_org_mapping m
WHERE f.owner_id = m.owner_id;

-- 4. 既存owner本人を、その組織の法人管理者(org_admin)として登録
INSERT INTO public.organization_members (organization_id, user_id, role, facility_id)
SELECT m.organization_id, m.owner_id, 'org_admin', NULL
FROM owner_org_mapping m;

COMMIT;

-- 【代表・PM確認事項】実行後、以下のクエリで件数の整合性を確認してください
-- (このSELECT群はトランザクションの外側で、確認用として別途実行するもの)。
--
-- 1. facilitiesのowner_id保持者数とorganizations件数が一致するか
--    (1ユーザー=1組織になっているはず)
--   select count(distinct owner_id) from public.facilities where owner_id is not null;
--   select count(*) from public.organizations;
--
-- 2. organization_membersのorg_admin件数が1のクエリと一致するか
--   select count(*) from public.organization_members where role = 'org_admin';
--
-- 3. organization_idがNULLのままのfacilitiesが残っていないか(owner_id自体がNULLの
--    施設データがある場合は意図通りNULLのまま残る。owner_idがある行だけ確認する)
--   select id, name, owner_id from public.facilities
--   where owner_id is not null and organization_id is null;
