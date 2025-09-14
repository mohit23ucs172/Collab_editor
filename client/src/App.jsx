// src/App.jsx (or where you connect socket)
import { useEffect } from "react";
import { io } from "socket.io-client";

const socket = io("http://localhost:4000");

function App() {
  useEffect(() => {
    // Example: hard-coded username, later replace with login form input
    const username = prompt("Enter your name") || "Anonymous";

    socket.emit("join_room", { roomId: "room1", username });
  }, []);

  return <Editor socket={socket} />;
}

export default App;
