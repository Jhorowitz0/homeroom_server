//-----------------------------------------IMPORTS
const { throws } = require('assert');
const { Console } = require('console');
var express = require('express');
const { get } = require('http');
var app = express();
var http = require('http').createServer(app);
var io = require('socket.io')(http);
// io.sockets.emit('thing');
app.use(express.static('public'));
//------------------------CLASSES---------------------------
class Player{
    constructor(x,y,id){
        this.startPos = { x:x, y:y };
        this.pos = { x:x, y:y };
        this.vel = 0;
        this.maxVel = PLAYER_SPEED;
        this.rot = 0;
        this.id = id;
        this.pushing = 0;
        this.heldItem = 0;
    }

    reset(){
        let x = this.startPos.x;
        let y = this.startPos.y;
        this.pos = { x:x, y:y };
        this.vel = 0;
        this.maxVel = PLAYER_SPEED;
        this.rot = 0;
        this.pushing = 0;
        this.heldItem = 0;
    }

    update(data){
        this.vel = data.vel;
        this.rot = data.rot;
    }

    action(){
        if(this.heldItem){
            place(this);
            return;
        }
        grab(this);
        if(this.heldItem == 0)this.pushing = 80;
    }

    move(){
        let newPos = {
            x: this.pos.x + (Math.sin(this.rot) * this.vel),
            y: this.pos.y - (Math.cos(this.rot) * this.vel)
        }
        if(!isValidPlayerPos(newPos.x,newPos.y,this.id)) return;
        this.pos.x = newPos.x;
        this.pos.y = newPos.y;
        if(this.vel) this.pushing = 0;

        if(this.pushing > 0){
            this.pushing -= 1;
            if(this.pushing == 1) pushDesk(this);
        }
        if(this.heldItem){
            gameState.backpacks[this.heldItem].pos.x = this.pos.x;
            gameState.backpacks[this.heldItem].pos.y = this.pos.y;
        }
    }
}

class Desk{
    constructor(x,y){
        this.startPos = { x:x, y:y };
        this.pos = { x:x, y:y };
    }

    reset(){
        this.pos.x = this.startPos.x;
        this.pos.y = this.startPos.y;
    }
}

class Backpack{
    constructor(x,y){
        this.startPos = { x:x, y:y };
        this.pos = { x:x, y:y };
        this.spilled = false;
    }

