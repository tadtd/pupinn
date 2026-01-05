# Pupinn - Hotel Management System (MVP)

A modern hotel management system built as a student project for an Introduction to Software Engineering (ISE) course. The system covers the core MVP pillars: Guest Check-in/out, Room Status Management, and Basic Bookings.

## 🏗️ Architecture

- **Backend**: Rust with Axum web framework
- **Frontend**: Next.js 15 with React 19 and shadcn/ui
- **Database**: PostgreSQL 16 (Dockerized) with Diesel ORM
- **Authentication**: JWT-based with Argon2id password hashing
- **Infrastructure**: Docker Compose for database orchestration

## 📋 Features

### Core Functionality

- **Booking Management**: Create, view, and cancel reservations
- **Room Management**: Add rooms, update status (Available/Occupied/Maintenance/Dirty/Cleaning)
- **Guest Check-in/Check-out**: Full guest lifecycle management (checkout now marks rooms Dirty)
- **Dashboard**: Today's arrivals, departures, and room availability stats
- **Cleaner Dashboard**: Visual status indicators (red/yellow/green) and cleaning workflow (Dirty → Cleaning → Available)

### User Roles

- **Guest**: Self-register, login, search rooms, book rooms, view/cancel own bookings
- **Receptionist**: Book rooms, check-in/out guests, view all bookings
- **Admin**: All receptionist permissions + room management
- **Cleaner**: Access cleaner dashboard to view Dirty/Cleaning/Available rooms, update statuses, and cannot set rooms to Occupied/Maintenance

### Guest Self-Service Portal

- **Registration**: Guests can create accounts with email, password, and name
- **Room Search**: Search available rooms by date range and room type
- **Self-Booking**: Book rooms directly without staff assistance
- **Booking Management**: View own bookings and cancel upcoming reservations

## 🚀 Quick Start

### Prerequisites

- **Docker** and **Docker Compose** (for database) and Postgres 16.
- **Rust** 1.75+ with Cargo
- **Node.js** 20+ with pnpm
- **Diesel CLI** (`cargo install diesel_cli --no-default-features --features postgres`)

### 1. Database Setup (Dockerized)

The project uses a Dockerized PostgreSQL 16 database with automatic migrations and optional seed data.

```bash
# Step 1: Create environment file and edit your own customize database settings
mv .env.example .env
# Step 1.1: Edit .env to customize database settings

# Step 2: Start database container
docker compose up -d postgres

# Step 3: Wait for container to be healthy (10-15 seconds)
docker compose ps
```

**What gets created:**

- ✅ PostgreSQL 16 container with persistent data
- ✅ Database with all tables (users, rooms, bookings)
- ✅ Health checks for container readiness

**Default Configuration:**

- **Database**: `pupinn_db` (customizable in `.env`)
- **User**: `pupinn_user`
- **Port**: `5432` (customizable if port conflict)
- **Connection String**: `postgresql://pupinn_user:dev_password_123@localhost:5432/pupinn_db`

### Seed Sample Data (Optional)

Creates full demo dataset:

- 3 users (admin, reception, guest@example.com)
- 13 rooms (full hotel layout)
- 5 sample bookings

**Bash/Linux/Mac:**

```bash
# From project root
./scripts/init-db/seed-data.sh
```

**PowerShell/Windows (Easiest - Recommended):**

```powershell
# From project root - Run the helper script
.\scripts\init-db\seed-data.ps1
```

### 2. Backend Setup

```bash
cd backend

# Create .env file (adjust DATABASE_URL if you customized database settings) with your own username, password, port, and database name
DATABASE_URL=postgresql://{your_username}:{your_password}@localhost:{your_port}/{your_database_name}
JWT_SECRET={your_jwt_secret} // or generate a random one with (openssl rand -hex 64)
ALLOWED_ORIGIN=http://localhost:3000
SERVER_HOST=0.0.0.0
SERVER_PORT=8080

# Run migrations
diesel migration run

# Start server
cargo run --bin server
```

The server will start on `http://localhost:8080`.

> **Note**: If you haven't seeded sample data yet, see the "Optional: Seed Sample Data" section above.

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

