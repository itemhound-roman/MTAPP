

var _ = require('underscore');
var http = require('http');

var sockets = [];
var unassignedSockets = [];

var quizmaster = [];
var schools = [];
var clients = [];

module.exports = function (socket) {
  
  console.log("connection from")
  console.log(socket.id);
  if (unassignedSockets.indexOf(socket.id) == -1){
    unassignedSockets.push(socket.id);    
  };

  socket.on('startTimer', function(data){
    socket.broadcast.emit('startTimer', data);
  });

  socket.on('new-result', function(data){
    socket.broadcast.emit('new-result', data);
  })

  socket.on('clearAllCanvases', function(data){    
    socket.broadcast.emit('clearCanvas', data);
  })

  socket.on('refreshPages', function(data){
    socket.broadcast.emit('refreshPages', data);
  })

  socket.on('identify', function(data){
    if (data.identity == "quizmaster"){
      quizmaster.push({
        id: socket.id
      })
    };
    if (data.identity == "school"){      
      var newSchool = new Object();
      newSchool.socketId = socket.id;
      newSchool.schoolName = data.schoolName;      
      clients.push(newSchool);
      
      data.schoolId = socket.id;      
      socket.broadcast.emit("new-school", data);      
    }
    unassignedSockets = unassignedSockets.filter(function(a){return a!= socket.id});
  })

  socket.on('join', function(data){
    
  })

  socket.on('canvasImage', function(data){
    data.schoolId = socket.id;
    socket.broadcast.emit('canvasImage', data);
  });


  socket.on('new-question', function(data){
    console.log("NEW QUESTION!!!!!")
    console.log(data);
    socket.broadcast.emit('new-question', data);
  });

  socket.on('update-result', function(data){    
    console.log(data);
    socket.broadcast.emit('update-result', data);
    
  })

  socket.on('disconnect', function(data){
    console.log("someone disconnected");
    console.log(socket.id);

    var school_left = _.find(clients, function(client){ return client.socketId == socket.id });    
    clients = _.reject(clients, function(client){return client.socketId == socket.id});
    if(school_left){
      socket.broadcast.emit('school-left', {schoolName: school_left.schoolName, schoolId: socket.id});
    }
  })
  
};