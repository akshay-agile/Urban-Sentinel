"""
Tracks connected WebSocket clients and broadcasts JSON events to all of
them. Used to push live updates to the dashboard (and, from Session 10
onward, the mobile app's foreground iOS notifications) whenever a sensor
reading lands or an incident changes — instead of clients only finding
out on their next poll.
"""
from fastapi import WebSocket


class ConnectionManager:
    def __init__(self) -> None:
        self.active_connections: set[WebSocket] = set()

    async def connect(self, websocket: WebSocket) -> None:
        await websocket.accept()
        self.active_connections.add(websocket)

    def disconnect(self, websocket: WebSocket) -> None:
        self.active_connections.discard(websocket)

    async def broadcast(self, message: dict) -> None:
        dead: set[WebSocket] = set()
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception:
                dead.add(connection)
        for connection in dead:
            self.active_connections.discard(connection)


manager = ConnectionManager()
