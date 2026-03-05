# Testing Patterns Map

## Current Testing Landscape
- Automated tests are concentrated in `backend/tests/`.
- No first-party `test_*.py`, `*.spec.*`, or `*.test.*` suites were found under `frontend/`, `algorithmic_annotation_web/`, `algorithmic_annotation_backen/`, or `lx-music-desktop/`.
- `lx-music-desktop/` and `algorithmic_annotation_web/` emphasize linting/typecheck scripts over runtime test scripts (`lx-music-desktop/package.json`, `algorithmic_annotation_web/package.json`).

## Primary Framework (`backend/`)
- Test runner is `pytest` configured in `backend/pytest.ini`.
- Python test dependencies are explicitly listed in `backend/requirements-test.txt` (pytest, pytest-asyncio, pytest-cov, pytest-flask, pytest-xdist, pytest-html).
- Discovery rules are standard pytest naming conventions (`python_files = test_*.py *_test.py`, etc.) in `backend/pytest.ini`.
- Default test path is `tests` (`backend/pytest.ini`).
- Coverage sections are configured in the same ini file under `[coverage:*]` (`backend/pytest.ini`).

## Test Suite Structure
- Shared fixtures are centralized in `backend/tests/conftest.py`.
- Core suites currently include:
  - `backend/tests/test_playlist.py`
  - `backend/tests/test_music_source.py`
  - `backend/tests/test_api_music.py`
- Documentation and summaries are maintained in `backend/tests/README.md`, `backend/tests/TEST_SUMMARY.md`, and `backend/tests/API_TESTS_SUMMARY.md`.
- There are helper scripts for bootstrapping test files (`backend/create_tests.py`, `backend/setup_tests.py`, and `--generate-tests` path in `backend/main.py`).

## Fixture and Isolation Patterns
- App fixture builds a Flask app + in-memory SQLite for isolated tests (`backend/tests/conftest.py`, `backend/src/config.py` `TestingConfig`).
- Database lifecycle is setup/teardown per fixture scope with `db.create_all()` and `db.drop_all()` (`backend/tests/conftest.py`).
- Data fixtures are entity-oriented and reusable (`test_user`, `test_playlist`, `test_favorite`, `test_play_history`) in `backend/tests/conftest.py`.
- Tests assert both model behavior (`to_dict`, defaults, repr) and service behavior (CRUD, permission rules, paging) in `backend/tests/test_playlist.py`.

## Mocking and External Boundary Handling
- `unittest.mock.patch` is the dominant mocking strategy (`backend/tests/test_music_source.py`, `backend/tests/test_api_music.py`).
- Mock targets focus on:
  - DB query/session internals (`src.modules.music_source.models.*`, `src.extensions.db.session`).
  - External source calls (`MusicSourceManager.search_with_fallback`, lyric/play-url helper functions).
- Async source methods are exercised with `pytest.mark.asyncio` in `backend/tests/test_music_source.py`.

## Coverage and Quality Intent
- Coverage tooling is wired (`pytest-cov`, `coverage`) with `source = src` and html output dir `htmlcov` in `backend/pytest.ini`.
- Project docs repeatedly state an 80%+ target (`backend/tests/test_playlist.py`, `backend/tests/TEST_SUMMARY.md`, `backend/tests/README.md`).
- Tests are organized by model/service/API layers, which aligns with backend module boundaries in `backend/src/modules/*`.

## Observed Gaps and Risks
- Marker definitions (`unit`, `integration`, `slow`, `async`, `api`) exist in `backend/pytest.ini`, but suites mostly do not apply those markers directly.
- Async tests use `@pytest.mark.asyncio`, while config defines `async`; this can cause selection mismatch for marker-based CI filters (`backend/pytest.ini`, `backend/tests/test_music_source.py`).
- Integration test data contracts appear partially drifted from current model fields (example: `enabled`/`config` usage in `backend/tests/test_api_music.py` vs `is_enabled`/`config_json` fields in `backend/src/modules/music_source/models.py`).
- Frontend and secondary backend subprojects currently lack executable automated test suites, so regression protection is backend-heavy.

## Practical Guidance for New Tests
- Add new backend tests under `backend/tests/` and reuse fixture patterns from `backend/tests/conftest.py`.
- Prefer service-level tests for business rules, plus thin API integration tests for endpoint contract verification.
- Use patching at clear boundaries (external APIs, manager facades, DB side effects) instead of patching deep implementation details where possible.
- If marker-based pipelines are required, standardize marker usage in test files and align marker names with `backend/pytest.ini`.
- For non-backend projects, establish at least smoke-level test entry points before adding broad feature work.
