# Codebase Conventions Map

## Scope
- This repository is a multi-project workspace, not a single uniform style guide.
- Primary backends are Flask-based in `backend/` and `algorithmic_annotation_backen/`.
- Primary frontends are Vue + TypeScript in `frontend/` and `algorithmic_annotation_web/`.
- `lx-music-desktop/` follows its own Electron + Vue conventions and lint profile.

## Python Backend Conventions (`backend/`)
- Application factory pattern is used (`create_app`) with centralized extension init in `backend/src/__init__.py` and `backend/src/extensions.py`.
- Module organization is consistent: `models.py`, `service.py`, `routes.py`, `schemas.py`, plus `exceptions.py` when needed (examples: `backend/src/modules/user/`, `backend/src/modules/playlist/`, `backend/src/modules/music_source/`).
- Naming is snake_case for Python internals (`user_id`, `created_time`) in services and models (`backend/src/modules/user/service.py`, `backend/src/modules/user/models.py`).
- API response payloads are intentionally camelCase (`userId`, `createdTime`) from model serializers like `to_dict()` / `to_api_dict()` (`backend/src/modules/user/models.py`, `backend/src/modules/favorite/models.py`, `backend/src/modules/history/models.py`).
- Route handlers commonly define a local `make_response(...)` helper returning `{code, success, message, data}` (`backend/src/modules/user/routes.py`, `backend/src/modules/favorite/routes.py`, `backend/src/modules/player/routes.py`).
- Request parsing is mostly manual via `request.args` / `request.get_json()` with explicit required-field checks (`backend/src/modules/playlist/routes.py`, `backend/src/modules/local_music/routes.py`).
- Services hold business logic as class-level static methods (`UserService`, `PlaylistService`, `MusicSourceService`) in `backend/src/modules/*/service.py`.
- SQLAlchemy 2 typed mapping style is used (`Mapped[...]`, `mapped_column`) in models (`backend/src/modules/playlist/models.py`, `backend/src/modules/music_source/models.py`).
- Time fields follow `created_time` / `updated_time` + `datetime.utcnow` defaults (`backend/src/modules/user/models.py`, `backend/src/modules/playlist/models.py`).
- Common exception strategy: domain exception classes with code/message, plus broad catch-all in routes (`backend/src/modules/playlist/service.py`, `backend/src/modules/music_source/exceptions.py`, `backend/src/modules/playlist/routes.py`).
- Error handling is partially inconsistent: many broad `except Exception` blocks return stringified errors, but transactional rollback appears only in some paths (example rollback in `backend/src/modules/favorite/service.py`).

## Python Backend Conventions (`algorithmic_annotation_backen/`)
- Uses Flask-RESTX `Namespace` + `Resource` classes for route declarations (`algorithmic_annotation_backen/src/modules/base/routes.py`, `algorithmic_annotation_backen/src/modules/dataset/routes.py`).
- Unified response decorator `@response_wrapper` wraps handler results into `{code, success, message, data}` (`algorithmic_annotation_backen/src/utils/response_wrapper.py`).
- RESTX model + Pydantic bridging is formalized via model conversion helpers (`algorithmic_annotation_backen/src/utils/model_util.py`).
- Global exception handler registration with categorized exception classes is centralized (`algorithmic_annotation_backen/src/modules/exceptions.py`).

## Frontend Conventions (`frontend/`)
- Vue 3 Composition API + `<script setup lang="ts">` is standard (`frontend/src/views/music-source/index.vue`, `frontend/src/views/music-source/components/SourceForm.vue`).
- TypeScript strict mode and unused checks are enabled in compiler config (`frontend/tsconfig.json`).
- `@/*` path alias is standard for imports (`frontend/tsconfig.json`, `frontend/src/router/index.ts`, `frontend/src/stores/player.ts`).
- Store pattern: Pinia composition stores with reactive refs/computed + function actions (`frontend/src/stores/player.ts`).
- HTTP pattern: centralized Axios instance, interceptors, typed error transform in `frontend/src/api/request.ts`.
- API layer is organized by domain and exports typed Promise wrappers (`frontend/src/api/musicSource/source.ts`, `frontend/src/types/musicSource/index.ts`).

## Frontend Conventions (`algorithmic_annotation_web/`, `lx-music-desktop/`)
- `algorithmic_annotation_web/` enforces lint/format tooling through ESLint + Prettier + Stylelint (`algorithmic_annotation_web/eslint.config.js`, `algorithmic_annotation_web/stylelint.config.js`).
- Editor baseline there is 2-space indent + LF + UTF-8 (`algorithmic_annotation_web/.editorconfig`).
- `lx-music-desktop/` uses ESLint standard/TS + Vue rules with multiple relaxations (`lx-music-desktop/.eslintrc.base.cjs`).
- `lx-music-desktop/` allows mixed naming and legacy-compatible JS/TS patterns (for example `camelcase: off`, `eqeqeq: off` in `lx-music-desktop/.eslintrc.base.cjs`).

## Practical Guidance for Contributors
- Follow local subsystem conventions first; do not force one style across all subprojects.
- In `backend/`, preserve snake_case internal fields and camelCase API output contracts.
- Keep business logic in `service.py` and keep `routes.py` focused on request/response orchestration.
- Prefer extending existing local exception classes instead of ad-hoc error payloads.
- In frontend apps, preserve existing import alias style and store architecture per project.
