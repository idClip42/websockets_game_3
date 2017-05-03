"use strict";

let ctx;
let canvas;
let socket;

let prevState;

// 
// The rooms that the player can
// choose to go in for their tasks
// Hold information for
// visualization
//
const rooms = [
    {
        name: "Food Storage",
        x: 0.2,
        y: 0.15,
        width: 0.2,
        height: 0.2
        // CORRESPONDS TO FOOD TASK 0
    },
    {
        name: "Chem Storage",
        x: 0.6,
        y: 0.15,
        width: 0.2,
        height: 0.2
        // CORRESPONDS TO CHEM TASK 1
    },
    {
        name: "Generator",
        x: 0.2,
        y: 0.65,
        width: 0.2,
        height: 0.2
        //CORRESPONDS TO POWER TASK 2
    },
    {
        name: "Main Lab",
        x: 0.35,
        y: 0.35,
        width: 0.3,
        height: 0.3
        // CORRESPONDS TO MAIN TASK 3, NOTHING TASK -1
    },
];

//
// The game object
// This is all the info for the current game being played
// Changes with every update
//
let game = {
/*
    // Filled with demo info
    GAMESTATE: Object.freeze({
      LOBBY: 0,
      GATHERING: 1,
      VOTING: 2,
      INFO: 3,
    }),
    state: 0,
    players: [
    
    //    {
    //        name: "Alex",
    //    },
    //    {
    //        name: "Ben",
    //    },
    //    {
    //        name: "Frankenstein",
    //    },
        
    ],
    food: 3,
    chems: 5,
    generator: 9,
    message: "this is a demo message",
    */
};

//
// The players to be drawn on screen
// in the map
//
const playerDraws = [
    // Filled with demo info
    /*
    {
        name: "Alex",
        x: 0,
        y: 0,
        tx: 0,
        ty: 0
    },
    {
        name: "Ben",
        x: 0,
        y: 0,
        tx: 0,
        ty: 0
    },
    {
        name: "Frankenstein",
        x: 0,
        y: 0,
        tx: 0,
        ty: 0
    },
    */
];

const updateGameObject = (data) => {
    
    // An update means we are in a game,
    // which means we don't need to enter a game name
    //e.target.hidden = true;
    document.querySelector("#roomName").hidden = true;

    //console.log("Got a data");

    // Goes through each of the players
    for(let n = 0; n < data.players.length; ++n){
        // If there is no game, stop this loop
        if(!game) break;

        // Determines room by checking task
        // If task index not in room list
        // set it to the index of the main room
        let task = data.players[n].task;
        if(!rooms[task]) task = 3;
    
        // If this player is new, add them to the playerDraws
        if(!game.players || !game.players[n]) {
            playerDraws[n] = {
                name: data.players[n].name,
                x: 0,
                y: 0,
                tx: 0,
                ty: 0
            };
            setPlayerTarget(playerDraws[n], rooms[task]);
        }        
        // only update once per action   
        //if (data.state !== prevState) {

        if(game && game.players && game.players[n] && 
            game.players[n].task != data.players[n].task){
        
          // Update the playerdraws with their location
          setPlayerTarget(playerDraws[n], rooms[task]);
        } 

        //if(game.players[n].task != data.players[n].task)
        // setPlayerTarget(playerDraws[n], rooms[data.players[n].task]);
    }
    
    // Updates all the game data
    game = data;
};

const initSockets = () => {
    //*
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
    document.querySelector("#roomName").onsubmit = submitRoomName;
};

const initCanvas = () => {
    canvas = document.querySelector("canvas");
    ctx = canvas.getContext("2d");
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
};

const init = () => {

    initSockets();
    initPage();
    initCanvas();

    setPlayerTargets();
	update();
};

window.onload = init;

const displayMakeRoom = () => {

};

const displayLobby = () => {
    let names = game.players;
    ctx.fillStyle = "white";
    ctx.textAlign = "center";
    ctx.textBaseline="top"; 
    ctx.font = "30px Arial";
    let x = canvas.width/2;
    let y = 150;
    ctx.fillText("WAITING TO START...",x,y);
    ctx.fillText("IN LOBBY:",x,y + 35);
    ctx.fillText("ROOM NAME: " + game.room,x,y + 70);
    for(let n = 0; n < names.length; ++n){
        ctx.fillText(names[n].name, x, y + ((n+3) * 35));
    }
};

const displayMap = () => {
    drawRooms();
    updatePlayers();
    drawStats();
};

const update = () => {
	requestAnimationFrame(update);

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    ctx.fillStyle = "black";
    ctx.fillRect(0,0,canvas.width,canvas.height);

	  drawCornerFrames();

    drawMessage();

    // DRAW GAME MESSAGE

    if(!game.GAMESTATE){
        displayMakeRoom();
    } else if(game.state == game.GAMESTATE.LOBBY){
        displayLobby();
    } else if(game.state == game.GAMESTATE.GATHERING){
        displayMap();
    } else if(game.state == game.GAMESTATE.VOTING){
        displayMap();
    } else if(game.state == game.GAMESTATE.INFO){
        
    } else {

    }

    prevState = game.state;
};

