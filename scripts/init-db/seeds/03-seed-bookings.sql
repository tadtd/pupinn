-- Seed data for bookings table
-- Idempotent: checks if bookings already exist before inserting
-- Creates bookings corresponding to occupied rooms (103, 204, 303)

DO $$
BEGIN
  RAISE NOTICE 'Starting booking seed data...';
  
  -- Update existing bookings with new guest names, or create if they don't exist
  -- First, update existing bookings
  UPDATE bookings SET guest_name = 'Bao-Huy Pham' WHERE reference = 'SEED-001';
  UPDATE bookings SET guest_name = 'Tien-Dat Do' WHERE reference = 'SEED-002';
  UPDATE bookings SET guest_name = 'Tien-Dat Dam' WHERE reference = 'SEED-003';
  UPDATE bookings SET guest_name = 'Quang-De Tran' WHERE reference = 'SEED-004';
  UPDATE bookings SET guest_name = 'Xuan-Dung Nguyen' WHERE reference = 'SEED-005';
  UPDATE bookings SET guest_name = 'Minh-Tuan Nguyen-Ngoc' WHERE reference = 'SEED-006';
  UPDATE bookings SET guest_name = 'Thanh-Trinh Nguyen' WHERE reference = 'SEED-007';
  UPDATE bookings SET guest_name = 'Van-Anh Le' WHERE reference = 'SEED-008';
  UPDATE bookings SET guest_name = 'Hoang-Nam Vu' WHERE reference = 'SEED-009';
  UPDATE bookings SET guest_name = 'Thi-Hong Tran' WHERE reference = 'SEED-010';
  UPDATE bookings SET guest_name = 'Quoc-Dung Phan' WHERE reference = 'SEED-011';
  UPDATE bookings SET guest_name = 'Mai-Linh Ho' WHERE reference = 'SEED-012';
  UPDATE bookings SET guest_name = 'Thanh-Long Bui' WHERE reference = 'SEED-013';
  UPDATE bookings SET guest_name = 'Thu-Ha Dang' WHERE reference = 'SEED-014';
  UPDATE bookings SET guest_name = 'Duc-Minh Vo' WHERE reference = 'SEED-015';
  
  -- Then create if they don't exist
  IF NOT EXISTS (SELECT 1 FROM bookings WHERE reference LIKE 'SEED-%') THEN
    
    -- Booking 1: Checked-in guest in Room 103 (single, occupied)
    -- This booking corresponds to the occupied room 103
    INSERT INTO bookings (
      id, reference, guest_name, room_id, check_in_date, check_out_date,
      status, created_by_user_id, creation_source, price, created_at, updated_at
    ) VALUES (
      '20000000-0000-0000-0000-000000000001'::uuid,
      'SEED-001',
      'Bao-Huy Pham',
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
      'Tien-Dat Do',
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
      'Tien-Dat Dam',
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
      'Quang-De Tran',
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
      'Xuan-Dung Nguyen',
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
      'Minh-Tuan Nguyen-Ngoc',
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
      'Thanh-Trinh Nguyen',
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
  
  -- Add additional checked-out bookings for more detailed line graph data
  -- These are added conditionally regardless of the above block
  
  -- Booking 8: Checked-out booking (Room 102 - available)
  IF NOT EXISTS (SELECT 1 FROM bookings WHERE reference = 'SEED-008') THEN
    INSERT INTO bookings (
      id, reference, guest_name, room_id, check_in_date, check_out_date,
      status, created_by_user_id, creation_source, price, created_at, updated_at
    ) VALUES (
      '20000000-0000-0000-0000-000000000008'::uuid,
      'SEED-008',
      'Van-Anh Le',
      '10000000-0000-0000-0000-000000000102'::uuid,  -- Room 102
      CURRENT_DATE - INTERVAL '7 days',
      CURRENT_DATE - INTERVAL '4 days',
      'checked_out',
      '00000000-0000-0000-0000-000000000002'::uuid,  -- Receptionist
      'staff',
      (SELECT price FROM rooms WHERE id = '10000000-0000-0000-0000-000000000102'::uuid) * 3,
      NOW() - INTERVAL '8 days',
      NOW() - INTERVAL '4 days'
    );
  END IF;
  
  -- Booking 9: Checked-out booking (Room 202 - available)
  IF NOT EXISTS (SELECT 1 FROM bookings WHERE reference = 'SEED-009') THEN
    INSERT INTO bookings (
      id, reference, guest_name, room_id, check_in_date, check_out_date,
      status, created_by_user_id, creation_source, price, created_at, updated_at
    ) VALUES (
      '20000000-0000-0000-0000-000000000009'::uuid,
      'SEED-009',
      'Hoang-Nam Vu',
      '10000000-0000-0000-0000-000000000202'::uuid,  -- Room 202
      CURRENT_DATE - INTERVAL '10 days',
      CURRENT_DATE - INTERVAL '7 days',
      'checked_out',
      '00000000-0000-0000-0000-000000000001'::uuid,  -- Admin
      'staff',
      (SELECT price FROM rooms WHERE id = '10000000-0000-0000-0000-000000000202'::uuid) * 3,
      NOW() - INTERVAL '11 days',
      NOW() - INTERVAL '7 days'
    );
  END IF;
  
  -- Booking 10: Checked-out booking (Room 302 - available)
  IF NOT EXISTS (SELECT 1 FROM bookings WHERE reference = 'SEED-010') THEN
    INSERT INTO bookings (
      id, reference, guest_name, room_id, check_in_date, check_out_date,
      status, created_by_user_id, creation_source, price, created_at, updated_at
    ) VALUES (
      '20000000-0000-0000-0000-000000000010'::uuid,
      'SEED-010',
      'Thi-Hong Tran',
      '10000000-0000-0000-0000-000000000302'::uuid,  -- Room 302
      CURRENT_DATE - INTERVAL '12 days',
      CURRENT_DATE - INTERVAL '9 days',
      'checked_out',
      '00000000-0000-0000-0000-000000000002'::uuid,  -- Receptionist
      'staff',
      (SELECT price FROM rooms WHERE id = '10000000-0000-0000-0000-000000000302'::uuid) * 3,
      NOW() - INTERVAL '13 days',
      NOW() - INTERVAL '9 days'
    );
  END IF;
  
  -- Booking 11: Checked-out booking (Room 401 - available)
  IF NOT EXISTS (SELECT 1 FROM bookings WHERE reference = 'SEED-011') THEN
    INSERT INTO bookings (
      id, reference, guest_name, room_id, check_in_date, check_out_date,
      status, created_by_user_id, creation_source, price, created_at, updated_at
    ) VALUES (
      '20000000-0000-0000-0000-000000000011'::uuid,
      'SEED-011',
      'Quoc-Dung Phan',
      '10000000-0000-0000-0000-000000000401'::uuid,  -- Room 401
      CURRENT_DATE - INTERVAL '14 days',
      CURRENT_DATE - INTERVAL '11 days',
      'checked_out',
      '00000000-0000-0000-0000-000000000001'::uuid,  -- Admin
      'staff',
      (SELECT price FROM rooms WHERE id = '10000000-0000-0000-0000-000000000401'::uuid) * 3,
      NOW() - INTERVAL '15 days',
      NOW() - INTERVAL '11 days'
    );
  END IF;
  
  -- Booking 12: Checked-out booking (Room 403 - available)
  IF NOT EXISTS (SELECT 1 FROM bookings WHERE reference = 'SEED-012') THEN
    INSERT INTO bookings (
      id, reference, guest_name, room_id, check_in_date, check_out_date,
      status, created_by_user_id, creation_source, price, created_at, updated_at
    ) VALUES (
      '20000000-0000-0000-0000-000000000012'::uuid,
      'SEED-012',
      'Mai-Linh Ho',
      '10000000-0000-0000-0000-000000000403'::uuid,  -- Room 403
      CURRENT_DATE - INTERVAL '18 days',
      CURRENT_DATE - INTERVAL '15 days',
      'checked_out',
      '00000000-0000-0000-0000-000000000002'::uuid,  -- Receptionist
      'staff',
      (SELECT price FROM rooms WHERE id = '10000000-0000-0000-0000-000000000403'::uuid) * 3,
      NOW() - INTERVAL '19 days',
      NOW() - INTERVAL '15 days'
    );
  END IF;
  
  -- Booking 13: Checked-out booking (Room 102 - available)
  IF NOT EXISTS (SELECT 1 FROM bookings WHERE reference = 'SEED-013') THEN
    INSERT INTO bookings (
      id, reference, guest_name, room_id, check_in_date, check_out_date,
      status, created_by_user_id, creation_source, price, created_at, updated_at
    ) VALUES (
      '20000000-0000-0000-0000-000000000013'::uuid,
      'SEED-013',
      'Thanh-Long Bui',
      '10000000-0000-0000-0000-000000000102'::uuid,  -- Room 102
      CURRENT_DATE - INTERVAL '21 days',
      CURRENT_DATE - INTERVAL '19 days',
      'checked_out',
      '00000000-0000-0000-0000-000000000001'::uuid,  -- Admin
      'staff',
      (SELECT price FROM rooms WHERE id = '10000000-0000-0000-0000-000000000102'::uuid) * 2,
      NOW() - INTERVAL '22 days',
      NOW() - INTERVAL '19 days'
    );
  END IF;
  
  -- Booking 14: Checked-out booking (Room 202 - available)
  IF NOT EXISTS (SELECT 1 FROM bookings WHERE reference = 'SEED-014') THEN
    INSERT INTO bookings (
      id, reference, guest_name, room_id, check_in_date, check_out_date,
      status, created_by_user_id, creation_source, price, created_at, updated_at
    ) VALUES (
      '20000000-0000-0000-0000-000000000014'::uuid,
      'SEED-014',
      'Thu-Ha Dang',
      '10000000-0000-0000-0000-000000000202'::uuid,  -- Room 202
      CURRENT_DATE - INTERVAL '25 days',
      CURRENT_DATE - INTERVAL '22 days',
      'checked_out',
      '00000000-0000-0000-0000-000000000002'::uuid,  -- Receptionist
      'staff',
      (SELECT price FROM rooms WHERE id = '10000000-0000-0000-0000-000000000202'::uuid) * 3,
      NOW() - INTERVAL '26 days',
      NOW() - INTERVAL '22 days'
    );
  END IF;
  
  -- Booking 15: Checked-out booking (Room 302 - available)
  IF NOT EXISTS (SELECT 1 FROM bookings WHERE reference = 'SEED-015') THEN
    INSERT INTO bookings (
      id, reference, guest_name, room_id, check_in_date, check_out_date,
      status, created_by_user_id, creation_source, price, created_at, updated_at
    ) VALUES (
      '20000000-0000-0000-0000-000000000015'::uuid,
      'SEED-015',
      'Duc-Minh Vo',
      '10000000-0000-0000-0000-000000000302'::uuid,  -- Room 302
      CURRENT_DATE - INTERVAL '28 days',
      CURRENT_DATE - INTERVAL '25 days',
      'checked_out',
      '00000000-0000-0000-0000-000000000001'::uuid,  -- Admin
      'staff',
      (SELECT price FROM rooms WHERE id = '10000000-0000-0000-0000-000000000302'::uuid) * 3,
      NOW() - INTERVAL '29 days',
      NOW() - INTERVAL '25 days'
    );
  END IF;
  
  RAISE NOTICE 'Booking seed data complete!';
END $$;

