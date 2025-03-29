# models.py
from pydantic import BaseModel
from typing import List

class QuestionRequest(BaseModel):
    player_id: str
    current_stage: str  # "easy", "medium", "hard"

class QuestionResponse(BaseModel):
    question: str
    options: List[str]
    correct_option: int
    difficulty: str

class AnswerSubmission(BaseModel):
    player_id: str
    is_correct: bool

class LeaderboardEntry(BaseModel):
    player_id: str
    score: int
