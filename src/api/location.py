from flask import Blueprint, jsonify, request
from flask_cors import cross_origin
import logging
import asyncio
import threading
import time
import traceback
from pymobiledevice3.lockdown import create_using_usbmux
from pymobiledevice3.exceptions import DeviceHasPasscodeSetError, NoDeviceConnectedError
from pymobiledevice3.remote.utils import stop_remoted_if_required, resume_remoted_if_required, get_rsds
from pymobiledevice3.services.dvt.instruments.location_simulation import LocationSimulation
from pymobiledevice3.services.dvt.dvt_secure_socket_proxy import DvtSecureSocketProxyService
from pymobiledevice3.remote.remote_service_discovery import RemoteServiceDiscoveryService
from pymobiledevice3.remote.tunnel_service import (
    create_core_device_tunnel_service_using_rsd,
    CoreDeviceTunnelProxy,
)
from ..models.location import Location, LocationSimulationState

logger = logging.getLogger(__name__)

location_bp = Blueprint('location', __name__)

# ---------------------------------------------------------------------------
# Globals
# ---------------------------------------------------------------------------
rsd_host = None
rsd_port = None
rsd_data_map = {}  # Cache: {udid: {conn_type: {"host": ..., "port": ...}}}

# Location simulation state
location_state = LocationSimulationState()

# Tunnel thread management
terminate_tunnel_thread = False
tunnel_thread = None

# Location thread management
terminate_location_thread = False
location_thread = None

# iOS <17 lockdown reference (kept alive across set/stop)
active_lockdown = None


# ---------------------------------------------------------------------------
# Version helpers
# ---------------------------------------------------------------------------

def is_ios17_or_greater(version_string):
    """Check if the major version is 17 or greater."""
    try:
        return int(version_string.split('.')[0]) >= 17
    except (ValueError, IndexError):
        return False


def needs_quic_tunnel(version_string):
    """Return True for iOS 17.0-17.3.x which require QUIC tunnels.

    iOS 17.4+ uses TCP tunnels via CoreDeviceTunnelProxy.
    """
    try:
        parts = version_string.split('.')
        major = int(parts[0])
        minor = int(parts[1]) if len(parts) > 1 else 0
        return major == 17 and 0 <= minor <= 3
    except (ValueError, IndexError):
        return False


# ---------------------------------------------------------------------------
# Error formatting
# ---------------------------------------------------------------------------

def _format_ios17_error(error):
    """Provide user-friendly guidance for iOS 17+ location simulation errors."""
    message = str(error)
    if "InvalidService" in message or "MissingKey" in message:
        return ("Developer Mode appears to be disabled. Enable Developer Mode in "
                "Settings > Privacy & Security > Developer Mode on your iPhone and restart the device.")
    if "make_channel" in message:
        return ("The developer services channel could not be created. This usually means the device "
                "needs to be restarted after enabling Developer Mode.")
    if "Tunnel data not available" in message or "rsd_host" in message:
        return ("The tunnel to the device did not initialize. Please disconnect and reconnect your device, "
                "ensure the app has the necessary permissions, and try again.")
    if "Could not connect" in message or "Connection reset" in message:
        return ("The connection to the device dropped. Please reconnect the device and try again.")
    if "No route to host" in message:
        return ("Could not connect to tunnel. If you are not running as root/sudo, try running:\n\n"
                "  sudo pymobiledevice3 remote start-tunnel\n\n"
                "in a separate terminal, then try again.")
    return ("Location simulation is not available. Please ensure Developer Mode is enabled and restart the device "
            "if the issue persists.")


# ---------------------------------------------------------------------------
# Tunnel management – QUIC (iOS 17.0-17.3.x)
# ---------------------------------------------------------------------------

async def _start_quic_tunnel(service_provider):
    """Start a QUIC tunnel for iOS 17.0-17.3.x using an RSD service provider.

    Sets the global rsd_host / rsd_port and blocks until ``terminate_tunnel_thread``
    is set to ``True``.
    """
    global rsd_host, rsd_port, terminate_tunnel_thread

    stop_remoted_if_required()

    service = await create_core_device_tunnel_service_using_rsd(service_provider, autopair=True)

    async with service.start_quic_tunnel() as tunnel_result:
        resume_remoted_if_required()

        logger.info(f"QUIC Address: {tunnel_result.address}")
        logger.info(f"QUIC Port: {tunnel_result.port}")

        rsd_host = tunnel_result.address
        rsd_port = str(tunnel_result.port)

        while not terminate_tunnel_thread:
            await asyncio.sleep(0.5)


# ---------------------------------------------------------------------------
# Tunnel management – TCP (iOS 17.4+)
# ---------------------------------------------------------------------------

