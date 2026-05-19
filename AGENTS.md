# Repository Guidelines

## Project Structure & Module Organization
This repository is a Docker-first monorepo:
- `backend/`: Flask API, Celery workers, services, routes, and `tests/`.
- `frontend/`: React 18 + Vite + TypeScript app (`src/`, `public/`, `scripts/`).
- `nginx/`: dev/prod reverse proxy configs.
- `deploy/`: infra runtime configs (for example `deploy/redis/redis.conf`).
- `scripts/`: deployment, sitemap, cleanup, and ops helpers.
- `docs/`: implementation and ops documentation.

Keep business logic in `backend/app/services/*_service.py`; route handlers belong in `backend/app/routes/`.

## Build, Test, and Development Commands
Primary local workflow uses Docker Compose from repo root:

```bash
docker-compose up -d --build     # start full stack
docker-compose ps                # service status
docker-compose logs -f backend   # follow backend logs
docker-compose down -v           # stop and remove volumes
bash docker-compose-tests.sh     # connectivity/health checks
```

Frontend-only workflow:

```bash
cd frontend
npm run dev      # Vite dev server
npm run lint     # ESLint
npm run test     # Vitest
npm run build    # type-check + production build + SEO generation
```

Backend tests:

```bash
docker-compose exec backend pytest tests -q
```

## Coding Style & Naming Conventions
- Python: PEP 8, 4-space indentation, `snake_case` for modules/functions, `PascalCase` for classes.
- TypeScript/React: 2-space indentation, `PascalCase` components (for example `PdfEditor.tsx`), `camelCase` utilities, hooks prefixed with `use`.
- File naming patterns are intentional: backend tasks use `*_tasks.py`, backend services use `*_service.py`, frontend tests use `*.test.ts` or `*.test.tsx`.
- Linting is enforced on frontend via ESLint (`frontend/eslint.config.ts`).

## Testing Guidelines
- Backend: `pytest` + `pytest-flask` under `backend/tests/` with files named `test_*.py`.
- Frontend: `vitest` + Testing Library (`frontend/src/test/setup.ts`) with `*.test.ts(x)` files.
- Add or update tests with every behavior change; prefer focused unit tests near touched modules.

## Commit & Pull Request Guidelines
Recent history mixes `feat:` commits and ad-hoc `Fix problem ...` messages. Prefer consistent Conventional Commit style:
- `feat(scope): add PDF watermark opacity control`
- `fix(api): handle empty upload payload`

PRs should include: concise summary, linked issue/ticket, test evidence (commands run), and screenshots/GIFs for UI changes.

## Security & Configuration Tips
- Copy `.env.example` to `.env`; never commit real secrets.
- Treat `certbot/` and deployment configs as sensitive operational files.
- Validate uploaded-file handling changes against `backend/app/utils/file_validator.py` tests.
