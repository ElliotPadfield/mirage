#!/bin/bash
set -euo pipefail

cd "$(dirname "$0")"

# Ensure cargo is in PATH for Tauri CLI
[ -f "$HOME/.cargo/env" ] && source "$HOME/.cargo/env"
export PATH="$HOME/.cargo/bin:$PATH"

# ── Colours ──────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

step() { echo -e "\n${BLUE}▸${NC} $1"; }
ok()   { echo -e "  ${GREEN}✓${NC} $1"; }
warn() { echo -e "  ${YELLOW}⚠${NC} $1"; }
fail() { echo -e "  ${RED}✗${NC} $1"; exit 1; }

cleanup() {
    echo ""
    step "Cleaning up"
    # Graceful shutdown: SIGTERM first, wait, then SIGKILL
    PIDS=$(lsof -ti:54323 2>/dev/null || true)
    if [ -n "$PIDS" ]; then
        echo "$PIDS" | xargs sudo kill -TERM 2>/dev/null || true
        # Wait up to 5 seconds for graceful exit
        for i in $(seq 1 10); do
            if ! lsof -ti:54323 >/dev/null 2>&1; then
                ok "Sidecar stopped gracefully"
                break
            fi
            if [ "$i" -eq 10 ]; then
                warn "Sidecar did not exit in time, force killing"
                lsof -ti:54323 2>/dev/null | xargs sudo kill -9 2>/dev/null || true
            fi
            sleep 0.5
        done
    else
        ok "Nothing to clean up"
    fi

    # Clean up orphaned utun interfaces with pymobiledevice3 tunnel addresses
    for iface in $(ifconfig -l 2>/dev/null); do
        case "$iface" in utun*)
            if ifconfig "$iface" 2>/dev/null | grep -q 'inet6 fd'; then
                warn "Cleaning orphaned tunnel interface: $iface"
                sudo ifconfig "$iface" down 2>/dev/null || true
            fi
        ;; esac
    done

    # Resume remoted if suspended
    REMOTED_PID=$(pgrep -x remoted 2>/dev/null || true)
    if [ -n "$REMOTED_PID" ]; then
        REMOTED_STATE=$(ps -o stat= -p "$REMOTED_PID" 2>/dev/null || true)
        case "$REMOTED_STATE" in
            *T*)
                warn "Resuming suspended remoted daemon"
                sudo kill -CONT "$REMOTED_PID" 2>/dev/null || true
                ok "remoted resumed"
                ;;
        esac
    fi
}
trap cleanup EXIT INT TERM

# ── 1. Check prerequisites ──────────────────────────────
step "Checking prerequisites"

command -v python3 >/dev/null 2>&1 || fail "python3 not found"
ok "python3 found"

if command -v cargo >/dev/null 2>&1; then
    ok "cargo found"
elif [ -f "$HOME/.cargo/env" ]; then
    source "$HOME/.cargo/env"
    ok "cargo found (sourced from ~/.cargo/env)"
else
    fail "Rust/cargo not found. Install from https://rustup.rs"
fi

command -v pnpm >/dev/null 2>&1 || fail "pnpm not found"
ok "pnpm found"

# ── 2. Install JS dependencies if needed ────────────────
if [ ! -d "node_modules" ]; then
    step "Installing JS dependencies"
    pnpm install
    ok "Done"
fi

# ── 3. Install Python dependencies if needed ────────────
step "Checking Python dependencies"
python3 -c "import flask; import pymobiledevice3" 2>/dev/null || {
    warn "Installing Python dependencies..."
    pip3 install -r requirements.txt
}
python3 -c "import PyInstaller" 2>/dev/null || {
    warn "Installing PyInstaller..."
    pip3 install pyinstaller
}
ok "Python deps ready"

# ── 4. Fix root-owned build artifacts (from prior sudo) ─
if find build/python -user root -print -quit 2>/dev/null | grep -q .; then
    step "Fixing root-owned build artifacts (will prompt for admin password)"
    osascript -e "do shell script \"chown -R $(whoami):staff $(pwd)/build/python\" with administrator privileges"
    ok "Ownership fixed"
fi

# ── 5. Build Python sidecar ─────────────────────────────
step "Building Python sidecar"

SIDECAR_SRC_HASH=$(find src -name '*.py' -exec md5 -q {} \; 2>/dev/null | md5 -q)
SIDECAR_BIN="build/python/mirage-backend"
CACHE_FILE="build/python/.build_hash"

if [ -f "$SIDECAR_BIN" ] && [ -f "$CACHE_FILE" ] && [ "$(cat "$CACHE_FILE")" = "$SIDECAR_SRC_HASH" ]; then
    ok "Sidecar up to date, skipping build"
else
    python3 -m PyInstaller \
        --onefile \
        --name mirage-backend \
        --distpath build/python \
        --workpath build/python/work \
        --specpath build/python/spec \
        --noconfirm \
        --exclude-module tkinter \
        --exclude-module matplotlib \
        --exclude-module scipy \
        --exclude-module pandas.plotting \
        --exclude-module jupyter \
        --exclude-module notebook \
        --strip \
        --optimize 2 \
        src/main.py

    echo "$SIDECAR_SRC_HASH" > "$CACHE_FILE"
    ok "Sidecar built: $SIDECAR_BIN"
fi

# ── 6. Copy sidecar to Tauri binaries dir ────────────────
step "Placing sidecar for Tauri"

ARCH=$(uname -m)
case "$ARCH" in
    arm64)  TRIPLE="aarch64-apple-darwin" ;;
    x86_64) TRIPLE="x86_64-apple-darwin" ;;
    *)      fail "Unknown architecture: $ARCH" ;;
esac

SIDECAR_TARGET="src-tauri/binaries/mirage-backend-${TRIPLE}"
mkdir -p src-tauri/binaries
cp "$SIDECAR_BIN" "$SIDECAR_TARGET"
chmod +x "$SIDECAR_TARGET"
ok "Copied to $SIDECAR_TARGET"

# ── 7. Start sidecar with sudo (needed for iOS tunnels) ──
step "Starting Python sidecar with sudo (needed for iOS 17+ tunnels)"
echo -e "  ${YELLOW}You may be prompted for your password${NC}"

# Kill anything already on the port
lsof -ti:54323 2>/dev/null | xargs kill -9 2>/dev/null || true
sleep 0.5

# Start sidecar as root in background, redirect output so we can see errors
sudo "$PWD/$SIDECAR_TARGET" --port 54323 --host 127.0.0.1 --electron > /tmp/mirage-sidecar.log 2>&1 &

# Wait for health check (sidecar takes ~5s cold start)
for i in $(seq 1 20); do
    if curl -sf http://127.0.0.1:54323/health >/dev/null 2>&1; then
        HEALTH=$(curl -sf http://127.0.0.1:54323/health)
        ok "Sidecar running with root privileges (attempt $i): $HEALTH"
        break
    fi
    if [ "$i" -eq 20 ]; then
        warn "Sidecar may still be starting — check /tmp/mirage-sidecar.log"
        cat /tmp/mirage-sidecar.log 2>/dev/null | tail -5
    fi
    sleep 1
done

# ── 8. Launch Tauri dev (sidecar already running) ────────
step "Launching Tauri dev server"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  Mirage v3.0.0 — Tauri + React + Python${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Tell Tauri not to spawn its own sidecar — we already started one with sudo
export MIRAGE_SKIP_SIDECAR=1
pnpm tauri dev