async def _start_tcp_tunnel(udid):
    """Start a TCP tunnel for iOS 17.4+ via ``CoreDeviceTunnelProxy``.

    Sets the global rsd_host / rsd_port and blocks until ``terminate_tunnel_thread``
    is set to ``True``.
    """
    global rsd_host, rsd_port, terminate_tunnel_thread

    stop_remoted_if_required()

    lockdown = create_using_usbmux(udid, autopair=True)
    service = CoreDeviceTunnelProxy(lockdown)

    async with service.start_tcp_tunnel() as tunnel_result:
        resume_remoted_if_required()

        logger.info(f"TCP Address: {tunnel_result.address}")
        logger.info(f"TCP Port: {tunnel_result.port}")

        rsd_host = tunnel_result.address
        rsd_port = str(tunnel_result.port)

        while not terminate_tunnel_thread:
            await asyncio.sleep(0.5)


# ---------------------------------------------------------------------------
# Tunnel thread helpers
# ---------------------------------------------------------------------------

def _run_tunnel_in_thread(coro):
    """Run an async tunnel coroutine inside ``asyncio.run``."""
    try:
        asyncio.run(coro)
    except Exception as e:
        logger.error(f"Tunnel thread error: {type(e).__name__}: {e}")
        logger.error(traceback.format_exc())


def start_tunnel_thread(udid, ios_version):
    """Start the appropriate tunnel (QUIC or TCP) in a background thread.

    Blocks until rsd_host/rsd_port are populated (up to 30 s).
    Returns True on success.
    """
    global tunnel_thread, terminate_tunnel_thread, rsd_host, rsd_port

    terminate_tunnel_thread = False
    rsd_host = None
    rsd_port = None

    if needs_quic_tunnel(ios_version):
        # QUIC path – need RSD service provider from get_rsds
        try:
            devices = asyncio.run(get_rsds())
            rsd = None
            for d in devices:
                if d.udid == udid:
                    rsd = d
                    break
            if rsd is None and devices:
                rsd = devices[0]
            if rsd is None:
                logger.error("No RSD devices found for QUIC tunnel")
                return False
            coro = _start_quic_tunnel(rsd)
        except Exception as e:
            logger.error(f"Failed to get RSD devices for QUIC tunnel: {e}")
            return False
    else:
        coro = _start_tcp_tunnel(udid)

    tunnel_thread = threading.Thread(target=_run_tunnel_in_thread, args=(coro,), daemon=True)
    tunnel_thread.start()

    if not check_rsd_data(timeout=30):
        logger.error("Tunnel did not produce rsd_host/rsd_port in time")
        return False

    return True


def stop_tunnel_thread():
    """Signal the tunnel thread to terminate."""
    global terminate_tunnel_thread, tunnel_thread, rsd_host, rsd_port

    terminate_tunnel_thread = True
    if tunnel_thread and tunnel_thread.is_alive():
        tunnel_thread.join(timeout=5)
    tunnel_thread = None


def check_rsd_data(timeout=30):
    """Poll until rsd_host and rsd_port are set, or *timeout* seconds elapse."""
    for _ in range(timeout):
        if rsd_host is not None and rsd_port is not None:
            return True
        time.sleep(1)
    return False


def check_existing_tunnel():
    """Check if there is already an external pymobiledevice3 tunnel running."""
    global rsd_host, rsd_port
    try:
        from pymobiledevice3.remote.common import get_tunnel_services
        tunnels = get_tunnel_services()
        if tunnels:
            tunnel = tunnels[0]
            rsd_host = tunnel.hostname
            rsd_port = tunnel.port
            logger.info(f"Found existing tunnel: {rsd_host}:{rsd_port}")
            return True
    except ImportError:
        logger.debug("get_tunnel_services not available in this pymobiledevice3 version")
    except Exception as e:
        logger.debug(f"No existing tunnel found: {e}")
    return False


# ---------------------------------------------------------------------------
# Location simulation
# ---------------------------------------------------------------------------

async def _location_simulation_loop(lat, lng, stop_event):
    """Connect to the device via RSD and keep location simulation alive.

    Works for iOS 17+ where rsd_host/rsd_port have been set by a tunnel.
    Blocks until *stop_event* is set.
    """
    if rsd_host is None or rsd_port is None:
        raise RuntimeError("Tunnel data not available for DVT services")

    # Small delay so routing is fully up
    await asyncio.sleep(1)

    port = int(rsd_port) if isinstance(rsd_port, str) else rsd_port

    max_retries = 3
    last_error = None

    for attempt in range(max_retries):
        try:
            logger.info(f"Connecting to RSD at {rsd_host}:{port} (attempt {attempt + 1}/{max_retries})")
            async with RemoteServiceDiscoveryService((rsd_host, port)) as sp_rsd:
                with DvtSecureSocketProxyService(sp_rsd) as dvt:
                    simulation = LocationSimulation(dvt)
                    try:
                        simulation.clear()
                    except Exception:
                        pass

                    simulation.set(lat, lng)
                    logger.info(f"Location set successfully: {lat}, {lng}")

                    # Keep connection alive until told to stop
                    while not stop_event.is_set():
                        await asyncio.sleep(0.5)

                    logger.info("Stop signal received – clearing location")
                    try:
                        simulation.clear()
                    except Exception as e:
                        logger.warning(f"Failed to clear location on stop: {e}")
                    return  # success
        except OSError as e:
            last_error = e
            logger.warning(f"Connection attempt {attempt + 1} failed: {e}")
            if attempt < max_retries - 1:
                await asyncio.sleep(2)
        except Exception as e:
            last_error = e
            logger.error(f"Unexpected error in location simulation: {e}")
            break

    raise last_error or RuntimeError("Failed to connect to device after retries")


