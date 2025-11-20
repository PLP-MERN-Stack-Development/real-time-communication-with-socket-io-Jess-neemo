// client/src/socket/socket.js
import { io } from 'socket.io-client';

// Use environment-based URL
const BACKEND_URL =
  import.meta.env.PROD 
    ? 'https://your-railway-url.up.railway.app'  // ← REPLACE THIS AFTER DEPLOYING TO RAILWAY
    : 'http://localhost:3001';

export const socket = io(BACKEND_URL, {
  withCredentials: true,
  reconnection: true,
  reconnectionAttempts: 10,
  timeout: 10000,
});