const drawCornerFrames = () => {
    ctx.fillStyle = "white";
    const offset = 30;
    const length = 100;
    const thickness = 3;

    ctx.fillRect(offset, offset, thickness, length);
    ctx.fillRect(offset, offset, length, thickness);

    ctx.fillRect(offset, canvas.height - offset, thickness, -length);
    ctx.fillRect(offset, canvas.height - offset, length, thickness);

    ctx.fillRect(canvas.width - offset, offset, -thickness, length);
    ctx.fillRect(canvas.width - offset, offset, -length, -thickness);

    ctx.fillRect(canvas.width - offset, canvas.height - offset, -thickness, -length);
    ctx.fillRect(canvas.width - offset, canvas.height - offset, -length, -thickness);
};

const drawRooms = () => {
    const lineWidth = 3;
    ctx.strokeStyle = "white";
    ctx.fillStyle = "white";
    ctx.textAlign = "left";
    ctx.textBaseline="top"; 
    ctx.font = "20px Arial";

    //let keys = Object.keys(rooms);
    //for(let n = 0; n < keys.length; ++n){
    for(let n = 0; n < rooms.length; ++n){
        //let r = rooms[keys[n]];
        let r = rooms[n];
        let x = r.x * canvas.width;
        let y = r.y * canvas.height;
        let w = r.width * canvas.width;
        let h = r.height * canvas.height;
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + w, y);
        ctx.lineTo(x + w, y + h);
        ctx.lineTo(x, y + h);
        ctx.lineTo(x, y);
        ctx.stroke();
        ctx.restore();

        ctx.fillText(r.name, x + 5, y + 5);
    }
};

const setPlayerTarget = (player, room) => {
    player.tx = room.x + Math.random() * room.width;
    player.ty = room.y + Math.random() * room.height;
};

const setPlayerTargets = () => {
    for(let n = 0; n < playerDraws.length; ++n){
        let player = playerDraws[n];
        //let room = rooms.main;
        let room = rooms[3];
        setPlayerTarget(player, room);
    }
};

const updatePlayers = () => {
    const lerp = 0.1;
    for(let n = 0; n < playerDraws.length; ++n){
        let player = playerDraws[n];
        player.x += (player.tx - player.x) * lerp;
        player.y += (player.ty - player.y) * lerp;

        let x = player.x * canvas.width;
        let y = player.y * canvas.height

        let color = "white";
        // Shows who the thing is for debug purposes
        //if(game.players[n].thing === true) color = "red";

        drawCircle(x, y, 3, color);
        ctx.fillStyle = color;
        ctx.textAlign = "left";
        ctx.textBaseline="top"; 
        ctx.font = "16px Arial";
        ctx.fillText(player.name, x + 5, y + 5);
    }
};

const drawStats = () => {
    ctx.fillStyle = "white";
    ctx.textAlign = "left";
    ctx.textBaseline="middle"; 
    ctx.font = "24px Arial";

    const x = 0.6 * canvas.width;
    const y = 0.7 * canvas.height;
    const height = 50;
    const length = 100;
    const blockWidth = 10;
    const blockOffset = 15;

    ctx.fillText("Food:", x, y);
    let foodCount = game.food;
    if(foodCount < 0) foodCount *= -1;
    for(let n = 0; n < foodCount; ++n)
        ctx.fillRect(x + length + blockOffset*n, y, blockWidth, blockWidth);
    ctx.fillText("Chems:", x, y + height);
    let chemCount = game.chems;
    if(chemCount < 0) chemCount *= -1;
    for(let n = 0; n < chemCount; ++n)
        ctx.fillRect(x + length + blockOffset*n, y + height, blockWidth, blockWidth);
    ctx.fillText("Power:", x, y + height * 2);
    for(let n = 0; n < game.generator; ++n)
        ctx.fillRect(x + length + blockOffset*n, y + height*2, blockWidth, blockWidth);

};

const drawMessage = () => {
    if(!game) return;

    let x = 0.5 * canvas.width;
    let y = 0.1 * canvas.height;

    ctx.fillStyle = "white";
    ctx.textAlign = "center";
    ctx.textBaseline="middle"; 
    ctx.font = "24px Arial";

    ctx.fillText(game.message, x, y);
};

const drawCircle = (x,y,r,color) => {
    ctx.save();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, 2*Math.PI);
    ctx.fill();
    ctx.restore();
};

const submitRoomName = (e) => {
    e.preventDefault();
    let name = e.target.firstChild.value;
    if(name == "") return false;

    if(socket)
        socket.emit("makeGame", name);
    else 
        console.log("no socket connected");

    return false;
};