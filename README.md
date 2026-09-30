# ระบบบริหารโครงการและเบิกจ่ายค่าใช้จ่าย

**Stack:** Next.js 14 (full-stack) · Supabase (Postgres + Storage) · Vercel (deploy)

---

## โครงสร้างโปรเจค

```
expense-fun-engineer/
├── web/                          ← Next.js full-stack app
│   ├── src/
│   │   ├── app/
│   │   │   ├── api/              ← API Routes (server-side only)
│   │   │   │   ├── auth/         ← login, logout, me, refresh, microsoft
│   │   │   │   ├── members/      ← CRUD สมาชิก
│   │   │   │   ├── projects/     ← CRUD โครงการ + participants + status
│   │   │   │   ├── expenses/     ← เอกสารเบิกจ่าย + items + workflow
│   │   │   │   ├── dashboard/    ← overview, my, leader, member, welfare
│   │   │   │   └── attachments/  ← sign-upload, sign-download (Supabase Storage)
│   │   │   └── (pages)           ← Frontend pages
│   │   ├── components/
│   │   └── lib/
│   │       ├── auth-server.js    ← getSessionUser() อ่าน httpOnly cookie
│   │       ├── microsoft-auth.js ← Microsoft Entra ID (OIDC + PKCE)
│   │       ├── db.js             ← pg Pool → Supabase Postgres
│   │       ├── supabase-server.js← Storage client (service role key)
│   │       ├── calculation.js    ← คำนวณ 60/40
│   │       ├── recalculate.js    ← recalc expense shares
│   │       └── welfare.js        ← welfare snapshot
│   ├── .env.local                ← (ไม่ commit) ENV สำหรับ local dev
│   ├── .env.local.example        ← template ENV พร้อมคำอธิบาย
│   └── package.json
└── supabase/
    └── migrations/
        ├── 20240101000000_initial_schema.sql   ← tables + storage bucket
        ├── 20240102000000_rls_policies.sql      ← RLS policies
        ├── 20240103000000_seed_settings.sql     ← welfare budget default 1800
        ├── 20240104000000_seed_mockup.sql       ← ข้อมูลทดสอบ (dev เท่านั้น)
        └── 20240105000000_members_microsoft.sql ← email + microsoft_oid สำหรับ SSO
```

---

## Local Development

### สิ่งที่ต้องมีก่อน

| เครื่องมือ | วิธีติดตั้ง |
| --- | --- |
| Node.js 18+ | <https://nodejs.org> |
| Docker Desktop | <https://docker.com> (ต้องเปิดรันอยู่) |
| Supabase CLI | `brew install supabase/tap/supabase` |

### ขั้นตอน

```bash
# 1. เข้าโปรเจค
cd expense-fun-engineer

# 2. Start local Supabase (Docker ต้องรันอยู่)
supabase start
```

หลัง `supabase start` จะได้ output แบบนี้ — **จดทุกค่าไว้**:

```
API_URL:     http://127.0.0.1:54321
DB_URL:      postgresql://postgres:postgres@127.0.0.1:54322/postgres
STUDIO_URL:  http://127.0.0.1:54323
SECRET_KEY:  sb_secret_XXXXXXXXXX          ← SUPABASE_SERVICE_ROLE_KEY
JWT_SECRET:  super-secret-jwt-token-...    ← SUPABASE_JWT_SECRET
```

```bash
# 3. Apply schema + seed data
supabase db reset

# 4. สร้างไฟล์ ENV
cd web
cp .env.local.example .env.local
# แก้ไขค่าใน .env.local ตามตารางด้านล่าง

# 5. Install และ Run
npm install
npm run dev
```

เปิด <http://localhost:3000>

### ENV สำหรับ Local (`web/.env.local`)

| Variable | นำมาจาก | ค่า |
| --- | --- | --- |
| `DATABASE_URL` | `supabase start` → `DB_URL` | `postgresql://postgres:postgres@127.0.0.1:54322/postgres` |
| `SUPABASE_URL` | `supabase start` → `API_URL` | `http://127.0.0.1:54321` |
| `SUPABASE_SERVICE_ROLE_KEY` | `supabase start` → **`SECRET_KEY`** | `sb_secret_...` |
| `SUPABASE_JWT_SECRET` | `supabase start` → **`JWT_SECRET`** | `super-secret-jwt-token-...` |
| `CORP_AUTH_API_URL` | **ไม่ต้องใส่** → ใช้ bcrypt จาก DB แทน | (comment ออก) |
| `MICROSOFT_CLIENT_ID` | Azure App Registration → Application (client) ID | |
| `MICROSOFT_CLIENT_SECRET` | Azure App Registration → Certificates & secrets | |
| `MICROSOFT_TENANT_ID` | Azure App Registration → Directory (tenant) ID | |
| `MICROSOFT_REDIRECT_URI` | ต้องตรงกับ Redirect URI ใน Azure | `http://localhost:3000/api/auth/microsoft/callback` |
| `MICROSOFT_ALLOWED_DOMAIN` | โดเมนอีเมลที่อนุญาต | `thinknet.co.th` |

