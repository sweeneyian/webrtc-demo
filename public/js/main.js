'use strict';

// telephone variables

const callButton = document.getElementById('callButton');
const upgradeButton = document.getElementById('upgradeButton');
const hangupButton = document.getElementById('hangupButton');

var roomInput = document.getElementById('roomInput');
var roomDiv = document.getElementById('roomDiv');
var roomName = document.getElementById('roomName');

callButton.disabled = true;
hangupButton.disabled = true;
upgradeButton.disabled = true;
callButton.onclick = call;
upgradeButton.onclick = upgrade;
hangupButton.onclick = hangup;

let startTime;
const localVideo = document.getElementById('localVideo');
const localAudio = document.getElementById('localAudio');
const remoteVideo = document.getElementById('remoteVideo');
const remoteAudio = document.getElementById('remoteAudio');

// Peer variables

var isChannelReady = false;
var isInitiator = false;
var isStarted = false;
var localStream;
var pc;
var remoteStream;

let localConnection;
let remoteConnection;
let sendChannel;
let receiveChannel;
const dataChannelSend = document.querySelector('textarea#dataChannelSend');
const dataChannelReceive = document.querySelector('textarea#dataChannelReceive');
const sendButton = document.querySelector('button#sendButton');

sendButton.onclick = sendData;




//////// Audio Events

remoteVideo.addEventListener('loadedmetadata', () => {
  return console.log(`Remote video videoWidth: ${this.videoWidth}px,  videoHeight: ${this.videoHeight}px`);
});

remoteVideo.addEventListener('resize', () => {
  console.log(`Remote video size changed to ${remoteVideo.videoWidth}x${remoteVideo.videoHeight}`);
  // We'll use the first onsize callback as an indication that video has started
  // playing out.
  if (startTime) {
    const elapsedTime = window.performance.now() - startTime;
    console.log(`Setup time: ${elapsedTime.toFixed(3)}ms`);
    startTime = null;
  }
});

localVideo.addEventListener('loadedmetadata', () => {
  return console.log(`localVideo  videoWidth: ${this.videoWidth}px,  videoHeight: ${this.videoHeight}px`);
});

localVideo.addEventListener('resize', () => {
  console.log(`localVideo size changed to ${localVideo.videoWidth}x${localVideo.videoHeight}`);
  // We'll use the first onsize callback as an indication that video has started
  // playing out.
  if (startTime) {
    const elapsedTime = window.performance.now() - startTime;
    console.log(`Setup time: ${elapsedTime.toFixed(3)}ms`);
    startTime = null;
  }
});

//////// telephone functions

function call() {
  startTime = window.performance.now();
  isInitiator = true;
  callButton.disabled = true;
  upgradeButton.disabled = false;
  hangupButton.disabled = false;
  sendMessage('calling' + room);
  maybeStart();
  // const audioTracks = localStream.getAudioTracks();
  // if (audioTracks.length > 0) {
  //   console.log(`Using audio device: ${audioTracks[0].label}`);
  // }
  // const servers = null;
  // pc1 = new RTCPeerConnection(servers);
  // console.log('Created local peer connection object pc1');
  // pc1.onicecandidate = e => onIceCandidate(pc1, e);
  // pc2 = new RTCPeerConnection(servers);
  // console.log('Created remote peer connection object pc2');
  // pc2.onicecandidate = e => onIceCandidate(pc2, e);
  // pc1.oniceconnectionstatechange = e => onIceStateChange(pc1, e);
  // pc2.oniceconnectionstatechange = e => onIceStateChange(pc2, e);
  // pc2.ontrack = gotRemoteStream;

  // localStream.getTracks().forEach(track => pc1.addTrack(track, localStream));
  // console.log('Added local stream to pc1');

  // console.log('pc1 createOffer start');
  // pc1.createOffer(offerOptions).then(onCreateOfferSuccess, onCreateSessionDescriptionError);
}


