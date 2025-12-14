# Setup Guide - Fixing Database Connection Issues

## Quick Fix for "ECONNREFUSED" Error

The error `ECONNREFUSED ::1:5432` means PostgreSQL is not running or not accessible.

### Step 1: Install PostgreSQL (if not installed)

**macOS (using Homebrew):**
```bash
brew install postgresql@14
# or
brew install postgresql
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt-get update
sudo apt-get install postgresql postgresql-contrib
```

**Windows:**
Download and install from https://www.postgresql.org/download/windows/

### Step 2: Start PostgreSQL

**macOS:**
```bash
# Start PostgreSQL service
brew services start postgresql
# or
pg_ctl -D /usr/local/var/postgres start
```

**Linux:**
```bash
sudo systemctl start postgresql
# Enable auto-start on boot
sudo systemctl enable postgresql
```

**Windows:**
Start PostgreSQL service from Services panel or use pgAdmin.

### Step 3: Create Database

```bash
# Create the database
createdb ota_console

# Or using psql
psql postgres
CREATE DATABASE ota_console;
\q
```

### Step 4: Configure Environment Variables

Create/update `backend/.env`:

**macOS (Homebrew) - Default user is your macOS username:**
```env
# Database Configuration (macOS with Homebrew)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=ota_console
DB_USER=punithmanthri  # Your macOS username (usually no password needed)
DB_PASSWORD=

# Or use connection string
# DATABASE_URL=postgresql://punithmanthri@localhost:5432/ota_console
```

**Linux/Windows - Typically uses 'postgres' user:**
```env
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=ota_console
DB_USER=postgres
DB_PASSWORD=your_password

# Or use connection string
# DATABASE_URL=postgresql://postgres:password@localhost:5432/ota_console
```

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=7d

# Server Configuration
PORT=3001
NODE_ENV=development
```

### Step 5: Run Database Migrations

```bash
cd backend
npm run migrate
```

This will create all necessary tables (users, versions, update_logs).

### Step 6: Verify Connection

```bash
# Test database connection
psql -d ota_console -c "SELECT version();"
```

Or check the health endpoint:
```bash
curl http://localhost:3001/health
```

### Step 7: Start the Server

```bash
cd backend
npm start
```

You should see:
```
✓ Connected to PostgreSQL database
Server running on port 3001
Environment: development
```

## Troubleshooting

### PostgreSQL Not Starting

**macOS:**
```bash
# Check if PostgreSQL is running
pg_isready

# Check logs
tail -f /usr/local/var/log/postgres.log
```

**Linux:**
```bash
# Check status
sudo systemctl status postgresql

# Check logs
sudo journalctl -u postgresql -f
```

### Permission Denied

If you get permission errors, you may need to create a user:

```bash
# Create postgres user (if needed)
createuser -s postgres
```

### Port Already in Use

If port 5432 is already in use:
1. Find the process: `lsof -i :5432`
2. Kill it: `kill -9 <PID>`
3. Or change PostgreSQL port in `postgresql.conf`

### Connection String Format

If using DATABASE_URL, format is:
```
postgresql://username:password@host:port/database
```

Example:
```
postgresql://postgres:mypassword@localhost:5432/ota_console
```

## Alternative: Use Docker (Easier Setup)

If you have Docker installed:

```bash
# Run PostgreSQL in Docker
docker run --name ota-postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=ota_console \
  -p 5432:5432 \
  -d postgres:14

# Then update .env:
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/ota_console
```

## Verify Everything Works

1. ✅ PostgreSQL is running
2. ✅ Database `ota_console` exists
3. ✅ Migrations have been run
4. ✅ Backend server starts without errors
5. ✅ Health endpoint returns `"database": "connected"`
6. ✅ Can register/login through frontend

