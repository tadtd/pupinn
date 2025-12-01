-- Drop trigger and function
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
DROP FUNCTION IF EXISTS update_updated_at_column();

-- Drop table and enum
DROP TABLE IF EXISTS users;
DROP TYPE IF EXISTS user_role;

