/*


    SERVER AND PAGE REQUESTS


*/


const http = require('http');
const fs = require('fs');
const socketio = require('socket.io');
const url = require('url');

const port = process.env.PORT || process.env.NODE_PORT || 3000;

// File imports
let index = fs.readFileSync(`${__dirname}/../client/index.html`);


// Returns page and images on request
const onRequest = (request, response) => {
  const parsedUrl = url.parse(request.url);

  console.log(`Requested: ${request.url}`);

  let data;
  let type;

  switch (parsedUrl.pathname) {
    default:
      // Imports index each time so I don't have to restart server for html changes
      index = fs.readFileSync(`${__dirname}/../client/index.html`);
      data = index;
      type = 'text/html';
  }

  response.writeHead(200, { 'Content-Type': type });
  response.write(data);
  response.end();
};

const app = http.createServer(onRequest).listen(port);

console.log(`Listening on 127.0.0.1: ${port}`);


/*


    VARIABLES AND CONSTRUCTORS


*/


// The "framerate" - updates 60 times a second
const frameTime = 1000 / 60;


/*


    HELPERS


*/


/*


    SOCKETS


*/


const io = socketio(app);

io.sockets.on('connection', (socket) => {
  console.log('connected');

  socket.on('update', (data) => {
    console.log(data);
  });

  socket.on('joinGame', () => {
    socket.join('room1');
  });

  socket.on('disconnect', () => {

  });
});


console.log('Websocket server started');


/*


    RUNNING THE GAME


*/


const gameLoop = () => {
  const obj = {
    test: 'test',
  };
  io.sockets.emit('update', obj);
};
setInterval(gameLoop, frameTime);

