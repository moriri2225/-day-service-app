-- 提案SQL: 法人管理者/施設スタッフ権限モデル(フェーズB: RLS新ポリシー追加)
-- 起票: PRD開発部 ゆうあ / 2026-08-27
-- 元設計: outputs/kakehashi-project/2026-08-26-org-migration-and-inquiry-consolidation-yua.md 4章
--
-- 注意: このファイルはゆうあが「提案」として作成したものであり、
-- ゆうあ自身はRLSポリシーを作成・変更する権限(service_role等)を持たない。
-- 代表がSupabaseダッシュボード(SQL Editor)で内容を確認の上、適用すること。
--
-- 前提:
--   1. 2026-08-27-organizations-schema.sql が適用済みであること
--      (organizations / organization_members テーブル、facilities.organization_id列が存在すること)。
--   2. 2026-08-27-organizations-backfill.sql が適用済みであること
--      (既存owner全員がorg_adminとしてorganization_membersに登録済みであること)。
--      ※ バックフィル未実施のままこのファイルだけ適用しても実害はない
--        (organization_membersが空なら新ポリシーは誰も追加で許可しないだけであり、
--        既存owner_idベースの旧ポリシーによるアクセスはそのまま維持される)が、
--        バックフィル未実施の状態で「法人管理者としての複数施設横断閲覧」を
--        実際に使い始めることはできない。
--
-- 方針(設計書4-3節・段階Aのみ。段階B=旧owner_idベースポリシーの削除は
-- 別マイグレーションとし、本ファイルには一切含めない):
--   - 新ポリシーは既存の owner_id ベースのポリシーと「併存」させる。
--     PostgreSQLのRLSでは同一コマンド(SELECT/UPDATE等)への複数のpermissive
--     ポリシーはOR条件で評価されるため、新ポリシーを追加しても既存の許可範囲は
--     一切狭まらない(アクセスが締め出される事故は原理的に起きない)。
--   - 既存ポリシー名は変更・削除・上書きしない。本ファイルは
--     「is_authorized_for_facility」関数の新設と、新規ポリシー(下記で
--     drop policy if exists している名前 = 本ファイルが作る名前のみ)の
--     追加のみで完結する。

-- ============================================================
-- 1. 権限判定関数の新設
-- ============================================================
-- 法人管理者(org_admin)は自法人内の全施設、施設スタッフ(facility_staff)は
-- 自分が紐づく施設のみを true と判定する。SECURITY DEFINERにする理由:
-- ポリシー内からorganization_membersを参照するサブクエリ自体もRLS対象になり
-- 得るため、関数側で定義者権限に昇格して素直に読めるようにする
-- (Supabase公式が推奨するRLSヘルパー関数のパターン)。
create or replace function public.is_authorized_for_facility(target_facility_id bigint)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_members m
    join public.facilities f on f.id = target_facility_id
    where m.user_id = auth.uid()
      and (
        (m.role = 'org_admin'      and m.organization_id = f.organization_id)
        or
        (m.role = 'facility_staff' and m.facility_id = target_facility_id)
      )
  );
$$;

comment on function public.is_authorized_for_facility(bigint) is
  '法人管理者(自法人内全施設)または施設スタッフ(自施設のみ)が指定施設にアクセス権限を持つか判定する。RLSポリシーから使用する。';

-- ============================================================
-- 2. facilities: 更新権限の追加(旧owner_idベースのUPDATEポリシーと併存)
-- ============================================================
-- SELECTは既存ポリシーで公開(USING (true))済みのため変更不要。
-- INSERT(新規施設作成)は今回のPRDスコープに法人管理者による施設新規作成UIが
-- 含まれておらず、organization_id未確定の新規行に対する判定方法も未設計のため、
-- 本フェーズでは対象外とする(YAGNI。必要になった時点で別途設計する)。
drop policy if exists facilities_update_org_authorized on public.facilities;
create policy facilities_update_org_authorized
  on public.facilities
  for update
  using (public.is_authorized_for_facility(id))
  with check (public.is_authorized_for_facility(id));

-- ============================================================
-- 3. schedules: 書き込み権限の追加(旧owner_idベースのポリシーと併存)
-- ============================================================
-- SELECTは既存ポリシーで公開済みのため変更不要。
drop policy if exists schedules_insert_org_authorized on public.schedules;
create policy schedules_insert_org_authorized
  on public.schedules
  for insert
  with check (public.is_authorized_for_facility(facility_id));

