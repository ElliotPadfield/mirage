from dataclasses import dataclass
from typing import Optional, Dict, Any

@dataclass
class Location:
    """Location data model"""
    latitude: float
    longitude: float
    altitude: Optional[float] = None
    accuracy: Optional[float] = None
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'latitude': self.latitude,
            'longitude': self.longitude,
            'altitude': self.altitude,
            'accuracy': self.accuracy
        }
    
    def __str__(self) -> str:
        return f"{self.latitude} {self.longitude}"

@dataclass
class LocationSimulationState:
    """Location simulation state"""
    is_active: bool = False
    current_location: Optional[Location] = None
    udid: Optional[str] = None
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'is_active': self.is_active,
            'current_location': self.current_location.to_dict() if self.current_location else None,
            'udid': self.udid
        }