> ดู keys ได้ตลอดเวลาโดยไม่ต้อง start ใหม่:
> ```bash
> supabase status
> ```

### Local Services

| Service | URL |
| --- | --- |
| Next.js App | <http://localhost:3000> |
| Supabase Studio (ดู/แก้ DB) | <http://localhost:54323> |
| Supabase API | <http://localhost:54321> |
| PostgreSQL (direct) | `localhost:54322` |

### บัญชีทดสอบ (password ทุกคน: `password123`)

| Username | Role | ชื่อ | ทีม |
| --- | --- | --- | --- |
| `somsakdi` | superadmin | สมศักดิ์ แก้วมณี | Management |
| `anucha` | admin | อนุชา วงศ์สวรรค์ | Management |
| `wichai` | leader | วิชัย ประดิษฐ์ | Engineering |
| `supha` | leader | สุภา รักดี | Design |
| `thanakorn` | user | ธนากร สุขใจ | Engineering |
| `malee` | user | มาลี ชมชื่น | Engineering |
| `praphas` | user | ประภาส เจริญ | Design |
| `nipha` | user | นิภา ดีงาม | Design |
| `sommai` | user | สมหมาย ใจดี | HR |

### ข้อมูลตัวอย่าง (seed)

| โครงการ | หัวหน้า | Status | เอกสาร |
| --- | --- | --- | --- |
| อบรมพัฒนาทีม Q1/2567 | wichai | completed | closed + sent ✓ |
| สัมมนาประจำปี 2567 | supha | active | approved + sent |
| ทัศนศึกษา Engineering | wichai | active | pending_review |
| สัมมนาวางแผนกลยุทธ์ | supha | pending | — |
| Team Building Q4 | wichai | draft | — |

### Reset ข้อมูลใหม่

```bash
supabase db reset
# รัน migrations ทั้งหมดใหม่ตั้งแต่ต้น (ข้อมูลเดิมหาย)
```

### หยุด Supabase

```bash
supabase stop          # หยุดแต่เก็บข้อมูลไว้
supabase stop --no-backup  # หยุดและล้างข้อมูลทั้งหมด
```

---

## Production (Vercel + Supabase Cloud)

### ขั้นตอน

```bash
# 1. สร้าง Supabase project ที่ https://supabase.com → New Project

# 2. Link project
supabase link --project-ref <project-ref>
# project-ref ดูจาก URL: supabase.com/dashboard/project/<project-ref>

# 3. Push schema ขึ้น cloud (ไม่รัน seed_mockup)
supabase db push

# 4. ตั้ง ENV บน Vercel (ดูตารางด้านล่าง)

# 5. Deploy
git push origin main
```

### ENV สำหรับ Production (ตั้งใน Vercel Dashboard)

> Vercel Dashboard → Project → Settings → Environment Variables

| Variable | นำมาจาก |
| --- | --- |
| `DATABASE_URL` | Supabase Dashboard → **Settings → Database** → Connection String → URI → เลือก **Transaction** (port 6543) |
| `SUPABASE_URL` | Supabase Dashboard → **Settings → API** → Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Dashboard → **Settings → API** → Project API Keys → `service_role` |
| `SUPABASE_JWT_SECRET` | Supabase Dashboard → **Settings → API** → JWT Settings → **JWT Secret** |
| `CORP_AUTH_API_URL` | endpoint ของ corporate auth API จริง (ถ้าไม่มีใช้ bcrypt จาก DB) |
| `MICROSOFT_CLIENT_ID` | Azure App Registration → Application (client) ID |
| `MICROSOFT_CLIENT_SECRET` | Azure App Registration → Certificates & secrets |
| `MICROSOFT_TENANT_ID` | Azure App Registration → Directory (tenant) ID |
| `MICROSOFT_REDIRECT_URI` | `https://<domain>/api/auth/microsoft/callback` (ต้องตรงกับ Azure) |
| `MICROSOFT_ALLOWED_DOMAIN` | `thinknet.co.th` |

> **สำคัญ:** `SUPABASE_SERVICE_ROLE_KEY` และ `SUPABASE_JWT_SECRET` คือคนละค่ากัน อย่าสลับกัน
>
> | Key ใน Dashboard | ใช้กับ Variable |
> | --- | --- |
> | Project API Keys → `service_role` | `SUPABASE_SERVICE_ROLE_KEY` |
> | JWT Settings → `JWT Secret` | `SUPABASE_JWT_SECRET` |

---

## Auth Flow

