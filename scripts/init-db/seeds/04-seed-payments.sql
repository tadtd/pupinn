-- Seed data for payments table
-- Idempotent: checks if payments already exist before inserting
-- Creates payments only for bookings that have been checked in (checked_in or checked_out status)

DO $$
BEGIN
  RAISE NOTICE 'Starting payment seed data...';
  
  -- Check if payments already exist for seed bookings (only for checked-in/checked-out bookings)
  IF NOT EXISTS (SELECT 1 FROM payments WHERE booking_id IN (
    '20000000-0000-0000-0000-000000000001'::uuid,
    '20000000-0000-0000-0000-000000000002'::uuid,
    '20000000-0000-0000-0000-000000000003'::uuid,
    '20000000-0000-0000-0000-000000000006'::uuid,
    '20000000-0000-0000-0000-000000000008'::uuid,
    '20000000-0000-0000-0000-000000000009'::uuid,
    '20000000-0000-0000-0000-000000000010'::uuid,
    '20000000-0000-0000-0000-000000000011'::uuid,
    '20000000-0000-0000-0000-000000000012'::uuid,
    '20000000-0000-0000-0000-000000000013'::uuid,
    '20000000-0000-0000-0000-000000000014'::uuid,
    '20000000-0000-0000-0000-000000000015'::uuid
  )) THEN
    
    -- Payment 1: Deposit for Booking 1 (SEED-001 - checked_in)
    INSERT INTO payments (
      id, booking_id, amount, payment_type, payment_method, notes, created_by_user_id, created_at, updated_at
    ) VALUES (
      '30000000-0000-0000-0000-000000000001'::uuid,
      '20000000-0000-0000-0000-000000000001'::uuid,
      (SELECT price FROM bookings WHERE id = '20000000-0000-0000-0000-000000000001'::uuid) * 0.3,
      'deposit',
      'card',
      'Initial deposit payment',
      '00000000-0000-0000-0000-000000000002'::uuid,  -- Receptionist
      NOW() - INTERVAL '3 days',
      NOW() - INTERVAL '3 days'
    );
    
    -- Payment 2: Partial payment for Booking 1 (SEED-001 - checked_in)
    INSERT INTO payments (
      id, booking_id, amount, payment_type, payment_method, notes, created_by_user_id, created_at, updated_at
    ) VALUES (
      '30000000-0000-0000-0000-000000000002'::uuid,
      '20000000-0000-0000-0000-000000000001'::uuid,
      (SELECT price FROM bookings WHERE id = '20000000-0000-0000-0000-000000000001'::uuid) * 0.4,
      'partial',
      'cash',
      'Additional payment at check-in',
      '00000000-0000-0000-0000-000000000002'::uuid,  -- Receptionist
      NOW() - INTERVAL '2 days',
      NOW() - INTERVAL '2 days'
    );
    
    -- Payment 3: Full payment for Booking 2 (SEED-002 - checked_in)
    INSERT INTO payments (
      id, booking_id, amount, payment_type, payment_method, notes, created_by_user_id, created_at, updated_at
    ) VALUES (
      '30000000-0000-0000-0000-000000000003'::uuid,
      '20000000-0000-0000-0000-000000000002'::uuid,
      (SELECT price FROM bookings WHERE id = '20000000-0000-0000-0000-000000000002'::uuid),
      'full',
      'card',
      'Full payment at check-in',
      '00000000-0000-0000-0000-000000000001'::uuid,  -- Admin
      NOW() - INTERVAL '1 day',
      NOW() - INTERVAL '1 day'
    );
    
    -- Payment 4: Deposit for Booking 3 (SEED-003 - checked_in)
    INSERT INTO payments (
      id, booking_id, amount, payment_type, payment_method, notes, created_by_user_id, created_at, updated_at
    ) VALUES (
      '30000000-0000-0000-0000-000000000004'::uuid,
      '20000000-0000-0000-0000-000000000003'::uuid,
      (SELECT price FROM bookings WHERE id = '20000000-0000-0000-0000-000000000003'::uuid) * 0.5,
      'deposit',
      'bank_transfer',
      'Deposit payment via bank transfer',
      '00000000-0000-0000-0000-000000000002'::uuid,  -- Receptionist
      NOW() - INTERVAL '1 day',
      NOW() - INTERVAL '1 day'
    );
    
    -- Payment 5: Full payment for Booking 6 (SEED-006 - checked_out)
    INSERT INTO payments (
      id, booking_id, amount, payment_type, payment_method, notes, created_by_user_id, created_at, updated_at
    ) VALUES (
      '30000000-0000-0000-0000-000000000005'::uuid,
      '20000000-0000-0000-0000-000000000006'::uuid,
      (SELECT price FROM bookings WHERE id = '20000000-0000-0000-0000-000000000006'::uuid),
      'full',
      'card',
      'Full payment at check-in',
      '00000000-0000-0000-0000-000000000001'::uuid,  -- Admin
      NOW() - INTERVAL '5 days',
      NOW() - INTERVAL '5 days'
    );
    
    -- Payment 6: Full payment for Booking 8 (SEED-008 - checked_out)
    INSERT INTO payments (
      id, booking_id, amount, payment_type, payment_method, notes, created_by_user_id, created_at, updated_at
    ) VALUES (
      '30000000-0000-0000-0000-000000000006'::uuid,
      '20000000-0000-0000-0000-000000000008'::uuid,
      (SELECT price FROM bookings WHERE id = '20000000-0000-0000-0000-000000000008'::uuid),
      'full',
      'card',
      'Full payment at check-in',
      '00000000-0000-0000-0000-000000000002'::uuid,  -- Receptionist
      NOW() - INTERVAL '7 days',
      NOW() - INTERVAL '7 days'
    );
    
    -- Payment 7: Full payment for Booking 9 (SEED-009 - checked_out)
    INSERT INTO payments (
      id, booking_id, amount, payment_type, payment_method, notes, created_by_user_id, created_at, updated_at
    ) VALUES (
      '30000000-0000-0000-0000-000000000007'::uuid,
      '20000000-0000-0000-0000-000000000009'::uuid,
      (SELECT price FROM bookings WHERE id = '20000000-0000-0000-0000-000000000009'::uuid),
      'full',
      'cash',
      'Full payment at check-in',
      '00000000-0000-0000-0000-000000000001'::uuid,  -- Admin
      NOW() - INTERVAL '10 days',
      NOW() - INTERVAL '10 days'
    );
    
    -- Payment 8: Full payment for Booking 10 (SEED-010 - checked_out)
    INSERT INTO payments (
      id, booking_id, amount, payment_type, payment_method, notes, created_by_user_id, created_at, updated_at
    ) VALUES (
      '30000000-0000-0000-0000-000000000008'::uuid,
      '20000000-0000-0000-0000-000000000010'::uuid,
      (SELECT price FROM bookings WHERE id = '20000000-0000-0000-0000-000000000010'::uuid),
      'full',
      'bank_transfer',
      'Full payment via bank transfer',
      '00000000-0000-0000-0000-000000000002'::uuid,  -- Receptionist
      NOW() - INTERVAL '12 days',
      NOW() - INTERVAL '12 days'
    );
    
    -- Payment 9: Full payment for Booking 11 (SEED-011 - checked_out)
    INSERT INTO payments (
      id, booking_id, amount, payment_type, payment_method, notes, created_by_user_id, created_at, updated_at
    ) VALUES (
      '30000000-0000-0000-0000-000000000009'::uuid,
      '20000000-0000-0000-0000-000000000011'::uuid,
      (SELECT price FROM bookings WHERE id = '20000000-0000-0000-0000-000000000011'::uuid),
      'full',
      'card',
      'Full payment at check-in',
      '00000000-0000-0000-0000-000000000001'::uuid,  -- Admin
      NOW() - INTERVAL '14 days',
      NOW() - INTERVAL '14 days'
    );
    
    -- Payment 10: Full payment for Booking 12 (SEED-012 - checked_out)
    INSERT INTO payments (
      id, booking_id, amount, payment_type, payment_method, notes, created_by_user_id, created_at, updated_at
    ) VALUES (
      '30000000-0000-0000-0000-000000000010'::uuid,
      '20000000-0000-0000-0000-000000000012'::uuid,
      (SELECT price FROM bookings WHERE id = '20000000-0000-0000-0000-000000000012'::uuid),
      'full',
      'cash',
      'Full payment at check-in',
      '00000000-0000-0000-0000-000000000002'::uuid,  -- Receptionist
      NOW() - INTERVAL '18 days',
      NOW() - INTERVAL '18 days'
    );
    
    -- Payment 11: Full payment for Booking 13 (SEED-013 - checked_out)
    INSERT INTO payments (
      id, booking_id, amount, payment_type, payment_method, notes, created_by_user_id, created_at, updated_at
    ) VALUES (
      '30000000-0000-0000-0000-000000000011'::uuid,
      '20000000-0000-0000-0000-000000000013'::uuid,
      (SELECT price FROM bookings WHERE id = '20000000-0000-0000-0000-000000000013'::uuid),
      'full',
      'card',
      'Full payment at check-in',
      '00000000-0000-0000-0000-000000000001'::uuid,  -- Admin
      NOW() - INTERVAL '21 days',
      NOW() - INTERVAL '21 days'
    );
    
    -- Payment 12: Full payment for Booking 14 (SEED-014 - checked_out)
    INSERT INTO payments (
      id, booking_id, amount, payment_type, payment_method, notes, created_by_user_id, created_at, updated_at
    ) VALUES (
      '30000000-0000-0000-0000-000000000012'::uuid,
      '20000000-0000-0000-0000-000000000014'::uuid,
      (SELECT price FROM bookings WHERE id = '20000000-0000-0000-0000-000000000014'::uuid),
      'full',
      'bank_transfer',
      'Full payment via bank transfer',
      '00000000-0000-0000-0000-000000000002'::uuid,  -- Receptionist
      NOW() - INTERVAL '25 days',
      NOW() - INTERVAL '25 days'
    );
    
    -- Payment 13: Full payment for Booking 15 (SEED-015 - checked_out)
    INSERT INTO payments (
      id, booking_id, amount, payment_type, payment_method, notes, created_by_user_id, created_at, updated_at
    ) VALUES (
      '30000000-0000-0000-0000-000000000013'::uuid,
      '20000000-0000-0000-0000-000000000015'::uuid,
      (SELECT price FROM bookings WHERE id = '20000000-0000-0000-0000-000000000015'::uuid),
      'full',
      'card',
      'Full payment at check-in',
      '00000000-0000-0000-0000-000000000001'::uuid,  -- Admin
      NOW() - INTERVAL '28 days',
      NOW() - INTERVAL '28 days'
    );
    
    RAISE NOTICE '  ✓ Inserted 13 sample payments';
    RAISE NOTICE '    - 2 payments for booking SEED-001 (checked_in: deposit + partial)';
    RAISE NOTICE '    - 1 full payment for booking SEED-002 (checked_in)';
    RAISE NOTICE '    - 1 deposit for booking SEED-003 (checked_in)';
    RAISE NOTICE '    - 9 full payments for checked_out bookings (SEED-006, 008-015)';
  ELSE
    RAISE NOTICE '  ⊘ Sample payments already exist, skipping';
  END IF;
  
  RAISE NOTICE 'Payment seed data complete!';
END $$;
