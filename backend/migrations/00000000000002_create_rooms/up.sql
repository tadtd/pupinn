-- Create room_type enum
CREATE TYPE room_type AS ENUM ('single', 'double', 'suite');

-- Create room_status enum
CREATE TYPE room_status AS ENUM ('available', 'occupied', 'maintenance');

-- Create rooms table
CREATE TABLE rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    number VARCHAR(10) NOT NULL UNIQUE,
    room_type room_type NOT NULL,
    status room_status NOT NULL DEFAULT 'available',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_rooms_number ON rooms(number);
CREATE INDEX idx_rooms_status ON rooms(status);

-- Create trigger to auto-update updated_at
CREATE TRIGGER update_rooms_updated_at
    BEFORE UPDATE ON rooms
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

