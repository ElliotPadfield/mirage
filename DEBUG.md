# Debugging Guide

## Enabling Debug Mode

### For Packaged App (.app bundle)

Launch from the terminal with debug enabled:

```bash
MIRAGE_DEBUG=1 /Applications/Mirage.app/Contents/MacOS/Mirage
```

### For Development Mode

Debug mode is automatically enabled. You can also explicitly set:

```bash
MIRAGE_DEBUG=1 pnpm tauri dev
```

## Viewing Logs

### Terminal Output

When debug mode is enabled, you'll see:

- **Python Backend Startup**: Paths, command, arguments, configuration
- **Python Process Output**: stdout/stderr from the Flask backend
- **Server Health Checks**: Connection attempts to the Python server
- **Error Details**: Full error messages and stack traces

### WebView DevTools

Open with `Cmd+Option+I` or via the menu.

### Python Backend Logs

Look for these prefixes in the terminal:
- `[Python stdout]` - Standard output
- `[Python stderr]` - Error output
- `[Python]` - Process status messages

## Common Issues

### Python Backend Not Starting

1. Enable debug mode (see above)
2. Check the terminal for:
   - Executable path and permissions
   - Port conflicts
   - Process errors

3. Try manually running the backend:
   ```bash
   ./build/python/mirage-backend --port 54323 --debug
   ```

### Server Health Check Failing

If you see `Waiting for server...` repeatedly:

```bash
# Check if the process is running
ps aux | grep mirage-backend

# Check for port conflicts
lsof -i :54323
```

### Permission Issues

```bash
# Check executable permissions
ls -la build/python/mirage-backend

# Fix if needed
chmod +x build/python/mirage-backend
```

## Debug Output Examples

### Successful Startup

```
============================================================
Python Backend Startup Debug Info
============================================================
Command: /path/to/mirage-backend
Args: --port 54323 --debug
Port: 54323
Base URL: http://localhost:54323
============================================================
[Python stdout] Starting Mirage v3.0.0
[Python stdout] Running on 0.0.0.0:54323
Server is ready!
```

### Failed Startup

```
============================================================
Failed to start Python server
============================================================
Error: Python executable not found at: /path/to/mirage-backend
```
