-- Remove constraint
ALTER TABLE rooms
  DROP CONSTRAINT IF EXISTS chk_room_price_non_negative;

-- Remove price column
ALTER TABLE rooms
  DROP COLUMN IF EXISTS price;
