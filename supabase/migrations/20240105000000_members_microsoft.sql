-- Microsoft SSO: email + Azure object id, password optional for SSO-only users

ALTER TABLE members
  ADD COLUMN IF NOT EXISTS email VARCHAR(255),
  ADD COLUMN IF NOT EXISTS microsoft_oid VARCHAR(64);

ALTER TABLE members
  ALTER COLUMN password_hash DROP NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS members_email_unique
  ON members (email)
  WHERE email IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS members_microsoft_oid_unique
  ON members (microsoft_oid)
  WHERE microsoft_oid IS NOT NULL;