    reset(){
        this.pos.x = this.startPos.x;
        this.pos.y = this.startPos.y;
        this.spilled = false;
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
        for(id in gameState.backpacks){
            if(getDistance(gameState.backpacks[id].pos,this.pos)<0.7){
                speed *= 0.3;
            }
        }

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

//--------------------------------HELPER FUNCTIONS-------------------------------------------

//returns distance between two points
function getDistance(pos1,pos2){
    let dx = pos2.x - pos1.x;
    let dy = pos2.y - pos1.y;
    return Math.sqrt(dx * dx + dy * dy);
}

//returns true if the positions are equal
function isPosEqual(pos1,pos2){
    return(pos1.x == pos2.x && pos1.y == pos2.y);
}

//returns true if the position exists within given library
function isPosIn(lib,pos){
    for(id in lib){
        if(isPosEqual(lib[id],pos))return true;
    }
    return false;
}

//if there exists a desk in position, return the ID of desk, otherwise return 0
function getDeskId(pos){
    for(id in gameState.desks){
        let desk = gameState.desks[id];
        if(desk.pos.x == pos.x && desk.pos.y == pos.y)return id;
    }
    return 0;
}

//if there exists a pack in position, return the ID of pack, otherwise return 0
function getPackID(pos){
    for(id in gameState.backpacks){
        let pack = gameState.backpacks[id];
        let packPos = {
            x: Math.floor(pack.pos.x),
            y: Math.floor(pack.pos.y)
        }
        let rPos = {
            x: Math.floor(pos.x),
            y: Math.floor(pos.y),
        }
        if(packPos.x == rPos.x && packPos.y == rPos.y)return id;
    }
    return 0;
}


//returns true if the given point is a valid position for the player id to move to
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

    if(getDeskId({
        x: Math.floor(x),
        y: Math.floor(y)
    })){
        return false;
    }
    return true;
}

//returns true if a desk can be placed in the given position
function isValidDeskPos(pos){
    if(pos.x < 0 || pos.x > gameState.worldSize-1 || pos.y < 0 || pos.y > gameState.worldSize-1) return false;
    if(getDeskId(pos)) return false;
    if(getPackID(pos)) return false;
    return true;
}

//returns true if a pack can be placed in the given position
function isValidPackPos(pos){
    if(pos.x < 0 || pos.x > gameState.worldSize-1 || pos.y < 0 || pos.y > gameState.worldSize-1) return false;
    if(getPackID(pos))return false;
    return true;
}

//returns true if an agent can be placed in the given position
function isValidAgentPos(pos){
    if(pos.x < 0 || pos.x > gameState.worldSize || pos.y < 0 || pos.y > gameState.worldSize) return false;
    if(getDeskId({x:Math.floor(pos.x),y:Math.floor(pos.y)})) return false;
    return true;
}


//--------------------------------GLOBAL VARIABLES---------------------------------------------
var UPDATE_TIME = 50;
var PLAYER_SPEED = 0.15;
var TARGET_SPEED = 0.1;
var AGENT_SPEED = 0.11;
var LOBBY_TIME = 100;

var gameState = {
    worldSize: 9,
    players: {},
    desks: {
        1: new Desk(1,3),
        2: new Desk(1,4),
        3: new Desk(1,5),
        4: new Desk(3,1),
        5: new Desk(3,2),
        6: new Desk(3,3),
        7: new Desk(5,1),
        8: new Desk(5,2),
        9: new Desk(5,3),
        10: new Desk(7,1),
        11: new Desk(7,2),
        12: new Desk(7,3),
        13: new Desk(3,5),
        14: new Desk(3,6),
        15: new Desk(3,7),
        16: new Desk(5,5),
        17: new Desk(5,6),
        18: new Desk(5,7),
        19: new Desk(7,5),
        20: new Desk(7,6),
        21: new Desk(7,7),
    },
    agents: {},
    backpacks: {
        0: new Backpack(5.5,2.5),
        1: new Backpack(7.5,5.5)
    },
    targetID: 0,
    doorPos: {x:0,y:0},
    timeTillStart: -1,
}

//----------------------------------World Events-----------------------------------------------

//resets everything to its starting position 
function restartGame(){
    for(id in gameState.desks){
        gameState.desks[id].reset();
    }
    for(id in gameState.backpacks){
        gameState.backpacks[id].reset();
    }
    gameState.agents = {};
    for(id in gameState.players){
        gameState.players[id].reset();
    }
    gameState.timeTillStart = LOBBY_TIME;
    gameState.players[gameState.targetID].maxVel = PLAYER_SPEED;
    gameState.targetID = 0;
}

//given a starting position and a rotation, attempt to push a desk
function pushDesk(player){
    let pos = {x:0,y:0};
    pos.x = Math.floor(player.pos.x);
    pos.y = Math.floor(player.pos.y);
    let newPos = {x:pos.x,y:pos.y};
    let rot = player.rot;
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
    if(getPackID(pos))return;
    let id = getDeskId(pos);
    if(id && isValidDeskPos(newPos)){
        gameState.desks[id].pos.x = newPos.x;
        gameState.desks[id].pos.y = newPos.y;
    }
}

//given a player id, attempt to grab the backpack in front of the player if their is one
function grab(player){
    let pos = {x:0,y:0};
    pos.x = Math.floor(player.pos.x);
    pos.y = Math.floor(player.pos.y);
    let rot = player.rot;
    if(rot < 0.5){
        //up
        pos.y -= 1;
    }
    else if(rot < 2.4){
        //right
        pos.x += 1;
    }
    else if(rot < 3.2){
        //down
        pos.y += 1;
    }
    else{
        //left
        pos.x -= 1;
    }
    let id = getPackID(pos);
    if(id){
        if(gameState.backpacks[id].spilled)return;
        for(i in gameState.players){
            if(gameState.players[i].heldItem == id){
                gameState.players[i].heldItem = 0;
            }
        }
        player.heldItem = id;
    }
}

function place(player){
    let pos = {x:0,y:0};
    pos.x = Math.floor(player.pos.x);
    pos.y = Math.floor(player.pos.y);
    let rot = player.rot;
    if(rot < 0.5){
        //up
        pos.y -= 1;
    }
    else if(rot < 2.4){
        //right
        pos.x += 1;
    }
    else if(rot < 3.2){
        //down
        pos.y += 1;
    }
    else{
        //left
        pos.x -= 1;
    }
    if(getPackID(pos))return;
    if(getDeskId(pos)){
        gameState.backpacks[player.heldItem].pos.x = pos.x + 0.5;
        gameState.backpacks[player.heldItem].pos.y = pos.y + 0.5;
        player.heldItem = 0;
    }
    else if(isValidDeskPos(pos)){
        gameState.backpacks[player.heldItem].spilled = true;
        gameState.backpacks[player.heldItem].pos.x = pos.x + 0.5;
        gameState.backpacks[player.heldItem].pos.y = pos.y + 0.5;
        player.heldItem = 0;
    }
}




//------------------------------------------------Socket Interactions-----------------------------------
io.on('connection', function (socket) {
    console.log('user connected...');

    //this is sent to the client
    socket.emit('updateState', gameState);
    let playerCount = 0;
    for(id in gameState.players){
        playerCount++;
    }
    if(playerCount < 4){
        let pos = {
            x: Math.random() * gameState.worldSize,
            y: Math.random() * gameState.worldSize,
        }
        while(!isValidPlayerPos(pos.x,pos.y,socket.id)){
            pos = {
                x: Math.random() * gameState.worldSize,
                y: Math.random() * gameState.worldSize,
            }
        }
        gameState.players[socket.id] = new Player(pos.x,pos.y,socket.id);
        playerCount ++;
        if(playerCount == 4) gameState.timeTillStart = LOBBY_TIME;
    }

    // socket.on('spawn', function(pos){
    //     console.log('user spawned');
    //     gameState.players[socket.id] = new Player(pos.x,pos.y,socket.id);
    // });

    socket.on('update', function(vel){
        if(socket.id in gameState.players)gameState.players[socket.id].update(vel);
    });

    // socket.on('door', function(pos){
    //     gameState.doorPos.x = pos.x;
    //     gameState.doorPos.y = pos.y;
    // });

    // socket.on('target', () => {
    //     if(!(socket.id in gameState.players)) return;
    //     if(socket.id == gameState.targetID){
    //         gameState.targetID = 0;
    //         gameState.players[socket.id].maxSpeed = PLAYER_SPEED;
    //     }
    //     else{
    //         if(gameState.players[gameState.targetID]) gameState.players[gameState.targetID].maxSpeed = PLAYER_SPEED;
    //         gameState.targetID = socket.id;
    //         gameState.players[socket.id].maxSpeed = TARGET_SPEED;
    //     }
    // });

    socket.on('action',() => {
        let playerCount = 0;
        for(id in gameState.players){
            playerCount++;
        }
        if(gameState.targetID == socket.id
            || gameState.timeTillStart > 0
            || playerCount < 4) return;
        if(gameState.players[socket.id]) gameState.players[socket.id].action();
    });

    // socket.on('clear', ()=>{
    //     gameState.players = {};
    //     gameState.desks = {};
    //     gameState.agents = {};
    //     gameState.backpacks = {};
    //     io.sockets.emit('kicked');
    // });

    // socket.on('restart', restartGame);

    // socket.on('resize',delta=>{
    //     gameState.players = {};
    //     gameState.desks = {};
    //     gameState.agents = {};
    //     gameState.backpacks = {};
    //     io.sockets.emit('kicked');
    //     gameState.worldSize -= delta;
    // });

    // socket.on('desk', pos=>{
    //     for(id in gameState.desks){
    //         let desk = gameState.desks[id];
    //         if(pos.x == desk.pos.x && pos.y == desk.pos.y){                  
    //                 delete gameState.desks[id];
    //                 return;
    //         }
    //     }

    //     gameState.desks[Math.random()] = new Desk(pos.x,pos.y);
    // });

    // socket.on('agent', data=>{
    //     for(id in gameState.agents){
    //         if(Math.floor(gameState.agents[id].pos.x) == Math.floor(data.pos.x)
    //          && Math.floor(gameState.agents[id].pos.y) == Math.floor(data.pos.y)){
    //              delete gameState.agents[id];
    //              return;
    //          }
    //     }
    //     if(isValidAgentPos(data.pos)){
    //         gameState.agents[Math.random()] = new Agent(data.pos.x,data.pos.y,data.type);
    //     }
    // })

    // socket.on('pack',pos=>{
    //     for(id in gameState.objects){
    //         let pack = gameState.backpacks[id];
    //             if(pos.x == obj.pos.x && pos.y == obj.pos.y){
    //                 delete gameState.backpacks[id];
    //                 return;
    //             }
    //     }

    //     gameState.backpacks[Math.random()] = new Backpack(pos.x,pos.y);
    // });

    socket.on('disconnect', function(){
        console.log('user disconnected');
        delete gameState.players[socket.id];
    });

    // socket.on('leave', function(){
    //     console.log('user despawned');
    //     delete gameState.players[socket.id];
    //     socket.emit('kicked');
    // });
});


//gamestate update loop
setInterval(()=>{


    if(gameState.timeTillStart > 0){
        gameState.timeTillStart--;
    }

    let playerCount = 0;
    for(id in gameState.players){
        playerCount++;
    }

    if(gameState.timeTillStart == 0){
        gameState.timeTillStart = -1;
        gameState.agents[1] = new Agent(0.5,0.5,'chase');
        if(playerCount == 4){
            let targetID = Math.floor(Math.random() * playerCount);
            for(id in gameState.players){
                if(targetID == 0){
                    gameState.targetID = id;
                    gameState.players[gameState.targetID].maxVel = TARGET_SPEED;
                }
                targetID --;
            }
        }
    }


    for(id in gameState.players){
        gameState.players[id].move();
        if(gameState.timeTillStart > 0) continue;
        if(id == gameState.targetID){
            let pos = gameState.players[id].pos;
            if(Math.floor(pos.x) == gameState.doorPos.x && Math.floor(pos.y) == gameState.doorPos.y){
                restartGame();
            }
        } 
    }
    for(h in gameState.agents){
        if(gameState.agents[h])gameState.agents[h].update();
        if(gameState.agents[h])gameState.agents[h].move();
    }
    io.sockets.emit('state', gameState);
}, UPDATE_TIME);


//listen to the port 3000
http.listen(3000, function () {
    console.log('listening on *:3000');
});



