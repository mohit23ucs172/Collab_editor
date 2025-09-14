import { useEffect, useState } from "react";

export default function UserList({ socket, userColors }) {
  const [users, setUsers] = useState([]);

  useEffect(() => {
    socket.on("room_users", ({ users }) => {
      // Deduplicate by socketId
      const uniqueUsers = Array.from(
        new Map(users.map(u => [u.socketId, u])).values()
      );
      setUsers(uniqueUsers);
    });

    return () => socket.off("room_users");
  }, [socket]);

  return (
    <div>
      <h4>👥 Online Users ({users.length})</h4>
      <ul style={{ listStyle: "none", padding: 0 }}>
        {users.map((u) => (
          <li
            key={u.socketId}
            style={{
              margin: "0.3rem 0",
              padding: "0.5rem",
              borderRadius: "6px",
              color: "#fff",
              backgroundColor: userColors[u.username] || "#555",
              fontWeight: "bold",
              textShadow: "0 0 2px #000",
            }}
          >
            {u.username}
          </li>
        ))}
      </ul>
    </div>
  );
}