```
Microsoft Login (GET /api/auth/microsoft):
  1. redirect ไป Microsoft Entra ID (OIDC + PKCE)
  2. callback แลก code → Graph /me
  3. ตรวจว่า email เป็น @thinknet.co.th
  4. หา members จาก microsoft_oid หรือ email
     - เจอ → ผูก oid/email
     - ไม่เจอ → สร้างสมาชิกใหม่ role=user (JIT)
  5. jwt.sign({ sub: member.id, role }, SUPABASE_JWT_SECRET, 1h)
  6. set httpOnly cookie 'session' แล้ว redirect /login?ms=1
  7. frontend เรียก GET /api/auth/me แล้วเก็บ user ใน localStorage

Password Login (POST /api/auth/login) — ยังใช้ได้:
  1. รับ { username, password }
  2. ถ้ามี CORP_AUTH_API_URL → POST ไปตรวจกับ corporate auth API
     ถ้าไม่มี → ตรวจ bcrypt จาก password_hash ในฐานข้อมูล
  3. query members WHERE username = ?
  4. jwt.sign({ sub: member.id, role }, SUPABASE_JWT_SECRET, 1h)
  5. set httpOnly cookie 'session'
  6. return { user: { id, username, role, email, ... } }
  
ทุก API request:
  → cookie 'session' แนบอัตโนมัติ (credentials: 'include')
  → server อ่าน cookie → jwt.verify() → ได้ user.sub, user.role
  
Frontend:
  → เก็บ user object (id/name/role) ใน localStorage สำหรับแสดง UI
  → ไม่เก็บ token ใน localStorage
```

### Microsoft Entra ID (Azure AD)

สร้าง **App Registration** ใน [Azure Portal](https://portal.azure.com) ของ Thinknet:

1. New registration → เลือก **Accounts in this organizational directory only**
2. ไปที่ **Authentication** → **Add a platform** → เลือก **Web** (อย่าเลือก SPA)
3. Redirect URIs ต้องตรงทุกตัวอักษร ไม่มี slash ท้าย:
   - `http://localhost:3000/api/auth/microsoft/callback`
   - `http://127.0.0.1:3000/api/auth/microsoft/callback` (ถ้าเปิดผ่าน 127.0.0.1)
   - Production: `https://<domain>/api/auth/microsoft/callback`
4. กด **Save** — ถ้าไม่ใส่ตรงนี้จะได้ `AADSTS500113: No reply address is registered`
5. Certificates & secrets → New client secret → คัดลอก **Value** (ไม่ใช่ Secret ID)
6. API permissions: `openid`, `profile`, `email`, `User.Read` (Microsoft Graph)

สมาชิกเดิมที่ต้องการเข้าด้วย Microsoft **โดยไม่สร้างบัญชีใหม่** ต้องใส่ `email` ให้ตรงกับบัญชี Microsoft ในหน้าสมาชิกก่อน

หลังเพิ่ม migration `20240105000000_members_microsoft.sql` ให้รัน:

```bash
supabase db reset          # local — ล้างข้อมูลแล้วรัน migrations ใหม่
# หรือบน production:
supabase db push
```

## File Upload/Download Flow

```
Upload:
  1. client → POST /api/attachments/sign-upload { fileName, fileType, docId }
  2. server ตรวจสิทธิ์ → สร้าง signed upload URL (60 วินาที)
  3. client PUT ไฟล์ตรงไป Supabase Storage (ไม่ผ่าน Next.js)
  4. client → POST /api/expenses/:id/items { attachment_path, attachment_name, ... }

Download:
  1. client → GET /api/attachments/sign-download?path=...
  2. server ตรวจสิทธิ์ → สร้าง signed download URL (60 วินาที)
  3. client เปิด URL ที่ได้โดยตรง
```

## Permission Matrix

| Action | superadmin | admin | leader | user |
| --- | --- | --- | --- | --- |
| จัดการสมาชิก | ✅ ทุกคน | ✅ (ยกเว้น admin+) | ตัวเอง | ตัวเอง |
| สร้างโครงการ | ✅ | ✅ | ✅ (lead = ตัวเอง) | ❌ |
| ดูโครงการ | ทั้งหมด | ทั้งหมด | โครงการตัวเอง | เฉพาะที่เป็นผู้เข้าร่วม (pending/active/completed) |
| อนุมัติโครงการ | ✅ | ✅ | ❌ | ❌ |
| แก้ไข expense items | ✅ | ✅ | ✅ (pending_review/returned เท่านั้น) | ❌ |
| อนุมัติ/ปิด expense | ✅ | ✅ | ❌ | ❌ |
| Reopen expense | ✅ | ✅ | ❌ | ❌ |
| ดู expense | ทั้งหมด | ทั้งหมด | โครงการตัวเอง | approved+sent หรือ closed เท่านั้น |
