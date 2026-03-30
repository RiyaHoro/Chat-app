const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'public')));

io.on('connection', (socket) => {
  socket.on('join', ({ username }) => {
    socket.data.username = username || 'Anonymous';
    socket.broadcast.emit('system-message', `${socket.data.username} joined the chat`);
  });

  socket.on('chat-message', (payload) => {
    io.emit('chat-message', {
      username: socket.data.username || 'Anonymous',
      text: payload.text,
      createdAt: Date.now(),
    });
  });

  socket.on('media-message', (payload) => {
    io.emit('media-message', {
      username: socket.data.username || 'Anonymous',
      fileName: payload.fileName,
      mimeType: payload.mimeType,
      dataUrl: payload.dataUrl,
      createdAt: Date.now(),
    });
  });

  socket.on('webrtc-offer', (payload) => {
    socket.broadcast.emit('webrtc-offer', payload);
  });

  socket.on('webrtc-answer', (payload) => {
    socket.broadcast.emit('webrtc-answer', payload);
  });

  socket.on('webrtc-ice-candidate', (payload) => {
    socket.broadcast.emit('webrtc-ice-candidate', payload);
  });

  socket.on('disconnect', () => {
    if (socket.data.username) {
      socket.broadcast.emit('system-message', `${socket.data.username} left the chat`);
    }
  });
});

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
