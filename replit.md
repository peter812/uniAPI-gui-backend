# UniAPI - Instagram Scraper API Wrapper

## Overview
API wrapper service for the uniAPI Instagram scraper. Uses an async request/callback pattern where clients submit scrape requests and receive results via webhook callback.

## Architecture
- **Frontend**: React + Vite admin dashboard at `/`
- **Backend**: Express.js API server
- **Database**: PostgreSQL via Drizzle ORM
- **Pattern**: Async request queue with webhook callbacks

## Flow
1. Client POSTs to `/api/scrape` with request type, query, callback URL, client UUID, and API key
2. Server validates API key, queues request, returns `200` + server UUID
3. Server processes request (currently simulated, will connect to Python uniAPI scraper)
4. On completion, server POSTs results to client's callback URL with the server UUID

## Key Files
- `shared/schema.ts` - Database models (scrape_requests, admin_settings)
- `server/routes.ts` - All API endpoints
- `server/storage.ts` - Database CRUD operations via Drizzle
- `server/db.ts` - Database connection
- `server/seed.ts` - Seeds default admin settings
- `client/src/pages/admin.tsx` - Admin page wrapper with auth state
- `client/src/pages/admin-login.tsx` - Login form
- `client/src/pages/admin-dashboard.tsx` - Dashboard with API key, token, and queue management

## Admin
- Default password: `admin123`
- Session tokens stored in-memory on server, sessionStorage on client

## API Endpoints
- `POST /api/scrape` - Submit scrape request (client-facing)
- `POST /api/admin/login` - Admin login
- `GET /api/admin/settings?sessionToken=` - Get admin settings
- `POST /api/admin/reset-api-key` - Reset API key
- `POST /api/admin/instagram-token` - Update Instagram token
- `GET /api/admin/requests?sessionToken=` - List scrape requests

## Recent Changes
- 2026-02-10: Initial build - schema, admin dashboard, API endpoints, seed data
