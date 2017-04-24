/*
*
*
*
*
*
*
*
*
    SERVER AND PAGE REQUESTS
*
*
*
*
*
*
*
*
*
*/

const express = require('express');

const app = express();
app.use(express.static('client'));
const http = require('http').Server(app);
const socketio = require('socket.io');
const url = require('url');
var path = require('path');

const port = process.env.PORT || process.env.NODE_PORT || 3000;

// start server listen to all IPs on port
http.listen(port, '0.0.0.0', 511, () => {
  console.log(`listening on *: ${port}`);
  // console.log(`Listening on 127.0.0.1: ${port}`);
});

// FILE SERVING HANDLED BY EXPRESS

// DOESN'T DO ANYTHING
app.get('/', (req, res) => {
  // does not run, just returns index
  console.log('root request recieved');
  res.sendFile(path.resolve('client/controller.html'));
});


// SEND CONTROLLER
app.get('/controller', (req, res) => {
  console.log('request recieved');
  res.sendFile(path.resolve('client/controller.html'));
});

// SEND CANVAS GAME
app.get('/game', (req, res) => {
  console.log('request recieved');
  res.sendFile(path.resolve('client/game.html'));
});


/*
*
*
*
*
*
*
*
*
*
    VARIABLES AND CONSTRUCTORS
*
*
*
*
*
*
*
*
*
*/

const io = socketio(http);

// A game object where the key-value pairs are
// room names as keys holding Game objects
const roomGames = {};

// An enumeration for basic game values
const GAME = Object.freeze({
  MAX_POWER: 10,
  MAX_HEALTH: 5,
  MIN_PLAYERS: 4,
  MAX_PLAYERS: 8,
  VOTING_TIME: 30,   // timer should give time for discussion
  CHEMS_TO_TEST: 5,
});

// An enumeration for the Gamestate
const GAMESTATE = Object.freeze({
  LOBBY: 0,
  GATHERING: 1,
  VOTING: 2,
  INFO: 3,
});

// An enumeration for the tasks players select
// During the Gathering game state
const TASKS = Object.freeze({
  FOOD: 0,
  CHEM: 1,
  POWER: 2,
  MAIN: 3,
  NOTHING: -1,
});

// A constructor for a Game object
// This holds all info about a given game
const GameCreator = (room) => {
  const game = {};

  game.players = [];                  // List of players in game
  game.room = room;                   // Name of the room this game is in
  game.state = GAMESTATE.LOBBY;       // The current state of the game
  game.food = 0;                      // How much food has been collected
  game.chems = 0;                     // How many chems have been collected
  game.generator = GAME.MAX_POWER;    // How much power the generator has
  game.message = '';                  // Message shown on the main game screen
                                      // Gives info about events and actions
  game.GAMESTATE = GAMESTATE;         // A copy of the enumerations for gamestate
  game.TASKS = TASKS;                 // and tasks, for use on the client side

  return Object.seal(game);
};

// A constructor for a player object
// Holds all info about a given player
const PlayerCreator = (name, id) => {
  const player = {};

  player.name = name;                                             // The player's name
  player.health = Math.round(Math.random() * GAME.MAX_HEALTH);    // How much health they have (initialized randomly)
  player.task = TASKS.NOTHING;                                    // The player's selected task for the Gathering game state
  player.thing = false;                                           // Whether this player is The Thing
  player.socketID = id;                                           // The player client's socket id
  player.disabled = false;                                        // Whether the player has disconnected (used to allow reconnect
                                                                  // and prevent waiting for input from the disabled player)
  player.dead = false;                                            // Whether the player is dead (after being discovered as The Thing)
  player.vote = -1;                                               // An int signifiying what the player has voted for (corresponds to player index)

  return Object.seal(player);
};


const frameTime = 1000 / 60;          // The "framerate" - updates 60 times a second


/*
*
*
*
*
*
*
*
*
*
*
    HELPERS
*
*
*
*
*
*
*
*
*
*
*
*/


// Emits the Game object to everyone in the room
const emitUpdate = (room) => {
  const obj = roomGames[room];
  io.to(room).emit('update', obj);    // Unsure if this is correct
};


/*
*
*
*
*
*
*
*
*
*
    SOCKETS
*
*
*
*
*
*
*
*
*
*/


