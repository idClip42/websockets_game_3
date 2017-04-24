"use strict";

let socket;
let messageEl;
let actionContainer;
let voteContainer;

const initSockets = () => {
    /*
    socket = io.connect();

    socket.on("update", (data) => {
        updateGameObject(data);
    });

    socket.emit("joinGame");
    //*/
};

const initPage = () => {
    document.onscroll = function(e){
        e.preventDefault();
    };
};

const init = () => {
  initSockets();
  initPage();

};

window.onload = init;
