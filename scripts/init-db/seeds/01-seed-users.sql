-- Seed data for users table
-- Idempotent: checks if users already exist before inserting

DO $$
BEGIN
  RAISE NOTICE 'Starting user seed data...';

  -- Check if admin user exists
  IF NOT EXISTS (SELECT 1 FROM users WHERE username = 'admin') THEN
    -- Insert admin user with hashed password for "admin123"
    INSERT INTO users (id, username, email, role, password_hash, full_name, created_at, updated_at)
    VALUES (
      '00000000-0000-0000-0000-000000000001'::uuid,
      'admin',
      'admin@pupinn.local',
      'admin',
      '$argon2id$v=19$m=19456,t=2,p=1$Q7qpjUxx/KIS14QRgxPttw$ZIljgEut2REPXKiphJsLmDMneXDCxizpxoH0bJxiBl8',
      'System Administrator',
      NOW(),
      NOW()
    );
    RAISE NOTICE '  ✓ Inserted admin user (username: admin, password: admin123)';
  ELSE
    RAISE NOTICE '  ⊘ Admin user already exists, skipping';
  END IF;

  -- Check if receptionist user exists
  IF NOT EXISTS (SELECT 1 FROM users WHERE username = 'reception') THEN
    -- Insert receptionist user with hashed password for "reception123"
    INSERT INTO users (id, username, email, role, password_hash, full_name, created_at, updated_at)
    VALUES (
      '00000000-0000-0000-0000-000000000002'::uuid,
      'reception',
      'reception@pupinn.local',
      'receptionist',
      '$argon2id$v=19$m=19456,t=2,p=1$5KAhOzRSIvwMzQ4ZXJBWsg$tnEd4b8tbwXcgyaetI9bRyDwXKqO+7mewkEKTFeTpFU',
      'Front Desk Receptionist',
      NOW(),
      NOW()
    );
    RAISE NOTICE '  ✓ Inserted receptionist user (username: reception, password: reception123)';
  ELSE
    RAISE NOTICE '  ⊘ Receptionist user already exists, skipping';
  END IF;

  -- Check if cleaner user exists
  IF NOT EXISTS (SELECT 1 FROM users WHERE username = 'cleaner') THEN
    -- Insert cleaner user with hashed password for "cleaner123"
    INSERT INTO users (id, username, email, role, password_hash, full_name, created_at, updated_at)
    VALUES (
      '00000000-0000-0000-0000-000000000004'::uuid,
      'cleaner',
      'cleaner@pupinn.local',
      'cleaner',
      '$argon2id$v=19$m=19456,t=2,p=1$c6G23yKLofMCXxhATDfKFg$0FpBivdfAV1E8dh9M9JEofdPhehdEwOpr1x0gqY+3Yk',
      'Housekeeping Cleaner',
      NOW(),
      NOW()
    );
    RAISE NOTICE '  ✓ Inserted cleaner user (username: cleaner, password: cleaner123)';
  ELSE
    RAISE NOTICE '  ⊘ Cleaner user already exists, skipping';
  END IF;

  -- Check if guest user exists
  IF NOT EXISTS (SELECT 1 FROM users WHERE email = 'guest@example.com') THEN
    -- Insert guest user with hashed password for "guest123"
    INSERT INTO users (id, username, email, role, password_hash, full_name, created_at, updated_at)
    VALUES (
      '00000000-0000-0000-0000-000000000003'::uuid,
      NULL,
      'guest@example.com',
      'guest',
      '$argon2id$v=19$m=19456,t=2,p=1$8iHuB7fiS94sUBRjkTJahA$+TImWRzVe4flgmWQxgZ0TwDB9u7XOH4P6p1Wx5XSCbc',
      'John Doe',
      NOW(),
      NOW()
    );
    RAISE NOTICE '  ✓ Inserted guest user (email: guest@example.com, password: guest123)';
  ELSE
    RAISE NOTICE '  ⊘ Guest user already exists, skipping';
  END IF;

  RAISE NOTICE 'User seed data complete!';
END $$;

