-- Seed data for bookings table
-- Idempotent: checks if bookings already exist before inserting
-- Creates bookings corresponding to occupied rooms (103, 204, 303)

DO $$
BEGIN
  RAISE NOTICE 'Starting booking seed data...';
  
  -- Check if any sample bookings already exist
  IF NOT EXISTS (SELECT 1 FROM bookings WHERE reference LIKE 'SEED-%') THEN
    
    -- Booking 1: Checked-in guest in Room 103 (single, occupied)
    -- This booking corresponds to the occupied room 103
    INSERT INTO bookings (
      id, reference, guest_name, room_id, check_in_date, check_out_date,
      status, created_by_user_id, creation_source, price, created_at, updated_at
    ) VALUES (
      '20000000-0000-0000-0000-000000000001'::uuid,
      'SEED-001',
      'Jane Smith',
      '10000000-0000-0000-0000-000000000103'::uuid,  -- Room 103 (occupied)
      CURRENT_DATE - INTERVAL '2 days',
      CURRENT_DATE + INTERVAL '2 days',
      'checked_in',
      '00000000-0000-0000-0000-000000000002'::uuid,  -- Receptionist
      'staff',
      (SELECT price FROM rooms WHERE id = '10000000-0000-0000-0000-000000000103'::uuid) * ((CURRENT_DATE + INTERVAL '2 days')::date - (CURRENT_DATE - INTERVAL '2 days')::date),
      NOW() - INTERVAL '3 days',
      NOW()
    );
    
    -- Booking 2: Checked-in guest in Room 204 (double, occupied)
    -- This booking corresponds to the occupied room 204
    INSERT INTO bookings (
      id, reference, guest_name, room_id, check_in_date, check_out_date,
      status, created_by_user_id, creation_source, price, created_at, updated_at
    ) VALUES (
      '20000000-0000-0000-0000-000000000002'::uuid,
      'SEED-002',
      'Michael Chen',
      '10000000-0000-0000-0000-000000000204'::uuid,  -- Room 204 (occupied)
      CURRENT_DATE - INTERVAL '1 day',
      CURRENT_DATE + INTERVAL '3 days',
      'checked_in',
      '00000000-0000-0000-0000-000000000001'::uuid,  -- Admin
      'staff',
      (SELECT price FROM rooms WHERE id = '10000000-0000-0000-0000-000000000204'::uuid) * ((CURRENT_DATE + INTERVAL '3 days')::date - (CURRENT_DATE - INTERVAL '1 day')::date),
      NOW() - INTERVAL '2 days',
      NOW()
    );
    
    -- Booking 3: Checked-in guest in Room 303 (suite, occupied)
    -- This booking corresponds to the occupied room 303
    INSERT INTO bookings (
      id, reference, guest_name, room_id, check_in_date, check_out_date,
      status, created_by_user_id, creation_source, price, created_at, updated_at
    ) VALUES (
      '20000000-0000-0000-0000-000000000003'::uuid,
      'SEED-003',
      'Sarah Williams',
      '10000000-0000-0000-0000-000000000303'::uuid,  -- Room 303 (occupied)
      CURRENT_DATE,
      CURRENT_DATE + INTERVAL '4 days',
      'checked_in',
      '00000000-0000-0000-0000-000000000002'::uuid,  -- Receptionist
      'staff',
      (SELECT price FROM rooms WHERE id = '10000000-0000-0000-0000-000000000303'::uuid) * ((CURRENT_DATE + INTERVAL '4 days')::date - (CURRENT_DATE)::date),
      NOW() - INTERVAL '1 day',
      NOW()
    );
    
    -- Booking 4: Upcoming booking by guest user (Room 101 - available)
    INSERT INTO bookings (
      id, reference, guest_name, room_id, check_in_date, check_out_date,
      status, created_by_user_id, creation_source, price, created_at, updated_at
    ) VALUES (
      '20000000-0000-0000-0000-000000000004'::uuid,
      'SEED-004',
      'John Doe',
      '10000000-0000-0000-0000-000000000101'::uuid,  -- Room 101 (available)
      CURRENT_DATE + INTERVAL '3 days',
      CURRENT_DATE + INTERVAL '6 days',
      'upcoming',
      '00000000-0000-0000-0000-000000000003'::uuid,  -- Guest user
      'guest',
      (SELECT price FROM rooms WHERE id = '10000000-0000-0000-0000-000000000101'::uuid) * ((CURRENT_DATE + INTERVAL '6 days')::date - (CURRENT_DATE + INTERVAL '3 days')::date),
      NOW(),
      NOW()
    );
    
    -- Booking 5: Future booking by guest (Room 301 - available)
    INSERT INTO bookings (
      id, reference, guest_name, room_id, check_in_date, check_out_date,
      status, created_by_user_id, creation_source, price, created_at, updated_at
    ) VALUES (
      '20000000-0000-0000-0000-000000000005'::uuid,
      'SEED-005',
      'Alice Brown',
      '10000000-0000-0000-0000-000000000301'::uuid,  -- Room 301 (available)
      CURRENT_DATE + INTERVAL '10 days',
      CURRENT_DATE + INTERVAL '14 days',
      'upcoming',
      '00000000-0000-0000-0000-000000000003'::uuid,  -- Guest user
      'guest',
      (SELECT price FROM rooms WHERE id = '10000000-0000-0000-0000-000000000301'::uuid) * ((CURRENT_DATE + INTERVAL '14 days')::date - (CURRENT_DATE + INTERVAL '10 days')::date),
      NOW(),
      NOW()
    );
    
    -- Booking 6: Checked-out booking (Room 201 - available)
    INSERT INTO bookings (
      id, reference, guest_name, room_id, check_in_date, check_out_date,
      status, created_by_user_id, creation_source, price, created_at, updated_at
    ) VALUES (
      '20000000-0000-0000-0000-000000000006'::uuid,
      'SEED-006',
      'Bob Johnson',
      '10000000-0000-0000-0000-000000000201'::uuid,  -- Room 201 (available)
      CURRENT_DATE - INTERVAL '5 days',
      CURRENT_DATE - INTERVAL '2 days',
      'checked_out',
      '00000000-0000-0000-0000-000000000001'::uuid,  -- Admin
      'staff',
      (SELECT price FROM rooms WHERE id = '10000000-0000-0000-0000-000000000201'::uuid) * ((CURRENT_DATE - INTERVAL '2 days')::date - (CURRENT_DATE - INTERVAL '5 days')::date),
      NOW() - INTERVAL '6 days',
      NOW() - INTERVAL '2 days'
    );
    
    -- Booking 7: Cancelled booking (Room 402 - available)
    INSERT INTO bookings (
      id, reference, guest_name, room_id, check_in_date, check_out_date,
      status, created_by_user_id, creation_source, price, created_at, updated_at
    ) VALUES (
      '20000000-0000-0000-0000-000000000007'::uuid,
      'SEED-007',
      'Charlie Davis',
      '10000000-0000-0000-0000-000000000402'::uuid,  -- Room 402 (available)
      CURRENT_DATE + INTERVAL '7 days',
      CURRENT_DATE + INTERVAL '9 days',
      'cancelled',
      '00000000-0000-0000-0000-000000000002'::uuid,  -- Receptionist
      'staff',
      (SELECT price FROM rooms WHERE id = '10000000-0000-0000-0000-000000000402'::uuid) * ((CURRENT_DATE + INTERVAL '9 days')::date - (CURRENT_DATE + INTERVAL '7 days')::date),
      NOW(),
      NOW()
    );
    
    RAISE NOTICE '  ✓ Inserted 7 sample bookings';
    RAISE NOTICE '    - 3 checked-in bookings (rooms 103, 204, 303 - occupied)';
    RAISE NOTICE '    - 2 upcoming bookings (rooms 101, 301 - available)';
    RAISE NOTICE '    - 1 checked-out booking (room 201 - available)';
    RAISE NOTICE '    - 1 cancelled booking (room 402 - available)';
  ELSE
    RAISE NOTICE '  ⊘ Sample bookings already exist, skipping';
  END IF;
  
  RAISE NOTICE 'Booking seed data complete!';
END $$;