def _location_simulation_loop_legacy(lat, lng, stop_event, lockdown_client):
    """Keep a DVT location simulation alive for iOS < 17.

    Runs synchronously (called inside a thread).  The DVT context is kept
    open for the lifetime of the simulation so the service reference remains
    valid.
    """
    try:
        with DvtSecureSocketProxyService(lockdown=lockdown_client) as dvt:
            simulation = LocationSimulation(dvt)
            try:
                simulation.clear()
            except Exception:
                pass
            simulation.set(lat, lng)
            logger.info(f"[legacy] Location set: {lat}, {lng}")

            while not stop_event.is_set():
                time.sleep(0.5)

            logger.info("[legacy] Stop signal received – clearing location")
            try:
                simulation.clear()
            except Exception as e:
                logger.warning(f"[legacy] Failed to clear location: {e}")
    except Exception as e:
        logger.error(f"[legacy] Location simulation error: {e}")
        raise


def start_location_thread(lat, lng, lockdown_client=None):
    """Start background location simulation.

    For iOS 17+ (lockdown_client is None) this uses the async RSD loop.
    For iOS < 17 (lockdown_client provided) this uses the legacy DVT path.
    """
    global location_thread, terminate_location_thread

    stop_location_thread()
    terminate_location_thread = False
    stop_event = threading.Event()

    if lockdown_client is not None:
        # iOS < 17 – synchronous DVT loop
        def _target():
            try:
                _location_simulation_loop_legacy(lat, lng, stop_event, lockdown_client)
            except Exception as e:
                logger.error(f"Legacy location thread error: {e}")

        location_thread = threading.Thread(target=_target, daemon=True, name="LocationSimLegacy")
    else:
        # iOS 17+ – async RSD loop
        error_holder = [None]

        def _target():
            try:
                asyncio.run(_location_simulation_loop(lat, lng, stop_event))
            except Exception as e:
                logger.error(f"Location thread error: {type(e).__name__}: {e}")
                error_holder[0] = e

        location_thread = threading.Thread(target=_target, daemon=True, name="LocationSim17")

    # Stash the stop_event on the thread so stop_location_thread can use it
    location_thread._stop_event = stop_event
    location_thread.start()

    # Give the simulation a moment to connect and set location
    time.sleep(3)

    if not location_thread.is_alive():
        raise RuntimeError("Location simulation thread exited unexpectedly")


def stop_location_thread():
    """Signal the location simulation thread to stop and wait for it."""
    global location_thread, terminate_location_thread

    terminate_location_thread = True

    if location_thread is not None:
        stop_event = getattr(location_thread, '_stop_event', None)
        if stop_event is not None:
            stop_event.set()
        if location_thread.is_alive():
            location_thread.join(timeout=5)
        location_thread = None


# ---------------------------------------------------------------------------
# Flask routes
# ---------------------------------------------------------------------------

@location_bp.route('/location/update', methods=['POST'])
@cross_origin()
def update_location():
    """Update the current location (does not push to device)."""
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400

        lat_value = data.get('lat')
        lng_value = data.get('lng')

        if lat_value is None or lng_value is None:
            return jsonify({'error': 'Missing latitude or longitude data'}), 400

        try:
            lat = float(lat_value)
            lng = float(lng_value)
        except (ValueError, TypeError) as e:
            logger.error(f"Invalid location data: {e}")
            return jsonify({'error': 'Invalid latitude or longitude format'}), 400

        if not (-90 <= lat <= 90) or not (-180 <= lng <= 180):
            return jsonify({'error': 'Invalid coordinates: latitude must be between -90 and 90, '
                                     'longitude must be between -180 and 180'}), 400

        location = Location(latitude=lat, longitude=lng)
        location_state.current_location = location

        logger.info(f"Location updated: {location}")
        return jsonify({'message': 'Location updated successfully'})

    except Exception as e:
        logger.error(f"Error updating location: {e}")
        return jsonify({'error': str(e)}), 500


