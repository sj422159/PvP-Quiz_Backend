from fastapi import WebSocket
from typing import List, Dict


class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}  # {player_id: websocket}
        self.rooms: Dict[str, List[str]] = {}  # {room_id: [player1_id, player2_id]}

    async def connect(self, player_id: str, websocket: WebSocket):
        await websocket.accept()
        self.active_connections[player_id] = websocket

    def disconnect(self, player_id: str):
        if player_id in self.active_connections:
            del self.active_connections[player_id]

    async def send_personal_message(self, message: dict, player_id: str):
        if player_id in self.active_connections:
            websocket = self.active_connections[player_id]
            await websocket.send_json(message)

    async def broadcast_room(self, message: dict, room_id: str):
        if room_id in self.rooms:
            players = self.rooms[room_id]
            for player_id in players:
                if player_id in self.active_connections:
                    websocket = self.active_connections[player_id]
                    await websocket.send_json(message)

    def create_room(self, room_id: str, player1: str):
        self.rooms[room_id] = [player1]

    def join_room(self, room_id: str, player2: str):
        if room_id in self.rooms and len(self.rooms[room_id]) < 2:
            self.rooms[room_id].append(player2)

    def get_room_players(self, room_id: str):
        return self.rooms.get(room_id, [])
