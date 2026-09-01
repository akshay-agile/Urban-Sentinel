from pathlib import Path

from fastapi import APIRouter
from fastapi.responses import HTMLResponse

router = APIRouter(tags=["camera"])


@router.get("/camera", response_class=HTMLResponse)
async def camera_page():
    html_path = (
        Path(__file__).resolve().parents[2]
        / "static"
        / "camera.html"
    )

    return html_path.read_text(encoding="utf-8")