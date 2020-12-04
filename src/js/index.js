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
var chatWindow = document.getElementById('chatWindow');
var kakaoLoginButton = document.getElementById('kakaoLoginBtn');
var kakaoFriendsbutton = document.getElementById('kakaoFriendsBtn');
var sendButton = document.getElementById('chatMessageSendBtn');
var chatInput = document.getElementById('chatInput');
var locationLoadButton = document.getElementById('locationLoadBtn');
var midpointCalcButton = document.getElementById('midpointCalcBtn');
var addressBookWindow = document.getElementById('addressbook');
var appointmentButton = document.getElementById('appointmentBtn');

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

//////// KAKAO + ADDRESS BOOK ////////

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
      var friendEl = drawAddressBook(response);
      addressBookWindow.appendChild(friendEl);
    },
    fail: function(error) {
      console.log(error);
    }
  });
});

function drawAddressBook(data) {
  const friends = data.elements;
  var wrap = document.createElement('p');
  var img = document.createElement('img');
  var name = document.createElement('span');
  var button = document.createElement('button');
  
  name.innerText = friends[0].profile_nickname;
  img.src = friends[0].profile_thumbnail_image;
  button.innerText = "1:1 대화";
  button.onclick = () => {
    socket.emit('chatConnect', name.innerText);
  }
  
  name.classList.add('output__user__name');
  img.classList.add('output__user__image');
  button.classList.add('output__user_button');
  
  wrap.classList.add('output__user');
  wrap.dataset.id = socket.id;
  
  wrap.appendChild(img);
  wrap.appendChild(name);
  wrap.appendChild(button);
  
  return wrap;
}

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



////////// Google Calendar API //////////

/*

import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const { google } = require('googleapis')

const { OAuth2 } = google.auth

const oAuth2Client = new OAuth2('95982012649-cspq20jvq5ur59gmnj2uekgvhjlic3u7.apps.googleusercontent.com', 'Ieecb1R0H0c0Z_WqRHGTYg2A')

oAuth2Client.setCredentials({ refresh_token: '1//04GpYZO9RWCWKCgYIARAAGAQSNwF-L9IrV1tHgNxtWmutp9-XKg8OY2oT-K3GMfgQlDO_1p-9Ic65VfiPuIrVaT1SpG-IatF46rg',})

const calendar = google.calendar({ version: 'v3', auth: oAuth2Client })

const eventStartTime = new Date()

eventStartTime.setDate(eventStartTime.getDay() + 2)

const eventEndTime = new Date()
eventEndTime.setDate(eventEndTime.getDay() + 2)
eventEndTime.setMinutes(eventEndTime.getMinutes() + 45)

const event = {
    summary: 'Meeting Appointment',
    location: 'Location testing text',
    description: 'Testing description number 1',
    start: {
        dateTime: eventStartTime,
        timeZone: 'Asia/Seoul',
    },
    end: {
        dataTime: eventEndTime,
        timeZone: 'Asia/Seoul',
    },
    colorId: 1, 
}

calendar.freebusy.query(
    {
        resource: {
            timeMin: eventStartTime,
            timeMax: eventEndTime,
            timeZone: 'Asia/Seoul',
            items: [{id: 'primary'}],
        },
    },
    (err, res) => {
        if (err) return console.error('Busy Query Error: ', err)

        const eventsArr = res.data.calendars.primary.busy

        if (eventsArr.length === 0) return calendar.events.insert(
        { calendarId: 'primary', resource: event },
            err => {
                if (err) return console.error('Calendar Event Creation Error: ', err)

                return console.log('Calendar Event Created.')
            })
        return console.log(`Sorry, I'm Busy`)
    }
)
*/
