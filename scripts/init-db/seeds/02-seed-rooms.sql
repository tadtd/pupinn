-- Seed data for rooms table
-- Idempotent: uses ON CONFLICT DO NOTHING to avoid duplicates

DO $$
BEGIN
  RAISE NOTICE 'Starting room seed data...';
END $$;

-- Insert sample rooms with various types and statuses
-- Using ON CONFLICT to make idempotent
-- Insert sample rooms with various types and statuses (includes `price` in VND)
-- Using ON CONFLICT to make idempotent
INSERT INTO rooms (id, number, room_type, status, created_at, updated_at, price)
VALUES 
  -- Floor 1: Single rooms
  ('10000000-0000-0000-0000-000000000101'::uuid, '101', 'single', 'available', NOW(), NOW(), 1000000),
  ('10000000-0000-0000-0000-000000000102'::uuid, '102', 'single', 'available', NOW(), NOW(), 1000000),
  ('10000000-0000-0000-0000-000000000103'::uuid, '103', 'single', 'occupied', NOW(), NOW(), 1000000),
  
  -- Floor 2: Double rooms
  ('10000000-0000-0000-0000-000000000201'::uuid, '201', 'double', 'available', NOW(), NOW(), 1500000),
  ('10000000-0000-0000-0000-000000000202'::uuid, '202', 'double', 'available', NOW(), NOW(), 1500000),
  ('10000000-0000-0000-0000-000000000203'::uuid, '203', 'double', 'maintenance', NOW(), NOW(), 1500000),
  ('10000000-0000-0000-0000-000000000204'::uuid, '204', 'double', 'occupied', NOW(), NOW(), 1500000),
  
  -- Floor 3: Suites
  ('10000000-0000-0000-0000-000000000301'::uuid, '301', 'suite', 'available', NOW(), NOW(), 2500000),
  ('10000000-0000-0000-0000-000000000302'::uuid, '302', 'suite', 'available', NOW(), NOW(), 2500000),
  ('10000000-0000-0000-0000-000000000303'::uuid, '303', 'suite', 'occupied', NOW(), NOW(), 2500000),
  
  -- Floor 4: Mix
  ('10000000-0000-0000-0000-000000000401'::uuid, '401', 'single', 'available', NOW(), NOW(), 1000000),
  ('10000000-0000-0000-0000-000000000402'::uuid, '402', 'double', 'available', NOW(), NOW(), 1500000),
  ('10000000-0000-0000-0000-000000000403'::uuid, '403', 'suite', 'available', NOW(), NOW(), 2500000)
ON CONFLICT (number) DO UPDATE
  SET room_type = EXCLUDED.room_type,
      status = EXCLUDED.status,
      price = EXCLUDED.price,
      updated_at = NOW();

-- Ensure existing rows have sensible prices based on room_type (idempotent)
UPDATE rooms
SET price = CASE
  WHEN room_type = 'single' THEN 1000000
  WHEN room_type = 'double' THEN 1500000
  WHEN room_type = 'suite' THEN 2500000
  ELSE 1000000
END
WHERE price IS NULL OR price = 0;

DO $$
DECLARE
  inserted_count integer;
BEGIN
  GET DIAGNOSTICS inserted_count = ROW_COUNT;
  IF inserted_count > 0 THEN
    RAISE NOTICE '  ✓ Inserted % sample rooms', inserted_count;
  ELSE
    RAISE NOTICE '  ⊘ Sample rooms already exist, skipping';
  END IF;
  RAISE NOTICE 'Room seed data complete!';
END $$;

