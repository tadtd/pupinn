-- Drop trigger
DROP TRIGGER IF EXISTS update_bookings_updated_at ON bookings;

-- Drop table and enum
DROP TABLE IF EXISTS bookings;
DROP TYPE IF EXISTS booking_status;

