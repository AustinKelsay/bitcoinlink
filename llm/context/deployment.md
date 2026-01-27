# Deployment Documentation

## Overview

BitcoinLink is a **client-side only** application with no backend requirements. It can be deployed as a static site or standard Next.js application.

**No database, no backend API, no environment variables required.**

---

## Deployment Options

### Option 1: Static Export (Recommended)

The simplest deployment - just static HTML/JS/CSS files.

```bash
# Build static export
npm run build

# The output is in .next/ or out/ depending on config
# Deploy to any static host
```

**Works with:**
- Vercel (zero config)
- Netlify
- GitHub Pages
- Any static file server

### Option 2: Standard Next.js

For SSR features or if you want server-side rendering.

```bash
npm run build
npm start
```

**Works with:**
- Vercel
- Docker
- Any Node.js hosting

---

## Local Development

### Prerequisites
- Node.js 18+
- npm
- snstr library (must be available at `../snstr` relative to this repo)

### Setup

```bash
# Clone bitcoinlink
git clone https://github.com/austinkelsay/bitcoinlink.git
cd bitcoinlink

# Ensure snstr is available at ../snstr
# If not, clone and build it:
git clone https://github.com/AustinKelsay/snstr.git ../snstr
cd ../snstr && npm install && npm run build && cd ../bitcoinlink

# Install dependencies
npm install

# Start development server
npm run dev
```

The `snstr` dependency is referenced as `"snstr": "file:../snstr"` in package.json.

### Development Commands

```bash
npm run dev    # Start development server (http://localhost:3000)
npm run build  # Build for production
npm start      # Start production server
npm run lint   # Run ESLint
npm test       # Run tests
```

---

## Vercel Deployment

### One-Click Deploy

1. Fork the repository
2. Import to Vercel
3. Deploy (no configuration needed)

### Settings

| Setting | Value |
|---------|-------|
| Framework Preset | Next.js |
| Build Command | `npm run build` |
| Output Directory | `.next` |
| Install Command | `npm install` |
| Node.js Version | 18.x |

### Environment Variables

**None required.** The app connects to public Nostr relays.

---

## Docker Deployment

### Dockerfile

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
```

### Build and Run

```bash
docker build -t bitcoinlink .
docker run -p 3000:3000 bitcoinlink
```

### Docker Compose

```yaml
version: "3"
services:
  app:
    build: .
    ports:
      - "3000:3000"
```

```bash
docker-compose up -d
```

---

## Configuration

### Default Relays

The app uses these public relays (configured in `src/lib/nostr/relays.ts`):

```typescript
export const DEFAULT_RELAYS = [
  'wss://relay.damus.io',
  'wss://relay.nostr.band',
  'wss://nos.lol',
  'wss://nostr.mutinywallet.com'
];
```

To use custom relays, modify this file before building.

### Custom Domain

Update the base URL in link generation if using a custom domain:

1. Search for `bitcoinlink.app` in `src/lib/nostr/link-encoder.ts`
2. Replace with your domain

---

## What's NOT Needed

The Nostr-only architecture eliminates:

| Previously Required | Now |
|--------------------|-----|
| PostgreSQL database | Not needed |
| Prisma migrations | Not needed |
| Vercel KV/Redis | Not needed |
| Environment variables | Not needed |
| Backend API routes | Not needed |
| Rate limiting | Not needed |

---

## Self-Hosting Considerations

### Pros
- No database to manage
- No secrets to configure
- Can run offline (except for relay connections)
- Low resource requirements

### Cons
- Relies on public Nostr relays
- No server-side validation
- Users must trust client-side code

### Relay Considerations

For production, consider:
- Running your own relay
- Using paid relays with better uptime
- Configuring multiple fallback relays

---

## Monitoring

Since there's no backend, monitoring is simplified:

### What to Monitor
- Frontend availability (uptime check on domain)
- Relay connectivity (can the app reach relays?)

### Logging
- Client-side errors via browser dev tools
- Consider adding error boundary with reporting

---

## Scaling

The app scales horizontally with zero effort:
- No database connections to pool
- No session state
- CDN-cacheable static assets

Nostr relays handle the distributed storage.
