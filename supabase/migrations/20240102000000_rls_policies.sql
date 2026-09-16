-- RLS policies for expense management system
-- All data access goes through Next.js API Routes using service_role key.
-- These policies provide defense-in-depth using custom JWT claims.

-- Helper functions to extract custom JWT claims
CREATE OR REPLACE FUNCTION auth_member_id() RETURNS integer AS $$
  SELECT NULLIF(CURRENT_SETTING('request.jwt.claims', true)::json->>'sub', '')::integer;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION auth_member_role() RETURNS text AS $$
  SELECT NULLIF(CURRENT_SETTING('request.jwt.claims', true)::json->>'role', '');
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ===== members =====
ALTER TABLE members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all_members" ON members
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- admin/superadmin see all; others see only themselves
CREATE POLICY "authenticated_select_members" ON members
  FOR SELECT TO authenticated
  USING (
    auth_member_role() IN ('admin', 'superadmin')
    OR id = auth_member_id()
  );

-- Only superadmin can insert/update/delete via authenticated role
CREATE POLICY "superadmin_write_members" ON members
  FOR ALL TO authenticated
  USING (auth_member_role() = 'superadmin')
  WITH CHECK (auth_member_role() = 'superadmin');

-- ===== projects =====
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all_projects" ON projects
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "authenticated_select_projects" ON projects
  FOR SELECT TO authenticated
  USING (
    auth_member_role() IN ('admin', 'superadmin')
    OR lead_id = auth_member_id()
    OR EXISTS (
      SELECT 1 FROM project_participants
      WHERE project_id = projects.id AND member_id = auth_member_id()
    )
  );

CREATE POLICY "authenticated_write_projects" ON projects
  FOR ALL TO authenticated
  USING (
    auth_member_role() IN ('admin', 'superadmin')
    OR (auth_member_role() = 'leader' AND lead_id = auth_member_id())
  )
  WITH CHECK (
    auth_member_role() IN ('admin', 'superadmin')
    OR (auth_member_role() = 'leader' AND lead_id = auth_member_id())
  );

-- ===== project_participants =====
ALTER TABLE project_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all_pp" ON project_participants
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "authenticated_select_pp" ON project_participants
  FOR SELECT TO authenticated
  USING (
    auth_member_role() IN ('admin', 'superadmin', 'leader')
    OR member_id = auth_member_id()
  );

CREATE POLICY "authenticated_write_pp" ON project_participants
  FOR ALL TO authenticated
  USING (auth_member_role() IN ('admin', 'superadmin', 'leader'))
  WITH CHECK (auth_member_role() IN ('admin', 'superadmin', 'leader'));

-- ===== expense_documents =====
ALTER TABLE expense_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all_ed" ON expense_documents
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- user sees only approved+sent or closed; leader/admin see all in their scope
CREATE POLICY "authenticated_select_ed" ON expense_documents
  FOR SELECT TO authenticated
  USING (
    auth_member_role() IN ('admin', 'superadmin')
    OR (
      auth_member_role() = 'leader'
      AND EXISTS (SELECT 1 FROM projects WHERE id = expense_documents.project_id AND lead_id = auth_member_id())
    )
    OR (
      EXISTS (
        SELECT 1 FROM project_participants
        WHERE project_id = expense_documents.project_id AND member_id = auth_member_id()
      )
      AND (status = 'closed' OR (status = 'approved' AND sent_to_member = true))
    )
  );

CREATE POLICY "authenticated_write_ed" ON expense_documents
  FOR ALL TO authenticated
  USING (auth_member_role() IN ('admin', 'superadmin', 'leader'))
  WITH CHECK (auth_member_role() IN ('admin', 'superadmin', 'leader'));

-- ===== expense_items =====
ALTER TABLE expense_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all_ei" ON expense_items
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "authenticated_select_ei" ON expense_items
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM expense_documents ed
      WHERE ed.id = expense_items.document_id
        AND (
          auth_member_role() IN ('admin', 'superadmin', 'leader')
          OR (
            EXISTS (SELECT 1 FROM project_participants WHERE project_id = ed.project_id AND member_id = auth_member_id())
            AND (ed.status = 'closed' OR (ed.status = 'approved' AND ed.sent_to_member = true))
          )
        )
    )
  );

CREATE POLICY "authenticated_write_ei" ON expense_items
  FOR ALL TO authenticated
  USING (auth_member_role() IN ('admin', 'superadmin', 'leader'))
  WITH CHECK (auth_member_role() IN ('admin', 'superadmin', 'leader'));

-- ===== member_expense_shares =====
ALTER TABLE member_expense_shares ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all_mes" ON member_expense_shares
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "authenticated_select_mes" ON member_expense_shares
  FOR SELECT TO authenticated
  USING (
    auth_member_role() IN ('admin', 'superadmin', 'leader')
    OR member_id = auth_member_id()
  );

CREATE POLICY "authenticated_write_mes" ON member_expense_shares
  FOR ALL TO authenticated
  USING (auth_member_role() IN ('admin', 'superadmin', 'leader'))
  WITH CHECK (auth_member_role() IN ('admin', 'superadmin', 'leader'));

-- ===== system_settings =====
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all_ss" ON system_settings
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "authenticated_read_ss" ON system_settings
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "admin_write_ss" ON system_settings
  FOR ALL TO authenticated
  USING (auth_member_role() IN ('admin', 'superadmin'))
  WITH CHECK (auth_member_role() IN ('admin', 'superadmin'));

-- ===== welfare_budget_snapshots =====
ALTER TABLE welfare_budget_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all_wbs" ON welfare_budget_snapshots
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "authenticated_select_wbs" ON welfare_budget_snapshots
  FOR SELECT TO authenticated
  USING (
    auth_member_role() IN ('admin', 'superadmin')
    OR member_id = auth_member_id()
  );

CREATE POLICY "admin_write_wbs" ON welfare_budget_snapshots
  FOR ALL TO authenticated
  USING (auth_member_role() IN ('admin', 'superadmin'))
  WITH CHECK (auth_member_role() IN ('admin', 'superadmin'));

-- ===== Storage: expense-attachments bucket =====
-- Block all direct client access; access only via Next.js API (service_role signed URLs)
CREATE POLICY "service_role_all_storage" ON storage.objects
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Deny anon access
CREATE POLICY "deny_anon_storage" ON storage.objects
  FOR ALL TO anon USING (false);

-- Deny authenticated direct access (must use signed URL via API)
CREATE POLICY "deny_authenticated_direct_storage" ON storage.objects
  FOR ALL TO authenticated USING (false);
