# External Integrations Mapping

## Scope and Method
- Integration mapping covers: external APIs, databases, auth providers, storage, messaging, and webhook surfaces across `backend`, `frontend`, `algorithmic_annotation_backen`, `algorithmic_annotation_web`, `lx-music-desktop`.
- Evidence is taken from concrete implementation/config files, not README claims alone.

## 1) External Music APIs
- `backend` integrates directly with multiple music providers through source adapters and constants.
- Netease endpoints and defaults: `backend/src/modules/music_source/sources/netease/constants.py:18`, `backend/src/modules/music_source/sources/netease/constants.py:19`, `backend/src/modules/music_source/sources/netease/__init__.py:30`.
- QQ Music endpoints and defaults: `backend/src/modules/music_source/sources/qq/constants.py:18`, `backend/src/modules/music_source/sources/qq/constants.py:20`, `backend/src/modules/music_source/sources/qq/__init__.py:47`.
- Kuwo endpoints: `backend/src/modules/music_source/sources/kuwo/constants.py:17`, `backend/src/modules/music_source/sources/kuwo/constants.py:20`.
- Kugou endpoints: `backend/src/modules/music_source/sources/kugou/constants.py:18`, `backend/src/modules/music_source/sources/kugou/constants.py:32`.
- `backend` also supports script-based custom providers that can issue outbound HTTP requests via `requests.Session`.
- Evidence: `backend/src/modules/music_source/sources/custom/provider.py:9`, `backend/src/modules/music_source/sources/custom/provider.py:35`, `backend/src/modules/music_source/sources/custom/provider.py:65`, `backend/src/modules/music_source/sources/custom/loader.py:199`.
- `lx-music-desktop` calls external Kuwo and QQ interfaces from renderer SDK modules.
- Kuwo examples: `lx-music-desktop/src/renderer/utils/musicSdk/kw/songList.js:29`, `lx-music-desktop/src/renderer/utils/musicSdk/kw/songList.js:41`.
- QQ examples: `lx-music-desktop/src/renderer/utils/musicSdk/tx/songList.js:31`, `lx-music-desktop/src/renderer/utils/musicSdk/tx/songList.js:62`.

## 2) Backend API Integrations (Internal App-to-App)
- `frontend` points to backend API through Vite proxy and Axios base URL.
- Evidence: `frontend/vite.config.ts:15`, `frontend/vite.config.ts:16`, `frontend/src/api/request.ts:11`.
- `frontend` music-source features are wired to backend endpoints under `/music-sources/*`.
- Evidence: `frontend/src/api/musicSource/music.ts:34`, `frontend/src/api/musicSource/music.ts:82`, `frontend/src/api/musicSource/music.ts:117`.
- `algorithmic_annotation_web` points to annotation backend at `http://localhost:5001` by env/default config.
- Evidence: `algorithmic_annotation_web/.env.development:11`, `algorithmic_annotation_web/src/utils/http/index.ts:21`.
- Annotation web API modules are actively wired to backend resources (`/datasource`, `/dataset`, `/annotation`, `/training`, `/llm`, `/music`).
- Evidence: `algorithmic_annotation_web/src/api/datasource.ts:283`, `algorithmic_annotation_web/src/api/dataset.ts:118`, `algorithmic_annotation_web/src/api/annotation.ts:108`, `algorithmic_annotation_web/src/api/training.ts:301`, `algorithmic_annotation_web/src/api/llm.ts:103`, `algorithmic_annotation_web/src/api/music.ts:90`.

## 3) Databases
- `backend` supports SQLite (default) and MySQL (env-driven).
- Evidence: `backend/src/config.py:29`, `backend/src/config.py:34`, `backend/src/config.py:37`, `backend/.env.example:10`, `backend/.env.example:20`.
- `algorithmic_annotation_backen` uses SQLAlchemy with MySQL URL composition from YAML config.
- Evidence: `algorithmic_annotation_backen/src/__init__.py:20`, `algorithmic_annotation_backen/src/config.py:36`, `algorithmic_annotation_backen/src/config.py:45`, `algorithmic_annotation_backen/resources/application.yml:15`.
- `algorithmic_annotation_backen` includes a dedicated MySQL datasource strategy (connect/test/query/import/export style behavior).
- Evidence: `algorithmic_annotation_backen/src/modules/datasource/strategies/mysql_strategy.py:12`, `algorithmic_annotation_backen/src/modules/datasource/strategies/mysql_strategy.py:13`, `algorithmic_annotation_backen/src/modules/datasource/strategies/mysql_strategy.py:49`.
- `lx-music-desktop` includes local SQLite integration via `better-sqlite3`.
- Evidence: `lx-music-desktop/package.json:180`.

