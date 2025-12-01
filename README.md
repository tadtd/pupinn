# Pupinn - Hotel Management System (MVP)

A modern hotel management system built as a student project for an Introduction to Software Engineering (ISE) course. The system covers the core MVP pillars: Guest Check-in/out, Room Status Management, and Basic Bookings.

## 🏗️ Architecture

- **Backend**: Rust with Axum web framework
- **Frontend**: Next.js 15 with React 19 and shadcn/ui
- **Database**: PostgreSQL with Diesel ORM
- **Authentication**: JWT-based with Argon2id password hashing

## 📋 Features

### Core Functionality
- **Booking Management**: Create, view, and cancel reservations
- **Room Management**: Add rooms, update status (Available/Occupied/Maintenance)
- **Guest Check-in/Check-out**: Full guest lifecycle management
- **Dashboard**: Today's arrivals, departures, and room availability stats

### User Roles
- **Receptionist**: Book rooms, check-in/out guests, view bookings
- **Admin**: All receptionist permissions + room management

## 🚀 Quick Start

### Prerequisites
- Rust 1.75+ with Cargo
- Node.js 20+ with pnpm
- PostgreSQL 15+
- Diesel CLI (`cargo install diesel_cli --no-default-features --features postgres`)

### 1. Database Setup

```bash
# Create database
createdb -U postgres hms_dev

# Set environment variable
cd backend
echo "DATABASE_URL=postgres://postgres:password@localhost/hms_dev" > .env

# Run migrations
diesel migration run
```

### 2. Backend Setup

```bash
cd backend

# Create .env file
cat > .env << EOF
DATABASE_URL=postgres://postgres:password@localhost/hms_dev
JWT_SECRET=$(openssl rand -hex 64)
ALLOWED_ORIGIN=http://localhost:3000
SERVER_HOST=0.0.0.0
SERVER_PORT=8080
EOF

# Seed database with sample data
cargo run --bin seed

# Start server
cargo run --bin server
```

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
pnpm install

# Create .env.local
echo "NEXT_PUBLIC_API_URL=http://localhost:8080" > .env.local

# Start development server
pnpm dev
```

### 4. Access the Application

Open http://localhost:3000 in your browser.

**Default Credentials:**
| Username  | Password     | Role         |
| --------- | ------------ | ------------ |
| admin     | admin123     | Admin        |
| reception | reception123 | Receptionist |

## 📁 Project Structure

```
├── backend/
│   ├── src/
│   │   ├── api/           # Axum handlers (controllers)
│   │   ├── models/        # Domain models + Diesel mappings
│   │   ├── services/      # Business logic layer
│   │   ├── config.rs      # Environment configuration
│   │   ├── db.rs          # Database connection pool
│   │   ├── errors.rs      # Unified error handling
│   │   └── main.rs        # Server bootstrap
│   ├── migrations/        # Diesel SQL migrations
│   └── tests/             # Unit tests
│
├── frontend/
    ├── app/               # Next.js App Router pages
    ├── components/        # React components
    │   └── ui/            # shadcn/ui primitives
    ├── lib/               # Utilities, API client, validators
    └── hooks/             # Custom React hooks

```

## 🧪 Testing

```bash
# Backend tests
cd backend
cargo test

# Frontend build verification
cd frontend
pnpm build
```

## 📖 API Endpoints

### Authentication
- `POST /auth/login` - Login with username/password
- `GET /auth/me` - Get current user info
- `POST /auth/users` - Create new user (admin only)

### Rooms
- `GET /rooms` - List all rooms (with optional filters)
- `GET /rooms/:id` - Get room by ID
- `POST /rooms` - Create room (admin only)
- `PATCH /rooms/:id` - Update room (admin only)
- `GET /rooms/available` - Get available rooms for date range

### Bookings
- `GET /bookings` - List bookings (with filters)
- `GET /bookings/:id` - Get booking by ID
- `GET /bookings/reference/:ref` - Get booking by reference
- `POST /bookings` - Create new booking
- `POST /bookings/:id/check-in` - Check in guest
- `POST /bookings/:id/check-out` - Check out guest
- `POST /bookings/:id/cancel` - Cancel booking

## 🎓 Course Context

This project was developed as part of an Introduction to Software Engineering course, demonstrating:
- MVC-Layered Architecture
- Unit Testing for business logic
- Clean Code principles
- Full-stack web development
- Database design and migrations
- JWT authentication

## 📝 License

MIT License - See LICENSE file for details.

