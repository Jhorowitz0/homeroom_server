const { text } = require("express");
var socket;

function setup() {
	createCanvas(800,800);
	background(10);
}

function spawn(x,y){
	let sketch = (()=>{
		mousePressed = ()=>{
		}

		keyPressed = ()=>{
		}
	});

    let myp5 = new p5(sketch);
	// socket.emit('spawn',{x:x,y:y});
}

function enterLobby(){
	let sketch = (()=>{
		mousePressed = ()=>{
		}

		keyPressed = ()=>{
			
		}
	});
}