drop policy if exists schedules_update_org_authorized on public.schedules;
create policy schedules_update_org_authorized
  on public.schedules
  for update
  using (public.is_authorized_for_facility(facility_id))
  with check (public.is_authorized_for_facility(facility_id));

drop policy if exists schedules_delete_org_authorized on public.schedules;
create policy schedules_delete_org_authorized
  on public.schedules
  for delete
  using (public.is_authorized_for_facility(facility_id));

-- ============================================================
-- 4. conversations: 事業所側(法人管理者・施設スタッフ)の閲覧・返信対応権限の追加
-- ============================================================
-- 既存ポリシーは「保護者本人(user_id = auth.uid())」または
-- 「施設オーナー(facilities.owner_id = auth.uid()を辿るEXISTS)」のみを想定した
-- ものと設計書4-1に記載がある。法人管理者・施設スタッフも事業所側の受信箱
-- (app/admin/messages)から対応できるようにする必要があるため追加する。
-- INSERT(見学申込の起点)は保護者側の操作のみであり事業所側は行わないため対象外。
drop policy if exists conversations_select_org_authorized on public.conversations;
create policy conversations_select_org_authorized
  on public.conversations
  for select
  using (public.is_authorized_for_facility(facility_id));

drop policy if exists conversations_update_org_authorized on public.conversations;
create policy conversations_update_org_authorized
  on public.conversations
  for update
  using (public.is_authorized_for_facility(facility_id))
  with check (public.is_authorized_for_facility(facility_id));

-- ============================================================
-- 5. messages: 事業所側(法人管理者・施設スタッフ)の閲覧・返信権限の追加
-- ============================================================
-- messagesはconversationsに従属するテーブルであり、facility_idを直接持たない
-- (conversation_id経由でconversations.facility_idに辿る)ため、is_authorized_for_facility
-- を直接は使わず、対応するconversationsのfacility_idを都度EXISTSで解決する。
drop policy if exists messages_select_org_authorized on public.messages;
create policy messages_select_org_authorized
  on public.messages
  for select
  using (
    exists (
      select 1 from public.conversations c
      where c.id = messages.conversation_id
        and public.is_authorized_for_facility(c.facility_id)
    )
  );

drop policy if exists messages_insert_org_authorized on public.messages;
create policy messages_insert_org_authorized
  on public.messages
  for insert
  with check (
    exists (
      select 1 from public.conversations c
      where c.id = messages.conversation_id
        and public.is_authorized_for_facility(c.facility_id)
    )
  );

-- ============================================================
-- 6. 明示的に含めないもの(フェーズC/Dはスコープ外)
-- ============================================================
-- - 旧owner_idベースのポリシーの削除(設計書4-3節「段階B」)は本ファイルに含めない。
--   検証完了後、別マイグレーションとして着手する。
-- - 施設スタッフ招待機能(organization_membersへのINSERTをアプリから行う経路)は
--   service_roleキーを要するサーバーサイド処理の新設が前提(3-4節)であり、
--   今回のスコープ外。本ファイルはorganization_membersへの新規ポリシーを追加しない
--   (schema.sqlで作成済みのselect_ownポリシーのみで足りる)。

-- ============================================================
-- 【代表・PM確認事項】適用後の検証手順(設計書4-3節)
-- ============================================================
-- しょうごの訂正報告の教訓(黒箱の匿名キーAPIテストだけでは「空である」と
-- 「弾かれている」を区別できない)を踏まえ、以下をSupabaseダッシュボードの
-- SQL Editorで直接確認すること。
--
-- 1. RLSが有効なままであることの確認(全テーブル true のはず)
--   select relname, relrowsecurity from pg_class
--   where relname in ('facilities','schedules','conversations','messages','organization_members','organizations')
--     and relnamespace = 'public'::regnamespace;
--
-- 2. 新ポリシーが意図通り追加され、既存ポリシーが変更されていないことの確認
--   select tablename, policyname, cmd, qual, with_check
--   from pg_policies where schemaname = 'public' order by tablename, policyname;
--
-- 3. 実アカウントでの結合テスト
--   - 既存owner(バックフィル後はorg_admin)でログインし、これまで通り
--     自分の施設のスケジュール編集・問い合わせ対応ができること(退行がないこと)。
--   - (施設スタッフはフェーズCが未実装のため今回は作成できない。フェーズC
--     実装後に「自施設のみ見える/他施設は見えない」の確認を行うこと)。
--   - /messages, /admin/messages のRealtime購読(postgres_changes)が
--     新ポリシー適用後も従来通り届くことを確認する(design書4-4節の申し送り)。
