'use strict';

const callButton = document.getElementById('callButton');
const hangupButton = document.getElementById('hangupButton');

var roomInput = document.getElementById('roomInput');
var roomDiv = document.getElementById('roomDiv');
var roomName = document.getElementById('roomName');

callButton.disabled = true;
hangupButton.disabled = true;
callButton.onclick = call;
hangupButton.onclick = hangup;

let startTime;
const localAudio = document.getElementById('localAudio');
const localAudioCanvas = document.getElementById('localAudioCanvas');
const remoteAudio = document.getElementById('remoteAudio');
const remoteVideo = document.getElementById('remoteVideo');
const remoteAudioCanvas = document.getElementById('remoteAudioCanvas');
const sendReceive = document.getElementById('sendReceive');
const localControls = document.getElementById('localControls');
const remoteControls = document.getElementById('remoteControls');

var isChannelReady = false;
var isInitiator = false;
var isStarted = false;
var localStream;
var pc;
var remoteStream;

let sendChannel;
let receiveChannel;
const dataChannelSend = document.querySelector('textarea#dataChannelSend');
const dataChannelReceive = document.querySelector('textarea#dataChannelReceive');
const sendButton = document.querySelector('button#sendButton');

sendButton.onclick = sendData;
var socket = io.connect();
var room;

var localAudioSlider = document.getElementById("localAudioSlider");
var localAudioVolume = document.getElementById("localAudioVolume");
localAudioVolume.innerHTML = localAudioSlider.value;
localAudioSlider.oninput = function() {
  localAudioVolume.innerHTML = this.value;
  localAudio.volume = this.value/100;
}

var remoteAudioSlider = document.getElementById("remoteAudioSlider");
var remoteAudioVolume = document.getElementById("remoteAudioVolume");
remoteAudioVolume.innerHTML = remoteAudioSlider.value;
remoteAudioSlider.oninput = function() {
  remoteAudioVolume.innerHTML = this.value;
  remoteAudio.volume = this.value/100;
}


//////////////////////////


function call() {
  startTime = window.performance.now();
  isInitiator = true;
  callButton.disabled = true;
  hangupButton.disabled = false;
  sendMessage('calling' + room);
  maybeStart();
}

function joinRoom(){
  // always get video audio 
  console.log('Requesting local stream');

  navigator.mediaDevices
    .getUserMedia({
      audio: true,
      video: false
    })
    .then(gotStream) // gotStream stream => audio.srcObject = modifyGain(stream, 0.5)
    .catch(e => alert(`getUserMedia() error: ${e.name}`));

  room = roomName.value;
  console.log("Joining Room: " + room);
  roomInput.style.display = "none";
  localAudio.style.display = '';
  localAudioCanvas.style.display = '';
  localControls.style.display = '';


  roomDiv.innerHTML = "Welcome to <b>" + room + "</b> room" +"<br />";

  if (room !== '') {
    dataChannelSend.placeholder = ''; 
    callButton.style.display = '';
    hangupButton.style.display = '';

    socket.emit('create or join', room);
    console.log('Attempted to create or  join room', room);
    maybeStart();
  }
}

socket.on('created', function(room) {
  console.log('Created room ' + room);
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
  console.log(stream);
  localAudio.srcObject = stream;
  localStream = stream;
  localAudio.volume=0;

  const streamVisualizer = new StreamVisualizer(stream, localAudioCanvas);
  streamVisualizer.start();
  if (isChannelReady){
    callButton.disabled = false;
  }
}

function gotRemoteStream(e) {
  console.log('received remote stream');
  console.log(e);
  remoteStream = e;
  sendReceive.style.display = '';
  remoteAudio.style.display = '';
  remoteAudioCanvas.style.display = '';
  remoteControls.style.display = '';


    if (remoteAudio !== e.streams[0]) {
      remoteAudio.srcObject = e.streams[0];
      remoteAudio.volume =0.5;
      const streamVisualizer = new StreamVisualizer(e.streams[0], remoteAudioCanvas);
      streamVisualizer.start();
  }
}


function maybeStart() {
  console.log('>>>>>>> maybeStart() ', isStarted, localStream, isChannelReady);
  if (!isStarted && typeof localStream !== 'undefined' && isChannelReady) {
    console.log('>>>>>> creating peer connection');
    createPeerConnection();
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

var configuration = { 
  "iceServers": [{ "url": "stun:stun.1.google.com:19302" }] 
}; 

function createPeerConnection() {
  try {
    console.log('Create RTCPeerConnnection and send Data Channel');
    pc = new RTCPeerConnection(configuration);
    pc.onicecandidate = handleIceCandidate;
    pc.ontrack = gotRemoteStream;
    pc.onremovetrack = handleRemoteStreamRemoved;
    sendChannel = pc.createDataChannel('sendDataChannel');
    sendChannel.onopen = onSendChannelStateChange;
    sendChannel.onclose = onSendChannelStateChange;
    pc.ondatachannel = receiveChannelCallback;
    
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
  
  //upgradeButton.disabled = false;
  hangupButton.disabled = false;

  pc.createAnswer().then(
    setLocalAndSendMessage,
    onCreateSessionDescriptionError
  );
}

function setLocalAndSendMessage(sessionDescription) {
  pc.setLocalDescription(sessionDescription);
  console.log('setLocalAndSendMessage sending message', sessionDescription);
  sendMessage(sessionDescription);
}

function onCreateSessionDescriptionError(error) {
  console.log('Failed to create session description: ' + error.toString());
}

function handleRemoteStreamRemoved(event) {
  remoteAudio.style.display = 'none';
  //remoteVideo.style.display = 'none';
  console.log('Remote stream removed. Event: ', event);
}

function hangup() {
  console.log('Hanging up.');
  stop();
  sendMessage('bye');
  hangupButton.disabled = true;
}

function handleRemoteHangup() {
  console.log('Session terminated.');
  stop();
  isInitiator = false;
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
  var lowerCase = event.data.toLowerCase();
  var lastRed = lowerCase.lastIndexOf("red");
  var lastGreen = lowerCase.lastIndexOf("green");
  var lastBlue = lowerCase.lastIndexOf("blue");
  var maxIndex = Math.max(lastRed, lastGreen, lastBlue);

  switch (maxIndex){
    case -1:
        document.body.style.backgroundColor = "#FFFFFF";
      break;
    case lastRed:
        document.body.style.backgroundColor = "#FF0000";
      break;
    case lastGreen:
        document.body.style.backgroundColor = "#00FF00";
      break;
    case lastBlue:
        document.body.style.backgroundColor = "#0000FF";
      break;
    default: 
      document.body.style.backgroundColor = "#000000";
      break;
  }
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