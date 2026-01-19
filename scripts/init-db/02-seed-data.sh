#!/bin/bash
set -e

echo "🌱 Checking database for existing data..."

# Default database settings (can be overridden via .env)
DB_USER="${POSTGRES_USER:-pupinn_user}"
DB_NAME="${POSTGRES_DB:-pupinn_db}"

# Check if users table exists
TABLE_EXISTS=$(psql -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'users');" 2>/dev/null | tr -d ' ' || echo "f")

if [ "$TABLE_EXISTS" != "t" ]; then
  echo "⚠️  Users table does not exist yet. Migrations may not have run."
  echo "   Skipping seed (migrations should run first)."
  exit 0
fi

# Check if users table has data
USER_COUNT=$(psql -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM users WHERE role != 'bot';" 2>/dev/null | tr -d ' ' || echo "0")

if [ "$USER_COUNT" -gt 0 ]; then
  echo "✅ Database already contains data ($USER_COUNT users found). Skipping seed."
  exit 0
fi

echo "📦 Database is empty. Seeding with sample data..."
echo ""

# Seed directory - when running in docker-entrypoint-initdb.d, seeds are in the same directory structure
SEED_DIR="$(dirname "$0")/seeds"

# Check if seed directory exists
if [ ! -d "$SEED_DIR" ]; then
  echo "❌ Error: Seed directory not found at $SEED_DIR"
  exit 1
fi

# Execute seed scripts in order
for seed_file in "$SEED_DIR"/0*.sql; do
  if [ -f "$seed_file" ]; then
    filename=$(basename "$seed_file")
    echo "Loading: $filename"
    psql -U "$DB_USER" -d "$DB_NAME" -f "$seed_file"
    echo "  ✓ Completed"
    echo ""
  fi
done

echo "✅ Database seeding complete!"

