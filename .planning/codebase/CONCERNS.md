# Codebase Concerns Map

## Highest-Risk Issues
1. Missing real authentication and authorization across critical APIs.
Evidence: `backend/src/modules/player/routes.py` (hardcoded `return 1`), `backend/src/modules/download/routes.py` (repeated `user_id = 1`), `backend/src/modules/history/routes.py` (trusts `X-User-ID` header), `backend/src/modules/user/routes.py` (sensitive operations keyed by query `user_id`).
Impact: cross-user data access and modification is possible with crafted requests.
Action: enforce auth middleware, derive user identity from validated token/session only, remove query/header user identity trust.

2. Untrusted script upload and execution path is enabled.
Evidence: `backend/src/modules/music_source/routes.py` (`/upload` accepts `.py` / `.js` scripts), `backend/src/modules/music_source/sources/custom/loader.py` (`exec(script_content, sandbox)`), `backend/src/modules/music_source/sources/custom/loader.py` (`NodeJSBridge` executes JS in subprocess).
Impact: remote code execution risk if script validation is bypassed or sandbox assumptions fail.
Action: disable script upload in production by default, isolate execution in hardened worker/container, add capability-based allowlist and runtime limits.

3. HTTP upstream endpoints are hardcoded for multiple providers.
Evidence: `backend/src/modules/music_source/sources/kuwo/constants.py`, `backend/src/modules/music_source/sources/kugou/constants.py` (multiple `http://` API endpoints).
Impact: MITM/tampering risk for metadata/URLs; fragile behavior under strict network controls.
Action: migrate to HTTPS endpoints where available, add endpoint integrity checks and fallback strategy.

## Security and Configuration Debt
4. Insecure defaults and permissive cross-origin config.
Evidence: `backend/src/config.py` (`SECRET_KEY` dev fallback), `backend/src/__init__.py` (`cors.init_app(app)` with default permissive behavior), `backend/.env` (`DEBUG=true`).
Impact: weak session/signing security and accidental exposure in non-dev deployments.
Action: fail fast on missing secure env in production; explicitly restrict `CORS` origins/methods/headers.

5. No migration framework; schema is created dynamically at startup.
Evidence: `backend/src/__init__.py` (`db.create_all()` on app startup), absence of migration config in `backend/`.
Impact: schema drift, non-reproducible deployments, unsafe production upgrades/rollbacks.
Action: adopt Alembic/Flask-Migrate, remove runtime schema creation from request-serving startup path.

6. Runtime/local state lives inside repo paths.
Evidence: `backend/data/music.db`, `backend/src/__pycache__/...`, `frontend/node_modules/...`, `.omc/...`.
Impact: accidental commits, bloated repo/worktree, inconsistent environments.
Action: add root-level ignore policy and clean tracked artifacts from VCS history where applicable.

## Performance and Scalability Risks
7. Local music scanner performs per-file DB commits.
Evidence: `backend/src/modules/local_music/service.py` (`MusicScannerService.scan_folder` loops files and calls `LocalMusicService.create_music`), `backend/src/modules/local_music/service.py` (`create_music` commits each insert).
Impact: O(N) transaction overhead, slow scans on large libraries, higher lock contention.
Action: batch insert with periodic commits, defer metadata writes, add scan job progress persistence.

8. Async work is bridged in sync routes with repeated loop/executor creation.
Evidence: `backend/src/modules/music_source/routes.py` (`asyncio.run` + temporary `ThreadPoolExecutor` in request path), `backend/src/modules/music_source/routes.py` (`loop.run_until_complete` in route handler).
Impact: request latency spikes, event-loop fragility, poor throughput under concurrency.
Action: move async provider calls to dedicated worker/service or adopt consistent async web stack.

9. Intended cache paths are stubbed, creating repeated upstream calls.
Evidence: `backend/src/modules/music_source/manager.py` (`_get_cached_search_results` TODO returns `None`), `backend/src/modules/music_source/manager.py` (`_cache_search_results` TODO/pass).
Impact: avoidable external calls and degraded response times.
Action: implement cache lookup/write with TTL and invalidation metrics.

## Reliability / Maintainability Debt
10. Broad exception swallowing and print-based diagnostics reduce observability.
Evidence: `backend/src/modules/music_source/routes.py` (`print(...)`, `traceback.print_exc()`), `backend/src/modules/music_source/manager.py` (`except Exception: ... continue/pass`), `backend/src/modules/local_music/service.py` (`except Exception: error_files += 1; continue`).
Impact: hidden failures, hard debugging, noisy/non-structured logs.
Action: standardized structured logging + error taxonomy; never swallow exceptions without telemetry.

11. Frontend API layer is duplicated and inconsistent.
Evidence: `frontend/src/api/index.ts` and `frontend/src/api/request.ts` are both active clients; modules split between them (`frontend/src/api/auth.ts` vs `frontend/src/api/player.ts`).
Impact: inconsistent timeout/auth/error behavior and hard-to-debug request differences.
Action: consolidate to one HTTP client abstraction and one token strategy.

12. Frontend API contract drift versus backend routes.
Evidence: `frontend/src/api/musicSource/music.ts` calls endpoints such as `/music-sources/songs/detail/batch`, `/music-sources/play-url/batch`, `/music-sources/play-url/{source}/{song}`, `/music-sources/lyrics/{source}/{song}/plain`; backend route definitions in `backend/src/modules/music_source/routes.py` do not expose these exact endpoints.
Impact: latent runtime 404s and dead integration paths.
Action: generate typed client from backend OpenAPI/route schema; add contract tests.

13. Redirect/error handling assumes nonexistent routes.
Evidence: `frontend/src/api/request.ts` and `frontend/src/api/index.ts` redirect to `/login`; router in `frontend/src/router/index.ts` has no `/login` route.
Impact: 401 handling may bounce users to broken route.
Action: add auth route/guard or remove redirect logic until auth is implemented.

14. Significant incomplete feature wiring remains in user-facing flows.
Evidence: `frontend/src/views/music-search/index.vue` (play/favorite/download/share/seek TODOs), `frontend/src/components/Player/GlobalPlayer.vue` (lyrics TODO, empty URL fallback), `backend/src/modules/music_source/manager.py` (enabled-source filtering TODO).
Impact: UI appears complete but behavior is partial; increased regression risk during integration.
Action: track TODOs as explicit backlog issues with owner/priority and acceptance criteria.

## Repo-Level Fragility
15. Multi-repo nesting in a single workspace increases operational confusion.
Evidence: `./algorithmic_annotation_backen/.git`, `./algorithmic_annotation_web/.git`, `./lx-music-desktop/.git` under root repo.
Impact: accidental commits/omissions, tooling ambiguity, CI scope drift.
Action: formalize monorepo vs submodule strategy and document authoritative build/test boundaries.
