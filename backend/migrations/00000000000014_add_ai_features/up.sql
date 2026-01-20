ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'bot';

-- Create system_settings table
CREATE TABLE system_settings (
    key VARCHAR(50) PRIMARY KEY,
    value TEXT NOT NULL,
    description TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Seed Pupinn Bot User (Fixed ID for easy reference)
INSERT INTO users (id, username, email, role, password_hash, full_name, created_at, updated_at)
VALUES (
    '00000000-0000-0000-0000-000000000000',
    'Pupinn',
    'pupinn@pupinn.local',
    'bot',
    -- Random unusable hash
    '$argon2id$v=19$m=19456,t=2,p=1$Q7qpjUxx/KIS14QRgxPttw$ZIljgEut2REPXKiphJsLmDMneXDCxizpxoH0bJxiBl8', 
    'Pupinn AI Assistant',
    NOW(),
    NOW()
) ON CONFLICT (id) DO NOTHING;

-- Seed Default Settings
INSERT INTO system_settings (key, value, description) VALUES
('ai_enabled', 'false', 'Master switch for AI chatbot features'),
('ai_provider', 'gemini', 'AI Provider (openai, gemini)'),
('ai_api_key', '', 'API Key for the AI provider'),
('ai_model', 'gemini-3-flash-preview', 'Model identifier to use');