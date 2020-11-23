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

	enterLobby();
}

function draw(){
	noStroke();
	background(10);
	if(gameState){
		drawGrid();
		drawPlayers();
		if(socket.id in gameState.players){
			movePlayer();
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
		}
	});

    let myp5 = new p5(sketch);
	socket.emit('spawn',pos);
}

function enterLobby(){
	let sketch = (()=>{
		mousePressed = ()=>{
		}

		keyPressed = ()=>{
			if(keyCode == 13){ //if enter is hit
				if(gameState){
					let spawnPos = getGridPos(mouseX,mouseY);
					if(isValidPos(spawnPos)) spawn(spawnPos);
				}
			}
		}
	});
	let myp5 = new p5(sketch);
}

function isValidPos(pos){
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

	result.x = ((1+x) * size)-size/2;
	result.y = ((1+y) * size)-size/2;

	return result;
}

function drawRectOnGrid(x,y,s){
	let result = { x: 0, y: 0 };
	let size = width/gameState.worldSize;

	result.x = ((1+x) * size)-size/2;
	result.y = ((1+y) * size)-size/2;
	rect(result.x,result.y,size*s,size*s);
}

function drawEllipseOnGrid(x,y,s){
	let result = { x: 0, y: 0 };
	let size = width/gameState.worldSize;

	result.x = ((1+x) * size)-size/2;
	result.y = ((1+y) * size)-size/2;
	ellipse(result.x,result.y,size*s,size*s);
}

function drawGrid(){
	for(let x = 0; x < gameState.worldSize; x++){
		for(let y = 0; y < gameState.worldSize; y++){
			fill(255);
			drawRectOnGrid(x,y,0.9);
		}
	}
}

function drawPlayers(){
	for(id in gameState.players){
		let player = gameState.players[id];
		noStroke();
		if(id == socket.id){
			stroke(200,200,0);
			strokeWeight(6);
		}
		fill(0,255,0);
		let pos = getCanvasPos(player.pos.x,player.pos.y);
		push();
		translate(pos.x,pos.y);
		rotate(player.rot);
		let size = width/gameState.worldSize
		drawTriangle(0,0,size*0.4,size*0.4);
		pop();
	}
}

function drawLobby(){
	fill(0,255,0);
	let mousePos = getGridPos(mouseX,mouseY);
	drawEllipseOnGrid(mousePos.x,mousePos.y,0.4);

	fill(0,0,0,200);
	rect(width/2,height/2,width,height);
}

function drawTriangle(x,y,w,h){
	let pos1 = {x:x-(w/2),y:y+(h/2)};
	let pos2 = {x:x+(w/2),y:y+(h/2)};
	let pos3 = {x:x,y:y-(h/2)};
	triangle(pos1.x,pos1.y,pos2.x,pos2.y,pos3.x,pos3.y);
}

function movePlayer(){
	if(keyIsDown(38)){ //up
		if(keyIsDown(37))socket.emit('move',7*(Math.PI/4));//up - left
		else if(keyIsDown(39)) socket.emit('move', Math.PI/4);//up - right
		else socket.emit('move', 0);//up
	}
	else if(keyIsDown(40)){ //down
		if(keyIsDown(37))socket.emit('move', 5*(Math.PI/4));//down - left
		else if(keyIsDown(39))socket.emit('move', 3*(Math.PI/4));//down - right
		else socket.emit('move', Math.PI);
	}
	else if(keyIsDown(37))socket.emit('move', 3*(Math.PI/2));
	else if(keyIsDown(39))socket.emit('move', (Math.PI/2));
}