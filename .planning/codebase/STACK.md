# Technology Stack Mapping

## Scope
- Repository appears to be a multi-project workspace with 5 active apps: `backend`, `frontend`, `algorithmic_annotation_backen`, `algorithmic_annotation_web`, `lx-music-desktop`.
- Evidence for project manifests and lockfiles: `backend/pyproject.toml`, `frontend/package.json`, `frontend/pnpm-lock.yaml`, `algorithmic_annotation_backen/pyproject.toml`, `algorithmic_annotation_backen/uv.lock`, `algorithmic_annotation_web/package.json`, `algorithmic_annotation_web/pnpm-lock.yaml`, `lx-music-desktop/package.json`, `lx-music-desktop/package-lock.json`.

## Languages and Runtimes
- Python 3.11+ is required in both Python backends.
- Evidence: `backend/pyproject.toml:10`, `algorithmic_annotation_backen/pyproject.toml:6`.
- TypeScript + Vue 3 are used in both web frontends and desktop renderer code.
- Evidence: `frontend/package.json:17`, `frontend/package.json:23`, `algorithmic_annotation_web/package.json:72`, `algorithmic_annotation_web/package.json:121`, `lx-music-desktop/package.json:169`, `lx-music-desktop/package.json:198`.
- Node runtime constraints differ by app.
- Evidence: `algorithmic_annotation_web/package.json:135`, `lx-music-desktop/package.json:74`.

## Project: `backend` (jiyu-music-backend)
- Framework: Flask application factory pattern.
- Evidence: `backend/src/__init__.py:10`, `backend/src/__init__.py:20`.
- Core framework dependencies: Flask, Flask-RESTX, Flask-CORS, SQLAlchemy, PyMySQL, Requests.
- Evidence: `backend/pyproject.toml:2`, `backend/requirements.txt:2`, `backend/requirements.txt:3`, `backend/requirements.txt:4`, `backend/requirements.txt:8`, `backend/requirements.txt:9`, `backend/requirements.txt:22`.
- Extension wiring: SQLAlchemy, Marshmallow, CORS.
- Evidence: `backend/src/extensions.py:4`, `backend/src/extensions.py:5`, `backend/src/extensions.py:6`, `backend/src/extensions.py:9`, `backend/src/extensions.py:12`, `backend/src/extensions.py:15`.
- API route registration under `/api/v1/*` plus one unprefixed local music blueprint.
- Evidence: `backend/src/__init__.py:48`, `backend/src/__init__.py:49`, `backend/src/__init__.py:50`, `backend/src/__init__.py:55`.
- Database runtime config supports SQLite default and MySQL via env.
- Evidence: `backend/src/config.py:29`, `backend/src/config.py:34`, `backend/src/config.py:37`, `backend/.env.example:10`, `backend/.env.example:20`.
- Test/dev tooling present: `pytest`, `black`.
- Evidence: `backend/pyproject.toml:16`, `backend/pyproject.toml:17`, `backend/pytest.ini:1`.

## Project: `frontend` (jiyu-music-frontend)
- Framework/build: Vue 3 + TypeScript + Vite.
- Evidence: `frontend/package.json:6`, `frontend/package.json:7`, `frontend/package.json:17`, `frontend/package.json:23`, `frontend/package.json:24`.
- State/UI/data libs: Pinia, Element Plus, Axios.
- Evidence: `frontend/package.json:12`, `frontend/package.json:13`, `frontend/package.json:15`.
- Dev server proxy forwards `/api` to backend `http://localhost:5001`.
- Evidence: `frontend/vite.config.ts:15`, `frontend/vite.config.ts:16`.
- Primary API client base URL is `VITE_API_BASE_URL` fallback `/api/v1`.
- Evidence: `frontend/src/api/request.ts:11`, `frontend/src/api/request.ts:14`.
- Auth header uses bearer token from `localStorage`.
- Evidence: `frontend/src/api/request.ts:26`, `frontend/src/api/request.ts:28`.

