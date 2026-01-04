-- Your SQL goes here
-- 1. Expand the enum to include management statuses
ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'no_show';
ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'overstay';

-- 2. Normalize existing data to snake_case so Rust can read it
-- This fixes the "invalid input value" error from your screenshot
UPDATE bookings 
SET status = 'checked_in'::booking_status 
WHERE status::text IN ('Checked In', 'CheckedIn');

UPDATE bookings 
SET status = 'upcoming'::booking_status 
WHERE status::text = 'Upcoming';

UPDATE bookings 
SET status = 'checked_out'::booking_status 
WHERE status::text IN ('Checked Out', 'CheckedOut');