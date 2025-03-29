const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const axios = require("axios"); // Required for calling Gemini API

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // Update with frontend URL in prod
  },
});

let players = [];
let currentQuestion = "";

// Function to fetch question from Gemini API
const fetchQuestionFromGemini = async () => {
  try {
    console.log("🚀 Calling Google Gemini API...");

    // Replace with your actual API endpoint and model ID
    const response = await axios.post(
      'https://us-central1-aiplatform.googleapis.com/v1/projects/YOUR_PROJECT_ID/locations/us-central1/publishers/google/models/YOUR_MODEL_ID:predict', // Correct endpoint
      {
        instances: [{
          prompt: "Give me a cricket quiz question with options and the correct answer.",
          temperature: 0.7,
          max_output_tokens: 150, // Adjust max tokens for your requirement
        }],
      },
      {
        headers: {
          'Authorization': `Bearer AIzaSyBXJoaREJtOGZNjJ8GQUpCIja0zmPUBxBM`, // Your Google API key
        },
      }
    );

    console.log("Google Gemini API Response:", response.data);

    // Extract question from the response
    if (response.data && response.data.predictions && response.data.predictions[0]) {
      currentQuestion = response.data.predictions[0].text.trim();
      console.log("Question fetched:", currentQuestion);
      return currentQuestion;
    } else {
      console.error("Invalid response structure:", response.data);
      return "Failed to fetch question (Invalid response)";
    }
  } catch (error) {
    console.error("Error fetching question from Google Gemini:", error);
    console.error("Error details:", error.response ? error.response.data : error.message);
    return "Failed to fetch question (Error occurred)";
  }
};

io.on("connection", (socket) => {
  console.log(`🟢 Player connected: ${socket.id}`);
  players.push(socket.id);

  // Send updated players list to everyone
  io.emit("players", players);

  // Start game event
  socket.on("startGame", async () => {
    console.log("🔥 Game Started by", socket.id);

    // Fetch the first question from Gemini
    const question = await fetchQuestionFromGemini();

    // Emit the question to all players
    io.emit("new-question", question);

    // Optionally, you can keep emitting new questions as the game progresses
    setInterval(async () => {
      const question = await fetchQuestionFromGemini();
      io.emit("new-question", question);
    }, 10000); // Adjust interval as needed (e.g., new question every 10 seconds)
  });

  // Handle player disconnection
  socket.on("disconnect", () => {
    console.log(`🔴 Player disconnected: ${socket.id}`);
    players = players.filter((id) => id !== socket.id);
    io.emit("players", players);
  });
});

app.get("/", (req, res) => {
  res.send("🏏 PvP Cricket Quiz Backend Running!");
});

const { v4: uuidv4 } = require("uuid"); // For unique Room IDs
app.use(express.json()); // For reading JSON body

let rooms = {}; // Room structure

// ✅ Create Room API
app.post("/createroom", (req, res) => {
  const roomId = uuidv4();
  rooms[roomId] = {
    players: [],
  };
  console.log("🎯 Room created:", roomId);
  res.status(200).json({ roomId });
});

// ✅ Socket Join Room Logic
io.on("connection", (socket) => {
  console.log(`🟢 Player connected: ${socket.id}`);
  players.push(socket.id);

  io.emit("players", players);

  socket.on("joinRoom", ({ roomId }) => {
    if (rooms[roomId]) {
      rooms[roomId].players.push(socket.id);
      socket.join(roomId);
      console.log(`👥 Player ${socket.id} joined room ${roomId}`);

      // Start quiz when 2 players join
      if (rooms[roomId].players.length === 2) {
        io.to(roomId).emit("startQuiz", { roomId });
      }
    }
  });

  socket.on("startGame", async ({ roomId }) => {
    console.log("🔥 Game Started by", socket.id, "in room", roomId);

    const question = await fetchQuestionFromGemini();
    io.to(roomId).emit("new-question", question);

    // Optional auto question every 10 secs
    // setInterval(async () => {
    //   const question = await fetchQuestionFromGemini();
    //   io.to(roomId).emit("new-question", question);
    // }, 10000);
  });

  socket.on("disconnect", () => {
    console.log(`🔴 Player disconnected: ${socket.id}`);
    players = players.filter((id) => id !== socket.id);
    io.emit("players", players);

    // Remove from rooms
    for (let roomId in rooms) {
      rooms[roomId].players = rooms[roomId].players.filter((id) => id !== socket.id);
      if (rooms[roomId].players.length === 0) {
        delete rooms[roomId];
        console.log(`🗑️ Room ${roomId} deleted`);
      }
    }
  });
});


const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
