-- =============================================================
-- Seed: Mockup data for development/testing
-- Password ทุกคน: password123
-- =============================================================

-- pgcrypto สำหรับ bcrypt hash (มีใน Supabase โดยปกติ)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =============================================================
-- Members (9 คน: 1 superadmin, 1 admin, 2 leader, 5 user)
-- =============================================================
INSERT INTO members (id, prefix, first_name, last_name, nickname, team, username, password_hash, role) VALUES
  (1, 'นาย',    'สมศักดิ์', 'แก้วมณี',   'ศักดิ์',  'Management',  'somsakdi',  crypt('password123', gen_salt('bf', 10)), 'superadmin'),
  (2, 'นาย',    'อนุชา',    'วงศ์สวรรค์', 'ชา',     'Management',  'anucha',    crypt('password123', gen_salt('bf', 10)), 'admin'),
  (3, 'นาย',    'วิชัย',    'ประดิษฐ์',   'ชัย',    'Engineering', 'wichai',    crypt('password123', gen_salt('bf', 10)), 'leader'),
  (4, 'นางสาว', 'สุภา',     'รักดี',      'ภา',     'Design',      'supha',     crypt('password123', gen_salt('bf', 10)), 'leader'),
  (5, 'นาย',    'ธนากร',    'สุขใจ',      'กร',     'Engineering', 'thanakorn', crypt('password123', gen_salt('bf', 10)), 'user'),
  (6, 'นาง',    'มาลี',     'ชมชื่น',     'มา',     'Engineering', 'malee',     crypt('password123', gen_salt('bf', 10)), 'user'),
  (7, 'นาย',    'ประภาส',   'เจริญ',      'ภาส',    'Design',      'praphas',   crypt('password123', gen_salt('bf', 10)), 'user'),
  (8, 'นางสาว', 'นิภา',     'ดีงาม',      'ภา',     'Design',      'nipha',     crypt('password123', gen_salt('bf', 10)), 'user'),
  (9, 'นาย',    'สมหมาย',   'ใจดี',       'หมาย',   'HR',          'sommai',    crypt('password123', gen_salt('bf', 10)), 'user')
ON CONFLICT (id) DO NOTHING;

SELECT setval('members_id_seq', (SELECT MAX(id) FROM members));

-- =============================================================
-- Projects (5 โครงการ ครอบคลุมทุก status)
-- =============================================================
-- status: completed / active / active / pending / draft
INSERT INTO projects (id, name, lead_id, activity_date, activity_date_end, location, estimated_cost, status, created_by) VALUES
  (1, 'อบรมพัฒนาทีม Q1/2567',             3, '2024-02-15', '2024-02-16', 'โรงแรมแกรนด์ พระราม 9 กรุงเทพ', '15000', 'completed', 2),
  (2, 'สัมมนาประจำปี 2567',                4, '2024-05-20', '2024-05-21', 'รีสอร์ตเขาใหญ่ นครราชสีมา',       '10000', 'active',    2),
  (3, 'ทัศนศึกษาสายงาน Engineering',       3, '2024-08-10', '2024-08-10', 'พิพิธภัณฑ์วิทยาศาสตร์ ปทุมธานี', '9000',  'active',    3),
  (4, 'สัมมนาวางแผนกลยุทธ์ปีหน้า',        4, '2024-10-05', NULL,         'TBD',                              '20000', 'pending',   1),
  (5, 'กิจกรรม Team Building ไตรมาส 4',   3, NULL,         NULL,         NULL,                               NULL,   'draft',     3)
ON CONFLICT (id) DO NOTHING;

SELECT setval('projects_id_seq', (SELECT MAX(id) FROM projects));

-- =============================================================
-- Project Participants
-- =============================================================
INSERT INTO project_participants (project_id, member_id) VALUES
  -- Project 1 (completed): wichai, thanakorn, malee, praphas
  (1, 3), (1, 5), (1, 6), (1, 7),
  -- Project 2 (active): supha, thanakorn, nipha, sommai
  (2, 4), (2, 5), (2, 8), (2, 9),
  -- Project 3 (active): wichai, malee, nipha, sommai
  (3, 3), (3, 6), (3, 8), (3, 9),
  -- Project 4 (pending): supha, praphas, sommai
  (4, 4), (4, 7), (4, 9),
  -- Project 5 (draft): wichai, thanakorn
  (5, 3), (5, 5)
ON CONFLICT DO NOTHING;

-- =============================================================
-- Expense Documents
--
-- Project 1 → closed  + sent (ใช้คำนวณ welfare แล้ว)
-- Project 2 → approved + sent (รอ admin ปิด)
-- Project 3 → pending_review (รอ admin ตรวจ)
-- Project 4, 5 → ยังไม่มีเอกสาร
-- =============================================================
INSERT INTO expense_documents (id, project_id, status, sent_to_member, total_amount, remainder_amount, remainder_member_id) VALUES
  (1, 1, 'closed',         true,  12500.00, 0.00, NULL),
  (2, 2, 'approved',       true,   8400.00, 0.00, NULL),
  (3, 3, 'pending_review', false,  8000.00, 0.00, NULL)
