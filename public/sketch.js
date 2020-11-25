const { text } = require("express");
var socket;

var gameState = null;

function setup() {
	createCanvas(800,800);
	background(10);
	rectMode(CENTER);

	socket = io();

	socket.on('state', newState => {
		gameState = newState;
	});

	socket.on('kicked', () => {
		enterLobby();
	});

	enterLobby();
}

function draw(){
	noStroke();
	background(10);
	if(gameState){
		drawGrid();
		drawPlayers();
		drawObjects();
		drawAgents();
		if(socket.id in gameState.players){
			// movePlayer();
		}
		else drawLobby(); 
	}
}

function mousePressed(){
}

function spawn(pos){
	let sketch = (()=>{
		mousePressed = ()=>{
		}

		keyPressed = ()=>{
			if(keyCode == 84) socket.emit('target');
			else if(keyCode == 32) socket.emit('action',true);
			else movePlayer();
		}

		keyReleased = ()=>{
			if(!keyIsDown(32))socket.emit('action',false);

			if(keyIsDown(37)){
				movePlayer();
				return;
			}
			else if(keyIsDown(38)){
				movePlayer();
				return;
			}
			else if(keyIsDown(39)){
				movePlayer();
				return;
			}
			else if(keyIsDown(40)){
				movePlayer();
				return;
			}
			socket.emit('update','stop');
		}
	});

    let myp5 = new p5(sketch);
	socket.emit('spawn',pos);
}

function enterLobby(){
	let sketch = (()=>{
		mousePressed = ()=>{
			if(gameState){
				let spawnPos = getGridPos(mouseX,mouseY);
				if(keyIsDown(68)){
					socket.emit('desk',spawnPos);
					return;
				}
				spawnPos.x += 0.5;
				spawnPos.y += 0.5;
				if(keyIsDown(80)){
					socket.emit('case',spawnPos);
					return;
				}
				if(keyIsDown(65)){
					socket.emit('agent',spawnPos);
					return;
				}
				if(isValidPlayerPos(spawnPos)) spawn(spawnPos);
			}
		}

		keyPressed = ()=>{
			if(keyCode == 67) socket.emit('clear');
			if(keyCode == 219) socket.emit('resize',1);
			if(keyCode == 221) socket.emit('resize',-1);
		}
	});
	let myp5 = new p5(sketch);
}

function getDistance(pos1,pos2){
    let dx = pos2.x - pos1.x;
    let dy = pos2.y - pos1.y;
    return Math.sqrt(dx * dx + dy * dy);
}

