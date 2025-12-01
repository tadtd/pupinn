-- Drop trigger
DROP TRIGGER IF EXISTS update_rooms_updated_at ON rooms;

-- Drop table and enums
DROP TABLE IF EXISTS rooms;
DROP TYPE IF EXISTS room_status;
DROP TYPE IF EXISTS room_type;

