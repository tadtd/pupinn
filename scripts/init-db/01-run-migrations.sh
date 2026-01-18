#!/bin/bash
set -e

echo "🔄 Checking database migrations..."
echo ""

# Default database settings (can be overridden via .env)
DB_USER="${POSTGRES_USER:-pupinn_user}"
DB_NAME="${POSTGRES_DB:-pupinn_db}"

# Migrations directory (mounted from docker-compose)
MIGRATIONS_DIR="/migrations"

# Check if migrations directory exists
if [ ! -d "$MIGRATIONS_DIR" ]; then
  echo "⚠️  Warning: Migrations directory not found at $MIGRATIONS_DIR"
  echo "   Migrations will be handled by the backend on startup."
  exit 0
fi

# Check if users table exists (indicates migrations have run)
USERS_TABLE_EXISTS=$(psql -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'users');" 2>/dev/null | tr -d ' ' || echo "f")

if [ "$USERS_TABLE_EXISTS" = "t" ]; then
  echo "✅ Database tables already exist. Migrations appear to have been applied."
  echo "   If migrations are missing, the backend will handle them on startup."
  exit 0
fi

echo "📦 Database is empty. Running initial migrations..."

# Run migrations in order (sorted by directory name)
for migration_dir in $(ls -d "$MIGRATIONS_DIR"/*/ 2>/dev/null | sort); do
  if [ -d "$migration_dir" ]; then
    up_file="$migration_dir/up.sql"
    if [ -f "$up_file" ]; then
      migration_name=$(basename "$migration_dir")
      echo "Running: $migration_name"
      if psql -U "$DB_USER" -d "$DB_NAME" -f "$up_file" 2>&1; then
        echo "  ✓ Completed"
      else
        echo "  ⚠️  Migration may have already been applied or encountered an error"
      fi
      echo ""
    fi
  fi
done

echo "✅ Database migrations complete!"
