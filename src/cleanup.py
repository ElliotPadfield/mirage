"""
Centralized cleanup for tunnel interfaces and system daemons.

Handles graceful shutdown of pymobiledevice3 tunnels, removal of orphaned
utun interfaces, and resumption of the macOS remoted daemon.
"""

import atexit
import logging
import os
import platform
import signal
import subprocess
import sys
import threading
import time

logger = logging.getLogger(__name__)

# Track utun interfaces we've created so we can clean them up
_our_utun_interfaces = set()
_utun_lock = threading.Lock()
_cleanup_done = False
_cleanup_lock = threading.Lock()


def track_utun_interface(name):
    """Register a utun interface as ours so cleanup knows to remove it."""
    with _utun_lock:
        _our_utun_interfaces.add(name)
        logger.info(f"Tracking utun interface: {name}")


def untrack_utun_interface(name):
    """Remove a utun interface from tracking (it was cleaned up normally)."""
    with _utun_lock:
        _our_utun_interfaces.discard(name)
        logger.debug(f"Untracked utun interface: {name}")


def _get_active_utun_interfaces():
    """Get list of currently active utun interfaces on the system."""
    try:
        out = subprocess.check_output(["ifconfig", "-l"], text=True, timeout=5)
        return [iface for iface in out.strip().split() if iface.startswith("utun")]
    except Exception:
        return []


def _destroy_utun_interface(name):
    """Bring down and destroy a utun interface."""
    try:
        subprocess.run(
            ["ifconfig", name, "down"],
            capture_output=True, timeout=5
        )
        # On macOS, closing the socket that created the utun destroys it.
        # If the socket is leaked (process killed), the interface persists.
        # We can't destroy it directly, but we can remove its addresses
        # to prevent DNS routing issues.
        subprocess.run(
            ["ifconfig", name, "inet6", "delete"],
            capture_output=True, timeout=5
        )
        logger.info(f"Cleaned up utun interface: {name}")
    except Exception as e:
        logger.warning(f"Failed to clean up {name}: {e}")


def _resume_remoted():
    """Ensure the macOS remoted daemon is running (not suspended)."""
    if platform.system() != "Darwin":
        return

    try:
        import psutil
    except ImportError:
        logger.debug("psutil not available, skipping remoted check")
        return

    try:
        for proc in psutil.process_iter():
            if proc.pid == 0:
                continue
            try:
                if proc.exe() == "/usr/libexec/remoted":
                    if proc.status() == "stopped":
                        logger.warning("remoted is suspended, resuming it")
                        proc.resume()
                        logger.info("remoted resumed successfully")
                    return
            except (psutil.ZombieProcess, psutil.NoSuchProcess, psutil.AccessDenied):
                continue
    except Exception as e:
        logger.warning(f"Error checking/resuming remoted: {e}")


def _signal_tunnel_threads():
    """Signal all tunnel threads to terminate gracefully."""
    # Import here to avoid circular imports
    try:
        from src.api import location as loc_module
        loc_module.terminate_tunnel_thread = True
        loc_module.stop_location_thread()
    except Exception as e:
        logger.debug(f"Could not signal location tunnel: {e}")

    try:
        from src.api import devices as dev_module
        dev_module.terminate_tunnel_thread = True
    except Exception as e:
        logger.debug(f"Could not signal devices tunnel: {e}")


def cleanup():
    """Run full cleanup. Safe to call multiple times."""
    global _cleanup_done
    with _cleanup_lock:
        if _cleanup_done:
            return
        _cleanup_done = True

    logger.info("Running cleanup...")

    # 1. Signal tunnel threads to stop (triggers async with __aexit__ -> tun.close())
    _signal_tunnel_threads()

    # 2. Give tunnel threads time to tear down gracefully
    time.sleep(2)

    # 3. Clean up any orphaned utun interfaces we created
    with _utun_lock:
        orphaned = set(_our_utun_interfaces)

    active = _get_active_utun_interfaces()
    for iface in orphaned:
        if iface in active:
            logger.warning(f"Orphaned utun interface found: {iface}")
            _destroy_utun_interface(iface)

    # 4. Ensure remoted is not left suspended
    _resume_remoted()

    logger.info("Cleanup complete")


def startup_cleanup():
    """Clean up leftover state from a previous crash.

    Called once at process start before the Flask server begins.
    """
    if platform.system() != "Darwin":
        return

    logger.info("Running startup cleanup...")
    _resume_remoted()
    logger.info("Startup cleanup complete")


def _signal_handler(signum, frame):
    """Handle SIGTERM/SIGINT for graceful shutdown."""
    sig_name = signal.Signals(signum).name
    logger.info(f"Received {sig_name}, shutting down gracefully...")
    cleanup()
    sys.exit(0)


def register_cleanup_handlers():
    """Register signal handlers and atexit for cleanup."""
    signal.signal(signal.SIGTERM, _signal_handler)
    signal.signal(signal.SIGINT, _signal_handler)
    atexit.register(cleanup)
    logger.info("Cleanup handlers registered")
