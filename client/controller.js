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
const resolveChoice = () => {
  // clear button continer
  actionContainer.innerHTML = "";
}

// create a click listener for a choice button 
const activateChoiceBtn = (btn) => { 
  const b = btn;
  b.onclick = () => {
    socket.emit("choice",btn.innerHTML);
    resolveChoice();
    if (debug) log(btn.innerHTML);
  }
  return b;
}

// create a new choice button
const createChoice = (choiceString) => {
  const btn = document.createElement("button");
  btn.innerHTML = choiceString;
  activateChoiceBtn(btn);
  actionContainer.appendChild(btn);
}


// player choices on a given turn
const displayPlayerChoices = () => {
  createChoice("food");
  createChoice("generator");
  createChoice("chems");
}

const updateGame = (data) => {

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
      // first player gets start button
      if (data === "first") {
        const b = document.createElement("button");
        b.class = "startGame";
        b.innerHTML = "START GAME"
        b.onclick = () => {
          socket.emit("startGame");
        }
        document.body.appendChild(b);
      }
      hideLogin();
      messageEl.innerHTML = "WAITING FOR PLAYERS"
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
