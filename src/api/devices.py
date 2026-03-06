from flask import Blueprint, jsonify, request, current_app
from flask_cors import cross_origin
import logging
import sys
import time
import asyncio
import threading
from ..services.device_service import DeviceService
from ..models.device import ConnectionType
from ..utils.helpers import is_running_as_admin, get_platform_name

from pymobiledevice3.lockdown import create_using_usbmux
from pymobiledevice3.remote.tunnel_service import CoreDeviceTunnelProxy, create_core_device_tunnel_service_using_rsd
from pymobiledevice3.remote.utils import stop_remoted_if_required, resume_remoted_if_required, get_rsds
from ..cleanup import track_utun_interface, untrack_utun_interface

logger = logging.getLogger(__name__)


def _track_tunnel_result(tunnel_result):
    """Extract and track the utun interface name from a tunnel result."""
    name = None
    if hasattr(tunnel_result, 'interface') and tunnel_result.interface:
        name = tunnel_result.interface
    elif hasattr(tunnel_result, 'tunnel') and hasattr(tunnel_result.tunnel, 'tun') and tunnel_result.tunnel.tun:
        name = tunnel_result.tunnel.tun.name
    if name:
        track_utun_interface(name)
    return name


def _untrack_tunnel_result(tunnel_result):
    """Untrack the utun interface after clean teardown."""
    name = None
    if hasattr(tunnel_result, 'interface') and tunnel_result.interface:
        name = tunnel_result.interface
    elif hasattr(tunnel_result, 'tunnel') and hasattr(tunnel_result.tunnel, 'tun') and tunnel_result.tunnel.tun:
        name = tunnel_result.tunnel.tun.name
    if name:
        untrack_utun_interface(name)


devices_bp = Blueprint('devices', __name__)
device_service = DeviceService()

# Module-level tunnel state
terminate_tunnel_thread = False
rsd_host = None
rsd_port = None


def _is_major_version_17_or_greater(version_string):
    """Check if the major version is 17 or greater."""
    try:
        major_version = int(version_string.split('.')[0])
        return major_version >= 17
    except (ValueError, IndexError):
        return False


def _version_check(version_string):
    """Check if iOS version is between 17.0 and 17.3.x (needs QUIC tunnel)."""
    try:
        version_parts = version_string.split('.')
        major_version = int(version_parts[0])
        minor_version = int(version_parts[1]) if len(version_parts) > 1 else 0

        if major_version == 17 and 0 <= minor_version <= 3:
            return True
        else:
            return False
    except (ValueError, IndexError):
        return False


def _check_rsd_data():
    """Poll for rsd_host/rsd_port to become available (up to 30 seconds)."""
    global rsd_host, rsd_port
    max_attempts = 30
    attempts = 0
    while attempts < max_attempts:
        if rsd_host is not None and rsd_port is not None:
            return True
        time.sleep(1)
        attempts += 1
    return False


def _get_devices_with_retry(max_attempts=10):
    """Get USB RSD devices with retry logic."""
    for attempt in range(1, max_attempts + 1):
        try:
            devices = asyncio.run(get_rsds())
            if devices:
                return devices
            else:
                logger.warning(f"Attempt {attempt}: No USB RSD devices found")
        except Exception as e:
            logger.warning(f"Attempt {attempt}: Error occurred - {e}")
        time.sleep(1)
    raise RuntimeError("No USB RSD devices found after multiple attempts")


# --- QUIC tunnel (iOS 17.0 - 17.3.x) ---

async def _start_quic_tunnel(service_provider):
    """Start a QUIC tunnel for iOS 17.0-17.3.x devices."""
    global terminate_tunnel_thread, rsd_host, rsd_port

    logger.warning("Start USB QUIC tunnel")
    stop_remoted_if_required()

    service = await create_core_device_tunnel_service_using_rsd(service_provider, autopair=True)

    async with service.start_quic_tunnel() as tunnel_result:
        resume_remoted_if_required()
        _track_tunnel_result(tunnel_result)

        logger.info(f"QUIC Address: {tunnel_result.address}")
        logger.info(f"QUIC Port: {tunnel_result.port}")
        rsd_host = tunnel_result.address
        rsd_port = str(tunnel_result.port)

        while True:
            if terminate_tunnel_thread:
                return
            await asyncio.sleep(0.5)

    _untrack_tunnel_result(tunnel_result)


def _run_quic_tunnel(service_provider):
    """Thread target for QUIC tunnel."""
    try:
        asyncio.run(_start_quic_tunnel(service_provider))
    except Exception as e:
        logger.error(f"QUIC tunnel thread error: {e}")


