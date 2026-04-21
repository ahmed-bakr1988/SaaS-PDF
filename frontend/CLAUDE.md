# CLAUDE.md — Dociva Codebase Rules & Design System Reference

> Comprehensive rules document for AI-assisted development and Figma-to-code integration via Model Context Protocol (MCP).

---

## 1. Project Overview

Dociva is a full-stack web application offering 16+ free online file-processing tools (PDF, image, video, text). The architecture is a **Python/Flask backend** with **Celery workers** for async processing, and a **React + TypeScript frontend** styled with **Tailwind CSS**.

### Tech Stack Summary

| Layer       | Technology                                           |
|-------------|------------------------------------------------------|
| Frontend    | React 18, TypeScript 5.5, Vite 5.4                  |
| Styling     | Tailwind CSS 3.4, PostCSS, Autoprefixer             |
| State       | Zustand 4.5 (available but lightweight usage)        |
| Routing     | React Router DOM 6.23                                |
| i18n        | i18next 23 + react-i18next 14 (EN, AR, FR)          |
| Icons       | Lucide React 0.400                                   |
| HTTP        | Axios 1.7                                            |
| SEO         | react-helmet-async 2.0, JSON-LD structured data     |
| Analytics   | react-ga4 2.1                                        |
| File Upload | react-dropzone 14.2                                  |
| Toasts      | sonner 1.5                                            |
| Backend     | Flask, Celery, Redis                                 |
| Build       | Vite (dev + prod), Docker Compose                    |

---

## 2. Token Definitions (Design Tokens)

### 2.1 Color Tokens

Colors are defined in **two places** that must stay in sync:

#### Tailwind Extended Colors (`frontend/tailwind.config.js`)

```js
// Primary palette (Blue)
primary: {
  50: '#eff6ff',  100: '#dbeafe', 200: '#bfdbfe',
  300: '#93c5fd', 400: '#60a5fa', 500: '#3b82f6',
  600: '#2563eb', 700: '#1d4ed8', 800: '#1e40af',
  900: '#1e3a8a', 950: '#172554',
}

// Accent palette (Purple/Fuchsia)
accent: {
  50: '#fdf4ff',  100: '#fae8ff', 200: '#f5d0fe',
  300: '#f0abfc', 400: '#e879f9', 500: '#d946ef',
  600: '#c026d3', 700: '#a21caf', 800: '#86198f',
  900: '#701a75',
}
```

**Built-in Tailwind colors also in heavy use:** `slate`, `red`, `emerald`, `orange`, `violet`, `pink`, `teal`, `amber`, `lime`, `cyan`, `green`, `sky`, `blue`, `purple`, `indigo`.

#### CSS Custom Properties (`frontend/src/styles/global.css`)

```css
:root {
  --color-bg: #ffffff;
  --color-surface: #f8fafc;
  --color-text: #0f172a;
  --color-text-secondary: #64748b;
  --color-border: #e2e8f0;
}

.dark {
  --color-bg: #0f172a;
  --color-surface: #1e293b;
  --color-text: #f1f5f9;
  --color-text-secondary: #94a3b8;
  --color-border: #334155;
}
```

### 2.2 Typography Tokens

Fonts are loaded from Google Fonts in `frontend/index.html`:

| Font      | Weights          | Usage                       |
|-----------|------------------|-----------------------------|
| Inter     | 300,400,500,600,700 | Default sans-serif (LTR)  |
| Tajawal   | 300,400,500,700  | Arabic/RTL text             |

```js
// tailwind.config.js
fontFamily: {
  sans: ['Inter', 'Tajawal', 'system-ui', 'sans-serif'],
  arabic: ['Tajawal', 'Inter', 'sans-serif'],
}
```

**RTL switching** happens automatically in `global.css`:
```css
body { font-family: 'Inter', 'Tajawal', system-ui, sans-serif; }
[dir="rtl"] body { font-family: 'Tajawal', 'Inter', system-ui, sans-serif; }
```

### 2.3 Spacing & Layout Tokens

