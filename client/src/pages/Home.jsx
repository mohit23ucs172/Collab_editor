import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { nanoid } from 'nanoid';

export default function Home() {
  const navigate = useNavigate();
  const [roomId, setRoomId] = useState('');

  function createRoom() {
    const id = nanoid(8);
    navigate(`/room/${id}`);
  }

  function join() {
    if (roomId) navigate(`/room/${roomId}`);
  }

  return (
    <div
      style={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        background: 'linear-gradient(135deg, #6b73ff, #000dff)',
        color: '#fff',
        fontFamily: 'Arial, sans-serif',
        padding: '0 1rem',
      }}
    >
      <h1 style={{ fontSize: '3rem', marginBottom: '1rem', textShadow: '2px 2px 8px rgba(0,0,0,0.5)' }}>
        Collab Editor
      </h1>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        <button
          onClick={createRoom}
          style={{
            padding: '0.8rem 1.5rem',
            background: '#ff6b6b',
            border: 'none',
            borderRadius: '8px',
            color: '#fff',
            cursor: 'pointer',
            fontWeight: 'bold',
            transition: '0.3s',
          }}
          onMouseEnter={e => (e.target.style.background = '#ff3b3b')}
          onMouseLeave={e => (e.target.style.background = '#ff6b6b')}
        >
          Create Room
        </button>

        <input
          value={roomId}
          onChange={e => setRoomId(e.target.value)}
          placeholder="Enter Room ID"
          style={{
            padding: '0.8rem 1rem',
            borderRadius: '8px',
            border: 'none',
            outline: 'none',
            fontSize: '1rem',
            width: '200px',
          }}
        />

        <button
          onClick={join}
          style={{
            padding: '0.8rem 1.5rem',
            background: '#6bc1ff',
            border: 'none',
            borderRadius: '8px',
            color: '#fff',
            cursor: 'pointer',
            fontWeight: 'bold',
            transition: '0.3s',
          }}
          onMouseEnter={e => (e.target.style.background = '#33a6ff')}
          onMouseLeave={e => (e.target.style.background = '#6bc1ff')}
        >
          Join
        </button>
      </div>

      <p style={{ opacity: 0.8, fontSize: '0.9rem' }}>
        Enter a Room ID to join or create a new room.
      </p>
    </div>
  );
}
