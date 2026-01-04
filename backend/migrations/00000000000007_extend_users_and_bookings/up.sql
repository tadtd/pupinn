-- Add PII fields to users table (simplified: name, phone, id)
ALTER TABLE users
  ADD COLUMN phone VARCHAR(20) NULL,
  ADD COLUMN id_number VARCHAR(50) NULL,
  ADD COLUMN deactivated_at TIMESTAMPTZ NULL;

-- Add price to bookings table
ALTER TABLE bookings
  ADD COLUMN price DECIMAL(12, 0) NOT NULL DEFAULT 0;

-- Create guest_interaction_notes table
CREATE TABLE guest_interaction_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guest_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  admin_id UUID NOT NULL REFERENCES users(id),
  note TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_note_not_empty CHECK (LENGTH(TRIM(note)) > 0)
);

-- Add indexes
CREATE INDEX idx_users_email ON users(email) WHERE email IS NOT NULL;
CREATE INDEX idx_users_phone ON users(phone) WHERE phone IS NOT NULL;
CREATE INDEX idx_users_full_name ON users(full_name) WHERE full_name IS NOT NULL;
CREATE INDEX idx_users_id_number ON users(id_number) WHERE id_number IS NOT NULL;
CREATE INDEX idx_users_role_deactivated ON users(role, deactivated_at) WHERE role IN ('admin', 'receptionist', 'cleaner');
CREATE INDEX idx_bookings_room_status_price ON bookings(room_id, status, check_out_date);
CREATE INDEX idx_guest_notes_guest_id ON guest_interaction_notes(guest_id);
CREATE INDEX idx_guest_notes_created_at ON guest_interaction_notes(created_at);

-- Add constraints
ALTER TABLE bookings ADD CONSTRAINT chk_price_non_negative CHECK (price >= 0);

-- Create function to enforce single admin constraint
CREATE OR REPLACE FUNCTION check_single_admin()
RETURNS TRIGGER AS $$
DECLARE
  admin_count INTEGER;
BEGIN
  -- Only check if role is being set to admin
  IF NEW.role = 'admin' AND (OLD.role IS NULL OR OLD.role != 'admin') THEN
    SELECT COUNT(*) INTO admin_count
    FROM users
    WHERE role = 'admin' AND deactivated_at IS NULL AND id != NEW.id;
    
    IF admin_count > 0 THEN
      RAISE EXCEPTION 'Only one admin account is allowed. An admin account already exists.';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
CREATE TRIGGER enforce_single_admin_on_insert
  BEFORE INSERT ON users
  FOR EACH ROW
  EXECUTE FUNCTION check_single_admin();

CREATE TRIGGER enforce_single_admin_on_update
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION check_single_admin();

-- Create function to prevent deleting last admin
CREATE OR REPLACE FUNCTION prevent_delete_last_admin()
RETURNS TRIGGER AS $$
DECLARE
  admin_count INTEGER;
BEGIN
  IF OLD.role = 'admin' AND OLD.deactivated_at IS NULL THEN
    SELECT COUNT(*) INTO admin_count
    FROM users
    WHERE role = 'admin' AND deactivated_at IS NULL AND id != OLD.id;
    
    IF admin_count = 0 THEN
      RAISE EXCEPTION 'Cannot delete the last admin account. At least one admin must exist.';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to prevent deleting last admin
CREATE TRIGGER prevent_delete_last_admin_trigger
  BEFORE UPDATE OF deactivated_at ON users
  FOR EACH ROW
  WHEN (NEW.deactivated_at IS NOT NULL)
  EXECUTE FUNCTION prevent_delete_last_admin();

-- Update trigger for updated_at (if function exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
    CREATE TRIGGER update_guest_notes_updated_at
      BEFORE UPDATE ON guest_interaction_notes
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;
