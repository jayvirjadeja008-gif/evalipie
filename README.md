# EvaliPie Market

> **Live Hosted URL (Frontend + Backend)**: [https://resistance-certified-fellowship-uploaded.trycloudflare.com/](https://resistance-certified-fellowship-uploaded.trycloudflare.com/)

[![Live Website](https://img.shields.io/badge/Live%20Demo-Online-1B4332?style=for-the-badge&logo=cloudflare&logoColor=white)](https://resistance-certified-fellowship-uploaded.trycloudflare.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16%20ACID-111111?style=for-the-badge&logo=postgresql&logoColor=white)](https://resistance-certified-fellowship-uploaded.trycloudflare.com/)
[![Kafka](https://img.shields.io/badge/Apache%20Kafka-3.8-B84A27?style=for-the-badge&logo=apachekafka&logoColor=white)](https://resistance-certified-fellowship-uploaded.trycloudflare.com/)
[![OpenSearch](https://img.shields.io/badge/OpenSearch-2.15-0B57D0?style=for-the-badge&logo=opensearch&logoColor=white)](https://resistance-certified-fellowship-uploaded.trycloudflare.com/)

**Architectural Real-Time Retail Engine** backed by **PostgreSQL** (ACID transactional source of truth), **Apache Kafka** (event-driven transactional outbox & consumer groups), and **OpenSearch** (sub-15ms typo-tolerant search and fuzzy matching).

```
Storefront & 3D Gateway -> OpenSearch Search -> Multi-Hub Inventory -> ACID Checkout -> Postgres Outbox -> Kafka Event Bus -> Search Sync / Alerts
```

---

## Live Deployment & Access

- **Public Endpoint**: [https://resistance-certified-fellowship-uploaded.trycloudflare.com/](https://resistance-certified-fellowship-uploaded.trycloudflare.com/)
- **One-Click Demo Customer**: Click **`CONTINUE WITH DEMO ACCOUNT`** on the gateway (auto-authenticates `demo@stocksync.in` with Bengaluru fulfillment stock).
- **One-Click Guest Access**: Click **`BROWSE AS GUEST`** on the gateway for instant catalog browsing without credentials.
- **Admin Console**: `admin@stocksync.in` / `admin123` (Provides full telemetry, inventory adjustment, and outbox event streams).

---

## Architecture & Features

- **3D Architectural Login Gateway**: Full-screen entry landing screen built with `framer-motion` (spatial Z-depth transitions), interactive 3D-tilting preview cards (`perspective: 1200px`, `preserve-3d`), live architecture telemetry readouts, 6-city hub selector, and 1-click evaluation access (`CONTINUE WITH DEMO ACCOUNT` / `BROWSE AS GUEST`).
- **Unified Full-Stack Deployment**: React 18 + Vite frontend and Node.js + Express backend served on a single unified HTTPS port (`PORT=4000`), eliminating CORS discrepancies.
- **Audited 195-Product Catalog**: 100% verified plain white background (`#FFFFFF`) studio packshots across 6 major Indian e-commerce categories:
  - Mobiles & Smartphones (Flagships, mid-range, 5G devices)
  - Audio & Sound (Studio headphones, ANC noise-cancelling, true wireless)
  - Laptops & Computing (OLED ultrabooks, gaming rigs, creators)
  - Fashion & Apparel (Men, Women, Ethnic Wear, Western Wear, Outerwear)
  - Footwear (Athletic sneakers, road running, lifestyle packshots)
  - Home & Kitchen (Appliances, air fryers, RO purifiers, induction essentials)
- **Multi-Hub Fulfillment**: Stock allocated and audited across 6 Indian fulfillment cities:
  - `Bengaluru` (HQ Central Hub)
  - `Mumbai` (West Coastal Hub)
  - `Delhi` (North Capital Hub)
  - `Hyderabad` (South Central Hub)
  - `Chennai` (Coromandel Hub)
  - `Pune` (Industrial Hub)
- **Zero Phantom Inventory Guarantee**: PostgreSQL `SELECT ... FOR UPDATE` row-level locks prevent over-selling under high concurrency (validated under 50 simultaneous checkout stress tests).
- **Transactional Outbox & Kafka Consumers**: Every inventory deduction is recorded in the outbox within the same database transaction, broadcasted across Kafka topics (`order-events`, `inventory-events`), and synced to OpenSearch within milliseconds.
- **Real-Time Live Feed**: Server-Sent Events (SSE) broadcasting verified customer reviews with dynamic star rating updates.

---

## Quick Start (Local Development)

### Prerequisites
- Node.js 18+
- Docker & Docker Compose

### 1. Install Dependencies & Setup Environment
```bash
npm run setup                      # Installs dependencies for server & web
cp server/.env.example server/.env
```

### 2. Start Core Infrastructure (Postgres, Kafka, OpenSearch)
```bash
npm run infra:up                   # Launches PostgreSQL 16, Kafka 3.8 (KRaft), OpenSearch 2.15 via Docker
```

### 3. Initialize Database & Seed Catalog
```bash
npm run db:init                    # Seeds 195 products, multi-city stock, demo accounts
```

### 4. Build Frontend & Start Services
```bash
npm run build                      # Compiles production React SPA into web/dist
npm run start                      # Launches API server + Web application on http://localhost:4000
npm run worker                     # In a second terminal: Kafka outbox publisher & consumers
```

### 5. Run Verification & E2E Tests
```bash
npm run test:e2e                   # Complete pipeline verification across Postgres, Kafka, & OpenSearch
```

---

## License
MIT
