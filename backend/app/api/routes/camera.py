from datetime import datetime, timezone

from fastapi import APIRouter, File, UploadFile

router = APIRouter(
    prefix="/camera",
    tags=["camera"],
)


@router.post("/frame")
async def receive_frame(file: UploadFile = File(...)):
    """
    Receives a JPEG frame from the demo CCTV/phone camera.

    AI inference will be added in the next stage.
    """

    data = await file.read()

    return {
        "received": True,
        "filename": file.filename,
        "content_type": file.content_type,
        "size_bytes": len(data),
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }