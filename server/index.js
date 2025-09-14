const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
require("dotenv").config();
const mongoose = require("mongoose");
const Session = require("./models/Session");
const axios = require("axios");
// Connect to MongoDB
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error(err));

const app = express();
app.use(cors());
app.use(express.json());

const JUDGE0_KEY = process.env.VITE_JUDGE0_KEY;
const JUDGE0_HOST = process.env.VITE_JUDGE0_HOST;
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: process.env.CLIENT_ORIGIN || "http://localhost:5173" },
});

// In-memory store for rooms: { roomId: { javascript, cpp, python, java } }
const rooms = {};

// Helper: broadcast users in a room
function broadcastUsers(roomId) {
  const socketsInRoom = io.sockets.adapter.rooms.get(roomId) || new Set();
  const users = [...socketsInRoom].map((id) => {
    const s = io.sockets.sockets.get(id);
    return { socketId: id, username: s ? s.data.username : "Unknown" };
  });

  const uniqueUsers = Array.from(new Map(users.map(u => [u.socketId, u])).values());
  io.to(roomId).emit("room_users", { users: uniqueUsers });
}

// Socket.io connection
io.on("connection", (socket) => {
  console.log("Socket connected:", socket.id);

  socket.on("join_room", async ({ roomId, username }) => {
    socket.join(roomId);
    socket.data.username = username || "Anonymous";

    try {
      let sess = await Session.findOne({ roomId });

      if (!sess) {
        sess = new Session({ roomId });
        await sess.save();
      }

      // Store in memory
      rooms[roomId] = {
        javascript: sess.javascript,
        cpp: sess.cpp,
        python: sess.python,
        java: sess.java
      };

      socket.emit("load_code", { code: rooms[roomId] });
    } catch (err) {
      console.error("Error loading session:", err);
      rooms[roomId] = {
        javascript: "// Loading JavaScript...",
        cpp: "// Loading C++...",
        python: "# Loading Python...",
        java: "// Loading Java..."
      };
      socket.emit("load_code", { code: rooms[roomId] });
    }

    broadcastUsers(roomId);
  });

  // Code changes
  socket.on("code_change", ({ roomId, code, username, changes }) => {
    rooms[roomId] = { ...rooms[roomId], ...code };
    socket.to(roomId).emit("code_change", { code, username, changes });
  });

  // Run code output
  socket.on("run_code", ({ roomId, output }) => {
    socket.to(roomId).emit("run_code_output", { output });
  });

  // Disconnect
  socket.on("disconnecting", () => {
    for (const roomId of socket.rooms) {
      if (roomId === socket.id) continue;

      socket.to(roomId).emit("user_left", {
        socketId: socket.id,
        username: socket.data.username,
      });

      broadcastUsers(roomId);
    }
  });
});

// Auto-save endpoint (per language)
app.put('/session/:roomId', async (req, res) => {
  const { roomId } = req.params;
  const { code, language } = req.body;

  if (!language || !code) {
    return res.status(400).json({ ok: false, error: "Missing code or language" });
  }

  try {
    let sess = await Session.findOne({ roomId });

    if (!sess) {
      sess = new Session({ roomId });
    }

    // Update only the requested language
    if (language === "javascript") sess.javascript = code;
    else if (language === "cpp") sess.cpp = code;
    else if (language === "python") sess.python = code;
    else if (language === "java") sess.java = code;

    sess.updatedAt = new Date();
    await sess.save();

    // Update in-memory store
    if (rooms[roomId]) rooms[roomId][language] = code;

    res.json({ ok: true });
  } catch (err) {
    console.error("Error saving session:", err);
    res.status(500).json({ ok: false, error: err.message });
  }
});




// Route to run code
app.post('/run/:language', async (req, res) => {
  const { language } = req.params;
  const { code } = req.body;

  const languageMap = { cpp: 54, python: 71, java: 62, javascript: 63 };

  if (!languageMap[language]) return res.status(400).json({ output: ['Invalid language'] });

  try {
    const response = await axios.post(
      `https://${JUDGE0_HOST}/submissions?base64_encoded=false&wait=true`,
      {
        language_id: languageMap[language],
        source_code: code
      },
      {
        headers: {
          'X-RapidAPI-Key': JUDGE0_KEY,
          'X-RapidAPI-Host': JUDGE0_HOST,
          'Content-Type': 'application/json'
        }
      }
    );

    const result = response.data;
    if (result.stdout) res.json({ output: result.stdout.split('\n') });
    else if (result.stderr) res.json({ output: result.stderr.split('\n') });
    else if (result.compile_output) res.json({ output: result.compile_output.split('\n') });
    else res.json({ output: ['No output'] });
  } catch (err) {
    console.error("Error running code:", err);
    res.status(500).json({ output: [`Error: ${err.message}`] });
  }
});



const PORT = process.env.PORT || 5000;

// Start the server
if(process.env.NODE_ENV!=="production"){

  server.listen(PORT, () => {
    console.log(`Server is running on port: ${PORT}`);
  });
}

//Export server for vercel