def _start_quic_tunnel_thread(service_provider):
    """Start the QUIC tunnel in a background thread."""
    global terminate_tunnel_thread
    terminate_tunnel_thread = False
    thread = threading.Thread(target=_run_quic_tunnel, args=(service_provider,), daemon=True)
    thread.start()


# --- TCP tunnel (iOS 17.4+) ---

async def _start_tcp_tunnel(udid):
    """Start a TCP tunnel for iOS 17.4+ devices."""
    global terminate_tunnel_thread, rsd_host, rsd_port

    logger.warning("Start USB TCP tunnel")
    stop_remoted_if_required()

    lockdown = create_using_usbmux(udid, autopair=True)
    service = CoreDeviceTunnelProxy(lockdown)

    async with service.start_tcp_tunnel() as tunnel_result:
        resume_remoted_if_required()
        _track_tunnel_result(tunnel_result)

        logger.info(f"TCP Address: {tunnel_result.address}")
        logger.info(f"TCP Port: {tunnel_result.port}")
        rsd_host = tunnel_result.address
        rsd_port = str(tunnel_result.port)

        while True:
            if terminate_tunnel_thread:
                return
            await asyncio.sleep(0.5)

    _untrack_tunnel_result(tunnel_result)


def _run_tcp_tunnel(udid):
    """Thread target for TCP tunnel."""
    try:
        asyncio.run(_start_tcp_tunnel(udid))
    except Exception as e:
        logger.error(f"TCP tunnel thread error: {e}")


def _start_tcp_tunnel_thread(udid):
    """Start the TCP tunnel in a background thread."""
    global terminate_tunnel_thread
    terminate_tunnel_thread = False
    thread = threading.Thread(target=_run_tcp_tunnel, args=(udid,), daemon=True)
    thread.start()


# --- WiFi tunnels ---

async def _start_wifi_tcp_tunnel(udid):
    """Start a WiFi TCP tunnel (iOS 17.4+)."""
    global terminate_tunnel_thread, rsd_host, rsd_port

    logger.warning("Start WiFi TCP tunnel")
    stop_remoted_if_required()

    lockdown = create_using_usbmux(udid)
    service = CoreDeviceTunnelProxy(lockdown)

    async with service.start_tcp_tunnel() as tunnel_result:
        resume_remoted_if_required()
        _track_tunnel_result(tunnel_result)

        logger.info(f"WiFi TCP Address: {tunnel_result.address}")
        logger.info(f"WiFi TCP Port: {tunnel_result.port}")
        rsd_host = tunnel_result.address
        rsd_port = str(tunnel_result.port)

        while True:
            if terminate_tunnel_thread:
                return
            await asyncio.sleep(0.5)

    _untrack_tunnel_result(tunnel_result)


async def _start_wifi_quic_tunnel(udid, wifi_address, wifi_port):
    """Start a WiFi QUIC tunnel (iOS 17.0-17.3.x)."""
    global terminate_tunnel_thread, rsd_host, rsd_port

    logger.warning("Start WiFi QUIC tunnel")
    stop_remoted_if_required()

    from pymobiledevice3.remote.tunnel_service import create_core_device_tunnel_service_using_remotepairing
    service = await create_core_device_tunnel_service_using_remotepairing(udid, wifi_address, wifi_port)

    async with service.start_quic_tunnel() as tunnel_result:
        resume_remoted_if_required()
        _track_tunnel_result(tunnel_result)

        logger.info(f"WiFi QUIC Address: {tunnel_result.address}")
        logger.info(f"WiFi QUIC Port: {tunnel_result.port}")
        rsd_host = tunnel_result.address
        rsd_port = str(tunnel_result.port)

        while True:
            if terminate_tunnel_thread:
                return
            await asyncio.sleep(0.5)

    _untrack_tunnel_result(tunnel_result)


def _run_wifi_tunnel(udid, ios_version, wifi_address=None, wifi_port_val=None):
    """Thread target for WiFi tunnel - picks QUIC or TCP based on version."""
    try:
        if _version_check(ios_version):
            asyncio.run(_start_wifi_quic_tunnel(udid, wifi_address, wifi_port_val))
        else:
            asyncio.run(_start_wifi_tcp_tunnel(udid))
    except Exception as e:
        logger.error(f"WiFi tunnel thread error: {e}")