No custom spacing tokens — uses **Tailwind's default spacing scale** (4px base unit: `p-1` = 4px, `p-2` = 8px, etc.).

**Layout constants used throughout:**
- Max content width: `max-w-7xl` (header/footer), `max-w-2xl` (tool pages)
- Container padding: `px-4 sm:px-6 lg:px-8`
- Page vertical padding: `py-8`
- Section gap: `space-y-4`
- Card padding: `p-6`
- Border radius: `rounded-xl` (buttons, inputs), `rounded-2xl` (cards, zones)

### 2.4 Token Transformation

**No token transformation pipeline** (e.g., Style Dictionary) is in place. Tokens are hand-coded in Tailwind config and CSS. When integrating Figma variables:
- Map Figma color variables → `tailwind.config.js` `theme.extend.colors`
- Map Figma text styles → Tailwind `fontFamily`, `fontSize` classes
- Map Figma spacing → Tailwind spacing scale (already standard 4px grid)

---

## 3. Component Library

### 3.1 Component Organization

```
frontend/src/components/
├── layout/          # App-wide structural components
│   ├── Header.tsx   # Sticky header with nav, dark mode, language switcher
│   ├── Footer.tsx   # Footer with links
│   └── AdSlot.tsx   # Google AdSense container
├── shared/          # Reusable UI building blocks
│   ├── FileUploader.tsx   # Drag & drop file upload (react-dropzone)
│   ├── DownloadButton.tsx # Result card with download link
│   ├── ProgressBar.tsx    # Task processing indicator
│   └── ToolCard.tsx       # Homepage tool grid card (link)
└── tools/           # One component per tool (16 total)
    ├── PdfCompressor.tsx
    ├── MergePdf.tsx
    ├── SplitPdf.tsx
    ├── PdfToWord.tsx
    ├── WordToPdf.tsx
    ├── RotatePdf.tsx
    ├── PdfToImages.tsx
    ├── ImagesToPdf.tsx
    ├── WatermarkPdf.tsx
    ├── ProtectPdf.tsx
    ├── UnlockPdf.tsx
    ├── AddPageNumbers.tsx
    ├── ImageConverter.tsx
    ├── VideoToGif.tsx
    ├── WordCounter.tsx
    └── TextCleaner.tsx
```

### 3.2 Component Architecture Pattern

**All components are React functional components with default exports.**

#### Tool Component Standard Template
mn bv6[]
Every tool page follows this exact pattern:

```tsx
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
import { SomeIcon } from 'lucide-react';
import FileUploader from '@/components/shared/FileUploader';
import ProgressBar from '@/components/shared/ProgressBar';
import DownloadButton from '@/components/shared/DownloadButton';
import AdSlot from '@/components/layout/AdSlot';
import { useFileUpload } from '@/hooks/useFileUpload';
import { useTaskPolling } from '@/hooks/useTaskPolling';
import { generateToolSchema } from '@/utils/seo';

export default function ToolName() {
  const { t } = useTranslation();
  const [phase, setPhase] = useState<'upload' | 'processing' | 'done'>('upload');

  // 1. useFileUpload hook for file selection + upload
  // 2. useTaskPolling hook for progress tracking
  // 3. Three-phase UI: upload → processing → done

  return (
    <>
      <Helmet>
        <title>{t('tools.toolKey.title')} — {t('common.appName')}</title>
        <meta name="description" content={t('tools.toolKey.description')} />
        <link rel="canonical" href={`${window.location.origin}/tools/tool-slug`} />
        <script type="application/ld+json">{JSON.stringify(schema)}</script>
      </Helmet>

      <div className="mx-auto max-w-2xl">
        {/* Icon + Title + Description header */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-{color}-100">
            <SomeIcon className="h-8 w-8 text-{color}-600" />
          </div>
          <h1 className="section-heading">{t('tools.toolKey.title')}</h1>
          <p className="mt-2 text-slate-500">{t('tools.toolKey.description')}</p>
        </div>

        <AdSlot slot="top-banner" format="horizontal" className="mb-6" />

        {/* Phase-based rendering */}
        {phase === 'upload' && ( /* FileUploader + options + submit button */ )}
        {phase === 'processing' && ( <ProgressBar ... /> )}
        {phase === 'done' && result && ( <DownloadButton ... /> )}
        {phase === 'done' && error && ( /* Error message + retry */ )}

        <AdSlot slot="bottom-banner" className="mt-8" />
      </div>
    </>
  );
}
```

