from fastapi import APIRouter

from schemas import RouteRequest
from services.route_service import get_optimized_route

router = APIRouter()

@router.post("/optimize-route")
async def optimize_route_endpoint(request: RouteRequest):
    return await get_optimized_route(request)

@router.get("/health")
async def health_check():
    return {"status": "ok"}
