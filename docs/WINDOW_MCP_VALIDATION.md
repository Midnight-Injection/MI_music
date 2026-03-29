# Window MCP Validation

This project uses `tauri-plugin-mcp-bridge` for desktop validation.

## Required Capability

The default app capability must include:

- `mcp-bridge:default`

This grants access to:

- window listing
- window info inspection
- IPC monitoring
- JS execution
- native screenshots

## Recommended Validation Flow

1. Launch the desktop app with `pnpm tauri dev`.
2. Connect an MCP client to the running Tauri MCP Bridge instance.
3. Run `node scripts/validate_window_resize.mjs` for the automated smoke check.
4. Verify the generated summary includes:
   - window info before and after each resize
   - document responsiveness after each resize
   - sidebar navigation still changes routes
   - search page controls remain clickable
5. Verify only the expected windows are present:
   - `main`
   - `lyrics`
6. Read the `main` window info before and after dragging to confirm position updates are stable.
7. Inject a small script into `main` to:
   - click a sidebar item
   - click a search action
   - verify the document still receives pointer events after dragging
8. Capture screenshots before and after the drag-and-click sequence.

## Suggested Assertions

- Dragging the titlebar does not jitter.
- After dragging, sidebar and page controls remain clickable.
- Resize handles work on all four edges and four corners.
- Maximized mode disables resize handles visually and functionally.