function upgrade() {
  // upgradeButton.disabled = true;
  // navigator.mediaDevices
  //   .getUserMedia({video: true})
  //   .then(stream => {
  //     const videoTracks = stream.getVideoTracks();
  //     if (videoTracks.length > 0) {
  //       console.log(`Using video device: ${videoTracks[0].label}`);
  //     }
  //     localStream.addTrack(videoTracks[0]);
  //     localVideo.srcObject = null;
  //     localVideo.srcObject = localStream;
  //     pc1.addTrack(videoTracks[0], localStream);
  //     return pc1.createOffer();
  //   })
  //   .then(offer => pc1.setLocalDescription(offer))
  //   .then(() => pc2.setRemoteDescription(pc1.localDescription))
  //   .then(() => pc2.createAnswer())
  //   .then(answer => pc2.setLocalDescription(answer))
  //   .then(() => pc1.setRemoteDescription(pc2.localDescription));
}

// function hangup() {
//   console.log('Ending call');
//   pc1.close();
//   pc2.close();
//   pc1 = null;
//   pc2 = null;

//   const videoTracks = localStream.getVideoTracks();
//   videoTracks.forEach(videoTrack => {
//     videoTrack.stop();
//     localStream.removeTrack(videoTrack);
//   });
//   localVideo.srcObject = null;
//   localVideo.srcObject = localStream;

//   hangupButton.disabled = true;
//   callButton.disabled = false;
// }
/////////////////////////////////////////////

var socket = io.connect();
var room;

function joinRoom(){
  // always get video audio 
  console.log('Requesting local stream');

  navigator.mediaDevices
    .getUserMedia({
      audio: true,
      video: true
    })
    .then(gotStream)
    .catch(e => alert(`getUserMedia() error: ${e.name}`));
  room = roomName.value;
  console.log("Joining Room: " + room);
  roomInput.style.display = "none";
  localVideo.style.display = '';
  roomDiv.innerHTML = "Welcome to <b>" + room + "</b> room" +"<br />";

  if (room !== '') {
    
    dataChannelSend.placeholder = ''; 
    callButton.style.display = '';
    hangupButton.style.display = '';
    upgradeButton.style.display = '';

    socket.emit('create or join', room);
    console.log('Attempted to create or  join room', room);
  }
}

socket.on('created', function(room) {
  console.log('Created room ' + room);
  //isInitiator = true; // call was initiated on joining room
});

socket.on('full', function(room) {
  console.log('Room ' + room + ' is full');
});

socket.on('join', function (room){
  console.log('Another peer made a request to join room ' + room);
  isChannelReady = true;
  if (typeof localStream !== 'undefined'){
    callButton.disabled = false;
  }
});

// socket.on('calling', function (room){
//   console.log('Someone is calling the room ' + room);
//     // isInitiator becomes true when someone tries to call
//     isInitiator = true;
// });

socket.on('joined', function(room) {
  console.log('joined: ' + room);
  isChannelReady = true; //channel ready when both have joined
  if (typeof localStream !== 'undefined'){
    callButton.disabled = false;
  }
});

socket.on('log', function(array) {
  console.log.apply(console, array);
});

////////////////////////////////////////////////

function sendMessage(message) {
  console.log('Client sending message: ', message);
  socket.emit('message', message);
}

// This client receives a message
socket.on('message', function(message) {
  console.log('Client received message:', message);
  if (message === 'calling'+room) {
    maybeStart();
  } else if (message.type === 'offer') {
    if (!isInitiator && !isStarted) {
      maybeStart();
    }
    pc.setRemoteDescription(new RTCSessionDescription(message));
    doAnswer();
  } else if (message.type === 'answer' && isStarted) {
    pc.setRemoteDescription(new RTCSessionDescription(message));
  } else if (message.type === 'candidate' && isStarted) {
    var candidate = new RTCIceCandidate({
      sdpMLineIndex: message.label,
      candidate: message.candidate
    });
    pc.addIceCandidate(candidate);
  } else if (message === 'bye' && isStarted) {
    handleRemoteHangup();
  }
});

