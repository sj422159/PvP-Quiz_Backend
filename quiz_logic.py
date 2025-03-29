import os
import random
from google.generativeai import GenerativeModel
from dotenv import load_dotenv

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

model = GenerativeModel(model_name="gemini-1.0-pro", api_key=GEMINI_API_KEY)

DIFFICULTY_LEVELS = ["easy", "medium", "hard"]

async def generate_question(difficulty: str) -> dict:
    prompt = f"""
    You are a cricket quiz master. Create one cricket quiz question.
    Difficulty: {difficulty.upper()}
    
    Format:
    {{
        "question": "...",
        "options": ["A", "B", "C", "D"],
        "answer": "B"
    }}
    """
    response = model.generate_content(prompt)
    try:
        return eval(response.text.strip())  # Convert to dict
    except Exception:
        return {}

def adjust_difficulty(current_level: str, correct: bool) -> str:
    index = DIFFICULTY_LEVELS.index(current_level)
    if correct and index < 2:
        index += 1
    elif not correct and index > 0:
        index -= 1
    return DIFFICULTY_LEVELS[index]
