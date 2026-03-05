# Repository Guidelines

## Project Structure & Module Organization
- `src-tauri/` is the Tauri v2 shell (Rust) — spawns and manages the Python sidecar, exposes IPC commands.
- `src/` holds the Flask API; `api/`, `services/`, `models/` encapsulate device discovery and location spoof workflows.
- `src-ui/` is the Vite + React client; components map to sidebar, map, and control panes, with shared state in `context/` and `hooks/`.
- Build artifacts live in `build/` (Python binaries) and `src-tauri/target/` (Tauri outputs).

## Build, Test, and Development Commands
- `pnpm tauri dev` - Start development mode (Vite + Tauri + Python sidecar)
- `pnpm tauri build` - Build complete app for distribution (.app/.dmg)
- `pnpm vitest --run` - Run tests once (CI parity)
- `pnpm vitest` - Run tests in watch mode

## Release Process
- Version source of truth is `package.json`. The release pipeline syncs it to `tauri.conf.json` and `Cargo.toml`.
- To release: `pnpm release:patch`, `pnpm release:minor`, or `pnpm release:major`. This bumps the version, commits, and pushes. GitHub Actions detects the version change and builds a `.dmg`, creates a git tag, and publishes a GitHub Release.
- The pipeline runs on `macos-latest` (Apple Silicon only) via `.github/workflows/release.yml`.
- The app is GPL v3 licensed.

## Coding Style & Naming Conventions
- Python follows PEP 8 with four-space indentation and module-level logging (`src/app.py`); model schemas belong in `src/models` using `pydantic`.
- JavaScript/JSX stays in ES module syntax with `const` bindings, `PascalCase` components (`components/MapView.jsx`), and `camelCase` utilities.
- Tailwind drives styling; keep shared tokens in `tailwind.config.js` or `App.css` and reuse existing utility classes before adding new CSS.

## Testing Guidelines
- UI tests use Vitest + Testing Library; run `pnpm vitest --run` for CI parity or `pnpm vitest` during development.
- Store specs beside components (`components/Sidebar.test.jsx`) or in `src-ui/__tests__/`, mocking socket traffic with helpers from `src-ui/utils`.
- The Python layer has no suite yet; mirror the `src/` layout under `src/tests/` and start with `pytest` if you contribute backend coverage.

## Commit & Pull Request Guidelines
- Write descriptive, sentence-style commit subjects that capture scope and impact; keep unrelated changes out of the same commit.
- PRs must describe backend vs. UI changes, list manual test steps, and include screenshots whenever the UI shifts.
- Verify `pnpm tauri dev` succeeds before requesting review and flag platform-specific requirements in the PR body.

## Configuration & Security Tips
- Configuration comes from `.env`; defaults expose `PORT=54323` and limited CORS origins — extend `Config` instead of hardcoding.
- Do not commit device credentials or compiled binaries from `build/python/mirage-backend`; document new secrets in `.env.example`.
- When debugging USB access, only elevate privileges temporarily and redact serial numbers from shared logs.
