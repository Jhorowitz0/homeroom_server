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
var PLAYER_SPEED = 0.15;
var TARGET_SPEED = 0.1;
var AGENT_SPEED = 0.11;

//------------------------CLASSES---------------------------
class Player{
    constructor(x,y,id){
        this.startPos = { x:x, y:y };
        this.pos = { x:x, y:y };
        this.speed = 0;
        this.maxSpeed = PLAYER_SPEED;
        this.rot = 0;
        this.id = id;
        this.pushing = 0;
        this.heldItem = 0;
    }

    reset(){
        let x = this.startPos.x;
        let y = this.startPos.y;
        this.pos = { x:x, y:y };
        this.speed = 0;
        this.maxSpeed = PLAYER_SPEED;
        this.rot = 0;
        this.pushing = 0;
        this.heldItem = 0;
    }

    update(angle){
        if(angle == 'stop') this.speed = 0;
        else{
            this.rot = angle;
            this.speed = this.maxSpeed;
        }
    }

    move(){
        if(this.pushing){
            this.pushing -= 1;
        }
        let x = this.pos.x + Math.sin(this.rot) * this.speed;
        let y = this.pos.y - Math.cos(this.rot) * this.speed;
        if(this.pushing && this.pushing == 1)pushDesk(this.pos,this.rot);
        if(isValidPlayerPos(x,y,this.id)){
            this.pos.x = x;
            this.pos.y = y;
            this.pushing = 0;
            if(this.heldItem && gameState.objects[this.heldItem]){
                gameState.objects[this.heldItem].pos.x = x;
                gameState.objects[this.heldItem].pos.y = y;
            }
        }
    }
}

class Object{
    constructor(x,y,type){
        this.startPos = { x:x, y:y };
        this.pos = { x:x, y:y };
        this.type = type;
    }

    reset(){
        this.pos.x = this.startPos.x;
        this.pos.y = this.startPos.y;
    }
}

class Agent{
    constructor(x,y,type){
        this.startPos = { x:x, y:y };
        this.pos = { x:x, y:y };
        this.type = type;
        this.rot = 0;
        this.prevPos = [
            { x:x, y:y },
            { x:x, y:y },
            { x:x, y:y },
            { x:x, y:y }
        ];
        this.dest = { x:x, y:y };
        this.speed = AGENT_SPEED;
    }

    update(){
        if(gameState.targetID && gameState.players[gameState.targetID]){
            let possiblePositions = [];
            for(let x = -1; x <= 1; x++){
                for(let y = -1; y <= 1; y++){
                    if(x && y || (!x && !y))continue;
                    let pos = {x:Math.floor(this.pos.x) + 0.5 + x,y: Math.floor(this.pos.y) + 0.5 + y};
                    if(isValidAgentPos(pos) && (!isPosIn(this.prevPos,pos))){
                        possiblePositions.push(pos);
                    }
                }
            }
            let targetPos = {
                x: gameState.players[gameState.targetID].pos.x,
                y: gameState.players[gameState.targetID].pos.y
            }
            if(getDistance(targetPos,this.pos) < 0.6) restartGame();
            if(this.type == 'guard' && getDistance(targetPos,this.pos) > gameState.worldSize/3){
                targetPos.x = this.startPos.x;
                targetPos.y = this.startPos.y;
                if(getDistance(targetPos,this.pos) < 1) return;
            }
            let closest = 0;
            for(let i = 0; i < possiblePositions.length; i++){
                let closestDist = getDistance(possiblePositions[closest],targetPos);
                let newDist = getDistance(possiblePositions[i],targetPos);
                if(newDist <= closestDist) closest = i;
            }
            if(possiblePositions.length == 0){
                let x = this.pos.x;
                let y = this.pos.y;
                this.prevPos = [
                    { x:x, y:y },
                    { x:x, y:y },
                    { x:x, y:y },
                    { x:x, y:y }
                ];
                return;
            }
            if(!(this.dest.x == possiblePositions[closest].x && this.dest.y == possiblePositions[closest].y)){
                this.prevPos.push({x:this.dest.x,y:this.dest.y});
                this.prevPos.shift();
                this.dest.x = possiblePositions[closest].x;
                this.dest.y = possiblePositions[closest].y;
            }
        }
        else{
            this.dest.x = this.pos.x;
            this.dest.y = this.pos.y;
        }
    }