io.sockets.on('connection', (socket) => {
  console.log('connected');

  socket.on('update', (data) => {
    // Update individual values in the Game object here
    // (data should probably hold the player object only,
    //  since that's the only thing the player will be updating)

    emitUpdate(socket.room);  // socket.room may not be valid
    // This line is not needed if an update is sent out every frame in game loop
    // Can probably be deleted
  });

  socket.on('joinGame', (data) => {
    // data here should hold a room property and a player name property

    if(!data) return;

    const game = roomGames[data.room];

    // If the game is not in the Lobby, cannot add a player
    if (game.state !== GAMESTATE.LOBBY) return;
    // If the game has maxed out it's players, cannot add any more
    if (game.players.length >= GAME.MAX_PLAYERS) return;

    // TODO: Check if their socket id matches one already in the player list first
    // If it does, this is a returning player who was disconnected
    // Let them back in and set their player.disabled property to false

    socket.join(data.room);
    const player = PlayerCreator(data.name, socket.id);
    game.players.push(player);

    emitUpdate(data.room);
    // For the same reasons as above, this is probably not needed
  });

  socket.on('makeGame', (name) => {
    // The main screen will call this to make a new game

    // If there are no rooms with this name, makes one
    if (!roomGames[name]) { roomGames[name] = GameCreator(name); }
    socket.join(name);

    emitUpdate(name);
    // For the same reasons as above, this is probably not needed
  });

  socket.on('startGame', () => {
    // This should probably be called by a player
    // Perhaps the first player to join, like in Jackbox games?
    // Or perhaps just any player

    const game = roomGames[socket.room];  // socket.room may not be valid

    // If not in the Lobby, the game has already started
    if (game.state !== GAMESTATE.LOBBY) return;
    // Game can't start without enough players
    if (game.players.length < GAME.MIN_PLAYERS) return;
    game.state = GAMESTATE.GATHERING;

    emitUpdate(socket.room);  // socket.room may not be valid
    // For the same reasons as above, this is probably not needed
  });

  socket.on('disconnect', () => {
    // set player.disabled value to true
    // This tells us a player has disconnected
    // They might be back, so we leave the player there
    // But votes do not wait for them when they are disconnected
  });
});


console.log('Websocket server started');


/*
*
*
*
*
*
*
*
*
    VOTING
*
*
*
*
*
*
*
*
*
*/


//
// The given player is tested to see if they are The Thing
// If they are not, it is announced
// If they are, it is announced and they are killed
// and out of the game
//
const testPlayer = (g, p) => {
  const game = g;
  const player = p;

  if (player.thing === false) { game.message = `${player.name} is tested and found to be human.`; } else {
    game.message = `${player.name} is tested and is revealed to be The Thing! They are quickly killed`;
    player.dead = true;
  }
};


//
// At the end of the voting round,
// values are updated:
// The generator loses a unit of power
// All humans use one unit of health
//
const endVotingRound = (g, p) => {
  const game = g;
  const players = p;

  // Drains the generator
  game.generator -= (game.generator > 0) ? 1 : 0;
  if (game.generator <= 0) { game.message = 'The generator is out of power. You are plunged into darkness.'; }

  // Subtracts health from non-thing players
  for (let n = 0; n < players.length; n += 1) {
    if (players[n].thing === false && players[n].health > 0) { players[n].health -= 1; }
  }
};


//
// Checks whether everyone has voted yet
// Makes sure only non-disabled people need to vote
//
const doneVoting = (pl, property) => {
  const players = pl;

  let allVoted = true;
  for (let p = 0; p < players; p += 1) {
    if (players[p][property] === -1 && players[p].disabled === false) { allVoted = false; }
  }
  return allVoted;
};

//
// Resets the given voting property (task or vote) to -1
//
const resetVotes = (pl, property) => {
  const players = pl;

  for (let p = 0; p < players; p += 1) { players[p][property] = -1; }
};


// IMPORTANT NOTE ABOUT VOTING FOR PLAYERS:
// VOTES ARE INTEGERS THAT CORRESPOND TO PLAYER INDICES
// VOTES FOR NO ONE SHOULD BE COUNTED AS THE LENGTH OF THE PLAYER LIST,
// ONE MORE THAN THE FINAL INDEX


//
// Counts up the player votes for a given vote
// If a tie happens, -1 is returned
// Otherwise, the winning index is returned
//
const voteCounting = (p) => {
  const players = p;

  const voteArray = [players.length + 1];     // Creates array of votes
  for (let n = 0; n < voteArray.length; n += 1) { voteArray[n] = 0; }

  for (let n = 0; n < players.length; n += 1) {
    const v = players[n].vote;
    if (v !== -1) {  // Ignores non-voters
      voteArray[v] += 1;  // Adds a vote to the given player
    }
  }

  let choice = -1;
  let votes = -1;
  let tie = false;
  for (let n = 0; n < voteArray.length; n += 1) {
    if (voteArray[n] > votes) {
      choice = n;
      votes = voteArray[n];
      tie = false;
    } else if (voteArray[n] === votes) {
      tie = true;
    }
  }

  resetVotes(players, 'vote');

  if (tie === true) { return -1; }
  return choice;
};


