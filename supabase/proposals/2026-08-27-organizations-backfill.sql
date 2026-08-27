-- 提案SQL: 既存owner_idユーザーの法人管理者へのバックフィル(フェーズA-2)
-- 起票: PRD開発部 ゆうあ / 2026-08-27
-- 修正: 2026-08-27 一時テーブル版から単一CTE(WITH句)文への書き換え(経緯は下記)
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
-- 【経緯】旧版(一時テーブル owner_org_mapping + BEGIN〜COMMIT)からの変更理由:
--   代表がSupabaseダッシュボードのSQL Editorで2回実行したところ、いずれも
--   `relation "owner_org_mapping" does not exist` エラーで失敗した。原因は、SQL Editorの
--   接続プーリングの都合でBEGIN〜COMMIT内の各文が同一トランザクション・同一接続で
--   実行される保証がなく、CREATE TEMP TABLE ... ON COMMIT DROP で作った一時テーブルが
--   後続の文から見えなくなったためと推測される。この問題を構造的に回避するため、
--   一時テーブルを使わず「WITH句(CTE)を用いた単一のSQL文」に書き換えた。
--   単一の文である以上、複数の文をまたぐ接続・トランザクションの一貫性に依存しないため、
--   SQL Editor側の接続プーリングの挙動に左右されない。
--   (単一文はPostgreSQLにより暗黙的に単一トランザクションとして原子的に実行されるため、
--    明示的な BEGIN〜COMMIT による囲みも不要になった。)
--
-- 【このCTEベースの書き方が正しく動作する技術的根拠】
--   1. PostgreSQLでは、WITH句に列挙したデータ変更CTE(INSERT/UPDATE/DELETE)は、
--      主問い合わせ(この文ではorganization_membersへのINSERT)から直接参照されて
--      いなくても、WITH句に列挙されている限り必ず実行される
--      (PostgreSQL公式ドキュメント "Data-Modifying Statements in WITH" にある通り、
--      WITH句に複数の補助文を定義した場合、それらは全て実行される)。
--      本文の insert_orgs・update_facilities は主問い合わせや他のCTEから明示的に
--      参照されていないが、WITH句のトップレベルに列挙されているため、この文が
--      実行される際に必ず両方とも実行される。
--   2. mapping CTEは単なるSELECT(副作用なし)だが、insert_orgs・update_facilities・
--      末尾のINSERTの3箇所から参照されている。PostgreSQLの既定動作では、
--      2回以上参照される非再帰CTEは自動的にMATERIALIZED(1回だけ評価してその結果を
--      使い回す)として扱われるため、gen_random_uuid()は行ごとに1回だけ評価され、
--      3箇所すべてで同一のUUIDが一貫して使われる。念のため既定動作に依存せず
--      意図を明示するため、mapping CTEには明示的に MATERIALIZED を指定している。
--      これは旧・一時テーブル案が「同一owner_idには同一UUIDを使う」ために
--      テーブル化していた意図を正しく引き継いでいる。
--   3. facilities.organization_id の外部キー制約(既定でNOT DEFERRABLE・
--      INITIALLY IMMEDIATE)は、行イベントごとではなく「文(ステートメント)の
--      終了時点」でチェックされる。この文全体が単一のSQL文であるため、
--      insert_orgs(organizationsへのINSERT)とupdate_facilities
--      (facilities.organization_idへのUPDATE)がWITH句内でどちらが先に内部実行
--      されるか(実行順序はPostgreSQLの実装依存で保証されない)に関わらず、
--      文全体が完了する時点でorganizations側の行が揃っていれば外部キー制約は
--      満たされる。したがってCTE間の書き込み順序に依存しない。
--
-- 【あわせて修正した既存バグ】mapping CTEの owner_id 重複排除方法
--   旧版は `SELECT DISTINCT owner_id, gen_random_uuid() FROM facilities WHERE owner_id IS NOT NULL`
--   という形だった。これはDISTINCTが「owner_id と gen_random_uuid() の組」全体に対して
--   適用されるため、同一owner_idが複数施設(facilities行)を持つ場合、施設行ごとに
--   異なるUUIDが生成されてDISTINCTで潰されず、owner_idが重複した複数行が残ってしまう
--   (temp table版ではowner_id PRIMARY KEY制約違反、本CTE版でもorganizationsが
--   owner_idごとに複数作られてしまう)。今回、先にowner_idだけをDISTINCTで一意化した
--   サブクエリを作り、その結果に対して1行につき1回だけgen_random_uuid()を呼ぶ形に
--   修正し、owner_idごとに必ず1個のUUIDになるようにした。
--
-- 安全性:
--   - 単一のSQL文として原子的に実行される。途中でエラーが起きれば文全体が
--     ロールバックされ、facilities.organization_id は元のNULLのまま、
--     新設テーブルも空のままになる。
--   - 既存owner_idベースのRLS・アプリケーションコードには一切触れない、純粋な追加(INSERT/UPDATE)のみ。
--   - このスクリプトは一度だけ実行する前提。再実行するとowner_idごとに重複した組織が
--     再作成されるため、再実行が必要な場合は事前に3-3節の手順で
--     (organization_members, organizations を TRUNCATE、facilities.organization_id を NULL に戻す)
--     完全に巻き戻してから実行すること。

WITH mapping AS MATERIALIZED (
  SELECT
    owner_id,
    gen_random_uuid() AS organization_id
  FROM (
    SELECT DISTINCT owner_id
    FROM public.facilities
    WHERE owner_id IS NOT NULL
  ) AS distinct_owners
),
insert_orgs AS (
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
  FROM mapping m
),
update_facilities AS (
  UPDATE public.facilities f
  SET organization_id = m.organization_id
  FROM mapping m
  WHERE f.owner_id = m.owner_id
)
INSERT INTO public.organization_members (organization_id, user_id, role, facility_id)
SELECT m.organization_id, m.owner_id, 'org_admin', NULL
FROM mapping m;

-- 【代表・PM確認事項】実行後、以下のクエリで件数の整合性を確認してください
-- (このSELECT群は上記の文の外側で、確認用として別途実行するもの)。
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