@location_bp.route('/location/set', methods=['POST'])
@cross_origin()
def set_location():
    """Set location simulation on the connected device.

    Expected JSON body: ``{"udid": "...", "connType": "USB"}``
    The latitude/longitude come from the previously-stored ``location_state``.
    """
    global active_lockdown

    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400

        udid = data.get('udid')
        if not udid:
            return jsonify({'error': 'Device UDID required'}), 400

        if not location_state.current_location:
            return jsonify({'error': 'No location set'}), 400

        connection_type = data.get('connType', 'USB')

        # Stop any running simulation first
        stop_location_thread()

        lat = location_state.current_location.latitude
        lng = location_state.current_location.longitude

        # ----- Determine iOS version -----
        ios_version = '17.0'  # safe default
        try:
            temp_lockdown = create_using_usbmux(udid, autopair=True)
            ios_version = temp_lockdown.get_value('ProductVersion', '0.0') or '17.0'
            logger.info(f"Detected iOS version: {ios_version}")
        except Exception as ve:
            logger.warning(f"Could not get iOS version: {ve}, assuming 17+")

        if is_ios17_or_greater(ios_version):
            # ---- iOS 17+ ----
            logger.info(f"iOS 17+ detected ({ios_version}) – setting up tunnel + location")

            # Check cached tunnel data first
            cached = rsd_data_map.get(udid, {}).get(connection_type)
            if cached and cached.get('host') and cached.get('port'):
                global rsd_host, rsd_port
                rsd_host = cached['host']
                rsd_port = cached['port']
                logger.info(f"Reusing cached tunnel: {rsd_host}:{rsd_port}")
            else:
                # Check for an external tunnel (pymobiledevice3 remote start-tunnel)
                if not check_existing_tunnel():
                    # Create our own tunnel
                    if not start_tunnel_thread(udid, ios_version):
                        raise RuntimeError(
                            "Failed to establish tunnel. Make sure you are running with sudo / root "
                            "and Developer Mode is enabled on the device."
                        )
                # Cache the tunnel data
                if rsd_host is not None and rsd_port is not None:
                    rsd_data_map.setdefault(udid, {})[connection_type] = {
                        "host": rsd_host,
                        "port": rsd_port,
                    }
                    logger.info(f"Cached tunnel data: {rsd_data_map}")

            # Start persistent location simulation thread (iOS 17+ path)
            start_location_thread(lat, lng)

        else:
            # ---- iOS < 17 ----
            logger.info(f"iOS {ios_version} detected – using legacy DVT approach")
            lockdown = create_using_usbmux(udid, autopair=True)
            active_lockdown = lockdown

            # Cache for consistency
            rsd_data_map.setdefault(udid, {})[connection_type] = {
                "host": ios_version,
                "port": udid,
            }

            # Start persistent location simulation (legacy path keeps DVT open)
            start_location_thread(lat, lng, lockdown_client=lockdown)

        # Update state
        location_state.is_active = True
        location_state.udid = udid

        logger.info(f"Location simulation started for {udid}: {lat}, {lng}")
        return jsonify({
            'message': 'Location set successfully',
            'location': {
                'latitude': lat,
                'longitude': lng,
            }
        })

    except DeviceHasPasscodeSetError:
        return jsonify({'error': 'Device has passcode set. Please unlock device and try again.'}), 400
    except NoDeviceConnectedError:
        return jsonify({'error': 'No device connected. Please connect your iOS device.'}), 400
    except Exception as device_error:
        logger.error(f"Device connection error: {device_error}")
        logger.error(traceback.format_exc())
        guidance = _format_ios17_error(device_error)
        # Include the raw error so users can report it
        raw = f"{type(device_error).__name__}: {device_error}"
        return jsonify({'error': f"{guidance}\n\nDetails: {raw}"}), 500


@location_bp.route('/location/stop', methods=['POST'])
@cross_origin()
def stop_location():
    """Stop location simulation."""
    global active_lockdown

    try:
        # Stop the location simulation thread (works for both legacy and 17+ paths)
        stop_location_thread()

        # We do NOT stop the tunnel thread here – the tunnel stays alive so
        # subsequent /location/set calls can reuse it (matching original behaviour).

        # Update state
        location_state.is_active = False
        location_state.udid = None
        active_lockdown = None

        logger.info("Location simulation stopped")
        return jsonify({'message': 'Location cleared successfully'})

    except Exception as e:
        logger.error(f"Error stopping location: {e}")
        return jsonify({'error': str(e)}), 500


@location_bp.route('/location/status', methods=['GET'])
@cross_origin()
def get_location_status():
    """Get current location simulation status."""
    try:
        return jsonify(location_state.to_dict())
    except Exception as e:
        logger.error(f"Error getting location status: {e}")
        return jsonify({'error': str(e)}), 500
