# Intelligence Platform

> **Upload any Excel. Get a full intelligence dashboard. Every row. Zero backend.**

A hackathon-grade, production-ready analytics platform. Drag-drop your Excel → auto-detects columns → processes ALL rows in the browser → renders a 3-page executive dashboard with real data.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/YOUR_USERNAME/intelligence-platform)

---

## What it does

- **Upload any Excel** with school/results data (`.xlsx`, `.xls`, `.csv`)
- **Auto-detects columns** — maps school name, division, district, appeared, passed, failed automatically
- **Processes ALL rows** — 100%, 16,110 rows, no sampling, no limits
- **3-page dashboard**: Executive Command Center · Division Intelligence · School Intelligence
- **Zero backend** — everything runs in your browser (SheetJS + Chart.js + React)
- **Deploys in 2 clicks** to Vercel

---

## Stack

| Layer | Tech |
|-------|------|
| Framework | React 18 + Vite 5 |
| Excel parsing | SheetJS (xlsx) |
| Charts | Chart.js 4 |
| Styling | CSS custom properties (dark theme) |
| Deploy | Vercel (free) |

---

## Run locally

```bash
git clone https://github.com/YOUR_USERNAME/intelligence-platform
cd intelligence-platform
npm install
npm run dev
# Open http://localhost:5173
```

---

## Deploy to Vercel (2 steps)

### Step 1 — Push to GitHub
```bash
git init
git add .
git commit -m "Intelligence Platform v1"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/intelligence-platform.git
git push -u origin main
```

### Step 2 — Deploy on Vercel
1. Go to [vercel.com](https://vercel.com) → **Sign in with GitHub**
2. Click **Add New → Project**
3. Select your `intelligence-platform` repo
4. Click **Deploy** — done. Live in 60 seconds.

Your URL: `https://intelligence-platform.vercel.app`

---

## Excel Format

Your Excel needs at minimum:
- A column for **school name**
- A column for **students appeared**
- A column for **students passed**
- A column for **division** (region/zone)
- A column for **district**

Works with the MP Board `10SCHSTT_final.xlsx` format out of the box.

---

## Architecture

```
Upload Excel
    ↓
SheetJS (browser) — parse all rows
    ↓
Auto-detect column headers
    ↓
User confirms mapping (1 screen)
    ↓
processor.js — aggregate in memory
  ├── State totals
  ├── Division rollups
  ├── District rollups
  ├── Band classification (Elite/Excellent/Good/Average/Needs Improvement)
  └── Rankings (1–N)
    ↓
3-page React Dashboard
  ├── Executive: KPIs + Top/Bottom 10 + Insight paragraph
  ├── Division: Treemap + Rankings + Matrix
  └── School: Full table (paginated 200/page) + Scatter + Band chart
```

---

Built with ❤️ for MPBSE Intelligence Center · Shivanchal Consultants
