//check README.md

//create a web application that uses the express frameworks and socket.io to communicate via http (the web protocol)
const { throws } = require('assert');
const { Console } = require('console');
var express = require('express');
const { get } = require('http');
var app = express();
var http = require('http').createServer(app);
var io = require('socket.io')(http);
// io.sockets.emit('thing');
app.use(express.static('public'));
var UPDATE_TIME = 100

//------------------------CLASSES---------------------------
class Player{
    constructor(x,y){
        this.pos = { x:x, y:y };
        this.speed = 0.05;
        this.rotSpeed = 1;
        this.rot = 0;
    }

    move(angle){
        this.rot = angle;
        let x = this.pos.x + Math.sin(this.rot) * this.speed;
        let y = this.pos.y - Math.cos(this.rot) * this.speed;
        if(isValidPlayerPos(x,y)){
            this.pos.x = x;
            this.pos.y = y;
        }
    }
} 

var gameState = {
    worldSize: 12,
    players: {}
}

//when a client connects
io.on('connection', function (socket) {
    console.log('user connected...');

    //this is sent to the client
    socket.emit('updateState', gameState);

    socket.on('spawn', function(pos){
        console.log('user spawned');
        gameState.players[socket.id] = new Player(pos.x,pos.y);
    });

    socket.on('move', function(angle){
        if(socket.id in gameState.players)gameState.players[socket.id].move(angle);
    });

    socket.on('disconnect', function(){
        console.log('user disconnected');
        delete gameState.players[socket.id];
    });
});

setInterval(()=>{
    io.sockets.emit('state', gameState);
}, UPDATE_TIME);


//listen to the port 3000
http.listen(3000, function () {
    console.log('listening on *:3000');
});

function shortAngleDist(a0,a1) {
    var max = Math.PI*2;
    var da = (a1 - a0) % max;
    return 2*da % max - da;
}

function lerp(start,end,value){
    return start + shortAngleDist(start,end)*value;
}

function isValidPlayerPos(x,y){
    if(x < 0 || x > gameState.worldSize -1 ) return false;
    if(y < 0 || y > gameState.worldSize - 1) return false;
    return true;
}