    move(){

        let dest = this.dest;

        let delta = {
            x: this.dest.x - this.pos.x,
            y: this.dest.y - this.pos.y,
        }
        let prevPos = this.prevPos[this.prevPos.length-1];

        if(getDistance(prevPos,this.dest) < getDistance(this.pos,this.dest)){
            delta = {
                x: prevPos.x - this.pos.x,
                y: prevPos.y - this.pos.y, 
            }
            dest = prevPos;
        }
        if(getDistance(this.pos,prevPos) < this.speed){
            delta = {
                x: this.dest.x - prevPos.x,
                y: this.dest.y - prevPos.y,
            }
            dest = this.dest;
        }
    
        if(Math.abs(delta.x) < this.speed && Math.abs(delta.y) < this.speed){
            this.pos.x = this.dest.x;
            this.pos.y = this.dest.y;
            return;
        }

        if(Math.abs(delta.x) > Math.abs(delta.y)){
            delta.y = 0;
        }
        else delta.x = 0;

        if(delta.y < 0){
            this.rot = 0;
            this.pos.x = Math.floor(this.pos.x) + 0.5;
        }
        else if(delta.x < 0){
            this.rot = 3*Math.PI/2;
            this.pos.y = Math.floor(this.pos.y) + 0.5;
        }
        else if(delta.y > 0){
            this.rot = Math.PI;
            this.pos.x = Math.floor(this.pos.x) + 0.5;
        }
        else if(delta.x > 0){
            this.rot = Math.PI/2;
            this.pos.y = Math.floor(this.pos.y) + 0.5;
        } 

        let speed = this.speed;
        let playersTouching = 0;
        for(id in gameState.players){
            if(id == gameState.targetID)continue;
            if(getDistance(gameState.players[id].pos,this.pos) < 0.6){
                playersTouching++;
            }
        }
        if(playersTouching == 1) speed = speed * 0.3;
        else if(playersTouching == 2) speed = speed * 0.1;
        else if(playersTouching > 2) speed = 0;

        this.pos.x += Math.sin(this.rot) * speed;
        this.pos.y -= Math.cos(this.rot) * speed;
    }

    reset(){
        let x = this.startPos.x;
        let y = this.startPos.y;
        this.pos.x = x;
        this.pos.y = y;
        this.rot = 0;
        this.prevPos = [
            { x:x, y:y },
            { x:x, y:y },
            { x:x, y:y },
            { x:x, y:y }
        ];
    }
}

var gameState = {
    worldSize: 9,
    players: {},
    objects: {},
    agents: {},
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
        if(!(socket.id in gameState.players)) return;
        if(socket.id == gameState.targetID){
            gameState.targetID = 0;
            gameState.players[socket.id].maxSpeed = PLAYER_SPEED;
        }
        else{
            if(gameState.players[gameState.targetID])gameState.players[targetID].maxSpeed = PLAYER_SPEED;
            gameState.targetID = socket.id;
            gameState.players[socket.id].maxSpeed = TARGET_SPEED;
        }
    });

    socket.on('action',isPushed => {
        if(socket.id == gameState.targetID)return;
        if(isPushed && socket.id in gameState.players){
            grab(socket.id);
            gameState.players[socket.id].pushing = 60;
        }
        else if (socket.id in gameState.players){
            gameState.players[socket.id].pushing = 0;
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
                if(pos.x == obj.pos.x && pos.y == obj.pos.y){                  
                    delete gameState.objects[id];
                    return;
                }
            }
        }

        gameState.objects[Math.random()] = new Object(pos.x,pos.y,'desk');
    });

    socket.on('agent', data=>{
        for(id in gameState.agents){
            if(Math.floor(gameState.agents[id].pos.x) == Math.floor(data.pos.x)
             && Math.floor(gameState.agents[id].pos.y) == Math.floor(data.pos.y)){
                 delete gameState.agents[id];
                 return;
             }
        }
        if(isValidAgentPos(data.pos)){
            gameState.agents[Math.random()] = new Agent(data.pos.x,data.pos.y,data.type);
        }
    })

    socket.on('case',pos=>{
        for(id in gameState.objects){
            let obj = gameState.objects[id];
            if(obj.type == 'case'){
                if(pos.x == obj.pos.x && pos.y == obj.pos.y){
                    delete gameState.objects[id];
                    return;
                }
            }
        }

        gameState.objects[Math.random()] = new Object(pos.x,pos.y,'case');
    });

    socket.on('disconnect', function(){
        console.log('user disconnected');
        delete gameState.players[socket.id];
    });
});

