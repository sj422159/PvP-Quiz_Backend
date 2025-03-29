import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import socketio
import random

# Create a FastAPI instance
app = FastAPI()

# Create a Socket.IO server
sio = socketio.AsyncServer(
    async_mode="asgi",
    cors_allowed_origins="*"
)

# Mount the Socket.IO server to the FastAPI app
sio_app = socketio.ASGIApp(sio, app)

# CORS setup for frontend connection
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins (not recommended for production)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Predefined questions categorized by difficulty
questions = {
    "easy": [
        {"question": "Who won the 2011 Cricket World Cup?", "options": ["India", "Australia", "England", "Pakistan"], "answer": "India"},
        {"question": "How many players are on a cricket team?", "options": ["9", "10", "11", "12"], "answer": "11"},
    ],
    "medium": [
        {"question": "Who has the highest individual score in a Test match?", "options": ["Sachin Tendulkar", "Brian Lara", "Virat Kohli", "Steve Smith"], "answer": "Brian Lara"},
        {"question": "Which country won the first-ever Cricket World Cup in 1975?", "options": ["India", "West Indies", "England", "Australia"], "answer": "West Indies"},
    ],
    "hard": [
        {"question": "Who bowled the fastest recorded delivery in cricket?", "options": ["Brett Lee", "Shoaib Akhtar", "Mitchell Starc", "Dale Steyn"], "answer": "Shoaib Akhtar"},
        {"question": "Which batsman has the most double centuries in Test cricket?", "options": ["Sachin Tendulkar", "Don Bradman", "Kumar Sangakkara", "Virender Sehwag"], "answer": "Don Bradman"},
    ]
}

# Game state and player tracking
players = []
game_state = {
    "difficulty": "easy",
    "current_question": None,
    "player_scores": {},  # Stores scores separately for each difficulty
}

@app.get("/")
def read_root():
    return {"message": "Cricket PvP Quiz Backend with Socket.IO"}

# Handle new player connection
@sio.event
async def connect(sid, environ):
    print(f"Player {sid} connected.")
    
    if sid not in players:
        players.append(sid)
        game_state["player_scores"][sid] = {"easy": 0, "medium": 0, "hard": 0}
    
    if len(players) == 2:
        await start_game()

# Handle disconnection
@sio.event
async def disconnect(sid):
    print(f"Player {sid} disconnected.")
    if sid in players:
        players.remove(sid)
    game_state["player_scores"].pop(sid, None)

# Handle player's answer submission
@sio.event
async def answer(sid, data):
    if not game_state["current_question"]:
        return

    difficulty = game_state["difficulty"]
    answer = data.get("answer")
    correct = answer == game_state["current_question"]["answer"]
    
    if correct:
        game_state["player_scores"][sid][difficulty] += 1
    
    await send_question()

# Start the game and send the first question
async def start_game():
    print("Starting the game...")
    await send_question()

# Send the next question to all players
async def send_question():
    difficulty = game_state["difficulty"]
    question = random.choice(questions[difficulty])
    
    game_state["current_question"] = question
    active_players = [p for p in players if p in game_state["player_scores"]]
    
    for player in active_players:
        await sio.emit(
            "question", {
                "difficulty": difficulty,
                "question": question["question"],
                "options": question["options"],
                "scores": game_state["player_scores"]
            },
            room=player
        )

# Change difficulty level
@sio.event
async def change_difficulty(sid, data):
    new_difficulty = data.get("difficulty")
    if new_difficulty in questions:
        game_state["difficulty"] = new_difficulty
        await send_question()

# Run the FastAPI app with Socket.IO
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(sio_app, host="0.0.0.0", port=8000, reload=True)