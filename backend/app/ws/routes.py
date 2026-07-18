from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.ws.manager import manager

router = APIRouter()


@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket) -> None:
    """
    Clients (dashboard, and mobile from Session 10) connect here and
    receive a JSON message every time something happens — a sensor
    reading is persisted, a device is auto-registered, or an incident is
    created/updated. We don't expect clients to send anything meaningful
    back; this is a one-way live feed.
    """
    await manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)
