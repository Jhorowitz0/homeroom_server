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

	spawn();
}

function draw(){
	noStroke();
	background(10);
	if(gameState){
		drawGrid();
		drawDesks();
		drawDoor();
		drawPlayers();
		drawBackpacks();
		drawAgents();
		if(socket.id in gameState.players){
			movePlayer();
		}
		else drawLobby(); 
	}
}

function mousePressed(){
}

function spawn(pos){
	let controls = document.getElementById("controls");
	if(controls)controls.remove();

	var div = document.createElement("div");
	div.setAttribute("id", "controls");

	var para = document.createElement("h1");
	var node = document.createTextNode("Controls:");
	para.appendChild(node);
	div.appendChild(para);

	para = document.createElement("p");
	node = document.createTextNode("Arrow Keys:   move");
	para.appendChild(node);
	div.appendChild(para);

	para = document.createElement("p");
	node = document.createTextNode("Space:  pick up/place");
	para.appendChild(node);
	div.appendChild(para);

	para = document.createElement("p");
	node = document.createTextNode("Space(hold):  push desk");
	para.appendChild(node);
	div.appendChild(para);

	para = document.createElement("p");
	node = document.createTextNode("T: become target");
	para.appendChild(node);
	div.appendChild(para);

	para = document.createElement("p");
	node = document.createTextNode("L: return to lobby");
	para.appendChild(node);
	div.appendChild(para);
	
	element = document.getElementById("body");
	element.appendChild(div);

	let sketch = (()=>{
		mousePressed = ()=>{
		}

		keyPressed = ()=>{
			if(keyCode == 84) socket.emit('target');
			if(keyCode == 76) socket.emit('leave');
			else if(keyCode == 32) socket.emit('action',true);
			else movePlayer();
		}
	});

    let myp5 = new p5(sketch);
	socket.emit('spawn',pos);

	let canvas = document.getElementById("defaultCanvas1");
	canvas.remove();
}

function enterLobby(){
	let controls = document.getElementById("controls");
	if(controls)controls.remove();

	var div = document.createElement("div");
	div.setAttribute("id", "controls");

	var para = document.createElement("h1");
	var node = document.createTextNode("Controls:");
	para.appendChild(node);
	div.appendChild(para);

	para = document.createElement("p");
	node = document.createTextNode("C: clear board");
	para.appendChild(node);
	div.appendChild(para);

	para = document.createElement("p");
	node = document.createTextNode("[ or ]: resize board (clears it)");
	para.appendChild(node);
	div.appendChild(para);

	para = document.createElement("p");
	node = document.createTextNode("D: spawn desk");
	para.appendChild(node);
	div.appendChild(para);

	para = document.createElement("p");
	node = document.createTextNode("A: spawn agent");
	para.appendChild(node);
	div.appendChild(para);

	para = document.createElement("p");
	node = document.createTextNode("G: spawn agent that guards a point");
	para.appendChild(node);
	div.appendChild(para);

	para = document.createElement("p");
	node = document.createTextNode("B: spawn backpack");
	para.appendChild(node);
	div.appendChild(para);

	para = document.createElement("p");
	node = document.createTextNode("E: move exit");
	para.appendChild(node);
	div.appendChild(para);

	para = document.createElement("p");
	node = document.createTextNode("Click: spawn");
	para.appendChild(node);
	div.appendChild(para);
	
	element = document.getElementById("body");
	element.appendChild(div);


	let sketch = (()=>{
		mousePressed = ()=>{
			if(gameState){
				let spawnPos = getGridPos(mouseX,mouseY);
				if(keyIsDown(68)){
					socket.emit('desk',spawnPos);
					return;
				}
				if(keyIsDown(69)){
					socket.emit('door',spawnPos);
					console.log('door!');
					return;
				}
				spawnPos.x += 0.5;
				spawnPos.y += 0.5;
				if(keyIsDown(66)){
					socket.emit('pack',spawnPos);
					return;
				}
				if(keyIsDown(65)){
					socket.emit('agent',{type: 'chase',pos: spawnPos});
					return;
				}
				if(keyIsDown(71)){
					socket.emit('agent',{type: 'guard',pos: spawnPos});
					return;
				}
				if(isValidPlayerPos(spawnPos)) spawn(spawnPos);
			}
		}

		keyPressed = ()=>{
			if(keyCode == 67) socket.emit('clear');
			if(keyCode == 18) socket.emit('restart');
			if(keyCode == 219) socket.emit('resize',1);
			if(keyCode == 221) socket.emit('resize',-1);
		}
	});
	let myp5 = new p5(sketch);

	let canvas = document.getElementById("defaultCanvas1");
	canvas.remove();
}

