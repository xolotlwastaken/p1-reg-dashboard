# P1 Registration Dashboard

A Next.js dashboard for scraped Singapore Primary 1 registration vacancy and balloting data, backed by a Python scraper built with `Scrapling`.

## Stack

- Next.js App Router + React + TypeScript
- Tailwind CSS
- TanStack Table
- Recharts
- Python 3 scraper with `scrapling[fetchers]`
- Vercel for deployment

## Local setup

1. Install Node dependencies:

   ```bash
   npm install
   ```

2. Install Python scraper dependencies:

   ```bash
   python3 -m venv .venv
   .venv/bin/pip install -r requirements.txt
   .venv/bin/scrapling install
   ```

3. Scrape and generate data artifacts:

   ```bash
   npm run scrape
   ```

4. Start the app:

   ```bash
   npm run dev
   ```

## Commands

- `npm run scrape` refreshes `public/data`
- `npm run test` runs frontend unit tests and Python tests
- `npm run test:e2e` runs Playwright end-to-end tests
- `npm run build` creates the production build

## Deployment

Deploy to Vercel as a standard Next.js project. The app reads committed JSON/CSV artifacts from `public/data`, so no runtime database or scheduled production scraper is required for v1.
