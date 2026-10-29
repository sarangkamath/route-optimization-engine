import asyncio

from schemas import RouteRequest
from services.osrm_client import get_travel_time_matrix
from optimizer.solver import optimize_route


async def get_optimized_route(request: RouteRequest) -> dict:
    locations = [request.warehouse, *request.deliveries]

    travel_time_matrix = await get_travel_time_matrix(locations)

    route_indices, total_seconds = await asyncio.to_thread(
        optimize_route,
        travel_time_matrix)

    optimized_stops = [
        {
            "sequence": sequence,
            "id": locations[node].id,
            "name": locations[node].name,
            "longitude": locations[node].longitude,
            "latitude": locations[node].latitude,
            "type": (
                "warehouse" if node == 0 else "delivery"
            )
        }
        for sequence, node in enumerate(route_indices)
    ]

    return {
        "status": "success",
        "number_of_deliveries": len(request.deliveries),
        "total_travel_time_seconds": total_seconds,
        "total_travel_time_minutes": round(
            total_seconds / 60, 2
        ),
        "route_indices": route_indices,
        "optimized_route": optimized_stops
    }
