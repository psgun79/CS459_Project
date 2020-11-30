'use strict';

var directionsDisplay;
var directionsService;
let map, infoWindow;
var socket = io();
var myName;
var myPosition;
var myProfile;
var isConnected = false;
var isLogin = false;
var kakaoLoginButton = document.getElementById('kakaoLoginBtn');
var kakaoFriendsbutton = document.getElementById('kakaoFriendsBtn');
var sendButton = document.getElementById('chatMessageSendBtn');
var chatInput = document.getElementById('chatInput');
var locationLoadButton = document.getElementById('locationLoadBtn');
var midpointCalcButton = document.getElementById('midpointCalcBtn');

//////// SOCKET INITIALIZATION + CHAT ////////

socket.on('connect', function() {
  if (!isConnected) {
    var name = prompt('Username:','');
    isConnected = true;
    initMap();
    socket.emit('newUserConnect', name);
    myName = name;
  }
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

sendButton.addEventListener('click', function() {
  var message = chatInput.value;
  if(!message) return false;

  socket.emit('sendMessage', {message});

  chatInput.value = '';
});

//////// KAKAO ////////

if (isLogin) document.getElementById("kakaoLoginBtn").disabled = true;
else document.getElementById("kakaoLoginBtn").disabled = false;

kakaoLoginButton.addEventListener('click', function() {
  Kakao.init('a79182cf34f944ca68c3976d8fd108c8');
  Kakao.Auth.login({
    scope: 'friends',
    success: (auth) => {
      console.log('logged in');
      isLogin = true;
      document.getElementById("kakaoLoginBtn").disabled = true;
      document.getElementById("kakaoFriendsBtn").disabled = false;
      Kakao.API.request({
        url: '/v2/user/me',
        success: function(response) { // properties에 '동의항목'에 있는 내용이 포함됨
          myProfile = {
            id: response.id,
            nickname: response.properties.nickname,
            profile_image: response.properties.profile_image
          };
        },
        fail: function(error) {
          console.log(error);
        }
      });
    },
    fail: (err) => {
      console.error(err);
    }
  });
});

kakaoFriendsbutton.addEventListener('click', function() {
  Kakao.API.request({
    url: '/v1/api/talk/friends',
    success: function(response) {
      console.log(response);
    },
    fail: function(error) {
      console.log(error);
    }
  });
});

//////// MAP DISPLAY ////////

function initMap() {
  map = new google.maps.Map(document.getElementById("map"), {
    center: { lat: 36.37, lng: 127.36 },
    zoom: 6,
  });
  directionsService = new google.maps.DirectionsService();
  directionsDisplay = new google.maps.DirectionsRenderer();
  directionsDisplay.setMap(map);
  infoWindow = new google.maps.InfoWindow();
  const locationButton = document.createElement("button");
  locationButton.textContent = "현재 위치로 이동";
  locationButton.classList.add("custom-map-control-button");
  map.controls[google.maps.ControlPosition.TOP_CENTER].push(locationButton);
  locationButton.addEventListener("click", () => {
    // Try HTML5 geolocation.
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const pos = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          infoWindow.setPosition(pos);
          infoWindow.setContent("현재 위치를 찾았습니다");
          infoWindow.open(map);
          map.setCenter(pos);
          new google.maps.Marker({
            position: pos,
            map: map,
            label: "당신의 현재 위치"
          });
          myPosition = pos;
          document.getElementById("locationLoadBtn").disabled = false;
        },
        () => {
          handleLocationError(true, infoWindow, map.getCenter());
        }
      );
    } else {
      // Browser doesn't support Geolocation
      handleLocationError(false, infoWindow, map.getCenter());
    }
  });
}

function handleLocationError(browserHasGeolocation, infoWindow, pos) {
  infoWindow.setPosition(pos);
  infoWindow.setContent(
    browserHasGeolocation
      ? "Error: The Geolocation service failed."
      : "Error: Your browser doesn't support geolocation."
  );
  infoWindow.open(map);
}

//////// REQUESTING FRIEND'S LOCATION ////////

locationLoadButton.addEventListener('click', function() {
  socket.emit('locationRequest');
});

socket.on('locationRequestResponse', function(data) {
  if (data.name !== myName) {
    data.pos = myPosition;
    socket.emit('sendLocation', {data});
  }
});

socket.on('sendLocationResponse', function(data) {
  if (data.name !== myName) {
    new google.maps.Marker({
      map: map,
      //position: data.pos,
      position: new google.maps.LatLng(36.37, 127.36),
      label: "친구의 현재 위치"
    });
    document.getElementById("midpointCalcBtn").disabled = false;
  }
});

//////// ROUTING ////////

function calcRoute() {
  var start = myPosition;
  var end = new google.maps.LatLng(36.37, 127.36);
  var request = {
      origin: start,
      destination: end,
      travelMode: google.maps.TravelMode.TRANSIT
  };
  directionsService.route(request, function(response, status) {
    if (status === google.maps.DirectionsStatus.OK) {
      directionsDisplay.setDirections(response);
      var numberofWaypoints = response.routes[0].overview_path.length;
      var midPoint = response.routes[0].overview_path[parseInt(numberofWaypoints / 2)];
      new google.maps.Marker({
          map: map,
          position: new google.maps.LatLng(midPoint.lat(),midPoint.lng()),
          label: '중간지점'
      });
    }
  });
}

midpointCalcButton.addEventListener('click', function() {
  calcRoute();
});