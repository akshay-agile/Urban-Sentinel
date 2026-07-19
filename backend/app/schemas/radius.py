from pydantic import BaseModel


class NearbyUserRead(BaseModel):
    user_id: int
    full_name: str
    email: str
    distance_meters: float
