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
var UPDATE_TIME = 50;

//------------------------CLASSES---------------------------
class Player{
    constructor(x,y,id){
        this.pos = { x:x, y:y };
        this.speed = 0;
        this.maxSpeed = 0.2;
        this.rot = 0;
        this.id = id;
    }

    update(angle){
        if(angle == 'stop') this.speed = 0;
        else{
            this.rot = angle;
            this.speed = this.maxSpeed;
        }
    }

    move(){
        let x = this.pos.x + Math.sin(this.rot) * this.speed;
        let y = this.pos.y - Math.cos(this.rot) * this.speed;
        if(isValidPlayerPos(x,y,this.id)){
            this.pos.x = x;
            this.pos.y = y;
        }
    }
}

class Object{
    constructor(x,y,type){
        this.pos = { x:x, y:y };
        this.type = type;
    }
}

var gameState = {
    worldSize: 12,
    players: {},
    objects: {},
    targetID: 0,
}

//when a client connects
io.on('connection', function (socket) {
    console.log('user connected...');

    //this is sent to the client
    socket.emit('updateState', gameState);

    socket.on('spawn', function(pos){
        console.log('user spawned');
        gameState.players[socket.id] = new Player(pos.x,pos.y,socket.id);
    });

    socket.on('update', function(angle){
        if(socket.id in gameState.players)gameState.players[socket.id].update(angle);
    });

    socket.on('target', () => {
        if(socket.id == gameState.targetID){
            gameState.targetID = 0;
            gameState.players[socket.id].maxSpeed = 0.2;
        }
        else{
            gameState.targetID = socket.id;
            gameState.players[socket.id].maxSpeed = 0.08;
        }
    });

    socket.on('clear', ()=>{
        gameState.players = {};
        gameState.objects = {};
        io.sockets.emit('kicked');
    });

    socket.on('resize',delta=>{
        gameState.players = {};
        gameState.objects = {};
        io.sockets.emit('kicked');
        gameState.worldSize -= delta;
    });

    socket.on('desk', pos=>{
        for(id in gameState.objects){
            let obj = gameState.objects[id];
            if(obj.type == 'desk'){
                if(pos.x == obj.pos.x && pos.y == obj.pos.y){                  delete gameState.objects[id];
                    return;
                }
            }
        }

        gameState.objects[Math.random()] = new Object(pos.x,pos.y,'desk');
    })

    socket.on('disconnect', function(){
        console.log('user disconnected');
        delete gameState.players[socket.id];
    });
});

setInterval(()=>{
    for(id in gameState.players){
        gameState.players[id].move();
    }
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

function getDistance(pos1,pos2){
    let dx = pos2.x - pos1.x;
    let dy = pos2.y - pos1.y;
    return Math.sqrt(dx * dx + dy * dy);
}

function getDistToSquare(pos1,pos2){
}

function isValidPlayerPos(x,y,id){
    if(x < 0.2 || x > gameState.worldSize-0.2) return false;
    if(y < 0.2 || y > gameState.worldSize-0.2) return false;

    for(i in gameState.players){
        if(i == id)continue;
        else{
            let dist = getDistance(gameState.players[i].pos,{x:x,y:y});
            if(dist < 0.4) return;
        }
    }

    for(i in gameState.objects){
        let obj = gameState.objects[i];
        if(
            x > obj.pos.x && x < obj.pos.x + 1 &&
            y > obj.pos.y && y < obj.pos.y + 1
        ) return false;
    }
    return true;
}

