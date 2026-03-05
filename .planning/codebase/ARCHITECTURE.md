# Architecture Map

## 1) Repository-level pattern
- This repository is a **workspace container** with multiple independent codebases, not one tightly integrated monorepo.
- Evidence: nested Git roots at `.git`, `algorithmic_annotation_backen/.git`, `algorithmic_annotation_web/.git`, `lx-music-desktop/.git`.
- The active “Jiyu Music” web stack is primarily split into `backend/` (Flask) and `frontend/` (Vue 3 + Vite).
- Additional projects are present as sibling codebases (`algorithmic_annotation_backen/`, `algorithmic_annotation_web/`, `lx-music-desktop/`, `洛雪音乐-音源/`).

## 2) Primary architecture style (Jiyu Music)
- Backend uses a **modular monolith** pattern: one Flask app, feature modules under `backend/src/modules/*`.
- Frontend uses a **feature-organized SPA** pattern: route-driven pages under `frontend/src/views/*`, reusable UI under `frontend/src/components/*`, state in Pinia stores.
- Integration style is REST over HTTP via `/api/v1/*` and Vite proxy (`frontend/vite.config.ts`).

## 3) Backend layers and responsibilities
- Process entry point: `backend/main.py` initializes app from factory and runs server.
- App composition: `backend/src/__init__.py` builds app, applies config, initializes extensions, registers blueprints, creates DB tables.
- Configuration layer: `backend/src/config.py` chooses SQLite/MySQL from env (`DB_TYPE`, `DATABASE_URL`).
- Infrastructure extensions: `backend/src/extensions.py` owns `SQLAlchemy`, `Marshmallow`, `CORS` instances.
- Feature module convention (repeated): `models.py` + `service.py` + `routes.py` + `schemas.py` under each module folder.
- Evidence modules: `backend/src/modules/playlist/`, `backend/src/modules/player/`, `backend/src/modules/favorite/`, `backend/src/modules/history/`, `backend/src/modules/download/`, `backend/src/modules/local_music/`, `backend/src/modules/user/`, `backend/src/modules/music_source/`.

## 4) Frontend layers and responsibilities
- SPA entry point: `frontend/src/main.ts` mounts Vue app, installs Pinia + persisted-state plugin + Element Plus + router.
- Route shell: `frontend/src/router/index.ts` + `frontend/src/layout/MainLayout.vue`.
- View layer: page-level screens in `frontend/src/views/*` (e.g., `frontend/src/views/music-search/index.vue`).
- Domain API layer: `frontend/src/api/*` plus grouped music-source clients in `frontend/src/api/musicSource/*`.
- State layer: Pinia stores in `frontend/src/stores/*` (e.g., `frontend/src/stores/player.ts`).
- Type contracts: `frontend/src/types/*` and `frontend/src/types/musicSource/*`.

## 5) Runtime data flow
- Typical request flow:
  1. UI event in a view (e.g., `frontend/src/views/music-search/index.vue`).
  2. Calls API function (e.g., `frontend/src/api/musicSource/music.ts`).
  3. HTTP client/interceptors (`frontend/src/api/request.ts`).
  4. Flask route handler (e.g., `backend/src/modules/music_source/routes.py`).
  5. Service layer (e.g., `backend/src/modules/music_source/service.py`).
  6. ORM model/database (`backend/src/modules/music_source/models.py`, `backend/data/music.db`).
  7. Response mapped via `to_dict()` and returned to UI.

## 6) Key abstractions
- Music source provider contract: `BaseMusicSource` in `backend/src/modules/music_source/base.py`.
- Multi-source orchestration and fallback: `MusicSourceManager` singleton in `backend/src/modules/music_source/manager.py`.
- Dynamic script-based adapters: custom source loader/provider in `backend/src/modules/music_source/sources/custom/loader.py` and `backend/src/modules/music_source/sources/custom/provider.py`.
- Built-in source adapters: `backend/src/modules/music_source/sources/netease/`, `.../qq/`, `.../kugou/`, `.../kuwo/`.
- Frontend persisted playback state abstraction: `usePlayerStore` in `frontend/src/stores/player.ts`.

## 7) Entry points and operational scripts
- Backend app run: `backend/main.py`.
- Backend DB setup: `backend/init_db.py` and `backend/src/init_db.py`.
- Frontend dev/build entry: `frontend/package.json` scripts + `frontend/src/main.ts`.
- Tests entry: `backend/pytest.ini`, `backend/tests/conftest.py`, `backend/tests/test_*.py`.
- Script format specification for dynamic sources: `backend/docs/custom-source-format.md`.

## 8) Architectural notes that affect maintenance
- API response wrapping is implemented per-module (`make_response` / `format_response`) instead of one centralized response middleware (e.g., `backend/src/modules/user/routes.py`, `backend/src/modules/download/routes.py`, `backend/src/modules/playlist/routes.py`).
- `music_source` routes bridge async provider calls inside sync Flask routes using event-loop helpers in `backend/src/modules/music_source/routes.py`.
- Frontend currently has two axios entry utilities (`frontend/src/api/index.ts` and `frontend/src/api/request.ts`), which indicates a partial migration and dual client abstraction.