////////////////////////////////////////////////////


function gotStream(stream) {
  console.log('Adding local stream.');
  localStream = stream;
  // const audioTracks = localStream.getAudioTracks();
  localVideo.srcObject = stream;
  // if (audioTracks.length > 0) {
  //   console.log(`Using Audio device: ${audioTracks[0].label}`);
  // }

  const streamVisualizer = new StreamVisualizer(stream, localAudio);
  streamVisualizer.start();
  if (isChannelReady){
    callButton.disabled = false;
  }
  sendMessage('got user media');
  if (isInitiator) {
    maybeStart();
  }
}

// Lost with regards to ICE / TURN / STUN
// if (location.hostname !== 'localhost') {
//   requestTurn(
//     'https://computeengineondemand.appspot.com/turn?username=41784574&key=4080218913'
//   );
// }

function maybeStart() {
  console.log('>>>>>>> maybeStart() ', isStarted, localStream, isChannelReady);
  if (!isStarted && typeof localStream !== 'undefined' && isChannelReady) {
    console.log('>>>>>> creating peer connection');
    createPeerConnection();
    //pc.addStream(localStream);
    localStream.getTracks().forEach(track => pc.addTrack(track, localStream));
    isStarted = true;
    if (isInitiator) {
      doCall();
    }
  }
}

window.onbeforeunload = function() {
  sendMessage('bye');
};

/////////////////////////////////////////////////////////

function createPeerConnection() {
  try {
    pc = new RTCPeerConnection(null);
    pc.onicecandidate = handleIceCandidate;
    pc.onaddstream = handleRemoteStreamAdded;
    pc.ontrack = gotRemoteStream;
    pc.onremovestream = handleRemoteStreamRemoved;
    console.log('Created RTCPeerConnnection');
    

  
    sendChannel = pc.createDataChannel('sendDataChannel');
    console.log('Created send data channel');

    sendChannel.onopen = onSendChannelStateChange;
    sendChannel.onclose = onSendChannelStateChange;
  
    pc.ondatachannel = receiveChannelCallback;
  
    // localConnection.createOffer().then(
    //   gotDescription1,
    //   onCreateSessionDescriptionError
    // );
    
  } catch (e) {
    console.log('Failed to create PeerConnection, exception: ' + e.message);
    alert('Cannot create RTCPeerConnection object.');
    return;
  }
}

function handleIceCandidate(event) {
  console.log('icecandidate event: ', event);
  if (event.candidate) {
    sendMessage({
      type: 'candidate',
      label: event.candidate.sdpMLineIndex,
      id: event.candidate.sdpMid,
      candidate: event.candidate.candidate
    });
  } else {
    console.log('End of candidates.');
  }
}

function handleCreateOfferError(event) {
  console.log('createOffer() error: ', event);
}

function doCall() {
  console.log('Sending offer to peer');
  pc.createOffer(setLocalAndSendMessage, handleCreateOfferError);
}

function doAnswer() {
  console.log('Sending answer to peer.');
  pc.createAnswer().then(
    setLocalAndSendMessage,
    onCreateSessionDescriptionError
  );
}

function setLocalAndSendMessage(sessionDescription) {
  pc.setLocalDescription(sessionDescription);
  console.log('setLocalAndSendMessage sending message', sessionDescription);
  sendMessage(sessionDescription);
  upgradeButton.disabled = false;
  hangupButton.disabled = false;
}

function onCreateSessionDescriptionError(error) {
  console.log('Failed to create session description: ' + error.toString());
}


// function gotRemoteStream(e) {
//   console.log('gotRemoteStream', e.track, e.streams[0]);

//   // reset srcObject to work around minor bugs in Chrome and Edge.
//   remoteVideo.srcObject = null;
//   remoteVideo.srcObject = e.streams[0];
// }

