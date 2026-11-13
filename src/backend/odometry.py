"""Accumulate vehicle distance from decoded CAN message samples."""

from __future__ import annotations

import math
from typing import Literal, Mapping, Optional, Protocol


METERS_PER_MILE = 1609.344
EARTH_RADIUS_METERS = 6_371_008.8


class DecodedCanMessage(Protocol):
    """The fields used from backend.can_message.CanMessage."""

    sigDict: Mapping[str, object]
    timeStamp: float


class Odometry:
    """Accumulate distance from either velocity or GPS samples.

    Configure the signal names to match the project's DBC definitions. For
    velocity mode, message timestamps are assumed to be seconds and velocity
    units must be specified. GPS coordinates are assumed to be decimal degrees.
    """

    def __init__(
        self,
        source: Literal["velocity", "gps"],
        *,
        velocity_signal: Optional[str] = None,
        velocity_unit: Literal["m/s", "km/h", "mph"] = "m/s",
        latitude_signal: Optional[str] = None,
        longitude_signal: Optional[str] = None,
    ) -> None:
        if source == "velocity" and not velocity_signal:
            raise ValueError("velocity_signal is required for velocity odometry")
        if source == "gps" and (not latitude_signal or not longitude_signal):
            raise ValueError(
                "latitude_signal and longitude_signal are required for GPS odometry"
            )
        if source not in ("velocity", "gps"):
            raise ValueError("source must be 'velocity' or 'gps'")
        if velocity_unit not in ("m/s", "km/h", "mph"):
            raise ValueError("velocity_unit must be 'm/s', 'km/h', or 'mph'")

        self.source = source
        self.velocity_signal = velocity_signal
        self.velocity_unit = velocity_unit
        self.latitude_signal = latitude_signal
        self.longitude_signal = longitude_signal
        self.reset()

    @property
    def distance_meters(self) -> float:
        """Cumulative distance in meters."""
        return self._distance_meters

    @property
    def distance_miles(self) -> float:
        """Cumulative distance in international miles."""
        return self._distance_meters / METERS_PER_MILE

    def reset(self) -> None:
        """Clear the accumulated distance and previous sample."""
        self._distance_meters = 0.0
        self._previous_velocity_mps: Optional[float] = None
        self._previous_timestamp: Optional[float] = None
        self._previous_coordinates: Optional[tuple[float, float]] = None

    def update(self, message: DecodedCanMessage) -> float:
        """Add a decoded CAN sample and return the distance added, in meters.

        Samples without the configured signal(s) are ignored. In velocity
        mode, each pair of samples is integrated using the trapezoidal rule.
        In GPS mode, each pair of coordinates contributes its great-circle
        distance.
        """
        if self.source == "velocity":
            return self._update_velocity(message)
        return self._update_gps(message)

    def _update_velocity(self, message: DecodedCanMessage) -> float:
        assert self.velocity_signal is not None
        value = message.sigDict.get(self.velocity_signal)
        if value is None:
            return 0.0

        velocity = abs(self._number(value, self.velocity_signal))
        timestamp = self._number(message.timeStamp, "timestamp")
        if self.velocity_unit == "km/h":
            velocity *= 1_000 / 3_600
        elif self.velocity_unit == "mph":
            velocity *= METERS_PER_MILE / 3_600

        added_distance = 0.0
        if self._previous_timestamp is not None:
            elapsed = timestamp - self._previous_timestamp
            if elapsed < 0:
                raise ValueError("CAN message timestamps must not move backwards")
            if self._previous_velocity_mps is not None:
                added_distance = (
                    (self._previous_velocity_mps + velocity) / 2 * elapsed
                )

        self._previous_velocity_mps = velocity
        self._previous_timestamp = timestamp
        self._distance_meters += added_distance
        return added_distance

    def _update_gps(self, message: DecodedCanMessage) -> float:
        assert self.latitude_signal is not None
        assert self.longitude_signal is not None
        latitude = message.sigDict.get(self.latitude_signal)
        longitude = message.sigDict.get(self.longitude_signal)
        if latitude is None or longitude is None:
            return 0.0

        point = (
            self._number(latitude, self.latitude_signal),
            self._number(longitude, self.longitude_signal),
        )
        if not -90 <= point[0] <= 90:
            raise ValueError("latitude must be between -90 and 90 degrees")
        if not -180 <= point[1] <= 180:
            raise ValueError("longitude must be between -180 and 180 degrees")

        added_distance = 0.0
        if self._previous_coordinates is not None:
            added_distance = self._great_circle_distance(
                self._previous_coordinates, point
            )

        self._previous_coordinates = point
        self._distance_meters += added_distance
        return added_distance

    @staticmethod
    def _number(value: object, name: str) -> float:
        if isinstance(value, bool) or not isinstance(value, (int, float)):
            raise TypeError(f"{name} must be a number")
        result = float(value)
        if not math.isfinite(result):
            raise ValueError(f"{name} must be finite")
        return result

    @staticmethod
    def _great_circle_distance(
        first: tuple[float, float], second: tuple[float, float]
    ) -> float:
        latitude_1, longitude_1 = map(math.radians, first)
        latitude_2, longitude_2 = map(math.radians, second)
        latitude_delta = latitude_2 - latitude_1
        longitude_delta = longitude_2 - longitude_1

        haversine = (
            math.sin(latitude_delta / 2) ** 2
            + math.cos(latitude_1)
            * math.cos(latitude_2)
            * math.sin(longitude_delta / 2) ** 2
        )
        central_angle = 2 * math.atan2(
            math.sqrt(haversine), math.sqrt(1 - haversine)
        )
        return EARTH_RADIUS_METERS * central_angle
