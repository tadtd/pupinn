-- Drop triggers
DROP TRIGGER IF EXISTS update_guest_notes_updated_at ON guest_interaction_notes;
DROP TRIGGER IF EXISTS prevent_delete_last_admin_trigger ON users;
DROP TRIGGER IF EXISTS enforce_single_admin_on_update ON users;
DROP TRIGGER IF EXISTS enforce_single_admin_on_insert ON users;

-- Drop functions
DROP FUNCTION IF EXISTS prevent_delete_last_admin();
DROP FUNCTION IF EXISTS check_single_admin();

-- Drop constraints
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS chk_price_non_negative;

-- Drop indexes
DROP INDEX IF EXISTS idx_guest_notes_created_at;
DROP INDEX IF EXISTS idx_guest_notes_guest_id;
DROP INDEX IF EXISTS idx_bookings_room_status_price;
DROP INDEX IF EXISTS idx_users_role_deactivated;
DROP INDEX IF EXISTS idx_users_id_number;
DROP INDEX IF EXISTS idx_users_full_name;
DROP INDEX IF EXISTS idx_users_phone;
DROP INDEX IF EXISTS idx_users_email;

-- Drop table
DROP TABLE IF EXISTS guest_interaction_notes;

-- Remove columns
ALTER TABLE bookings DROP COLUMN IF EXISTS price;
ALTER TABLE users
  DROP COLUMN IF EXISTS deactivated_at,
  DROP COLUMN IF EXISTS id_number,
  DROP COLUMN IF EXISTS phone;
