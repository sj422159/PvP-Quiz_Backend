# mistral_api.py
import httpx
import os
from dotenv import load_dotenv

load_dotenv()
API_KEY = os.getenv("MISTRAL_API_KEY")

async def get_question(difficulty: str):
    prompt = f"Generate a {difficulty} level quiz question on cricket with 4 options. Mention correct option index too."

    headers = {
        "Authorization": f"Bearer {API_KEY}",
        "Content-Type": "application/json"
    }

    data = {
        "model": "mistral-tiny",  # adjust model if needed
        "messages": [{"role": "user", "content": prompt}],
    }

    async with httpx.AsyncClient() as client:
        response = await client.post("https://api.mistral.ai/v1/chat/completions", headers=headers, json=data)
        res = response.json()
        return res["choices"][0]["message"]["content"]