function isValidPlayerPos(pos){
	let x = pos.x;
	let y = pos.y;
	if(x < 0.2 || x > gameState.worldSize-0.2) return false;
    if(y < 0.2 || y > gameState.worldSize-0.2) return false;

    for(i in gameState.players){
		let dist = getDistance(gameState.players[i].pos,{x:x,y:y});
		if(dist < 0.4) return;
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

function isValidBlockPos(pos){
	let x = pos.x+0.5;
	let y = pos.y+0.5;
	if(x < 0.2 || x > gameState.worldSize-0.2) return false;
    if(y < 0.2 || y > gameState.worldSize-0.2) return false;
    for(i in gameState.objects){
        let obj = gameState.objects[i];
        if(
            x > obj.pos.x && x < obj.pos.x + 1 &&
            y > obj.pos.y && y < obj.pos.y + 1
        ) return false;
    }
    return true;
}

function getGridPos(x,y){
	let result = { x:x, y:y };
	result.x = Math.floor((x/width) * gameState.worldSize);
	result.y = Math.floor((y/height) * gameState.worldSize);
	return result;
}

function getCanvasPos(x,y){
	let result = { x: 0, y: 0 };
	let size = width/gameState.worldSize;

	result.x = ((x) * size);
	result.y = ((y) * size);

	return result;
}

function drawRectOnGrid(x,y,s){
	let result = getCanvasPos(x,y);
	let size = width/gameState.worldSize;
	rect(result.x,result.y,size*s,size*s);
}

function drawEllipseOnGrid(x,y,s){
	let result = getCanvasPos(x,y);
	let size = width/gameState.worldSize;
	ellipse(result.x,result.y,size*s,size*s);
}

function drawGrid(){
	for(let x = 0; x < gameState.worldSize; x++){
		for(let y = 0; y < gameState.worldSize; y++){
			fill(50);
			drawRectOnGrid(x+0.5,y+0.5,0.9);
		}
	}
}

function drawTarget(x,y,s){
	let result = getCanvasPos(x,y);
	let size = width/gameState.worldSize;
	noFill();
	stroke(255,0,0);
	strokeWeight(5);
	ellipse(result.x,result.y,size*s,size*s);
	line(result.x-size/2,result.y,result.x + size/2, result.y);
	line(result.x,result.y-size/2,result.x, result.y + size/2);
	noStroke();
}

function drawPlayers(){
	let t = gameState.players[gameState.targetID];
	if(t)drawTarget(t.pos.x,t.pos.y,0.65);

	for(id in gameState.players){
		let player = gameState.players[id];
		fill(0,255,0);
		if(id == socket.id)fill(255,200,0);
		drawEllipseOnGrid(player.pos.x,player.pos.y,0.4);
		let pos = getCanvasPos(player.pos.x,player.pos.y);
		push();
		translate(pos.x,pos.y);
		rotate(player.rot);
		let size = width/gameState.worldSize
		noStroke();
		drawTriangle(0,-1 *size*0.3,size*0.2,size*0.1);
		pop();
		fill(0,0,0,100);
		let s = (player.pushing / 100) * 0.5;
		drawEllipseOnGrid(player.pos.x,player.pos.y,s);
	}
}

function drawObjects(){
	for(id in gameState.objects){
		let obj = gameState.objects[id];
		let scale = 1.05;
		noStroke();
		fill(100);
		if(obj.type == 'case'){
			fill(255,0,255);
			scale = 0.3;
			drawRectOnGrid(obj.pos.x,obj.pos.y,scale);
			continue;
		}
		drawRectOnGrid(obj.pos.x + 0.5,obj.pos.y + 0.5,scale);
	}
}

function drawAgents(){
	for(id in gameState.agents){
		let agent = gameState.agents[id];
		noStroke();
		fill(30,20,255);
		drawEllipseOnGrid(agent.pos.x,agent.pos.y,0.7);
		fill(255,0,0);
		// drawEllipseOnGrid(agent.dest.x,agent.dest.y,0.3);
		// for(id in agent.prevPos){
		// 	fill(100);
		// 	drawEllipseOnGrid(agent.prevPos[id].x,agent.prevPos[id].y,0.3);
		// }
		let pos = getCanvasPos(agent.pos.x,agent.pos.y);
		push();
		translate(pos.x,pos.y);
		rotate(agent.rot);
		let size = width/gameState.worldSize
		noStroke();
		fill(30,20,255);
		drawTriangle(0,-1 *size*0.5,size*0.3,size*0.2);
		pop();
	}
}

function drawLobby(){

	noStroke();
	fill(0,0,0,200);
	rect(height/2,width/2,width,height);

	noFill();
	let mousePos = getGridPos(mouseX,mouseY);
	strokeWeight(5);
	if(keyIsDown(68)){
		stroke(255,0,0);
		if(isValidBlockPos(mousePos))stroke(0,255,0);
		drawRectOnGrid(mousePos.x+0.5,mousePos.y+0.5,0.9);
	}
	else if(keyIsDown(80)){
		stroke(255,0,0);
		if(isValidBlockPos(mousePos))stroke(0,255,0);
		drawRectOnGrid(mousePos.x+0.5,mousePos.y+0.5,0.3);
	}
	else if(keyIsDown(65)){
		stroke(255,0,0);
		if(isValidBlockPos(mousePos))stroke(0,255,0);
		drawEllipseOnGrid(mousePos.x+0.5,mousePos.y+0.5,0.8);
	}
	else{
		stroke(255,0,0);
		mousePos.x+=0.5;
		mousePos.y+=0.5;
		if(isValidPlayerPos(mousePos))stroke(0,255,0);
		drawEllipseOnGrid(mousePos.x,mousePos.y,0.4);
	}
}

function drawTriangle(x,y,w,h){
	let pos1 = {x:x-(w/2),y:y+(h/2)};
	let pos2 = {x:x+(w/2),y:y+(h/2)};
	let pos3 = {x:x,y:y-(h/2)};
	triangle(pos1.x,pos1.y,pos2.x,pos2.y,pos3.x,pos3.y);
}

function movePlayer(){
	if(keyIsDown(38)){ //up
		if(keyIsDown(37))socket.emit('update',7*(Math.PI/4));//up - left
		else if(keyIsDown(39)) socket.emit('update', Math.PI/4);//up - right
		else socket.emit('update', 0);//up
	}
	else if(keyIsDown(40)){ //down
		if(keyIsDown(37))socket.emit('update', 5*(Math.PI/4));//down - left
		else if(keyIsDown(39))socket.emit('update', 3*(Math.PI/4));//down - right
		else socket.emit('update', Math.PI);
	}
	else if(keyIsDown(37))socket.emit('update', 3*(Math.PI/2));
	else if(keyIsDown(39))socket.emit('update', (Math.PI/2));
}