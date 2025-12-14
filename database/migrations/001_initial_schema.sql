-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create versions table
CREATE TABLE IF NOT EXISTS versions (
    id SERIAL PRIMARY KEY,
    app_id VARCHAR(255) NOT NULL,
    version_name VARCHAR(50) NOT NULL,
    version_code INTEGER NOT NULL,
    update_type VARCHAR(10) NOT NULL CHECK (update_type IN ('major', 'minor')),
    apk_path VARCHAR(500),
    bundle_path VARCHAR(500),
    release_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id),
    is_active BOOLEAN DEFAULT true,
    UNIQUE(app_id, version_code)
);

-- Create update_logs table
CREATE TABLE IF NOT EXISTS update_logs (
    id SERIAL PRIMARY KEY,
    app_id VARCHAR(255) NOT NULL,
    from_version VARCHAR(50),
    to_version VARCHAR(50) NOT NULL,
    update_type VARCHAR(10) NOT NULL CHECK (update_type IN ('major', 'minor')),
    device_id VARCHAR(255),
    status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'downloading', 'completed', 'failed')),
    error_message TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_versions_app_id ON versions(app_id);
CREATE INDEX IF NOT EXISTS idx_versions_version_code ON versions(version_code);
CREATE INDEX IF NOT EXISTS idx_versions_created_at ON versions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_update_logs_app_id ON update_logs(app_id);
CREATE INDEX IF NOT EXISTS idx_update_logs_updated_at ON update_logs(updated_at DESC);

