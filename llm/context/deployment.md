# Deployment Documentation

## Overview

BitcoinLink supports two deployment modes:
1. **Local Development:** Docker Compose with PostgreSQL
2. **Production:** Vercel with Vercel Postgres and KV

---

## Local Development

### Prerequisites
- Docker and Docker Compose
- Node.js 18+
- npm or yarn

### Docker Compose Setup

**File:** `docker-compose.yml`

```yaml
version: '3.8'
services:
  db:
    image: postgres:14
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: bitcoinlink
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: postgresql://postgres:postgres@db:5432/bitcoinlink
    depends_on:
      - db

volumes:
  postgres_data:
```

### Dockerfile

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

RUN npx prisma generate
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
```

### Running Locally

```bash
# Start services
docker-compose up -d

# View logs
docker-compose logs -f app

# Stop services
docker-compose down

# Reset database
docker-compose down -v
docker-compose up -d
```

### Local Environment Variables

Create `.env` file:

```env
# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/bitcoinlink"
POSTGRES_PRISMA_URL="postgresql://postgres:postgres@localhost:5432/bitcoinlink"
POSTGRES_URL_NON_POOLING="postgresql://postgres:postgres@localhost:5432/bitcoinlink"

# Rate limiting (optional for local)
KV_REST_API_URL="http://localhost:8079"
KV_REST_API_TOKEN="local_token"
```

---

## Production (Vercel)

### Vercel Setup

1. **Connect Repository**
   - Link GitHub repository to Vercel
   - Auto-deploy on push to main

2. **Add Vercel Postgres**
   - Dashboard → Storage → Create Database
   - Select Postgres
   - Connect to project

3. **Add Vercel KV**
   - Dashboard → Storage → Create Database
   - Select KV
   - Connect to project

4. **Environment Variables**
   - Automatically populated from storage connections
   - Add any additional secrets

### Production Environment Variables

```env
# Vercel Postgres (auto-populated)
POSTGRES_PRISMA_URL="postgres://..."
POSTGRES_URL_NON_POOLING="postgres://..."

# Vercel KV (auto-populated)
KV_REST_API_URL="https://..."
KV_REST_API_TOKEN="..."
```

### Build Configuration

**package.json scripts:**
```json
{
  "scripts": {
    "build": "prisma generate && next build && prisma migrate deploy",
    "start": "next start",
    "postinstall": "prisma generate"
  }
}
```

**Build process:**
1. `prisma generate` - Generate Prisma client
2. `next build` - Build Next.js application
3. `prisma migrate deploy` - Apply database migrations

### Vercel Settings

| Setting | Value |
|---------|-------|
| Framework Preset | Next.js |
| Build Command | `npm run build` |
| Output Directory | `.next` |
| Install Command | `npm install` |
| Node.js Version | 18.x |

---

## Database Configuration

### Prisma Schema

**File:** `prisma/schema.prisma`

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("POSTGRES_PRISMA_URL")
  directUrl = env("POSTGRES_URL_NON_POOLING")
}

generator client {
  provider      = "prisma-client-js"
  binaryTargets = ["native", "debian-openssl-1.1.x"]
}
```

### Connection Pooling

- **POSTGRES_PRISMA_URL:** Pooled connection via PgBouncer
- **POSTGRES_URL_NON_POOLING:** Direct connection for migrations

### Migrations

```bash
# Create migration (development)
npx prisma migrate dev --name migration_name

# Apply migrations (production)
npx prisma migrate deploy

# Reset database (development only)
npx prisma migrate reset

# View database
npx prisma studio
```

---

## Rate Limiting Configuration

### Upstash Rate Limit

**File:** `middleware.js`

```javascript
import { Ratelimit } from '@upstash/ratelimit';
import { kv } from '@vercel/kv';

const ratelimit = new Ratelimit({
  redis: kv,
  limiter: Ratelimit.slidingWindow(5, '10 s'),
});

export async function middleware(request) {
  const ip = request.ip ?? '127.0.0.1';
  const { success } = await ratelimit.limit(ip);

  if (!success) {
    return new Response('Too many requests', { status: 429 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/api/:path*', '/((?!link).*)'],
};
```

---

## Environment Variable Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `POSTGRES_PRISMA_URL` | Yes | PostgreSQL pooled connection URL |
| `POSTGRES_URL_NON_POOLING` | Yes | PostgreSQL direct connection URL |
| `KV_REST_API_URL` | Yes* | Vercel KV REST API URL |
| `KV_REST_API_TOKEN` | Yes* | Vercel KV REST API token |

*Required for rate limiting in production

---

## Monitoring & Debugging

### Vercel Logs
- Dashboard → Project → Logs
- Real-time function logs
- Error tracking

### Database Inspection
```bash
# Connect to database
npx prisma studio

# View schema
npx prisma db pull
```

### Health Check

```bash
# Check API
curl https://bitcoinlink.app/api/health

# Check database connection
npx prisma db execute --stdin <<< "SELECT 1"
```

---

## Scaling Considerations

### Database
- Vercel Postgres handles connection pooling
- Consider read replicas for high traffic
- Monitor connection limits

### Rate Limiting
- Vercel KV provides low-latency Redis
- Adjust limits based on traffic patterns
- Consider premium tier for higher limits

### Serverless Functions
- Next.js API routes run as Vercel Functions
- Cold starts may occur on first request
- Functions timeout after 10s (default)