//
// The code for the voting round
// Goes through the food and the chems
// Deals out food until a tie happens or the majority votes for no one (or food runs out)
// Does the same for chems, though a certain number of chems must be used in order to test
//
// If a tie or vote for no one happens, the food/chem count is made negative
// This way, the if statement each frame thinks there is none left and moves on
// After the voting, the counts are made positive again
//
const votingRound = (g, p) => {
  const game = g;
  const players = p;


  // This will have a timer that counts down from GAME.VOTING_TIME

  // FOOD PHASE
  if (game.food > 0) {
    game.message = `Vote for who gets the food. There is ${game.food} food left.`;
    if (doneVoting(players, 'vote') === true) {
      const choice = voteCounting(players);
      if (choice === players.length) {
        game.message = 'No one is given the food. Moving on to chems.';
        game.food *= -1;
      } else if (choice === -1) {
        game.message = 'No one is given the food due to tie vote. Moving on to chems.';
        game.food *= -1;
      } else {
        players[choice].health = GAME.MAX_HEALTH;
        game.food -= 1;
        game.message = `${players[choice].name}is given the food.`;
      }
      resetVotes(players, 'vote');
    }
  } else if (game.chems > GAME.CHEMS_TO_TEST) {
    // CHEM PHASE

    game.message = `Vote for who gets tested. There are enough chems for ${Math.floor(game.chems / GAME.CHEMS_TO_TEST)} tests.`;
    if (doneVoting(players, 'vote') === true) {
      const choice = voteCounting(players);
      if (choice === players.length) {
        game.message = 'No one is tested.';
        game.chems *= -1;
      } else if (choice === -1) {
        game.message = 'No one is tested due to tie vote.';
        game.chems *= -1;
      } else {
        players[choice].health = GAME.MAX_HEALTH;
        game.chems -= GAME.CHEMS_TO_TEST;
        testPlayer(game, players[choice]);
      }
      resetVotes(players, 'vote');
    }
  } else return true;
  return false;
};


/*
*
*
*
*
*
*
*
*
  RUNNING THE GAME
*
*
*
*
*
*
*
*
*/


//
// This looks at each of the task rooms
// (food, chems, generator)
// Looks at who's in each room
// And converts players to The Thing as necessary,
// According to game rules
//
const playersInRooms = (g, pl) => {
  const game = g;
  const players = pl;

  // Goes through each of the tasks/rooms
  for (let t = 0; t < 3; t += 1) {
    const healthy = [];
    const starved = [];
    const thing = [];

    for (let p = 0; p < players.length; p += 1) {
      if (p.task === t) {
        if (p.thing === true) {
          thing.push(p);
        } else if (p.health <= 0) {
          starved.push(p);
        } else {
          healthy.push(p);
        }
      }
    }

    // If theres a thing in the room
    if (thing.length > 1) {
      // If the powers out, everyone is converted
      if (game.generator <= 0) {
        for (let h = 0; h < healthy.length; h += 1) { healthy[h].thing = true; }
      }
      // Any starved people are converted
      for (let s = 0; s < starved.length; s += 1) { starved[s].thing = true; }
      // If there is only one healthy person, they are converted
      if (healthy.length === 1) { healthy[0].thing = true; }
    }
  }
};


//
// Every frame, gameLoop is called
// It goes through each game currently running
// Manages that game's state and performs relevant actions
// Then emits an update to all the clients of the full Game object
//
const gameLoop = () => {
  const keys = Object.keys(roomGames);
  for (let n = 0; n < keys.length; n += 1) {
    const game = roomGames[keys[n]];
    const players = game.players;

    if (game.state === GAMESTATE.LOBBY) {
        // Probably do nothing here
    } else if (game.state === GAMESTATE.GATHERING) {
        // TODO: Timer
      if (doneVoting(players, 'task') === true) {
        game.state = GAME.VOTING;
        playersInRooms(game, players);
        resetVotes(players, 'task');
      }
    } else if (game.state === GAMESTATE.VOTING) {
        // TODO: Timer
      if (votingRound(game, players) === true) {
        game.food *= (game.food < 0) ? -1 : 1;    // If we didn't use the remaining supplies,
        game.chems *= (game.chems < 0) ? -1 : 1;  // their counts were made negative to work with the loops

        endVotingRound(game, players);

        game.state = GAME.GATHERING;
      }
    } else if (game.state === GAMESTATE.INFO) {
        // This is here in case we need it
      console.log('How did we get here?');
    } else {
      console.log(`game.state is somehow ${game.state}`);
    }

    emitUpdate(game.room);
  }
};
setInterval(gameLoop, frameTime);