ON CONFLICT (id) DO NOTHING;

SELECT setval('expense_documents_id_seq', (SELECT MAX(id) FROM expense_documents));

-- =============================================================
-- Expense Items
-- =============================================================
INSERT INTO expense_items (document_id, sequence, description, amount, notes) VALUES
  -- Doc 1: อบรมพัฒนาทีม (รวม 12,500)
  (1, 1, 'ค่าวิทยากร',               8000.00, NULL),
  (1, 2, 'ค่าอาหารกลางวันและเบรก',   3000.00, NULL),
  (1, 3, 'ค่าเอกสารและอุปกรณ์',      1500.00, NULL),
  -- Doc 2: สัมมนาประจำปี (รวม 8,400)
  (2, 1, 'ค่าเช่าห้องสัมมนา',        5000.00, 'รวม projector และ sound system'),
  (2, 2, 'ค่าอาหารและเครื่องดื่ม',   2800.00, NULL),
  (2, 3, 'ค่าเดินทาง',                600.00, 'น้ำมันรถตู้'),
  -- Doc 3: ทัศนศึกษา (รวม 8,000)
  (3, 1, 'ค่าเช่ารถตู้',             6000.00, 'รถตู้ 2 คัน 1 วัน'),
  (3, 2, 'ค่าอาหารกลางวัน',          2000.00, NULL)
ON CONFLICT DO NOTHING;

-- =============================================================
-- Member Expense Shares
--
-- Doc 1: 12,500 ÷ 4 คน → 60%=1,875  40%=1,250  รวม=3,125  เศษ=0
-- Doc 2:  8,400 ÷ 4 คน → 60%=1,260  40%=  840  รวม=2,100  เศษ=0
-- Doc 3:  8,000 ÷ 4 คน → 60%=1,200  40%=  800  รวม=2,000  เศษ=0
-- =============================================================
INSERT INTO member_expense_shares (document_id, member_id, share_60, share_40, remainder_share, total_share) VALUES
  -- Doc 1
  (1, 3, 1875.00, 1250.00, 0.00, 3125.00),  -- wichai
  (1, 5, 1875.00, 1250.00, 0.00, 3125.00),  -- thanakorn
  (1, 6, 1875.00, 1250.00, 0.00, 3125.00),  -- malee
  (1, 7, 1875.00, 1250.00, 0.00, 3125.00),  -- praphas
  -- Doc 2
  (2, 4, 1260.00, 840.00,  0.00, 2100.00),  -- supha
  (2, 5, 1260.00, 840.00,  0.00, 2100.00),  -- thanakorn
  (2, 8, 1260.00, 840.00,  0.00, 2100.00),  -- nipha
  (2, 9, 1260.00, 840.00,  0.00, 2100.00),  -- sommai
  -- Doc 3
  (3, 3, 1200.00, 800.00,  0.00, 2000.00),  -- wichai
  (3, 6, 1200.00, 800.00,  0.00, 2000.00),  -- malee
  (3, 8, 1200.00, 800.00,  0.00, 2000.00),  -- nipha
  (3, 9, 1200.00, 800.00,  0.00, 2000.00)   -- sommai
ON CONFLICT (document_id, member_id) DO NOTHING;

-- =============================================================
-- Welfare Budget Snapshots
-- นับเฉพาะ doc ที่ sent_to_member = true (doc 1 และ doc 2)
--
-- wichai    (3): 1875                     → claimable=1800  balance= -75
-- thanakorn (5): 1875+1260 = 3135         → claimable=1800  balance=-1335
-- malee     (6): 1875                     → claimable=1800  balance= -75
-- praphas   (7): 1875                     → claimable=1800  balance= -75
-- supha     (4): 1260                     → claimable=1260  balance= 540
-- nipha     (8): 1260                     → claimable=1260  balance= 540
-- sommai    (9): 1260                     → claimable=1260  balance= 540
-- =============================================================
INSERT INTO welfare_budget_snapshots (member_id, accumulated_60_percent, claimable_amount, budget_amount, balance_amount, last_updated_at) VALUES
  (3, 1875.00, 1800.00, 1800.00,  -75.00, NOW()),   -- wichai
  (4, 1260.00, 1260.00, 1800.00,  540.00, NOW()),   -- supha
  (5, 3135.00, 1800.00, 1800.00, -1335.00, NOW()),  -- thanakorn
  (6, 1875.00, 1800.00, 1800.00,  -75.00, NOW()),   -- malee
  (7, 1875.00, 1800.00, 1800.00,  -75.00, NOW()),   -- praphas
  (8, 1260.00, 1260.00, 1800.00,  540.00, NOW()),   -- nipha
  (9, 1260.00, 1260.00, 1800.00,  540.00, NOW())    -- sommai
ON CONFLICT (member_id) DO UPDATE SET
  accumulated_60_percent = EXCLUDED.accumulated_60_percent,
  claimable_amount       = EXCLUDED.claimable_amount,
  budget_amount          = EXCLUDED.budget_amount,
  balance_amount         = EXCLUDED.balance_amount,
  last_updated_at        = NOW();
