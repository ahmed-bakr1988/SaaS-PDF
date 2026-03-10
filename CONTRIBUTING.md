# Contributing to SaaS-PDF

## Safety Rules

These rules are **non-negotiable**. Every PR must comply.

### 1. Never Delete Existing Routes

All routes are registered in `frontend/src/config/routes.ts`. This file is the canonical source of truth. The route safety test (`routes.test.ts`) verifies that every registered route exists in `App.tsx`.

- **Adding a route:** Append to `routes.ts` → add `<Route>` in `App.tsx`
- **Removing a route:** ❌ NEVER. Deprecate by redirecting instead.

### 2. Never Modify Existing Working Tools

Each tool lives in its own file under `frontend/src/components/tools/`. Do not change a tool's:

- Public API (props, accepted file types, output format)
- Route path
- Backend endpoint it calls

If you need to change behavior, add a new option behind a feature flag.

### 3. Never Break Existing Tests

Run the full test suites before pushing:

```bash
# Frontend
cd frontend && npx vitest run

# Backend
cd backend && python -m pytest tests/ -q
```

If a test fails after your change, **fix your code**, not the test — unless the test itself is wrong (and you explain why in the PR).

### 4. Add New Functionality in Isolated Modules

- New tools → new file under `components/tools/`
- New pages → new file under `pages/`
- New backend routes → new file or append to existing route file
- New services → new file under `services/` or `utils/`

Never add new logic inline to existing tool components. Keep changes isolated so they can be reverted independently.

### 5. Use Feature Flags When Needed

#### Backend

Feature flags are defined in `backend/config/__init__.py`:

```python
FEATURE_EDITOR = os.getenv("FEATURE_EDITOR", "true").lower() == "true"
```

Check them in routes:

```python
from flask import current_app
if not current_app.config.get("FEATURE_EDITOR"):
    return jsonify(error="Feature disabled"), 403
```

#### Frontend

Feature flags are defined in `frontend/src/config/featureFlags.ts`:

```typescript
import { isFeatureEnabled } from '@/config/featureFlags';

if (isFeatureEnabled('EDITOR')) {
  // render the tool
}
```

Set via environment variables:

```env
VITE_FEATURE_EDITOR=true    # enabled (default)
VITE_FEATURE_OCR=false      # disabled
```

---

## Development Workflow

### Branch Naming

| Type | Pattern | Example |
|------|---------|---------|
| Feature | `feature/tool-name` | `feature/pdf-merger` |
| Fix | `fix/issue-description` | `fix/ocr-language-flag` |
| SEO | `feature/seo-*` | `feature/seo-content` |

### PR Checklist

- [ ] No existing routes removed (checked by `routes.test.ts`)
- [ ] No existing tool components modified (unless bug fix)
- [ ] All tests pass (`vitest run` + `pytest`)
- [ ] Build succeeds (`npx vite build`)
- [ ] New routes added to `routes.ts` registry
- [ ] New i18n keys added to all 3 language files (en, ar, fr)
- [ ] Feature flag added if the feature can be disabled

### File Structure Convention

```
frontend/src/
├── components/
│   ├── layout/         # Header, Footer, AdSlot
│   ├── shared/         # Reusable components (ToolCard, ErrorBoundary)
│   ├── seo/            # SEOHead, ToolLandingPage, FAQSection
│   └── tools/          # One file per tool (PdfToWord.tsx, etc.)
├── config/
│   ├── routes.ts       # Canonical route registry (NEVER delete entries)
│   ├── featureFlags.ts # Frontend feature flag reader
│   ├── seoData.ts      # SEO metadata for all tools
│   └── toolLimits.ts   # File size limits
├── hooks/              # Custom React hooks
├── i18n/               # Translation files (en.json, ar.json, fr.json)
├── pages/              # Page components (HomePage, AboutPage, etc.)
├── services/           # API clients, analytics
├── stores/             # Zustand stores
└── utils/              # Pure utility functions (seo.ts, etc.)
```
