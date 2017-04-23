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
  MIN_PLAYERS: 4,
  MAX_PLAYERS: 8,
  VOTING_TIME: 30,   // timer should give time for discussion
  CHEMS_TO_TEST: 5,
});

const TASKS = Object.freeze({
  FOOD: 0,
  CHEM: 1,
  POWER: 2,
  MAIN: 3,
  NOTHING: -1,
});

const GameCreator = (room) => {
  const game = {};

  game.players = [];
  game.room = room;
  game.state = GAMESTATE.LOBBY;
  game.food = 0;
  game.chems = 0;
  game.generator = GAME.MAX_POWER;
  game.message = "";    // A way to inform the player of what has just happened in the game
                        // May be wise to make this a (size limited) array of messages

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
  player.disabled = false;  // If a player disconnects
  player.dead = false;
  player.vote = -1;

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
    if(game.players.length >= GAME>MAX_PLAYERS) return;

    // TODO: Check if their socket id matches one already in the player list first
    // If it does, let them in and set the player.disabled property to false
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

  socket.on('startGame', () => {
    if(game.state != GAMESTATE.LOBBY) return;
    if(game.players.length < GAME.MIN_PLAYERS) return;

    let game = roomGames[socket.room];  // socket.room may not be valid
    game.state = GAMESTATE.GATHERING;
    emitUpdate(socket.room);  // socket.room may not be valid
  });

  socket.on('disconnect', () => {
    // set player.disabled value to true
    // This tells us a player has disconnected
    // They might be back, so we leave the player there
    // But votes do not wait for them when disconnected
  });
});


console.log('Websocket server started');


/*


    RUNNING THE GAME


*/


const playersInRooms = (game, players) => {

  // Goes through each of the tasks/rooms
  for(let t = 0; t < 3; ++t){

    let healthy = [];
    let starved = [];
    let thing = [];

    for(let p = 0; p < players.length; ++p){
      if(p.task === t){
        if(p.thing === true)
          thing.push(p);
        else if(p.health <= 0)
          starved.push(p);
        else
          health.push(p);
      }
    }

    // If theres a thing in the room
    if(thing.length > 1){
      // If the powers out, everyone is converted
      if(game.generator <= 0){
        for(let h = 0; h < healthy.length; ++h)
          healthy[h].thing = true
      }
      // Any starved people are converted
      for(let s = 0; s < starved.length; ++s)
        starved[s].thing = true
      // If there is only one healthy person, they are converted
      if(healthy.length === 1)
        healthy[0].thing = true;
    }

  }

};


const testPlayer = (player) => {
  if(player.thing === false)
    game.message = player.name + " is tested and found to be human.";
  else{
    game.message = player.name + " is tested and is revealed to be The Thing! They are quickly killed";
    player.dead = true;
  }
};


const endVotingRound = (game, players) => {
  // Drains the generator
  generator -= (game.generator > 0) ? 1 : 0;

  // Subtracts health from non-thing players
  for(let n = 0; n < players.length; ++n)
    if(players[n].thing == false && players[n].health > 0)
      players[n].health -= 1;
};


const voting = (players, property) => {
  let allVoted = true;
  for(let p = 0; p < players; ++p)
    if(players[p][property] == -1 && players[p].disabled == false)
      allVoted = false;
  return allVoted;
};

const resetVotes = (players, property) => {
  for(let p = 0; p < players; ++p)
    players[p][property] = -1;
};


// IMPORTANT NOTE:
// VOTES ARE INTEGERS THAT CORRESPOND TO PLAYER INDICES
// VOTES FOR NO ONE SHOULD BE COUNTED AS THE LENGTH OF THE PLAYER LIST,
// ONE MORE THAN THE FINAL INDEX
const voteCounting = (players) => {
  let voteArray = [players.length + 1];     // Creates array of votes
  for(let n = 0; n < voteArray.length; ++n)
    voteArray[n] = 0;

  for(let n = 0; n < player.length; ++n){
    let v = players[n].vote;
    if(v != -1){  // Ignores non-voters
      voteArray[v] += 1;  // Adds a vote to the given player
    }
  }

  let choice = -1;
  let votes = -1;
  let tie = false;
  for(let n = 0; n < voteArray.length; ++n){
    if(voteArray[n] > votes){
      choice = n;
      votes = voteArray[n];
      tie = false
    } else if(voteArray[n] == votes){
      tie = true;
    }
  }

  resetVotes(players, "vote");

  if(tie == true)
    return -1;
  return choice;
};

const votingRound = (game, players) => {
  // This will have a timer that counts down from GAME.VOTING_TIME

  // FOOD PHASE
  if(game.food > 0){
    game.message = "Vote for who gets the food. There is " + game.food + " food left.";
    if(voting(players,"vote") == true){
      let choice = voteCounting(players);
      if(choice == players.length){
        game.message = "No one is given the food. Moving on to chems.";
        game.food *= -1;
      } else if(choice == -1){
        game.message = "No one is given the food due to tie vote. Moving on to chems.";
        game.food *= -1;
      } else {
        players[choice].health = GAME.MAX_HEALTH;
        game.food -= 1;
        game.message = players[choice].name + "is given the food.";
      }
      resetVotes(players, "vote");
    } 
  } 

  // CHEM PHASE

  else if(game.chems > GAME.CHEMS_TO_TEST){
    game.message = "Vote for who gets tested. There are enough chems for " + Math.floor(game.chems/GAME.CHEMS_TO_TEST) + " tests.";
    if(voting(players,"vote") == true){
      let choice = voteCounting(players);
      if(choice == players.length){
        game.message = "No one is tested.";
        game.chems *= -1;
      } else if(choice == -1){
        game.message = "No one is tested due to tie vote.";
        game.chems *= -1;
      } else {
        players[choice].health = GAME.MAX_HEALTH;
        game.chems -= GAME.CHEMS_TO_TEST;
        testPlayer(players[choice]);
      }
      resetVotes(players, "vote");
    } 
  }

  else return true;
  return false;
};


const gameLoop = () => {
  
  let keys = Object.keys(roomGames);  
  for(let n = 0; n < keys.length; ++n){
    let game = roomGames[keys[n]];
    let players = game.players;

    if(game.state == GAMESTATE.LOBBY){
        // Probably do nothing here
    } else if(game.state == GAMESTATE.GATHERING){
        // TODO: Timer
        if(voting(players, "task") == true){
          game.state = GAME.VOTING;
          playersInRooms(game, players);
          resetVotes(players, "task");
        }
    } else if(game.state == GAMESTATE.VOTING){
        // TODO: Timer
        if(votingRound(game, players) == true){

          game.food *= (game.food < 0) ? -1 : 1;    // If we didn't use the remaining supplies,
          game.chems *= (game.chems < 0) ? -1 : 1;  // their counts were made negative to work with the loops

          endVotingRound(game, players);
          
          game.state = GAME.GATHERING;
        }
    } else if(game.state == GAMESTATE.INFO){
        // This is here in case we need it
    } else {

    }

    emitUpdate(game.room);
  }

};
setInterval(gameLoop, frameTime);

