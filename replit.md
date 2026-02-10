# UniAPI - Universal Social Media API Platform

## Overview
A unified social media API platform providing consistent interfaces for Twitter, Instagram, TikTok, Facebook, and LinkedIn. Combines a Python FastAPI backend with a React dashboard frontend served through Express.

## Architecture
- **Frontend**: React + Vite dashboard at `/` with sidebar navigation
- **Backend**: Express.js API server on port 5000 (proxies to Python API)
- **Python API**: FastAPI (uvicorn) on internal port 8001 - spawned as child process from Express
- **Database**: PostgreSQL via Drizzle ORM
- **Proxy**: Express forwards `/api/v1/*` requests to Python FastAPI

## Python API Integration
- Python FastAPI server runs on port 8001 (internal only, not exposed externally)
- Express spawns it as a child process in `server/index.ts` with auto-restart
- Express proxies `/api/v1/*` to `http://127.0.0.1:8001/api/v1/*`
- Health aggregation at `/api/uniapi/health` and `/api/uniapi/platforms`
- Bridge servers (Playwright-based) needed for actual social media automation

## Key Files
- `server/index.ts` - Express server + Python API child process management
- `server/routes.ts` - API endpoints, proxy setup, admin auth
- `shared/schema.ts` - Database models (scrape_requests, admin_settings, platform_tokens)
- `server/storage.ts` - Database CRUD operations via Drizzle
- `client/src/App.tsx` - React app with sidebar layout and routing
- `client/src/pages/dashboard.tsx` - Main dashboard with API/platform status
- `client/src/pages/platform-page.tsx` - Platform-specific API interaction pages
- `client/src/components/app-sidebar.tsx` - Sidebar navigation
- `uniapi-main/backend/main.py` - Python FastAPI entry point

## Pages
- `/` - Dashboard with API health and platform status
- `/twitter` - Twitter API interactions (user lookup, tweets, search, likes, follow)
- `/instagram` - Instagram API interactions (user lookup, likes, comments, DMs, follow)
- `/tiktok` - TikTok API interactions
- `/facebook` - Facebook API interactions
- `/linkedin` - LinkedIn API interactions
- `/admin` - Admin settings (API key, Instagram token, request queue)
- `/admin/tokens` - Platform token management (add/remove tokens per platform, restart Python server)

## API Endpoints
- `GET /api/uniapi/health` - Check Python API connectivity
- `GET /api/uniapi/platforms` - Get all platform statuses
- `/api/v1/*` - Proxied to Python FastAPI (platform-specific endpoints)
- `POST /api/scrape` - Submit scrape request (client-facing)
- `POST /api/admin/login` - Admin login (default password: `admin123`)
- `GET /api/admin/settings` - Get admin settings (auth required)
- `POST /api/admin/reset-api-key` - Reset API key (auth required)
- `GET /api/admin/platform-tokens` - List platform tokens (auth required)
- `POST /api/admin/platform-tokens` - Add/update platform token (auth required)
- `DELETE /api/admin/platform-tokens/:id` - Delete platform token (auth required)
- `POST /api/admin/restart-python` - Restart Python scraper server (auth required)

## Recent Changes
- 2026-02-10: Added Platform Tokens admin page with per-platform token management and Python server restart
- 2026-02-10: Connected Python FastAPI backend to React/Express frontend
- 2026-02-10: Added child process management for Python API with auto-restart
- 2026-02-10: Fixed proxy pathRewrite to preserve /api/v1 prefix
- 2026-02-10: Built dashboard with real-time platform health monitoring
- 2026-02-10: Created platform-specific pages with tabbed API interaction UI
