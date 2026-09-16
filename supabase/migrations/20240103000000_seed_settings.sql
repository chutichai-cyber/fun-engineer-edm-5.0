-- Seed default system settings
INSERT INTO system_settings (key, value)
VALUES ('welfare_budget_per_person', '1800')
ON CONFLICT (key) DO NOTHING;
