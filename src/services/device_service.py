import asyncio
import logging
import time
from typing import List, Dict, Optional, Any
from pymobiledevice3.usbmux import list_devices
from pymobiledevice3.lockdown import create_using_usbmux, create_using_tcp
from pymobiledevice3.remote.remote_service_discovery import RemoteServiceDiscoveryService
from pymobiledevice3.remote.utils import get_rsds
from pymobiledevice3.bonjour import DEFAULT_BONJOUR_TIMEOUT
from pymobiledevice3.exceptions import DeviceHasPasscodeSetError, NoDeviceConnectedError

from ..models.device import DeviceInfo, ConnectionType, ConnectionData
from ..utils.helpers import get_user_country
from ..config import Config

logger = logging.getLogger(__name__)

class DeviceService:
    """Service for managing iOS device connections"""
    
    def __init__(self):
        self.connected_devices: Dict[str, Dict[str, ConnectionData]] = {}
        self.timeout = DEFAULT_BONJOUR_TIMEOUT
    
    async def get_devices(self) -> Dict[str, Dict[str, List[DeviceInfo]]]:
        """Get all connected devices"""
        try:
            connected_devices = {}
            
            # Get USB devices
            usb_devices = list_devices()
            logger.info(f"Found {len(usb_devices)} USB devices")
            
            for device in usb_devices:
                udid = device.serial
                connection_type = device.connection_type
                
                try:
                    lockdown = create_using_usbmux(udid, connection_type=connection_type, autopair=True)
                    info = lockdown.short_info
                    
                    # Enable WiFi connections if not already enabled
                    wifi_connection_state = lockdown.enable_wifi_connections
                    if not wifi_connection_state:
                        logger.info("Enabling WiFi connections")
                        lockdown.enable_wifi_connections = True
                        wifi_connection_state = True
                    
                    # Add additional info
                    info['wifiState'] = wifi_connection_state
                    info['userLocale'] = get_user_country()
                    
                    device_info = DeviceInfo(
                        udid=udid,
                        name=info.get('DeviceName', 'Unknown'),
                        model=info.get('ProductType', 'Unknown'),
                        ios_version=info.get('ProductVersion', 'Unknown'),
                        connection_type=ConnectionType(connection_type),
                        wifi_state=wifi_connection_state,
                        user_locale=info.get('userLocale'),
                        is_connected=True
                    )
                    
                    if udid in connected_devices:
                        if connection_type in connected_devices[udid]:
                            connected_devices[udid][connection_type].append(device_info)
                        else:
                            connected_devices[udid][connection_type] = [device_info]
                    else:
                        connected_devices[udid] = {connection_type: [device_info]}
                        
                except Exception as e:
                    logger.error(f"Error processing device {udid}: {e}")
                    continue
            
            logger.info(f"Processed devices: {connected_devices}")
            
            # Convert DeviceInfo objects to dictionaries for JSON serialization
            serializable_devices = {}
            for udid, connections in connected_devices.items():
                serializable_devices[udid] = {}
                for connection_type, devices in connections.items():
                    serializable_devices[udid][connection_type] = [
                        device.to_dict() for device in devices
                    ]
            
            return serializable_devices
            
        except Exception as e:
            logger.error(f"Error getting devices: {e}")
            raise
    
    async def get_wifi_devices(self, udid: Optional[str] = None) -> List[Any]:
        """Get WiFi devices with retry logic"""
        from pymobiledevice3.remote.utils import get_remote_pairing_tunnel_services
        
        for attempt in range(1, Config.MAX_WIFI_RETRY_ATTEMPTS + 1):
            try:
                logger.info("Discovering WiFi devices...")
                devices = await get_remote_pairing_tunnel_services(self.timeout)
                
                if devices:
                    if udid:
                        for device in devices:
                            if device.remote_identifier == udid:
                                logger.info(f"Found target device: {udid}")
                                return device
                    return devices
                else:
                    logger.warning(f"Attempt {attempt}: No WiFi devices found")
            except Exception as e:
                logger.warning(f"Attempt {attempt}: Error - {e}")
            
            time.sleep(1)
        
        raise RuntimeError("No WiFi devices found after multiple attempts")
    
    async def get_usb_devices(self) -> List[Any]:
        """Get USB devices with retry logic"""
        for attempt in range(1, Config.MAX_DEVICE_RETRY_ATTEMPTS + 1):
            try:
                devices = await get_rsds(self.timeout)
                if devices:
                    return devices
                else:
                    logger.warning(f"Attempt {attempt}: No USB devices found")
            except Exception as e:
                logger.warning(f"Attempt {attempt}: Error - {e}")
            
            time.sleep(1)
        
        raise RuntimeError("No USB devices found after multiple attempts")
    
    def store_connection_data(self, udid: str, connection_type: ConnectionType, 
                           rsd_host: str, rsd_port: str, 
                           wifi_address: Optional[str] = None, 
                           wifi_port: Optional[int] = None):
        """Store connection data for a device"""
        connection_data = ConnectionData(
            udid=udid,
            connection_type=connection_type,
            rsd_host=rsd_host,
            rsd_port=rsd_port,
            wifi_address=wifi_address,
            wifi_port=wifi_port
        )
        
        if udid not in self.connected_devices:
            self.connected_devices[udid] = {}
        
        self.connected_devices[udid][connection_type.value] = connection_data
        logger.info(f"Stored connection data for {udid}: {connection_type.value}")
    
    def get_connection_data(self, udid: str, connection_type: ConnectionType) -> Optional[ConnectionData]:
        """Get stored connection data for a device"""
        if udid in self.connected_devices:
            if connection_type.value in self.connected_devices[udid]:
                return self.connected_devices[udid][connection_type.value]
        return None
    
    def clear_connection_data(self, udid: str):
        """Clear connection data for a device"""
        if udid in self.connected_devices:
            del self.connected_devices[udid]
            logger.info(f"Cleared connection data for {udid}")
