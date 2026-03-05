# Development Guide

## Quick Start

```bash
pnpm install
pnpm tauri dev
```

This starts Vite (port 5173), the Tauri shell, and the Python sidecar (port 54323) together.

## Commands

| Command | Description |
|---------|-------------|
| `pnpm tauri dev` | Start development mode |
| `pnpm tauri build` | Build .app/.dmg for distribution |
| `pnpm vite preview` | Preview production frontend build |
| `pnpm vitest` | Run tests in watch mode |
| `pnpm vitest --run` | Run tests once (CI mode) |

## Python Backend

The Python sidecar is built with PyInstaller into a single executable at `src-tauri/binaries/mirage-backend-aarch64-apple-darwin`.

### Rebuilding the sidecar

```bash
python3 build-python-fast.py
```

The build system caches results and only rebuilds when source files change. To force a rebuild, delete `build/python/.build_cache`.

### Dependencies

```bash
pip install -r requirements.txt
```

## Ports

- **Frontend**: http://localhost:5173
- **Backend**: http://localhost:54323

## Troubleshooting

### Python backend not starting
- Check if `build/python/mirage-backend` exists
- Force rebuild: `rm -rf build/python/.build_cache && python3 build-python-fast.py`
- Check dependencies: `pip install -r requirements.txt`

### Port conflicts
- Kill existing processes: `pkill -f mirage-backend`
- Check ports: `lsof -i :54323`
