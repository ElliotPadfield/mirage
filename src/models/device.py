from dataclasses import dataclass
from typing import Optional, Dict, Any
from enum import Enum

class ConnectionType(Enum):
    USB = "USB"
    WIFI = "Wifi"
    MANUAL = "Manual Wifi"
    NETWORK = "Network"

@dataclass
class DeviceInfo:
    """Device information model"""
    udid: str
    name: str
    model: str
    ios_version: str
    connection_type: ConnectionType
    wifi_state: bool = False
    user_locale: Optional[str] = None
    battery_level: Optional[int] = None
    is_connected: bool = False
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization"""
        return {
            'udid': self.udid,
            'name': self.name,
            'model': self.model,
            'ios_version': self.ios_version,
            'connection_type': self.connection_type.value,
            'wifi_state': self.wifi_state,
            'user_locale': self.user_locale,
            'battery_level': self.battery_level,
            'is_connected': self.is_connected
        }

@dataclass
class ConnectionData:
    """Device connection data"""
    udid: str
    connection_type: ConnectionType
    rsd_host: Optional[str] = None
    rsd_port: Optional[str] = None
    wifi_address: Optional[str] = None
    wifi_port: Optional[int] = None
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'udid': self.udid,
            'connection_type': self.connection_type.value,
            'rsd_host': self.rsd_host,
            'rsd_port': self.rsd_port,
            'wifi_address': self.wifi_address,
            'wifi_port': self.wifi_port
        }
