-- UniAPI Database Initialization Script
-- Run this after the PostgreSQL database starts for the first time
-- Usage: psql -U uniapi -d uniapi -f init-db.sql

CREATE TABLE IF NOT EXISTS scrape_requests (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  request_type TEXT NOT NULL,
  query_string TEXT NOT NULL,
  extra_options JSONB,
  client_uuid TEXT NOT NULL,
  server_uuid TEXT NOT NULL,
  api_key TEXT NOT NULL,
  callback_url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued',
  result JSONB,
  error_message TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS admin_settings (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key TEXT NOT NULL,
  admin_password TEXT NOT NULL,
  instagram_token TEXT
);

CREATE TABLE IF NOT EXISTS platform_tokens (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  platform TEXT NOT NULL,
  token_key TEXT NOT NULL,
  token_value TEXT NOT NULL
);

-- Seed default admin settings with API key and password
INSERT INTO admin_settings (api_key, admin_password)
SELECT
  'uniapi_' || replace(gen_random_uuid()::text, '-', ''),
  '401065'
WHERE NOT EXISTS (SELECT 1 FROM admin_settings);
