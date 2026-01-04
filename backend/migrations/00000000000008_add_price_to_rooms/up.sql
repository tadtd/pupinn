-- Add price column to rooms table
ALTER TABLE rooms
  ADD COLUMN price DECIMAL(12, 0) NOT NULL DEFAULT 1000000;

-- Set default prices based on room_type (values in VND)
-- Single: 1,000,000 VND, Double: 1,500,000 VND, Suite: 2,500,000 VND
UPDATE rooms
SET price = CASE
  WHEN room_type = 'single' THEN 1000000
  WHEN room_type = 'double' THEN 1500000
  WHEN room_type = 'suite' THEN 2500000
  ELSE 1000000
END;

-- Add constraint to ensure price is non-negative
ALTER TABLE rooms
  ADD CONSTRAINT chk_room_price_non_negative CHECK (price >= 0);