function getDistance(pos1,pos2){
    let dx = pos2.x - pos1.x;
    let dy = pos2.y - pos1.y;
    return Math.sqrt(dx * dx + dy * dy);
}

function isValidPlayerPos(pos){
	let x = pos.x;
	let y = pos.y;
	let id = socket.id;
    if(x < 0.2 || x > gameState.worldSize-0.2) return false;
    if(y < 0.2 || y > gameState.worldSize-0.2) return false;

    for(i in gameState.players){
        if(i == id)continue;
        else{
            let dist = getDistance(gameState.players[i].pos,{x:x,y:y});
            if(dist < 0.4) return;
        }
    }

    for(i in gameState.desks){
        let obj = gameState.desks[i];
        if(
            x+0.2 > obj.pos.x && x-0.2 < obj.pos.x + 1 &&
            y+0.2 > obj.pos.y && y-0.2 < obj.pos.y + 1
        ) return false;
    }
    return true;
}

function isValidBlockPos(pos){
	let x = pos.x+0.5;
	let y = pos.y+0.5;
	if(x < 0.2 || x > gameState.worldSize-0.2) return false;
    if(y < 0.2 || y > gameState.worldSize-0.2) return false;
    for(i in gameState.desks){
        let obj = gameState.desks[i];
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
	// let result = getCanvasPos(x,y);
	// let size = width/gameState.worldSize;
	// noFill();
	// stroke(255,0,0);
	// strokeWeight(5);
	// ellipse(result.x,result.y,size*s,size*s);
	// line(result.x-size/2,result.y,result.x + size/2, result.y);
	// line(result.x,result.y-size/2,result.x, result.y + size/2);
	// noStroke();
}

function drawDoor(){
	noStroke();
	fill(255,0,0);
	drawRectOnGrid(gameState.doorPos.x+0.5,gameState.doorPos.y+0.5,0.9);
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

function drawDesks(){
	for(id in gameState.desks){
		let obj = gameState.desks[id];
		let scale = 1.05;
		noStroke();
		fill(100);
		drawRectOnGrid(obj.pos.x + 0.5,obj.pos.y + 0.5,scale);
	}
}

function drawBackpacks(){
	for(id in gameState.backpacks){
		let pack = gameState.backpacks[id];
		let scale = 0.3;
		noStroke();
		fill(255,0,255);
		if(pack.spilled){
			drawRectOnGrid(pack.pos.x - 0.2,pack.pos.y + 0.3,0.1);
			drawRectOnGrid(pack.pos.x + 0.2,pack.pos.y + 0.35,0.15);
			drawRectOnGrid(pack.pos.x - 0.2,pack.pos.y - 0.2,0.1);
			drawRectOnGrid(pack.pos.x,pack.pos.y - 0.3,0.1);
			drawRectOnGrid(pack.pos.x + 0.33,pack.pos.y - 0.3,0.1);
			drawRectOnGrid(pack.pos.x + 0.1,pack.pos.y - 0.1,0.2);
			drawRectOnGrid(pack.pos.x - 0.2,pack.pos.y + 0.2,0.4);
		}
		else drawRectOnGrid(pack.pos.x,pack.pos.y,scale);
	}
}

function drawAgents(){
	for(id in gameState.agents){
		let agent = gameState.agents[id];
		noStroke();
		fill(30,20,255);
		drawEllipseOnGrid(agent.pos.x,agent.pos.y,0.7);
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
	if(keyIsDown(68) || keyIsDown(69)){
		stroke(255,0,0);
		if(isValidBlockPos(mousePos))stroke(0,255,0);
		drawRectOnGrid(mousePos.x+0.5,mousePos.y+0.5,0.9);
	}
	else if(keyIsDown(66)){
		stroke(255,0,0);
		if(isValidBlockPos(mousePos))stroke(0,255,0);
		drawRectOnGrid(mousePos.x+0.5,mousePos.y+0.5,0.3);
	}
	else if(keyIsDown(65) || keyIsDown(71)){
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
	let controls = {}
	if(keyIsDown(37)) controls.left = true;
	if(keyIsDown(38)) controls.up = true;
	if(keyIsDown(39)) controls.right = true;
	if(keyIsDown(40)) controls.down = true;
	socket.emit('update',controls);
}