## Project: `algorithmic_annotation_backen`
- Framework/build: Flask + Flask-RESTX + Flask-SQLAlchemy + CORS.
- Evidence: `algorithmic_annotation_backen/pyproject.toml:8`, `algorithmic_annotation_backen/pyproject.toml:10`, `algorithmic_annotation_backen/pyproject.toml:11`, `algorithmic_annotation_backen/src/__init__.py:2`, `algorithmic_annotation_backen/src/__init__.py:3`, `algorithmic_annotation_backen/src/__init__.py:4`, `algorithmic_annotation_backen/src/__init__.py:45`.
- Config model is YAML-driven (`resources/application.yml`) loaded in Python config class.
- Evidence: `algorithmic_annotation_backen/src/config.py:1`, `algorithmic_annotation_backen/src/config.py:17`, `algorithmic_annotation_backen/resources/application.yml:1`.
- AI/ML-centric dependencies: OpenAI SDK, Ultralytics, LiteLLM, Paho MQTT, MinIO client.
- Evidence: `algorithmic_annotation_backen/pyproject.toml:14`, `algorithmic_annotation_backen/pyproject.toml:17`, `algorithmic_annotation_backen/pyproject.toml:18`, `algorithmic_annotation_backen/pyproject.toml:19`, `algorithmic_annotation_backen/pyproject.toml:25`.
- SQLAlchemy DB URL is assembled as MySQL URL from YAML fields when not explicitly set.
- Evidence: `algorithmic_annotation_backen/src/config.py:36`, `algorithmic_annotation_backen/src/config.py:45`.
- Dependency lockfile indicates `uv` workflow is in use here.
- Evidence: `algorithmic_annotation_backen/uv.lock`.

## Project: `algorithmic_annotation_web`
- Framework/build: Vue 3 + Vite + TypeScript + Pure Admin ecosystem.
- Evidence: `algorithmic_annotation_web/package.json:2`, `algorithmic_annotation_web/package.json:7`, `algorithmic_annotation_web/package.json:72`, `algorithmic_annotation_web/package.json:121`, `algorithmic_annotation_web/package.json:124`.
- UI/state/network libs: Element Plus, Pinia, Axios.
- Evidence: `algorithmic_annotation_web/package.json:57`, `algorithmic_annotation_web/package.json:60`, `algorithmic_annotation_web/package.json:67`.
- Styling toolchain includes Tailwind v4.
- Evidence: `algorithmic_annotation_web/package.json:87`, `algorithmic_annotation_web/package.json:120`.
- Package manager policy is pnpm-only with explicit engines.
- Evidence: `algorithmic_annotation_web/package.json:22`, `algorithmic_annotation_web/package.json:134`, `algorithmic_annotation_web/package.json:136`.
- Default API base URL targets backend at port 5001.
- Evidence: `algorithmic_annotation_web/.env.development:11`, `algorithmic_annotation_web/src/utils/http/index.ts:21`.

## Project: `lx-music-desktop`
- Platform stack: Electron app with Vue + TypeScript and Webpack build pipeline.
- Evidence: `lx-music-desktop/package.json:57`, `lx-music-desktop/package.json:60`, `lx-music-desktop/package.json:61`, `lx-music-desktop/package.json:136`, `lx-music-desktop/package.json:172`, `lx-music-desktop/package.json:198`.
- Runtime requirements: Node >=22, npm >=8.5.2.
- Evidence: `lx-music-desktop/package.json:73`, `lx-music-desktop/package.json:74`, `lx-music-desktop/package.json:75`.
- Local database dependency uses `better-sqlite3`.
- Evidence: `lx-music-desktop/package.json:180`.
- Uses npm lockfile (not pnpm) unlike the two Vue web apps.
- Evidence: `lx-music-desktop/package-lock.json`.

## Configuration Surfaces (Cross-Repo)
- Python backend config via env: `backend/.env.example`, `backend/src/config.py`.
- Python annotation backend config via YAML: `algorithmic_annotation_backen/resources/application.yml`, `algorithmic_annotation_backen/src/config.py`.
- Frontend runtime API config via Vite env: `frontend/src/api/request.ts`, `algorithmic_annotation_web/.env.development`, `algorithmic_annotation_web/src/utils/http/index.ts`.
- Build-time dev proxy in frontend: `frontend/vite.config.ts`.

## Practical Notes
- The repo currently mixes package ecosystems (`uv`, `pnpm`, `npm`) and runtime targets (Flask APIs, Vue SPAs, Electron desktop), so CI and local setup should be handled per subproject rather than monorepo-wide.
- Evidence for mixed lockfiles: `algorithmic_annotation_backen/uv.lock`, `frontend/pnpm-lock.yaml`, `algorithmic_annotation_web/pnpm-lock.yaml`, `lx-music-desktop/package-lock.json`.
