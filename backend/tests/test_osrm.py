import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parents[1] / "app"))

import httpx
import pytest
from fastapi import HTTPException

from app.schemas import Location
from app.services import osrm_client

LOCATIONS = [
    Location(id="warehouse", name="Warehouse", longitude=77.59, latitude=12.97),
    Location(id="d1", name="Stop 1", longitude=77.62, latitude=12.93),
]


def fake_osrm(monkeypatch, data=None, error=None):
    """Replace httpx.AsyncClient so no real OSRM server is needed."""

    class Response:
        def raise_for_status(self): pass
        def json(self): return data

    class Client:
        def __init__(self, *args, **kwargs): pass
        async def __aenter__(self): return self
        async def __aexit__(self, *args): pass
        async def get(self, url, params=None):
            if error:
                raise error
            return Response()

    monkeypatch.setattr(osrm_client.httpx, "AsyncClient", Client)
    monkeypatch.setenv("OSRM_BASE_URL", "http://osrm")


def test_returns_rounded_matrix(monkeypatch):
    fake_osrm(monkeypatch, data={"code": "Ok", "durations": [[0, 10.4], [12.6, 0]]})

    matrix = asyncio.run(osrm_client.get_travel_time_matrix(LOCATIONS))

    assert matrix == [[0, 10], [13, 0]]


@pytest.mark.parametrize(
    "data, error, expected_status",
    [
        (None, httpx.TimeoutException("slow"), 504),                       # OSRM timed out
        (None, httpx.ConnectError("down"), 502),                           # OSRM unreachable
        ({"code": "NoRoute"}, None, 422),                                  # OSRM says no
        ({"code": "Ok", "durations": [[0, 1]]}, None, 502),                # wrong matrix shape
        ({"code": "Ok", "durations": [[0, None], [1, 0]]}, None, 422),     # unreachable location
    ],
)
def test_osrm_failures_become_http_errors(monkeypatch, data, error, expected_status):
    fake_osrm(monkeypatch, data=data, error=error)

    with pytest.raises(HTTPException) as exc:
        asyncio.run(osrm_client.get_travel_time_matrix(LOCATIONS))

    assert exc.value.status_code == expected_status


def test_route_geometry_is_returned_as_lat_lng(monkeypatch):
    coords = [[77.59, 12.97], [77.6, 12.95]]  # OSRM sends [lng, lat]
    fake_osrm(monkeypatch, data={"code": "Ok", "routes": [{"geometry": {"coordinates": coords}}]})

    path = asyncio.run(osrm_client.get_route_geometry(LOCATIONS))

    assert path == [[12.97, 77.59], [12.95, 77.6]]