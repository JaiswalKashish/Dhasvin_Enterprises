# Data Analytics Based Inventory Management System

## Overview

Full-stack inventory management system for DHASVIN ENTERPRISES with analytics, role-based access, and smart invoice upload.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **Frontend**: React + Vite + Tailwind CSS + Framer Motion + Recharts
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Authentication**: JWT (jsonwebtoken + bcryptjs)
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (ESM bundle)
- **File Upload**: Multer + XLSX for Excel import

## Structure

```text
artifacts-monorepo/
├── artifacts/
│   ├── api-server/         # Express API server (JWT auth, all routes)
│   └── inventory-app/      # React + Vite frontend (Dhasvin Enterprises)
├── lib/
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
├── attached_assets/        # Original Excel data file (2098 products)
└── scripts/                # Utility scripts
```

## Default Login Credentials

| Role  | Email                  | Password   |
|-------|------------------------|------------|
| Admin | admin@inventory.com    | Admin@123  |
| Staff | staff@inventory.com    | Staff@123  |
| User  | user@inventory.com     | User@123   |

## Database Schema

- `users` - User accounts with role-based access (admin, staff, user)
- `categories` - Product categories (auto-created from Excel import)
- `suppliers` - Supplier management
- `products` - Full inventory with all DHASVIN ENTERPRISES fields:
  - name, category, HSN/SAC code, barcode, type
  - unit price, price with tax, tax%
  - quantity, units, reorder level
  - discount, purchase price, description
  - show online, not for sale flags
- `purchases` - Purchase records with stock auto-update
- `sales` - Sales records with stock auto-deduction

## Features

- **Authentication**: JWT with 7-day expiry, role-based protected routes
- **Inventory**: Full CRUD, search/filter/sort, status badges (In Stock/Low Stock/Out of Stock/Not For Sale)
- **Smart Import**: Upload Excel/CSV → auto-creates categories → upserts products → updates stock
- **Analytics**: Real-time dashboard KPIs, charts (sales trend, top products, category distribution)
- **Purchases**: Manual entry + file upload, auto stock increase
- **Sales**: Record sales with auto stock deduction, payment methods
- **User Management**: Admin-only user CRUD

## API Routes

All routes are at `/api`:
- `POST /auth/login` - Login
- `GET /auth/me` - Current user
- `GET/POST/PUT/DELETE /products` - Product CRUD
- `POST /products/import` - Bulk Excel/CSV import
- `GET/POST/PUT/DELETE /categories` - Category CRUD
- `GET/POST/PUT/DELETE /suppliers` - Supplier CRUD
- `GET/POST /purchases` - Purchase management
- `GET/POST /sales` - Sales management
- `GET /analytics/dashboard` - Dashboard stats
- `GET /analytics/sales-trend` - Sales trend chart data
- `GET /analytics/top-products` - Top selling products
- `GET /analytics/category-distribution` - Pie chart data
- `GET /analytics/low-stock` - Low stock alert list
- `GET/POST/PUT/DELETE /users` - User management (admin only)

## Running

- `pnpm --filter @workspace/api-server run dev` - Start API server
- `pnpm --filter @workspace/inventory-app run dev` - Start frontend
- `pnpm --filter @workspace/db run push` - Push DB schema changes
- `pnpm --filter @workspace/api-spec run codegen` - Regenerate API client

## Data

- 2,098 products imported from `attached_assets/DHASVIN-ENTERPRISES_Products_1774545014616.xlsx`
- Inventory value: ~₹46.3 Lakh
- 12 auto-detected categories from the Excel data
