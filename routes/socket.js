var sockets = [];

var unassignedSockets = [];

var quizmaster = [];
var schools = [];

module.exports = function (socket) {
  
  console.log("connection from")
  console.log(socket.id);
  if (unassignedSockets.indexOf(socket.id) == -1){
    unassignedSockets.push(socket.id);    
  };

  socket.on('startTimer', function(data){
    socket.broadcast.emit('startTimer', data);
  });

  socket.on('draw:progress', function (data, start, coordinates) {    
    data.artist = socket.id;
    socket.broadcast.emit('draw:progress', data)
  });

  socket.on('new-result', function(data){
    console.log("newres");
    console.log(data);
    socket.broadcast.emit('new-result', data);
  })

  socket.on('clear', function(data){
    data.schoolId = socket.id;
    console.log('here');
    socket.broadcast.emit('clear', data);
  })

  socket.on('draw:end', function (data) {    
    data.artist = socket.id;
    socket.broadcast.emit('draw:end', data)
  }); 

  socket.on('identify', function(data){
    if (data.identity == "quizmaster"){
      quizmaster.push({
        id: socket.id
      })
    };
    if (data.identity == "school"){
      data.schoolId = socket.id;
      socket.broadcast.emit("new-school", data);      
    }
    unassignedSockets = unassignedSockets.filter(function(a){return a!= socket.id});
  })

  socket.on('join', function(data){
    
  })

  socket.on('new-question', function(data){
    console.log("NEW QUESTION!!!!!")
    console.log('data');
    socket.broadcast.emit('new-question', data);
    //console.log(data); data.questionText, question.points, question.time
  });
     

  // setInterval(function () {
  //   socket.emit('erika', {
  //     time: (new Date()).toString()
  //   });
  // }, 1000);
};