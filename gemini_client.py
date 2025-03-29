import google.generativeai as genai
import os
from dotenv import load_dotenv
load_dotenv()


# Load API key from environment variable or config
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

genai.configure(api_key=GEMINI_API_KEY)

model = genai.GenerativeModel('ggemini-1.0-pro')

async def generate_quiz_response(message: str) -> str:
    try:
        response = model.generate_content(message)
        return response.text
    except Exception as e:
        return f"Error generating response: {str(e)}"
