# Raccoon — Phased Deployment Guide

Deploy updates in this order to avoid breaking production.

---

## Phase 1: Brand Identity ✅
**Files:** `tailwind.config.js`, `index.html`, `src/style.css`

- Cairo font for Arabic (RTL)
- Outfit font for English (LTR)
- Brand colors: `#d94f39`, `#d85039`, `#fef8bc`

**Deploy:** Push frontend → Vercel auto-deploys.

---

## Phase 2: Backend Schema & Auth ✅
**Files:** `google-apps-script/Code.gs`, `google-apps-script/appsscript.json`

### Steps
1. Copy updated `Code.gs` and `appsscript.json` to Apps Script
2. Run **`initializeDatabase()`** — creates `Clients` + `Reports` sheets, adds `clientId` to `Content_Master`
3. Run **`authorizeAll()`** — approve Drive permissions
4. **Deploy → New version** of web app
5. Open `YOUR_URL?action=testDrive` in browser to authorize web app Drive access

### Default admin login
| Field | Value |
|-------|-------|
| Username | `admin` |
| Password | `raccoon2024` |

**Change this immediately** after first login via Clients tab or Apps Script.

---

## Phase 3: Authentication & Client Isolation ✅
**Files:** `LoginView.vue`, `useAuth.js`, `AppNavbar.vue`, `ClientManagement.vue`

- All users must log in (no more `?role=client` URL hack)
- Clients only see their own `clientId` content
- Admin creates client accounts with unique Drive folder IDs

### Vercel env vars (required)
```
GAS_URL=https://script.google.com/macros/s/YOUR_ID/exec
VITE_GAS_URL=https://script.google.com/macros/s/YOUR_ID/exec
```

---

## Phase 4: Client Viewer Reorder ✅
**Files:** `StoryboardViewer.vue`

Layout order:
1. **Top** — Platform, Content Type, Caption, Script (idea details)
2. **Bottom** — Visual storyboard grid + footer columns
3. **Sticky** — Approve / Reject bar

---

## Phase 5: Performance Reports ✅
**Files:** `ReportGenerator.vue`, `ClientReportsView.vue`

- Admin: Calendar tab → **Reports** → **+ Report**
- Client: **Reports** tab — color-coded executive summary
  - Green alerts for positives
  - Red alerts for improvement areas

---

## Phase 6: Raccoon Branding ✅
**Files:** `AppNavbar.vue`, `LoginView.vue`, `BrandFooter.vue`

- Navbar: **Raccoon** + *Ideas like a Raccoon!*
- Login: Raccoon Client Portal
- Footer on reports & storyboards: *Powered by Raccoon*

---

## Database Schema (Final)

### Clients
`clientId | clientName | username | passwordHash | folderId | role | createdAt`

### Content_Master
`id | clientId | date | platform | contentType | caption | script | status | clientFeedback | duration | castPeople | mood`

### Storyboard_Frames
`frameId | contentId | frameNumber | sceneTitle | imageUrl | arDescription | lensTechSpecs`

### Storyboard_Footer
`contentId | editingSequence | bRollNotes | productionNotes`

### Reports
`reportId | clientId | title | period | positives | negatives | createdAt`

---

## Post-Deploy Checklist

- [ ] `initializeDatabase()` run in Apps Script
- [ ] Web app redeployed (new version)
- [ ] `?action=testDrive` returns success
- [ ] Vercel `GAS_URL` + `VITE_GAS_URL` set
- [ ] Admin login works
- [ ] Create a test client with their Drive folder ID
- [ ] Create content for that client → images land in their folder
- [ ] Client login → sees only their calendar
- [ ] Generate a report → client sees it on Reports tab
