"use strict";

let socket;
let nameEl;
let roomEl;
let messageEl;
let loginContainer;
let actionContainer;
let voteContainer;
let submitBtn;
let debug = true;

let name = "";
let room = "";

let prevPhase;
let game;

const log = (output) => {
  console.log(output);
}

const q = (str) => {
  return document.querySelector(str);
}

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
    socket.emit(eventName,{ "name": name, "action": btn.innerHTML });
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

const displayVoteChoices = () => {
  for (let i=0; i<game.players.length; i++) {
    createVote(game.players[i].name);
  }
}

// player choices on a given turn
const displayPlayerChoices = () => {
  createChoice("food");
  createChoice("generator");
  createChoice("chems");
}

const updateGame = (data) => {
  game = data;
  if (prevPhase === game.state) return;
  prevPhase = game.state;
  switch (game.state) {
    // lobby
    case 0:
      // welcome to the arctic research facility
      break;
    // gather
    case 1:
      messageEl.innerHTML = "GATHERING PHASE";
      break;
    // vote
    case 2:
      displayVoteChoices();
      messageEl.innerHTML = "VOTING PHASE";
      break;
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
        const b = document.createElement("button");
        b.setAttribute("class", "startGame");
        b.innerHTML = "START GAME"
        b.onclick = () => {
          socket.emit("startGame");
        }
        document.body.appendChild(b);
      }
      hideLogin();
      messageEl.innerHTML = "WAITING FOR PLAYERS"
    });
    
    socket.on("start failed", (data) => {
      alert(data);
    });
    
    socket.on("start succeeded", (data) => {
      q(".startGame").remove();
      GatheringPhase();
    });
};

const GatheringPhase = () => {
  // temporary
  messageEl.innerHTML = "GATHERING PHASE"
  displayPlayerChoices();
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
    voteContainer = q(".vote");
    submitBtn = q(".submit");
    log(submitBtn);
    
    // events
    submitBtn.onclick = () => { joinGame(); };
};

const init = () => {
  log("init");
  initSockets();
  initPage();
};

window.onload = init;