#### Key Patterns

| Pattern | Implementation |
|---------|---------------|
| State management | Local `useState` per tool; 3-phase state machine (`upload`/`processing`/`done`) |
| File upload | `useFileUpload` hook → wraps `uploadFile()` API call |
| Async processing | `useTaskPolling` hook → polls `/api/tasks/{id}/status` every 1.5s |
| SEO | `<Helmet>` with title, description, canonical URL, JSON-LD |
| i18n | All user-facing strings via `t('key')`, never hardcoded |
| Lazy loading | All tool + page components use `React.lazy()` + `Suspense` in `App.tsx` |

### 3.3 Component Documentation

**No Storybook or formal component documentation exists.** Components are self-documented through TypeScript interfaces on their props.

---

## 4. Frameworks & Build System

### 4.1 Build & Dev

| Tool    | Config File | Purpose |
|---------|------------|---------|
| Vite    | `frontend/vite.config.ts` | Dev server (port 5173) + production build |
| TypeScript | `frontend/tsconfig.json` | Strict mode, ES2020 target, `@/` path alias |
| PostCSS | `frontend/postcss.config.js` | Tailwind CSS + Autoprefixer |

### 4.2 Path Aliases

```ts
// vite.config.ts + tsconfig.json
'@/*' → './src/*'
```

**Always use `@/` imports**, never relative `../` paths:
```tsx
// ✅ Correct
import FileUploader from '@/components/shared/FileUploader';

// ❌ Wrong
import FileUploader from '../../components/shared/FileUploader';
```

### 4.3 Code Splitting

Vite is configured with manual chunks:
```ts
manualChunks: {
  vendor: ['react', 'react-dom', 'react-router-dom'],
  i18n: ['i18next', 'react-i18next'],
}
```

All route-level components use `React.lazy()` for automatic code splitting.

---

## 5. Asset Management

### 5.1 Static Assets

```
frontend/public/         # Served at root URL, not processed by Vite
├── favicon.svg          # SVG favicon (indigo rounded-rect with doc icon)
├── ads.txt              # Google AdSense ads.txt
└── robots.txt           # SEO robots directive
```

- **No image assets** are stored in the frontend — the app is icon-driven
- Uploaded files are stored server-side in Docker volumes (`/tmp/uploads`, `/tmp/outputs`)
- Download URLs are served from the backend API

### 5.2 Asset Optimization

- **Nginx caching** (production): 1-year cache for `js|css|png|jpg|jpeg|gif|ico|svg|woff2` with `Cache-Control: public, immutable`
- **Vite build**: Sourcemaps disabled in production (`sourcemap: false`)
- **No CDN** is currently configured — assets are served directly from the Nginx container

### 5.3 Font Loading

Fonts are loaded via Google Fonts CDN with `preconnect` hints in `index.html`:
```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Tajawal:wght@300;400;500;700&display=swap" rel="stylesheet" />
```

---

## 6. Icon System

### 6.1 Library

