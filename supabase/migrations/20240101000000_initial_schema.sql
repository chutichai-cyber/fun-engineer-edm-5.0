-- Initial schema for expense management system

CREATE TABLE IF NOT EXISTS members (
  id          SERIAL PRIMARY KEY,
  prefix      VARCHAR(20),
  first_name  VARCHAR(100) NOT NULL,
  last_name   VARCHAR(100) NOT NULL,
  nickname    VARCHAR(50),
  team        VARCHAR(100),
  username    VARCHAR(100) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role        VARCHAR(20) NOT NULL CHECK (role IN ('superadmin', 'admin', 'leader', 'user')),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS projects (
  id               SERIAL PRIMARY KEY,
  name             VARCHAR(500) NOT NULL,
  lead_id          INTEGER REFERENCES members(id) ON DELETE SET NULL,
  activity_date    DATE,
  activity_date_end DATE,
  location         TEXT,
  estimated_cost   TEXT,
  status           VARCHAR(50) DEFAULT 'draft'
    CHECK (status IN ('draft', 'pending', 'active', 'completed', 'cancelled', 'rejected')),
  created_by       INTEGER REFERENCES members(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS project_participants (
  project_id  INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  member_id   INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  PRIMARY KEY (project_id, member_id)
);

CREATE TABLE IF NOT EXISTS expense_documents (
  id                  SERIAL PRIMARY KEY,
  project_id          INTEGER UNIQUE NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  status              VARCHAR(50) DEFAULT 'pending_review'
    CHECK (status IN ('pending_review', 'approved', 'returned', 'closed')),
  total_amount        NUMERIC(15,2) DEFAULT 0,
  remainder_amount    NUMERIC(15,2) DEFAULT 0,
  sent_to_member      BOOLEAN DEFAULT false,
  remainder_member_id INTEGER REFERENCES members(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS expense_items (
  id               SERIAL PRIMARY KEY,
  document_id      INTEGER NOT NULL REFERENCES expense_documents(id) ON DELETE CASCADE,
  sequence         INTEGER NOT NULL DEFAULT 1,
  description      TEXT NOT NULL,
  amount           NUMERIC(15,2) NOT NULL,
  attachment_path  TEXT,
  attachment_name  TEXT,
  attachment_size  BIGINT,
  notes            TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS member_expense_shares (
  id              SERIAL PRIMARY KEY,
  document_id     INTEGER NOT NULL REFERENCES expense_documents(id) ON DELETE CASCADE,
  member_id       INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  share_60        NUMERIC(15,2) NOT NULL DEFAULT 0,
  share_40        NUMERIC(15,2) NOT NULL DEFAULT 0,
  remainder_share NUMERIC(15,2) NOT NULL DEFAULT 0,
  total_share     NUMERIC(15,2) NOT NULL DEFAULT 0,
  UNIQUE (document_id, member_id)
);

CREATE TABLE IF NOT EXISTS system_settings (
  key        VARCHAR(100) PRIMARY KEY,
  value      TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS welfare_budget_snapshots (
  member_id              INTEGER PRIMARY KEY REFERENCES members(id) ON DELETE CASCADE,
  accumulated_60_percent NUMERIC(15,2) NOT NULL DEFAULT 0,
  claimable_amount       NUMERIC(15,2) NOT NULL DEFAULT 0,
  budget_amount          NUMERIC(15,2) NOT NULL DEFAULT 0,
  balance_amount         NUMERIC(15,2) NOT NULL DEFAULT 0,
  last_updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_projects_lead_id ON projects(lead_id);
CREATE INDEX IF NOT EXISTS idx_project_participants_member_id ON project_participants(member_id);
CREATE INDEX IF NOT EXISTS idx_expense_documents_project_id ON expense_documents(project_id);
CREATE INDEX IF NOT EXISTS idx_expense_items_document_id ON expense_items(document_id);
CREATE INDEX IF NOT EXISTS idx_member_expense_shares_document_id ON member_expense_shares(document_id);
CREATE INDEX IF NOT EXISTS idx_member_expense_shares_member_id ON member_expense_shares(member_id);

-- Storage bucket for expense attachments (private, 50MB max)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'expense-attachments',
  'expense-attachments',
  false,
  52428800,
  ARRAY['image/jpeg','image/png','image/gif','image/webp','application/pdf',
        'application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']
)
ON CONFLICT (id) DO NOTHING;
