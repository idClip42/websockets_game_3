/*


    SERVER AND PAGE REQUESTS


*/

const express = require('express');

const app = express();
app.use(express.static('client'));
app
const http = require('http').Server(app);
const socketio = require('socket.io');
const url = require('url');

const port = process.env.PORT || process.env.NODE_PORT || 3000;

// start server listen to all IPs on port
http.listen(port, "0.0.0.0", 511, function(){
  console.log(`listening on *: ${port}`);
  //console.log(`Listening on 127.0.0.1: ${port}`);
});


// FILE SERVING HANDLED BY EXPRESS

// const app = http.createServer(onRequest).listen(port);
app.get('/', function(req, res){
  console.log("request recieved");
  res.sendFile(__dirname + '/client/index.html');
});



/*


    VARIABLES AND CONSTRUCTORS


*/

const GAMESTATE = Object.freeze({
  LOBBY: 0,
  GATHERING: 1,
  VOTING: 2,
  INFO: 3,
});

const GAME = Object.freeze({
  MAX_POWER: 10,
  MAX_HEALTH: 5,
});

const TASKS = Object.freeze({
  FOOD: 0,
  CHEM: 1,
  POWER: 2,
  NOTHING: 3,
});

const GameStateCreator = () => {
  const game = {};

  game.players = [];
  game.room = undefined;
  game.state = GAMESTATE.LOBBY;
  game.food = 0;
  game.chem = 0;
  game.generator = GAME.MAX_POWER;

  // Seal it!
  return Object.seal(game);
};

const PlayerCreator = (name) => {
  const player = {};

  player.name = name;
  player.health = Math.round(Math.random() * GAME.MAX_HEALTH);
  player.task = TASKS.NOTHING;
  player.thing = false;

  // Seal it!
  return Object.seal(player);
};


// The "framerate" - updates 60 times a second
const frameTime = 1000 / 60;


/*


    HELPERS


*/


/*


    SOCKETS


*/


const io = socketio(http);

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