// function onCreateAnswerSuccess(desc) {
//   console.log(`Answer from pc2:
// ${desc.sdp}`);
//   console.log('pc2 setLocalDescription start');
//   pc2.setLocalDescription(desc).then(() => onSetLocalSuccess(pc2), onSetSessionDescriptionError);
//   console.log('pc1 setRemoteDescription start');
//   pc1.setRemoteDescription(desc).then(() => onSetRemoteSuccess(pc1), onSetSessionDescriptionError);
// }

// function onSetLocalSuccess(pc) {
//   console.log(`${getName(pc)} setLocalDescription complete`);
// }

// function onCreateSessionDescriptionError(error) {
//   console.log(`Failed to create session description: ${error.toString()}`);
// }

// function onSetRemoteSuccess(pc) {
//   console.log(`${getName(pc)} setRemoteDescription complete`);
// }

// function onSetSessionDescriptionError(error) {
//   console.log(`Failed to set session description: ${error.toString()}`);
// }

// Lost with regards to ICE / TURN / STUN
// function requestTurn(turnURL) {
//
  // }

function gotRemoteStream(e) {
  if (remoteVideo.srcObject !== e.streams[0]) {
    remoteVideo.srcObject = e.streams[0];
    console.log('received remote stream');
    const streamVisualizer = new StreamVisualizer(e.streams[0], remoteAudio);
    streamVisualizer.start();
  }
}

function handleRemoteStreamAdded(event) {
  console.log('Remote stream added.');
  remoteStream = event.stream;
  remoteVideo.style.display = '';
  remoteVideo.srcObject = remoteStream;
}

function handleRemoteStreamRemoved(event) {
  remoteVideo.style.display = 'none';
  console.log('Remote stream removed. Event: ', event);
}

function hangup() {
  console.log('Hanging up.');
  stop();
  sendMessage('bye');
  upgradeButton.disabled = true;
  hangupButton.disabled = true;
}

function handleRemoteHangup() {
  console.log('Session terminated.');
  stop();
  isInitiator = false;
  upgradeButton.disabled = true;
  hangupButton.disabled = true;
}

function stop() {
  isStarted = false;
  pc.close();
  pc = null;
}


function sendData() {
  const data = dataChannelSend.value;
  sendChannel.send(data);
  console.log('Sent Data: ' + data);
}

function receiveChannelCallback(event) {
  console.log('Receive Channel Callback');
  receiveChannel = event.channel;
  receiveChannel.onmessage = onReceiveMessageCallback;
  receiveChannel.onopen = onReceiveChannelStateChange;
  receiveChannel.onclose = onReceiveChannelStateChange;
}

function onReceiveMessageCallback(event) {
  console.log('Received Message');
  dataChannelReceive.value = event.data;
}

function onSendChannelStateChange() {
  const readyState = sendChannel.readyState;
  console.log('Send channel state is: ' + readyState);
  if (readyState === 'open') {
    dataChannelSend.disabled = false;
    dataChannelSend.focus();
    sendButton.disabled = false;
  } else {
    dataChannelSend.disabled = true;
    sendButton.disabled = true;
  }
}

function onReceiveChannelStateChange() {
  const readyState = receiveChannel.readyState;
  console.log(`Receive channel state is: ${readyState}`);
}

// // function gotDescription1(desc) {
//   localConnection.setLocalDescription(desc);
//   console.log(`Offer from localConnection\n${desc.sdp}`);
//   localConnection.createAnswer().then(
//     gotDescription2,
//     onCreateSessionDescriptionError
//   );
// }

// function gotDescription2(desc) {
//   console.log(`Answer from remoteConnection\n${desc.sdp}`);
//   localConnection.setRemoteDescription(desc);
// }



function onIceCandidate(event) {
  localConnection
    .addIceCandidate(event.candidate)
    .then(
      () => onAddIceCandidateSuccess(localConnection),
      err => onAddIceCandidateError(localConnection, err)
    );
  console.log(`${localConnection} ICE candidate: ${event.candidate ? event.candidate.candidate : '(null)'}`);
}