def _start_wifi_tunnel_thread(udid, ios_version, wifi_address=None, wifi_port_val=None):
    """Start the WiFi tunnel in a background thread."""
    global terminate_tunnel_thread
    terminate_tunnel_thread = False
    thread = threading.Thread(
        target=_run_wifi_tunnel,
        args=(udid, ios_version, wifi_address, wifi_port_val),
        daemon=True,
    )
    thread.start()


def _sync_tunnel_to_location_module(udid, connection_type):
    """Push rsd_host/rsd_port into the location module so /location/set can reuse the tunnel."""
    global rsd_host, rsd_port
    try:
        from . import location as location_module

        location_module.rsd_host = rsd_host
        location_module.rsd_port = rsd_port

        if not hasattr(location_module, 'rsd_data_map'):
            location_module.rsd_data_map = {}

        location_module.rsd_data_map.setdefault(udid, {})[connection_type] = {
            "host": rsd_host,
            "port": rsd_port,
        }
        logger.info(f"Synced tunnel data to location module: {rsd_host}:{rsd_port}")
    except Exception as e:
        logger.warning(f"Could not sync tunnel data to location module: {e}")


# ────────────────────────────── Routes ──────────────────────────────

@devices_bp.route('/devices', methods=['GET'])
@cross_origin()
def list_devices():
    """Get all connected devices"""
    try:
        # Warn if not running as admin, but allow the request to proceed
        # (similar to how main.py handles it - show warning but allow limited functionality)
        if get_platform_name() == 'MacOS' and not is_running_as_admin():
            logger.warning("Not running as admin - device access may be limited")
            # Continue to try to get devices, but may return empty or limited results

        # Run async function
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            devices = loop.run_until_complete(device_service.get_devices())
            return jsonify(devices)
        finally:
            loop.close()

    except Exception as e:
        logger.error(f"Error listing devices: {e}")
        return jsonify({'error': str(e)}), 500

