import { io } from 'socket.io-client';
const SERVER = import.meta.env.VITE_SERVER_URL || 'http://localhost:4000';
const socket = io(SERVER);
export default socket;