**Portal URLs:**
| Portal | URL | Description |
| --------------- | --------------------------------- | ---------------------- |
| Guest Login | http://localhost:3000/login | Guest sign in/register |
| Staff Login | http://localhost:3000/staff/login | Staff portal |
| Guest Dashboard | http://localhost:3000/guest | Guest booking area |
| Staff Dashboard | http://localhost:3000 | Staff management area |

**Staff Credentials** (available with both seed options):
| Username | Password | Role |
| --------- | ------------ | ------------ |
| admin | admin123 | Admin |
| reception | reception123 | Receptionist |

**Sample Guest Account** (only with SQL seed scripts - Option B):
| Email | Password | Name |
| ----------------- | -------- | -------- |
| guest@example.com | guest123 | John Doe |

**Or Register New Guest:**
Guests can self-register at `/register` with email, password, and full name.

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
│   ├── app/               # Next.js App Router pages
│   ├── components/        # React components
│   │   └── ui/            # shadcn/ui primitives
│   ├── lib/               # Utilities, API client, validators
│   └── hooks/             # Custom React hooks
│
├── scripts/
│   └── init-db/           # Database initialization scripts
│       ├── 01-run-migrations.sh    # Diesel migration runner
│       ├── 02-seed-data.sh         # Optional seed data loader
│       └── seeds/         # SQL seed files
│           ├── 01-seed-users.sql   # Sample users
│           ├── 02-seed-rooms.sql   # Sample rooms
│           └── 03-seed-bookings.sql # Sample bookings
│
├── docker-compose.yml     # Database container orchestration
└── .env.example           # Environment variable template

```

## 🐳 Docker Database Management

### Common Commands

```bash
# Start database
docker compose up -d postgres

# Stop database
docker compose down

# Stop and remove data (fresh start)
docker compose down -v

# View logs
docker compose logs postgres

# Check health status
docker compose ps

# Access PostgreSQL shell
docker compose exec postgres psql -U pupinn_user -d pupinn_db

# Backup database
# Bash: docker compose exec postgres pg_dump -U pupinn_user pupinn_db > backup.sql
# PowerShell: docker compose exec postgres pg_dump -U pupinn_user pupinn_db | Out-File -Encoding utf8 backup.sql

# Restore database
# Bash: docker compose exec -T postgres psql -U pupinn_user -d pupinn_db < backup.sql
# PowerShell: Get-Content backup.sql | docker compose exec -T postgres psql -U pupinn_user -d pupinn_db
```

### Troubleshooting

**Port conflict (5432 already in use):**
Edit `.env` and change `POSTGRES_PORT=5433`, then update backend `DATABASE_URL` accordingly.

**Database not responding:**

```bash
# Check container status
docker compose ps

# View recent logs
docker compose logs --tail=50 postgres

# Restart container
docker compose restart postgres
```

**Reset database completely:**

```bash
docker compose down -v
docker compose up -d postgres
cd backend && diesel migration run
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

### Staff Authentication

- `POST /auth/login` - Staff login with username/password
- `GET /auth/me` - Get current staff user info
- `POST /auth/users` - Create new staff user (admin only)

### Guest Authentication

- `POST /auth/register` - Register new guest account
- `POST /auth/guest/login` - Guest login with email/password
- `GET /auth/guest/me` - Get current guest user info

### Rooms

- `GET /rooms` - List all rooms (with optional filters)
- `GET /rooms/:id` - Get room by ID
- `POST /rooms` - Create room (admin only)
- `PATCH /rooms/:id` - Update room (admin only)
- `GET /rooms/available` - Get available rooms for date range

### Staff Bookings

- `GET /bookings` - List all bookings (with filters)
- `GET /bookings/:id` - Get booking by ID
- `GET /bookings/reference/:ref` - Get booking by reference
- `POST /bookings` - Create new booking (staff)
- `POST /bookings/:id/check-in` - Check in guest
- `POST /bookings/:id/check-out` - Check out guest
- `POST /bookings/:id/cancel` - Cancel booking

### Guest Bookings

- `GET /guest/bookings` - List own bookings (requires guest auth)
- `GET /guest/bookings/:id` - Get own booking by ID
- `POST /guest/bookings` - Create new booking (guest)
- `POST /guest/bookings/:id/cancel` - Cancel own upcoming booking

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