@devices_bp.route('/devices/connect', methods=['POST'])
@cross_origin()
def connect_device():
    """Connect to a specific device"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400

        udid = data.get('udid')
        connection_type = data.get('connType')
        ios_version = data.get('ios_version')

        if not udid or not connection_type:
            return jsonify({'error': 'Missing required fields'}), 400

        # Check if we have cached connection data
        conn_type_enum = ConnectionType(connection_type)
        cached_data = device_service.get_connection_data(udid, conn_type_enum)

        if cached_data:
            logger.info(f"Using cached connection data for {udid}")
            return jsonify({'rsd_data': cached_data.to_dict()})

        # Handle different connection types
        if connection_type == 'USB':
            return handle_usb_connection(udid, ios_version)
        elif connection_type in ['Network', 'Manual', 'Wifi']:
            return handle_wifi_connection(udid, ios_version, connection_type)
        else:
            return jsonify({'error': 'Invalid connection type'}), 400

    except Exception as e:
        logger.error(f"Error connecting device: {e}")
        return jsonify({'error': str(e)}), 500


def handle_usb_connection(udid: str, ios_version: str):
    """Handle USB device connection by establishing a tunnel."""
    global rsd_host, rsd_port

    try:
        rsd_host = None
        rsd_port = None
        connection_type = 'USB'

        if ios_version is None:
            return jsonify({'error': 'No iOS version present'}), 400

        if _is_major_version_17_or_greater(ios_version):
            logger.info(f"iOS 17+ detected (version {ios_version})")

            if _version_check(ios_version):
                # iOS 17.0 - 17.3.x  -->  QUIC tunnel via get_rsds()
                logger.info("iOS 17.0-17.3.x: using QUIC tunnel via RSD")
                try:
                    devices = _get_devices_with_retry()
                    logger.info(f"RSD devices found: {devices}")
                    rsd = [d for d in devices if d.udid == udid]
                    if rsd:
                        rsd = rsd[0]
                    else:
                        return jsonify({'error': f'Device {udid} not found in RSD list'}), 404
                    _start_quic_tunnel_thread(rsd)
                except RuntimeError as e:
                    logger.error(f"Error finding devices: {e}")
                    return jsonify({'error': 'No Devices Found'}), 500
            else:
                # iOS 17.4+  -->  TCP tunnel via CoreDeviceTunnelProxy
                logger.info("iOS 17.4+: using TCP tunnel via CoreDeviceTunnelProxy")
                _start_tcp_tunnel_thread(udid)

            # Wait for tunnel data to become available
            if not _check_rsd_data():
                logger.error("RSD data is None after waiting - tunnel may not have been established")
            else:
                logger.info(f"RSD Data: {rsd_host}:{rsd_port}")

            rsd_data = (rsd_host, rsd_port)

            # Store in device_service cache
            device_service.store_connection_data(
                udid, ConnectionType.USB,
                rsd_host=rsd_host, rsd_port=rsd_port,
            )

            # Push tunnel state to location module
            _sync_tunnel_to_location_module(udid, connection_type)

            logger.info(f"USB connection established for {udid}")
            return jsonify({'rsd_data': rsd_data})

        else:
            # iOS < 17  -->  lockdown only, no tunnel needed
            logger.info(f"iOS < 17 ({ios_version}): using lockdown (no tunnel)")
            lockdown = create_using_usbmux(udid, autopair=True)
            logger.info(f"Lockdown client = {lockdown}")

            rsd_host = ios_version
            rsd_port = udid
            rsd_data = (rsd_host, rsd_port)

            device_service.store_connection_data(
                udid, ConnectionType.USB,
                rsd_host=rsd_host, rsd_port=rsd_port,
            )

            _sync_tunnel_to_location_module(udid, connection_type)

            return jsonify({'message': 'iOS version less than 17', 'rsd_data': rsd_data})

    except Exception as e:
        logger.error(f"Error handling USB connection: {e}")
        return jsonify({'error': str(e)}), 500


def handle_wifi_connection(udid: str, ios_version: str, connection_type: str = 'Wifi'):
    """Handle WiFi / Network device connection by establishing a tunnel."""
    global rsd_host, rsd_port

    try:
        rsd_host = None
        rsd_port = None

        if ios_version is None:
            return jsonify({'error': 'No iOS version present'}), 400

        if _is_major_version_17_or_greater(ios_version):
            logger.info(f"iOS 17+ WiFi detected (version {ios_version})")

            # For iOS 17.0-17.3.x, try to discover WiFi devices first
            if _version_check(ios_version):
                try:
                    from pymobiledevice3.remote.tunnel_service import get_remote_pairing_tunnel_services
                    devices = asyncio.run(get_remote_pairing_tunnel_services())
                    logger.info(f"WiFi devices discovered: {devices}")
                except RuntimeError as e:
                    logger.error(f"Error discovering WiFi devices: {e}")
                    return jsonify({'error': 'No WiFi Devices Found'}), 500

            # Start WiFi tunnel thread
            _start_wifi_tunnel_thread(udid, ios_version)

            # Wait for tunnel data
            if not _check_rsd_data():
                logger.error("RSD data is None after waiting - WiFi tunnel may not have been established")
            else:
                logger.info(f"WiFi RSD Data: {rsd_host}:{rsd_port}")

            rsd_data = (rsd_host, rsd_port)

            # Map connection_type string to ConnectionType enum
            conn_type_enum = ConnectionType(connection_type)

            device_service.store_connection_data(
                udid, conn_type_enum,
                rsd_host=rsd_host, rsd_port=rsd_port,
            )

            _sync_tunnel_to_location_module(udid, connection_type)

            logger.info(f"WiFi connection established for {udid}")
            return jsonify({'rsd_data': rsd_data})

        else:
            # iOS < 17 WiFi  -->  lockdown via usbmux with connection_type
            logger.info(f"iOS < 17 WiFi ({ios_version}): using lockdown")
            lockdown = create_using_usbmux(udid, connection_type=connection_type, autopair=True)
            logger.info(f"WiFi lockdown client = {lockdown}")

            rsd_host = ios_version
            rsd_port = udid
            rsd_data = (rsd_host, rsd_port)

            conn_type_enum = ConnectionType(connection_type)

            device_service.store_connection_data(
                udid, conn_type_enum,
                rsd_host=rsd_host, rsd_port=rsd_port,
            )

            _sync_tunnel_to_location_module(udid, connection_type)

            return jsonify({'message': 'iOS version less than 17', 'rsd_data': rsd_data})

    except Exception as e:
        logger.error(f"Error handling WiFi connection: {e}")
        return jsonify({'error': str(e)}), 500


@devices_bp.route('/devices/disconnect', methods=['POST'])
@cross_origin()
def disconnect_device():
    """Disconnect from a device"""
    global terminate_tunnel_thread
    try:
        data = request.get_json()
        udid = data.get('udid') if data else None

        if udid:
            # Signal any running tunnel threads to stop
            terminate_tunnel_thread = True
            device_service.clear_connection_data(udid)
            logger.info(f"Disconnected device: {udid}")

        return jsonify({'message': 'Device disconnected'})

    except Exception as e:
        logger.error(f"Error disconnecting device: {e}")
        return jsonify({'error': str(e)}), 500
