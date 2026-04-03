# Auto Update

## Local signing files

The updater signing keypair for this project is stored locally under:

- `.local/signing/tauri-updater-private.key`
- `.local/signing/tauri-updater-public.key`

This directory is ignored by Git and must not be committed.

## Tauri updater config

The public key embedded in `src-tauri/tauri.conf.json` must match `.local/signing/tauri-updater-public.key`.

The updater endpoint is:

- `https://github.com/Midnight-Injection/MI_music/releases/latest/download/latest.json`

## GitHub repository secrets

Configure the following repository secrets in:

- `Settings` -> `Secrets and variables` -> `Actions` -> `Repository secrets`

Required secrets:

- `TAURI_SIGNING_PRIVATE_KEY`
  Paste the full file content of `.local/signing/tauri-updater-private.key`

- `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`
  Paste the private key password used when generating the key

Do not paste a file path. Do not paste the public key.

## Release flow

1. Update app version in `package.json` and `src-tauri/tauri.conf.json`.
2. Commit and push to GitHub.
3. Create and push a tag like `v0.1.1`.
4. GitHub Actions workflow `.github/workflows/release.yml` builds platform packages and publishes a draft release.
5. Publish the draft release. Once published, `latest.json` becomes available for in-app updates.

## Local verification

Example local macOS build using the repo-managed key:

```bash
export TAURI_SIGNING_PRIVATE_KEY_PATH="$PWD/.local/signing/tauri-updater-private.key"
export TAURI_SIGNING_PRIVATE_KEY_PASSWORD="your-password"
pnpm tauri build --bundles app --target aarch64-apple-darwin --no-sign
```

Expected updater artifacts are generated under `src-tauri/target/<target>/release/bundle/`.

## Cross-platform note

Full runtime verification of auto update requires each target OS:

- macOS: local build/runtime verification is possible on macOS
- Windows: verify through GitHub Actions on Windows runner or a Windows machine
- Linux: verify through GitHub Actions on Linux runner or a Linux machine

This repository currently includes a GitHub Actions release workflow for those platform builds.