All icons come from **[Lucide React](https://lucide.dev/)** (`lucide-react` v0.400).

### 6.2 Import Pattern

```tsx
import { FileText, Upload, Download, X, Loader2 } from 'lucide-react';
```

Each icon is imported **individually by name** — Lucide is tree-shakeable.

### 6.3 Sizing Convention

| Context           | Size Class       | Example |
|-------------------|-----------------|---------|
| Tool page hero    | `h-8 w-8`      | `<Minimize2 className="h-8 w-8 text-orange-600" />` |
| Homepage card     | `h-6 w-6`      | `<FileText className="h-6 w-6 text-red-600" />` |
| Header nav        | `h-7 w-7`      | Logo icon |
| Buttons / inline  | `h-5 w-5`      | `<Download className="h-5 w-5" />` |
| Small indicators  | `h-4 w-4`      | Chevrons, checkmarks |
| Upload zone       | `h-12 w-12`    | `<Upload className="h-12 w-12" />` |

### 6.4 Icon Color Convention

Icons use **Tailwind text-color classes**, typically matching a semantic color:
```tsx
// Tool hero icons get a colored background container
<div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-100">
  <Minimize2 className="h-8 w-8 text-orange-600" />
</div>
```

### 6.5 Icon-to-Tool Color Mapping

| Tool | Icon | Background | Text Color |
|------|------|-----------|------------|
| PDF to Word | `FileText` | `bg-red-50` | `text-red-600` |
| Word to PDF | `FileOutput` | `bg-blue-50` | `text-blue-600` |
| Compress PDF | `Minimize2` | `bg-orange-50` | `text-orange-600` |
| Merge PDF | `Layers` | `bg-violet-50` | `text-violet-600` |
| Split PDF | `Scissors` | `bg-pink-50` | `text-pink-600` |
| Rotate PDF | `RotateCw` | `bg-teal-50` | `text-teal-600` |
| PDF to Images | `Image` | `bg-amber-50` | `text-amber-600` |
| Images to PDF | `FileImage` | `bg-lime-50` | `text-lime-600` |
| Watermark PDF | `Droplets` | `bg-cyan-50` | `text-cyan-600` |
| Protect PDF | `Lock` | `bg-red-50` | `text-red-600` |
| Unlock PDF | `Unlock` | `bg-green-50` | `text-green-600` |
| Page Numbers | `ListOrdered` | `bg-sky-50` | `text-sky-600` |
| Image Converter | `ImageIcon` | `bg-purple-50` | `text-purple-600` |
| Video to GIF | `Film` | `bg-emerald-50` | `text-emerald-600` |
| Word Counter | `Hash` | `bg-blue-50` | `text-blue-600` |
| Text Cleaner | `Eraser` | `bg-indigo-50` | `text-indigo-600` |

### 6.6 No Custom SVG Icons

The project uses **zero custom SVG icons** — everything is Lucide. If a Figma design introduces custom icons, they should be converted to React components following Lucide's pattern (24x24 viewBox, `currentColor` stroke, configurable `className`).

---

## 7. Styling Approach

### 7.1 Methodology: Utility-First Tailwind CSS

- **Primary approach**: Tailwind utility classes applied directly in JSX
- **No CSS Modules**, no Styled Components, no CSS-in-JS
- **No BEM** or other class naming convention

### 7.2 Reusable Component Classes (`@layer components`)

Defined in `frontend/src/styles/global.css`:

```css
/* Buttons */
.btn-primary    /* Blue filled button, rounded-xl, primary-600 bg */
.btn-secondary  /* White/outlined button, slate ring */
.btn-success    /* Green filled button, emerald-600 bg */

/* Cards */
.card           /* White card, rounded-2xl, ring-1 slate, shadow-sm */
.tool-card      /* Card + cursor-pointer + hover effects */

/* Form */
.input-field    /* Full-width input, rounded-xl, ring-1 slate */

/* Typography */
.section-heading /* text-2xl/3xl bold tracking-tight */

/* Upload */
.upload-zone    /* Dashed border, centered content, hover state */

/* Ads */
.ad-slot        /* Centered container for AdSense units */
```

### 7.3 Dark Mode

- Strategy: **Tailwind `class` mode** (`darkMode: 'class'` in config)
- Toggled via `dark` class on `<html>` element
- Persisted in `localStorage` under key `theme`
- Respects `prefers-color-scheme` on first visit
- Implementation: `useDarkMode()` hook in `Header.tsx`

**Dark mode pattern — every visual element needs both variants:**
```tsx
// ✅ Always pair light + dark
className="bg-white text-slate-900 dark:bg-slate-800 dark:text-slate-100"

// ❌ Never omit dark variant for visible elements
className="bg-white text-slate-900"
```

### 7.4 Responsive Design

- **Mobile-first** approach using Tailwind breakpoints
- Breakpoints: `sm:` (640px), `md:` (768px), `lg:` (1024px), `xl:` (1280px)
- Common patterns:
  ```tsx
  // Responsive grid
  className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
  
  // Show/hide
  className="hidden md:flex"   // Desktop nav
  className="md:hidden"        // Mobile menu button
  
  // Responsive text
  className="text-4xl sm:text-5xl"
  
  // Responsive padding
  className="px-4 sm:px-6 lg:px-8"
  ```

### 7.5 RTL Support

- Automatic direction switching via `useDirection()` hook
- Arabic (`ar`) triggers `dir="rtl"` on `<html>`
- Uses Tailwind RTL-aware logical properties:
  - `ms-auto` (margin-inline-start) instead of `ml-auto`
  - `end-0` instead of `right-0`
  - `[dir="rtl"] .ltr-only` utility for forcing LTR on specific elements
- Font family switches to Tajawal-first for Arabic

### 7.6 Animations

Defined in `global.css`:
```css
@keyframes progress-pulse { /* Pulsing opacity for progress bars */ }
@keyframes fadeSlideIn { /* Fade + slide for dropdowns */ }
```

Used via classes: `.progress-bar-animated`, `.animate-in`

---

## 8. Internationalization (i18n)

### 8.1 Setup

- **Library**: i18next + react-i18next + i18next-browser-languagedetector
- **Config**: `frontend/src/i18n/index.ts`
- **Translation files**:
  - `frontend/src/i18n/en.json` (English — source of truth)
  - `frontend/src/i18n/ar.json` (Arabic)
  - `frontend/src/i18n/fr.json` (French)

### 8.2 Key Structure

```json
{
  "common": { "appName", "upload", "download", "processing", ... },
  "home":   { "hero", "heroSub", "popularTools", ... },
  "tools":  {
    "toolKey": { "title", "description", "shortDesc", ...toolSpecificKeys }
  },
  "result": { "conversionComplete", "downloadReady", "linkExpiry", ... }
}
```

### 8.3 Usage Rules

```tsx
// ✅ Always use translation keys
<h1>{t('tools.compressPdf.title')}</h1>

// ✅ Interpolation
{t('common.maxSize', { size: maxSizeMB })}

// ❌ Never hardcode user-facing strings
<h1>Compress PDF</h1>
```

---

## 9. Project Structure Rules

### 9.1 Directory Layout

```
Dociva/
├── frontend/           # React SPA
│   ├── src/
│   │   ├── components/ # UI Components (layout/, shared/, tools/)
│   │   ├── hooks/      # Custom React hooks
│   │   ├── i18n/       # Translation files
│   │   ├── pages/      # Route-level page components
│   │   ├── services/   # API client (axios)
│   │   ├── styles/     # Global CSS (Tailwind layers)
│   │   └── utils/      # Pure utility functions
│   └── public/         # Static assets
├── backend/            # Flask + Celery
│   ├── app/
│   │   ├── routes/     # API endpoints (Flask blueprints)
│   │   ├── services/   # Business logic
│   │   ├── tasks/      # Celery async tasks
│   │   ├── utils/      # Backend utilities
│   │   └── middleware/  # Rate limiting, etc.
│   ├── config/         # Flask configuration
│   └── tests/          # pytest tests
├── nginx/              # Reverse proxy configuration
├── scripts/            # Deployment & maintenance scripts
├── docs/               # Specifications & planning docs
├── docker-compose.yml  # Development environment
└── docker-compose.prod.yml
```

### 9.2 File Naming Conventions

| Type | Convention | Example |
|------|-----------|---------|
| React components | PascalCase | `PdfCompressor.tsx`, `FileUploader.tsx` |
| Hooks | camelCase with `use` prefix | `useFileUpload.ts`, `useDirection.ts` |
| Utils | camelCase | `textTools.ts`, `seo.ts` |
| Services | camelCase | `api.ts` |
| Translation files | lowercase ISO code | `en.json`, `ar.json` |
| CSS files | lowercase | `global.css` |
| Pages | PascalCase + `Page` suffix | `HomePage.tsx`, `AboutPage.tsx` |

### 9.3 Export Conventions

- **Components**: `export default function ComponentName()` (default export)
- **Hooks**: `export function useHookName()` (named export)
- **Utils**: `export function utilName()` (named export)
- **Services**: named exports + `export default api` for the axios instance

---

## 10. Figma Integration Guidelines (MCP)

### 10.1 Mapping Figma to Code

| Figma Element | Maps To |
|---------------|---------|
| Color Variables | `tailwind.config.js` → `theme.extend.colors` |
| Text Styles | Tailwind `text-*`, `font-*` classes + `fontFamily` config |
| Spacing | Tailwind spacing scale (4px grid: `p-1`=4px, `p-4`=16px) |
| Border Radius | `rounded-xl` (12px) for buttons/inputs, `rounded-2xl` (16px) for cards |
| Shadow | `shadow-sm`, `shadow-md`, `shadow-lg` (Tailwind defaults) |
| Icons | Map to Lucide React icon names |
| Components | React functional components with Tailwind utility classes |

### 10.2 When Creating New Components from Figma

1. **Place the file** in the correct directory (`layout/`, `shared/`, or `tools/`)
2. **Use `@/` path alias** for all imports
3. **Apply dark mode** classes to every visual element
4. **Add i18n keys** to all three translation files (`en.json`, `ar.json`, `fr.json`)
5. **Use Lucide icons** — do not add custom SVG files unless absolutely necessary
6. **Follow the tool template** pattern for any new tool page
7. **Add the route** to `App.tsx` with `React.lazy()` import
8. **Add SEO** via `<Helmet>` + `generateToolSchema()`
9. **Support RTL** — use logical properties (`ms-`, `me-`, `ps-`, `pe-`, `start-`, `end-`)

### 10.3 Color Translation Cheat Sheet

| Figma Token | Tailwind Class |
|-------------|---------------|
| Primary / Brand Blue | `primary-600` (buttons), `primary-500` (dark mode) |
| Background | `white` / `dark:slate-950` (page), `slate-50` / `dark:slate-800` (surface) |
| Text Primary | `slate-900` / `dark:slate-100` |
| Text Secondary | `slate-500` / `dark:slate-400` |
| Border | `slate-200` / `dark:slate-700` |
| Success | `emerald-600` |
| Error | `red-600` / `red-700` |
| Warning | `orange-600` |

### 10.4 Spacing Translation

| Figma px | Tailwind class |
|----------|---------------|
| 4px | `1` |
| 8px | `2` |
| 12px | `3` |
| 16px | `4` |
| 20px | `5` |
| 24px | `6` |
| 32px | `8` |
| 40px | `10` |
| 48px | `12` |
| 64px | `16` |
| 80px | `20` |
| 96px | `24` |

---

## 11. Code Quality Rules

### 11.1 TypeScript

- **Strict mode** enabled
- All component props must have an `interface` (not inline types)
- Use `type` imports when importing only types: `import type { TaskResult } from '@/services/api'`

### 11.2 Component Rules

- Every component must be a **default export** function
- No class components
- Use `useTranslation()` for all user-facing text
- Use `<Helmet>` for page-level SEO on every route-level component

### 11.3 Styling Rules

- **No inline styles** except for dynamic values (e.g., `style={{ width: '${percent}%' }}`)
- **No external CSS files** per component — everything in Tailwind utilities or `global.css` `@layer`
- Always include both light and dark mode variants
- Always include responsive breakpoints for layout-affecting properties

### 11.4 Accessibility

- Use semantic HTML (`<header>`, `<main>`, `<footer>`, `<nav>`, `<section>`)
- Include `aria-label` on icon-only buttons
- Use `aria-expanded`, `aria-haspopup`, `role`, `aria-selected` for interactive widgets
- Support keyboard navigation
- Use `dir="auto"` on user text input fields for mixed-direction content