## 4) AI/LLM Integrations
- `algorithmic_annotation_backen` exposes an OpenAI-compatible endpoint at `/v1/chat/completions`.
- Evidence: `algorithmic_annotation_backen/src/modules/ai/routes.py:140`.
- The AI processor uses official OpenAI clients (`openai.OpenAI`, `openai.AsyncOpenAI`) with configurable `base_url`.
- Evidence: `algorithmic_annotation_backen/src/modules/ai/processors/llm_processor.py:11`, `algorithmic_annotation_backen/src/modules/ai/processors/llm_processor.py:27`, `algorithmic_annotation_backen/src/modules/ai/processors/llm_processor.py:33`.
- LiteLLM is also integrated for provider abstraction and streaming/non-streaming completion paths.
- Evidence: `algorithmic_annotation_backen/src/modules/llm/service.py:233`, `algorithmic_annotation_backen/src/modules/llm/service.py:282`, `algorithmic_annotation_backen/src/modules/llm/service.py:355`, `algorithmic_annotation_backen/pyproject.toml:25`.
- LLM model metadata includes `base_url` and provider enum includes OpenAI.
- Evidence: `algorithmic_annotation_backen/src/modules/llm/models.py:12`, `algorithmic_annotation_backen/src/modules/llm/models.py:49`.

## 5) Object Storage / File Systems
- `algorithmic_annotation_backen` supports `local` and `minio` storage modes.
- Evidence: `algorithmic_annotation_backen/resources/application.yml:25`, `algorithmic_annotation_backen/resources/application.yml:28`.
- MinIO integration is explicit through `MinioFileManager` and MinIO SDK client construction.
- Evidence: `algorithmic_annotation_backen/src/modules/file/__init__.py:59`, `algorithmic_annotation_backen/src/modules/file/__init__.py:61`, `algorithmic_annotation_backen/src/modules/file/managers/minio.py:9`, `algorithmic_annotation_backen/src/modules/file/managers/minio.py:37`.

## 6) Messaging / Streaming
- `algorithmic_annotation_backen` integrates MQTT in two places: generic MQ module and datasource strategy.
- Evidence: `algorithmic_annotation_backen/src/modules/mq/strategies/mqtt_strategy.py:3`, `algorithmic_annotation_backen/src/modules/mq/strategies/mqtt_strategy.py:57`, `algorithmic_annotation_backen/src/modules/mq/strategies/mqtt_strategy.py:184`.
- Datasource MQTT strategy also manages connect/subscribe lifecycle.
- Evidence: `algorithmic_annotation_backen/src/modules/datasource/strategies/mqtt_strategy.py:12`, `algorithmic_annotation_backen/src/modules/datasource/strategies/mqtt_strategy.py:196`, `algorithmic_annotation_backen/src/modules/datasource/strategies/mqtt_strategy.py:212`.
- LLM and AI endpoints provide SSE streaming semantics.
- Evidence: `algorithmic_annotation_backen/src/modules/ai/routes.py:220`, `algorithmic_annotation_backen/src/modules/llm/service.py:272`.

## 7) Auth Providers and Identity Surfaces
- No third-party auth provider (OAuth/OIDC/SAML) is clearly wired in the inspected backend routes.
- `backend` user APIs are keyed by `user_id` request parameters and profile/preferences CRUD.
- Evidence: `backend/src/modules/user/routes.py:42`, `backend/src/modules/user/routes.py:48`, `backend/src/modules/user/routes.py:191`.
- `frontend` includes `/auth/*` client methods and bearer-token headers, but matching backend auth endpoints are not obvious in current `backend` blueprint registration.
- Evidence: `frontend/src/api/auth.ts:12`, `frontend/src/api/auth.ts:28`, `frontend/src/api/request.ts:28`, `backend/src/__init__.py:48`.
- `algorithmic_annotation_web` auth flow is explicitly mock/local in several places.
- Evidence: `algorithmic_annotation_web/src/api/user.ts:37`, `algorithmic_annotation_web/src/api/user.ts:41`, `algorithmic_annotation_web/src/config/auth.ts:3`, `algorithmic_annotation_web/src/config/auth.ts:77`.

## 8) Webhooks
- No explicit webhook handler endpoints were found across primary service folders during repository search.
- Checked API route surfaces include `backend/src/modules/*/routes.py`, `algorithmic_annotation_backen/src/modules/*/routes.py`, `frontend/src/api/*`, `algorithmic_annotation_web/src/api/*`, and desktop modules under `lx-music-desktop/src/*`.
- Practical implication: current integrations appear request/response or streaming-based, not inbound webhook-driven.

## 9) Desktop Sync/Open API Integrations
- `lx-music-desktop` supports a separate sync server integration and local open API surface (documented behavior).
- Evidence: `lx-music-desktop/README.md:72`, `lx-music-desktop/README.md:76`.
- Sync client converts HTTP URL to WS/WSS transport and negotiates connection/auth.
- Evidence: `lx-music-desktop/src/main/modules/sync/client/index.ts:16`, `lx-music-desktop/src/main/modules/sync/client/index.ts:21`, `lx-music-desktop/src/main/modules/sync/client/utils.ts:97`, `lx-music-desktop/src/main/modules/sync/client/utils.ts:105`.
