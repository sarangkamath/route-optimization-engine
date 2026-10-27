from pydantic import BaseModel, Field

class Location(BaseModel):
    id : str
    name : str
    longitude : float = Field(ge=-180, le=180)
    latitude : float = Field(ge=-90, le=90)

class RouteRequest(BaseModel):
    warehouse : Location
    deliveries : list[Location] = Field(min_length=1, max_length=10)

