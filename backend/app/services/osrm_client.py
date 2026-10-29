from schemas import Location
from fastapi import HTTPException, status

import httpx 

import os
from dotenv import load_dotenv
load_dotenv()


async def get_travel_time_matrix(locations: list[Location]) -> list[list[int]]:
    # convert to (longitude, latitude) for OSRM requirement
    coordinates = ";".join(
        f"{loc.longitude},{loc.latitude}" for loc in locations
    )

    url = f"{os.getenv("OSRM_BASE_URL")}/table/v1/driving/{coordinates}"

    try:
        async with httpx.AsyncClient(timeout=15) as client:
            response = await client.get(url, params = {"annotations" : "duration"})
            response.raise_for_status()
            data =  response.json()

    except httpx.TimeoutException as exception:
        raise HTTPException(status_code=status.HTTP_504_GATEWAY_TIMEOUT, detail="OSRM request timed out") from exception

    except httpx.HTTPError as exception:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Unable to connect to OSRM") from exception

    if data.get("code") != "Ok":
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                            detail = ("OSRM could not compute travel-time matrix: "
                                        f"{data.get('code', 'Unknown error')}"))

    durations = data.get("durations")
    length = len(locations)

    if(not isinstance(durations, list)
        or len(durations) != length
        or any(not isinstance(row, list) or len(row) != length
                for row in durations)):
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY, 
            detail= "Invalid travel-time matrix"
        )

    matrix = []

    for row in durations:
        converted_row = []
        for duration in row:
            if duration is None:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                    detail= "Some locations are unreachable by road. Please check the coordinates."
                )

            converted_row.append(round(duration))
        matrix.append(converted_row)

    return matrix