"use strict";

let socket;
let nameEl;
let roomEl;
let messageEl;
let loginContainer;
let actionContainer;
let voteContainer;
let healthContainer;
let submitBtn;
let debug = true;

let name = "";
let room = "";

let prevPhase;
let prevMsg = "";
let game;
let self; // self reference refreshed every update;

let hearts;

// An enumeration for the Gamestate
const GAMESTATE = Object.freeze({
  LOBBY: 0,
  GATHERING: 1,
  VOTING: 2,
  INFO: 3,
  END: 4
});

// shorthand for print
const log = (output) => {
  //console.log(output);
}

// shorthand for query selector
const q = (str) => {
  return document.querySelector(str);
}

// search an array for an object with a given property == a value
const elemWithProperty = (arrayOfObjects, propertyName, match) => {
  // loop
  for (let i = 0; i < arrayOfObjects.length; i++) {
    // match found
    if (match === arrayOfObjects[i][propertyName]) {
      return arrayOfObjects[i];
    }
  }
  // no match found
  return undefined;
};

const hideLogin = () => {
  loginContainer.style.display = "none";
}

const joinGame = () => {
  log("asdF");
  socket.emit("joinGame",{ "name": nameEl.value, "room": roomEl.value });
}

// choice made
const removeChoices = () => {
  // clear button continer
  actionContainer.innerHTML = "";
  voteContainer.innerHTML = "";
}

// create a click listener for a choice button 
const activateChoiceBtn = (btn, eventName) => { 
  const b = btn;
  b.onclick = () => {
    socket.emit(eventName,{ "name": name, "choice": btn.innerHTML });
    removeChoices();
    if (debug) log(btn.innerHTML);
  }
  return b;
}

// create a new choice button
const createChoice = (choiceString) => {
  const btn = document.createElement("button");
  btn.innerHTML = choiceString;
  activateChoiceBtn(btn, 'action');
  actionContainer.appendChild(btn);
}

// create a new vote button
const createVote = (choiceString) => {
  const btn = document.createElement("button");
  btn.innerHTML = choiceString;
  activateChoiceBtn(btn, 'vote');
  voteContainer.appendChild(btn);
}

const createNoneVote = () => {
  const btn = document.createElement("button");
  btn.innerHTML = "None";
  btn.onclick = () => {
    socket.emit('vote',{ "name": name, "choice": "_^_&$^%%" });
    removeChoices();
  }
  voteContainer.appendChild(btn);
}

const displayVoteChoices = () => {
  for (let i=0; i<game.players.length; i++) {

    let name = game.players[i].name;
    if(self.thing == true &&
      game.players[i].thing == true)
      name += "*";

    createVote(name);
  }
  createNoneVote();
}

// player choices on a given turn
const displayPlayerChoices = () => {
  createChoice("food");
  createChoice("generator");
  createChoice("chems");
}

const showHealth = () => {
  for (var i=0; i<5; i++) {
    if (i <= self.health) {
      hearts[i].setAttribute("class", "full");
    } else {
      hearts[i].setAttribute("class", "");
    }
  }
}

const updateGame = (data) => {
  game = data;
  self = elemWithProperty(data.players,'name',name);
  if (prevMsg !== game.message) {
    healthContainer.style.display = "block";
    messageEl.innerHTML = game.message;
    prevMsg = game.message;
    // if there is a new vote, display the new vote
    if (game.state === GAMESTATE.VOTING) {
      removeChoices();
      displayVoteChoices();
    }
  }
  if (prevPhase === game.state) return;
  if (self.thing) { 
    q(".healthLabel").innerHTML = "You are the thing"; 
  } else {
    q(".healthLabel").innerHTML = "Eat to restore health"; 
  }
  prevPhase = game.state;
  showHealth();
  switch (game.state) {
    // lobby
    case GAMESTATE.LOBBY:
      // welcome to the arctic research facility
      break;
    // gather
    case GAMESTATE.GATHERING:
      removeChoices();
      displayPlayerChoices();
      break;
    // vote
    case GAMESTATE.VOTING:
      removeChoices();
      displayVoteChoices();
      break;
    case GAMESTATE.END  :
      GameOverPhase();
      break;
      
  }
  if (self.dead) {
    q(".healthLabel").innerHTML = "You have died"; 
    removeChoices();
  }
}

const initSockets = () => {
    socket = io.connect();

    socket.on("update", (data) => {
      updateGame(data);
    });
    
    socket.on("join failed", (data) => {
      alert("ERROR: "+data);
    });
    
    socket.on("join succeeded", (data) => {
      // set properties
      name = nameEl.value;
      room = roomEl.value;
      
      // first player gets start button
      if (data === "first") {
        const c = document.createElement("div");
        c.setAttribute("class","container");
        const b = document.createElement("button");
        b.setAttribute("class", "startGame");
        b.innerHTML = "ALL PLAYERS READY"
        b.onclick = () => {
          socket.emit("startGame");
        }
        c.appendChild(b);
        q(".controller").appendChild(c);
      }
      hideLogin();
      messageEl.innerHTML = "WAITING FOR PLAYERS"
    });
    
    socket.on("start failed", (data) => {
      alert(data);
    });
    
    socket.on("start succeeded", (data) => {
      healthContainer.style.display = "block";
      q(".startGame").remove();
      GatheringPhase();
    });
};

const GatheringPhase = () => {
  // temporary
  messageEl.innerHTML = "GATHERING PHASE"
  //displayPlayerChoices(); now handled by update
}

const ShowRestartButton = () => {
  const c = document.createElement("div");
  c.setAttribute("class","container");
  const b = document.createElement("button");
  b.setAttribute("class", "startGame");
  b.innerHTML = "START NEW GAME"
  b.onclick = () => {
    socket.emit("startGame");
  }
  c.appendChild(b);
  q(".controller").appendChild(c);
}

const GameOverPhase = () => {
  removeChoices();
  ShowRestartButton();
}

const initPage = () => {
    document.onscroll = function(e){
        e.preventDefault();
    };
    
    // get references to DOM elements
    nameEl = q(".name");
    roomEl = q(".room");
    messageEl = q(".message");
    loginContainer = q(".login");
    actionContainer = q(".action");
    healthContainer = q(".HUD");
    voteContainer = q(".vote");
    submitBtn = q(".submit");
    hearts = document.querySelectorAll(".health > div");
    //q('.closeAd').onclick = () => { 
    //  q('.ad').parentNode.removeChild(q('.ad')); 
    //};
    
    healthContainer.style.display = "none";
    
    // events
    //submitBtn.onclick = (e) => { 
    q("#loginContainer").onsubmit = (e) => {
      e.preventDefault();
      joinGame(); 
      return false;
    };
};

const init = () => {
  log("init");
  initSockets();
  initPage();
};

window.onload = init;
