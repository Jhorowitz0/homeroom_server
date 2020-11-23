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
//when a client connects serve the static files in the public directory ie public/index.html
app.use(express.static('public'));

var UPDATE_TIME = 100

//when a client connects
io.on('connection', function (socket) {
    console.log('user connected...');

    //this is sent to the client
    socket.emit('updateState', gameState);

    socket.on('spawn', function(pos){
    });

    socket.on('disconnect', function(){
        console.log('user disconnected');
    });
});

setInterval(()=>{
    // io.sockets.emit('state', gameState);
}, UPDATE_TIME);


//listen to the port 3000
http.listen(3000, function () {
    console.log('listening on *:3000');
});