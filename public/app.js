const socket = io();
const username = prompt('Enter your username:') || 'Anonymous';
socket.emit('join', { username });

const messagesEl = document.getElementById('messages');
const chatForm = document.getElementById('chatForm');
const mediaForm = document.getElementById('mediaForm');
const messageInput = document.getElementById('messageInput');
const mediaInput = document.getElementById('mediaInput');
const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');
const startCallBtn = document.getElementById('startCallBtn');
const endCallBtn = document.getElementById('endCallBtn');

const peerConfig = {
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
};

let localStream;
let peerConnection;

function addMessage(html) {
  const wrapper = document.createElement('div');
  wrapper.className = 'message';
  wrapper.innerHTML = html;
  messagesEl.appendChild(wrapper);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function formatTime(ts) {
  return new Date(ts).toLocaleTimeString();
}

chatForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const text = messageInput.value.trim();
  if (!text) return;
  socket.emit('chat-message', { text });
  messageInput.value = '';
});

mediaForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const file = mediaInput.files[0];
  if (!file) return;

  const dataUrl = await fileToDataUrl(file);
  socket.emit('media-message', {
    fileName: file.name,
    mimeType: file.type,
    dataUrl,
  });
  mediaInput.value = '';
});

socket.on('chat-message', ({ username: sender, text, createdAt }) => {
  addMessage(`<strong>${sender}</strong> <small>${formatTime(createdAt)}</small><div>${escapeHtml(text)}</div>`);
});

socket.on('media-message', ({ username: sender, fileName, mimeType, dataUrl, createdAt }) => {
  const media = renderMedia(mimeType, dataUrl);
  addMessage(`<strong>${sender}</strong> <small>${formatTime(createdAt)}</small><div>${escapeHtml(fileName)}</div>${media}`);
});

socket.on('system-message', (text) => {
  addMessage(`<em>${escapeHtml(text)}</em>`);
});

startCallBtn.addEventListener('click', async () => {
  await ensureLocalStream();
  await createPeerConnection();

  const offer = await peerConnection.createOffer();
  await peerConnection.setLocalDescription(offer);
  socket.emit('webrtc-offer', offer);

  startCallBtn.disabled = true;
  endCallBtn.disabled = false;
});

endCallBtn.addEventListener('click', () => {
  closeConnection();
});

socket.on('webrtc-offer', async (offer) => {
  await ensureLocalStream();
  await createPeerConnection();

  await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
  const answer = await peerConnection.createAnswer();
  await peerConnection.setLocalDescription(answer);
  socket.emit('webrtc-answer', answer);

  startCallBtn.disabled = true;
  endCallBtn.disabled = false;
});

socket.on('webrtc-answer', async (answer) => {
  if (!peerConnection) return;
  await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
});

socket.on('webrtc-ice-candidate', async (candidate) => {
  if (!peerConnection || !candidate) return;
  try {
    await peerConnection.addIceCandidate(candidate);
  } catch (error) {
    console.error('ICE error', error);
  }
});

async function ensureLocalStream() {
  if (localStream) return;
  localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
  localVideo.srcObject = localStream;
}

async function createPeerConnection() {
  if (peerConnection) return;

  peerConnection = new RTCPeerConnection(peerConfig);
  localStream.getTracks().forEach((track) => peerConnection.addTrack(track, localStream));

  peerConnection.ontrack = (event) => {
    [remoteVideo.srcObject] = event.streams;
  };

  peerConnection.onicecandidate = (event) => {
    if (event.candidate) {
      socket.emit('webrtc-ice-candidate', event.candidate);
    }
  };

  peerConnection.onconnectionstatechange = () => {
    if (['failed', 'disconnected', 'closed'].includes(peerConnection.connectionState)) {
      closeConnection();
    }
  };
}

function closeConnection() {
  if (peerConnection) {
    peerConnection.close();
    peerConnection = null;
  }

  remoteVideo.srcObject = null;
  startCallBtn.disabled = false;
  endCallBtn.disabled = true;
}

function renderMedia(mimeType, dataUrl) {
  if (mimeType.startsWith('image/')) {
    return `<img src="${dataUrl}" alt="shared image" />`;
  }
  if (mimeType.startsWith('video/')) {
    return `<video controls src="${dataUrl}"></video>`;
  }
  if (mimeType.startsWith('audio/')) {
    return `<audio controls src="${dataUrl}"></audio>`;
  }
  return `<a href="${dataUrl}" download>Download attachment</a>`;
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