setInterval(()=>{
    for(id in gameState.players){
        gameState.players[id].move();
    }
    for(h in gameState.agents){
        gameState.agents[h].update();
        gameState.agents[h].move();
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
        if(obj.type != 'desk')continue;
        if(
            x+0.2 > obj.pos.x && x-0.2 < obj.pos.x + 1 &&
            y+0.2 > obj.pos.y && y-0.2 < obj.pos.y + 1
        ) return false;
    }
    return true;
}

function getDeskId(pos){
    for(id in gameState.objects){
        let obj = gameState.objects[id];
        if(obj.type != 'desk')return 0;
        if(obj.pos.x == pos.x && obj.pos.y == pos.y)return id;
    }
}

function getCaseId(pos){
    for(id in gameState.objects){
        let obj = gameState.objects[id];
        if(obj.type != 'case')return 0;
        let objPos = {
            x: Math.floor(obj.pos.x),
            y: Math.floor(obj.pos.y)
        }
        let rPos = {
            x: Math.floor(pos.x),
            y: Math.floor(pos.y),
        }
        if(objPos.x == rPos.x && objPos.y == rPos.y)return id;
    }
}


function isValidDeskPos(pos){
    if(pos.x < 0 || pos.x > gameState.worldSize-1 || pos.y < 0 || pos.y > gameState.worldSize-1) return false;
    if(getDeskId(pos)) return false;
    return true;
}

function isValidAgentPos(pos){
    if(pos.x < 0 || pos.x > gameState.worldSize || pos.y < 0 || pos.y > gameState.worldSize) return false;
    if(getDeskId({x:Math.floor(pos.x),y:Math.floor(pos.y)})) return false;
    return true;
}

function isPosEqual(pos1,pos2){
    return(pos1.x == pos2.x && pos1.y == pos2.y);
}

function isPosIn(lib,pos){
    for(id in lib){
        if(isPosEqual(lib[id],pos))return true;
    }
    return false;
}

function restartGame(){
    for(id in gameState.objects){
        gameState.objects[id].reset();
    }
    for(id in gameState.agents){
        gameState.agents[id].reset();
    }
    for(id in gameState.players){
        gameState.players[id].reset();
    }
    gameState.targetID = 0;
}

function pushDesk(Ppos,rot){
    let pos = {x:Ppos.x,y:Ppos.y};
    pos.x = Math.floor(Ppos.x);
    pos.y = Math.floor(Ppos.y);
    let newPos = {x:pos.x,y:pos.y};
    if(rot < 0.5){
        //up
        pos.y -= 1;
        newPos.y -= 2;
    }
    else if(rot < 2.4){
        //right
        pos.x += 1;
        newPos.x += 2;
    }
    else if(rot < 3.2){
        //down
        pos.y += 1;
        newPos.y += 2;
    }
    else{
        //left
        pos.x -= 1;
        newPos.x -= 2;
    }
    let id = getDeskId(pos);
    if(id && isValidDeskPos(newPos)){
        gameState.objects[id].pos.x = newPos.x;
        gameState.objects[id].pos.y = newPos.y;
    }
}

function grab(id){
    let pos = {
        x: Math.floor(gameState.players[id].pos.x),
        y: Math.floor(gameState.players[id].pos.y)
    }
    let rot = gameState.players[id].rot;
    let pos2 = {x:pos.x,y:pos.y};
    if(rot < 0.5){
        //up
        pos2.y -= 1;
    }
    else if(rot < 2.4){
        //right
        pos2.x += 1;
    }
    else if(rot < 3.2){
        //down
        pos2.y += 1;
    }
    else{
        //left
        pos2.x -= 1;
    }
    let caseId = getCaseId(pos);
    if(!caseId) caseId = getCaseId(pos2);
    if(caseId){
        gameState.players[id].heldItem = caseId;
    }
    
}

