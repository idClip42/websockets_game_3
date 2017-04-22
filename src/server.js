/*


    SERVER AND PAGE REQUESTS


*/

const express = require('express');

const app = express();
app.use(express.static('client'));
const http = require('http').Server(app);
const socketio = require('socket.io');
const url = require('url');

const port = process.env.PORT || process.env.NODE_PORT || 3000;

// start server listen to all IPs on port
http.listen(port, '0.0.0.0', 511, () => {
  console.log(`listening on *: ${port}`);
  // console.log(`Listening on 127.0.0.1: ${port}`);
});

// FILE SERVING HANDLED BY EXPRESS

// const app = http.createServer(onRequest).listen(port);
app.get('/', (req, res) => {
  console.log('request recieved');
  res.sendFile(`${__dirname}/client/index.html`);
});
app.get('/game', (req, res) => {
  console.log('request recieved');
  res.sendFile(`${__dirname}/../client/game.html`);
});


/*


    VARIABLES AND CONSTRUCTORS


*/

const io = socketio(http);

const roomGames = {};

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
  MAIN: 3,
  NOTHING: 4,
});

const GameCreator = (room) => {
  const game = {};

  game.players = [];
  game.room = room;
  game.state = GAMESTATE.LOBBY;
  game.food = 0;
  game.chem = 0;
  game.generator = GAME.MAX_POWER;

  game.GAMESTATE = GAMESTATE;
  game.TASKS = TASKS;

  // Seal it!
  return Object.seal(game);
};

const PlayerCreator = (name, id) => {
  const player = {};

  player.name = name;
  player.health = Math.round(Math.random() * GAME.MAX_HEALTH);
  player.task = TASKS.NOTHING;
  player.thing = false;
  player.socketID = id;

  // Seal it!
  return Object.seal(player);
};


// The "framerate" - updates 60 times a second
const frameTime = 1000 / 60;


/*


    HELPERS


*/


const emitUpdate = (room) => {
  const obj = roomGames[room];
  io.to(room).emit('update', obj);
};


/*


    SOCKETS


*/


io.sockets.on('connection', (socket) => {
  console.log('connected');

  socket.on('update', (data) => {
    // Update individual values in the Game object here
    // (data should hold only the properties that need to be changed)
    // (actually, data should probably hold the player object only,
    //  since that's the only thing the player will be updating)

    emitUpdate(socket.room);  // socket.room may not be valid
  });

  socket.on('joinGame', (data) => {

    let game = roomGames[data.room];
    if(game.state != GAMESTATE.LOBBY) return;

    // TODO: Check if their socket id matches one already in the player list first
    socket.join(data.room);
    let player = PlayerCreator(data.name, socket.id);
    game.players.push(player);
    emitUpdate(data.room);
  });

  socket.on('makeGame', (name) => {
    if (!roomGames[name]) { roomGames[name] = GameCreator(name); }
    socket.join(name);
    emitUpdate(name);
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

