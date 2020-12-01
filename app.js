const express = require('express');
const http = require('http');
const app = express();
const server = http.createServer(app);
const fs = require('fs');
const io = require('socket.io')(server);

app.use(express.static('src'));

app.get('/', function(req, res) {
  fs.readFile('./src/index.html', (err, data) => {
    if(err) throw err;
    
    res.writeHead(200, { 'Content-Type' : 'text/html' }).write(data).end();
  });
});

io.sockets.on('connection', function(socket) {
  socket.on('newUserConnect', function(name) {
    socket.name = name;

    var message = name + ' is connected';
    io.sockets.emit('updateMessage', { // 나를 포함한 모든 소켓에 메시지 전송
      name : 'SERVER',
      message : message
    })

    console.log('connect: ' + name);
  });

  socket.on('chatConnect', function(target) {
    var message = target + '님과의 채팅이 연결되었습니다';
    io.sockets.emit('updateMessage', {
      name : 'SERVER',
      message : message
    })
  });

  socket.on('disconnect', function() {
    var message = socket.name + ' disconnected';
    socket.broadcast.emit('updateMessage', { // 나를 제외한 다른 모든 소켓에 메시지 전송
      name : 'SERVER',
      message : message
    });

    console.log('disconnect: ' + socket.name);
  });

  socket.on('sendMessage', function(data) {
    data.name = socket.name; // 전송한 사람의 이름을 data에 추가해서
    io.sockets.emit('updateMessage', data); // 모든 사람들에게 data 전송

    console.log('message sent: ' + data.name + ' / ' + data.message);
  });

  socket.on('locationRequest', function() {
    data = { name : socket.name };
    io.sockets.emit('locationRequestResponse', data);

    console.log('location request sent: ' + data.name);
  });

  socket.on('sendLocation', function(data) {
    data.name = socket.name;
    io.sockets.emit('sendLocationResponse', data);

    console.log('location information sent: ' + data.name);
  });
});

server.listen(3000, function() {
  console.log('서버 가동');
});