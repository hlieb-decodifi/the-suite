-- Migration: Add cookie_consent field to users table
ALTER TABLE users
  ADD COLUMN cookie_consent boolean NOT NULL DEFAULT false;

-- Optionally, update the updated_at timestamp when cookie_consent changes
CREATE OR REPLACE FUNCTION update_users_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_users_updated_at ON users;
CREATE TRIGGER set_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_users_updated_at(); 