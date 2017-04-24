"use strict";

let socket;
let messageEl;
let actionContainer;
let voteContainer;
let submitBtn;
let debug = true;

const log = (output) => {
  console.log(output);
}

const initSockets = () => {
    socket = io.connect();

    socket.on("update", (data) => {
        updateGameObject(data);
    });

    socket.emit("joinGame");
};

const initPage = () => {
    document.onscroll = function(e){
        e.preventDefault();
    };
    
    // get references to DOM elements
    messageEl = document.querySelector(".message");
    actionContainer = document.querySelector(".action");
    voteContainer = document.querySelector(".vote");
    submitBtn = document.querySelector(".submit")
    
    // events
    
};

// create a new choice button
const createChoice = (choiceString) => {
  const btn = document.create("button");
  btn.innerHTML = choiceString;
  activateChoiceBtn(btn);
  actionContainer.appendChild(btn);
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

// choice made
const resolveChoice = () => {
  // clear button continer
  actionContainer.innerHTML = "";
}

const init = () => {
  initSockets();
  initPage();

};

window.onload = init;
