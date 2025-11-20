// client/src/App.jsx
import { useState, useEffect } from 'react';
import { socket } from './socket/socket';

export default function App() {
  const [username, setUsername] = useState('');
  const [room, setRoom] = useState('general');
  const [joined, setJoined] = useState(false);
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [typingUser, setTypingUser] = useState('');

  // Join chat
  const handleJoin = (e) => {
    e.preventDefault();
    if (!username.trim()) return;
    socket.emit('join', { username, room });
    setJoined(true);
  };

  // Send message
  const sendMessage = (e) => {
    e.preventDefault();
    if (!messageText.trim()) return;
    socket.emit('sendMessage', { text: messageText, room });
    setMessageText('');
  };

  // Typing indicator
  useEffect(() => {
    let timeout;
    const handleInput = () => {
      socket.emit('typing', { room, isTyping: true });
      setIsTyping(true);
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        setIsTyping(false);
      }, 1000);
    };

    const input = document.getElementById('message-input');
    if (input) input.addEventListener('input', handleInput);
    return () => {
      if (input) input.removeEventListener('input', handleInput);
      clearTimeout(timeout);
    };
  }, [room]);

  // Socket listeners
  useEffect(() => {
    socket.on('init', ({ messages, online, currentRoom }) => {
      setMessages(messages);
      setOnlineUsers(online);
      setRoom(currentRoom);
    });

    socket.on('receiveMessage', (msg) => {
      setMessages(prev => [...prev, msg]);
      // Optional: auto-mark as read after 1s
      setTimeout(() => {
        socket.emit('markRead', { messageId: msg.id, room });
      }, 500);
    });

    socket.on('userJoined', ({ username }) => {
      setOnlineUsers(prev => [...new Set([...prev, username])]);
    });

    socket.on('userLeft', ({ username }) => {
      setOnlineUsers(prev => prev.filter(u => u !== username));
    });

    socket.on('userTyping', ({ username }) => {
      setTypingUser(username);
      setTimeout(() => setTypingUser(''), 1500);
    });

    return () => {
      socket.off('init');
      socket.off('receiveMessage');
      socket.off('userJoined');
      socket.off('userLeft');
      socket.off('userTyping');
    };
  }, [room]);

  if (!joined) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <form onSubmit={handleJoin} className="bg-white p-6 rounded shadow">
          <h2 className="text-xl mb-4">Join Chat</h2>
          <input
            type="text"
            placeholder="Your name"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="border p-2 w-full mb-2"
            required
          />
          <button type="submit" className="bg-blue-500 text-white px-4 py-2 rounded">
            Join
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-blue-600 text-white p-4 flex justify-between">
        <h1>Chat Room: {room}</h1>
        <div className="text-sm">Online: {onlineUsers.length}</div>
      </header>

      {/* Online Users */}
      <div className="bg-white p-2 border-b text-sm">
        👥 Online: {onlineUsers.join(', ')}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 bg-gray-100">
        {messages.map((msg) => (
          <div key={msg.id} className={`mb-2 p-2 rounded ${msg.sender === username ? 'bg-blue-200 ml-auto max-w-xs' : 'bg-white mr-auto max-w-xs'}`}>
            <div className="font-bold">{msg.sender}</div>
            <div>{msg.text}</div>
            <div className="text-xs text-gray-500">{new Date(msg.timestamp).toLocaleTimeString()}</div>
            {msg.read && msg.sender !== username && (
              <div className="text-xs text-green-500">✓ Read</div>
            )}
          </div>
        ))}
        {typingUser && <div className="text-sm text-gray-500 italic">{typingUser} is typing...</div>}
      </div>

      {/* Input */}
      <form onSubmit={sendMessage} className="p-2 border-t bg-white">
        <div className="flex">
          <input
            id="message-input"
            type="text"
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 border p-2 rounded-l"
          />
          <button type="submit" className="bg-blue-500 text-white px-4 rounded-r">
            Send
          </button>
        </div>
      </form>
    </div>
  );
}