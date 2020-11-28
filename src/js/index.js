'use strict';

var socket = io();

socket.on('connect', function() {
  var name = prompt('Username:','');
  socket.emit('newUserConnect', name);
});

var chatWindow = document.getElementById('chatWindow');
socket.on('updateMessage', function(data) {
  if(data.name === 'SERVER') {
    var info = document.getElementById('info');
    info.innerHTML = data.message;
    setTimeout(() => {info.innerText = '';}, 3000);
  } else {
    var chatMessageEl = drawChatMessage(data);
    chatWindow.appendChild(chatMessageEl);
  }
});

function drawChatMessage(data) {
  var wrap = document.createElement('p'); // 전체를 감싸줄 객체
  var message = document.createElement('span'); // 메시지 담는 객체
  var name = document.createElement('span'); // 이름 담는 객체
  
  name.innerText = data.name + ": ";
  message.innerText = data.message;
  
  name.classList.add('output__user__name');
  message.classList.add('output__user__message');
  
  wrap.classList.add('output__user');
  wrap.dataset.id = socket.id;
  
  wrap.appendChild(name);
  wrap.appendChild(message);
  
  return wrap;
}

var sendButton = document.getElementById('chatMessageSendBtn');
var chatInput = document.getElementById('chatInput');

sendButton.addEventListener('click', function() {
  var message = chatInput.value;
  if(!message) return false;

  socket.emit('sendMessage', {message});

  chatInput.value = '';
});