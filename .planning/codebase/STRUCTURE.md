# Directory Structure Map

## 1) Top-level layout
- `.planning/` planning artifacts; codebase docs are written to `.planning/codebase/`.
- `backend/` active Flask backend for Jiyu Music.
- `frontend/` active Vue 3 frontend for Jiyu Music.
- `algorithmic_annotation_backen/` separate backend project (own `.git`, own `main.py`).
- `algorithmic_annotation_web/` separate Vue admin project (`pure-admin-thin`).
- `lx-music-desktop/` separate Electron + Vue desktop app project.
- `洛雪音乐-音源/` standalone custom source scripts repository (JS/TXT source files).

## 2) Jiyu backend structure (`backend/`)
- App bootstrap: `backend/main.py`.
- Packaging/config: `backend/pyproject.toml`, `backend/requirements.txt`, `backend/.env.example`.
- Core app package: `backend/src/`.
- App factory + config + extensions: `backend/src/__init__.py`, `backend/src/config.py`, `backend/src/extensions.py`.
- Domain modules: `backend/src/modules/<module>/`.
- Module file convention appears consistent:
  - `routes.py` HTTP layer
  - `service.py` business logic
  - `models.py` ORM entities
  - `schemas.py` DTO/validation models
- Utility and scripts: `backend/src/utils/`, `backend/init_db.py`, `backend/src/init_db.py`, `backend/create_tests.py`.
- Data and docs: `backend/data/music.db`, `backend/docs/custom-source-format.md`.
- Tests: `backend/tests/conftest.py`, `backend/tests/test_api_music.py`, `backend/tests/test_music_source.py`, `backend/tests/test_playlist.py`.

## 3) Jiyu frontend structure (`frontend/`)
- Tooling root: `frontend/package.json`, `frontend/vite.config.ts`, `frontend/tsconfig.json`.
- App entry: `frontend/src/main.ts`, root app `frontend/src/App.vue`.
- Router and layout: `frontend/src/router/index.ts`, `frontend/src/layout/MainLayout.vue`.
- Views by route: `frontend/src/views/` with feature folders like `music-search/`, `music-source/`, `playlist/`, `favorite/`, `history/`, `download/`, `local-music/`.
- Reusable components: `frontend/src/components/Player/*`.
- API clients: `frontend/src/api/` plus nested grouping at `frontend/src/api/musicSource/`.
- State stores: `frontend/src/stores/*.ts`.
- Types: `frontend/src/types/*.ts` and `frontend/src/types/musicSource/*`.

## 4) Music-source backend deep structure
- Core abstractions: `backend/src/modules/music_source/base.py`, `.../manager.py`, `.../exceptions.py`.
- Built-in providers: `backend/src/modules/music_source/sources/netease/`, `.../qq/`, `.../kugou/`, `.../kuwo/`.
- Custom provider runtime: `backend/src/modules/music_source/sources/custom/` (`loader.py`, `provider.py`, `js_bridge.js`).
- API surface: `backend/src/modules/music_source/routes.py` (including config CRUD, live search, script upload/validate).

## 5) Naming and organization conventions observed
- Python modules/files use `snake_case` paths and filenames (e.g., `local_music`, `music_source`, `service.py`).
- Flask blueprints are feature-scoped and registered in `backend/src/__init__.py`.
- API responses are mostly camelCase payloads produced by model `to_dict()` methods (e.g., `backend/src/modules/playlist/models.py`, `backend/src/modules/user/models.py`).
- Frontend path alias `@` maps to `src` in `frontend/vite.config.ts` and `frontend/tsconfig.json`.
- Frontend feature folders often use kebab-case (`frontend/src/views/music-search/`, `frontend/src/views/local-music/`).
- Store filenames are camelCase feature names (`frontend/src/stores/localMusic.ts`) while route paths are kebab-case (`/local-music`).

## 6) Other project structures in workspace
- `algorithmic_annotation_backen/` has `main.py`, `src/`, `resources/`, generator templates (`resources/templates/*.vm`).
- `algorithmic_annotation_web/` follows a full admin template structure (`src/views/`, `src/router/`, `src/store/`, `src/components/`).
- `lx-music-desktop/` is split into Electron process layers (`src/main/`, `src/renderer/`, `src/renderer-lyric/`, `src/common/`).
- `洛雪音乐-音源/` is flat script storage for source files (`*.js`, `*.txt`) used as external source artifacts.

## 7) Practical navigation shortcuts
- Start backend architecture reading from `backend/src/__init__.py` then one module folder like `backend/src/modules/playlist/`.
- Start frontend architecture reading from `frontend/src/main.ts` then `frontend/src/router/index.ts` and one feature view folder.
- For source-plugin behavior, jump directly to `backend/src/modules/music_source/routes.py` + `backend/src/modules/music_source/sources/custom/`.
- For request-contract checks, compare `frontend/src/api/musicSource/*.ts` against `backend/src/modules/music_source/routes.py`.
