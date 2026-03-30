# Realtime Chat Web App

A simple web app where users can:

- Send realtime text messages
- Share media files (image/video/audio)
- Start a peer-to-peer 1:1 video call

## Run locally

```bash
npm install
npm start
```

Then open `http://localhost:3000` in two browser tabs/devices.

## Notes

- Media files are transmitted as data URLs through Socket.IO for simplicity.
- Video calls use WebRTC with Socket.IO signaling and public Google STUN.
- This is a starter app (no authentication, no persistent storage, and no production TURN server).
