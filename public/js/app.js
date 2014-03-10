app = angular.module('mtap-quizmaster', ['ngRoute'])

app.factory('socket', function ($rootScope) {
  var socket = io.connect();

  return {
    socket: socket,
    on: function (eventName, callback) {
      socket.on(eventName, function () {  
        var args = arguments;
        $rootScope.$apply(function () {
          callback.apply(socket, args);
        });
      });
    },
    emit: function (eventName, data, callback) {
      socket.emit(eventName, data, function () {
        var args = arguments;
        $rootScope.$apply(function () {
          if (callback) {
            callback.apply(socket, args);
          }
        });
      })
    }
  };
});

app.controller('appctrl', ['$rootScope','$route','$location', '$http', function($rootScope,$route,$location,$http){ 

}]);

app.config(['$routeProvider',
  function($routeProvider) {
    $routeProvider.
      when('/', {
        templateUrl: '/templates/index.html',
        controller: 'indexCtrl'
      }).
      when('/contestant',{
        templateUrl: '/templates/contestant.html',
        controller: 'contestantCtrl'
      }).      
      when('/draw/:quizId', {
        templateUrl: '/templates/draw.html',
        controller: 'drawCtrl'
      }).
      otherwise({
        redirectTo: '/'
      });
}]);


app.controller('drawCtrl', function ($scope, $http, $route, $routeParams, socket){

  //variables
  //need quizName and categoryName
  var quizId = $routeParams.quizId;  
  var teamName = "";  
  var isTimeOut = true;

  paper.install(window);
  paper.setup('myCanvas');
  var tool = new Tool();
  tool.minDistance = 2;
  tool.maxDistance = 15;
  var path;
  
  tool.onMouseDown = function(event) {
    if(!isTimeOut){
      if (path) {
        path.selected = false;
      }

      path = new Path();
      path.strokeWidth = 6;
      path.strokeColor = 'black';      
    }
  }

  tool.onMouseDrag = function(event) {
    if( !isTimeOut ){
      path.add(event.point);  
    }
  }

  tool.onMouseUp = function(event) {
    if( !isTimeOut ){
      path.smooth();    
    }
  }
  
  tool.onMouseOut = function(event){
    if( !isTimeOut ){
      path.smooth();
    }
  }
  

  var clearCanvas = function(data){
    if(data.quizId == quizId){
      
      var canvas = document.getElementById('myCanvas');      
      context = canvas.getContext("2d");

      var o = document.getElementById('myCanvas');
      var l =o.offsetLeft; var t = o.offsetTop;
      while (o=o.offsetParent)
        l += o.offsetLeft;
      o = document.getElementById('myCanvas');
      //while (o=o.offsetParent)
        t += o.offsetTop;

      context.clearRect(0,t, canvas.width,canvas.height);
      project.clear();
    }    
  }

  var sendCanvas = function(){
    var canvas = document.getElementById('myCanvas');
    var dataURL = canvas.toDataURL();
    socket.emit('canvasImage', {'dataUrl': dataURL});
    $http.post('/uploadImage/', {"imgBase64":dataURL,"quizName":$scope.quiz_name,"category":$scope.category_name,"teamName":teamName}).success(function(){
    });
  }

  var countdownTimer = function(){
    if ($scope.countdown_timer > 0) {
      $scope.countdown_timer--;
      $scope.$apply();
      setTimeout(countdownTimer, 1000);
    }
    else{
      isTimeOut = true;
      $scope.canvas_class = "red-bordered"      
      $scope.timesupalert_class = "alert alert-danger alert-dismissable";
      $scope.$apply();
      sendCanvas();
    }
  }

  //data bindings  
  $scope.disableSendCanvas = false;
  $scope.question_class ="hidden";
  $scope.team_score = 0;
  $scope.countdown_timer = 0;
  $scope.canvas_class = "red-bordered"
  $scope.doOrDieMode = false;
  $scope.canvasSent = false;
  $scope.regions = [
      {name: 'CAR'},
      {name: 'NCR-A'},
      {name: 'NCR-B'},
      {name: 'Region I'},
      {name: 'Region II'},
      {name: 'Region III'},
      {name: 'Region IV-A'},
      {name: 'Region IV-B'},
      {name: 'Region V'},
      {name: 'Region VI'},
      {name: 'Region VII'},
      {name: 'Region VII'},
      {name: 'Region IX'},
      {name: 'Region X'},
      {name: 'Region XI'},
      {name: 'Region XII'},
      {name: 'Region XIII'},
    ];
  $scope.region = $scope.regions[-1]; // red

  $scope.updateRegion = function(){
    var dataToSend = {
      quizId: quizId,
      teamName: teamName,
      region: $scope.region.name
    }

    socket.emit('update-region', {'quizId': quizId});    
    $http.post('/mapi/updateRegion', dataToSend).sucess(function(){
    });


  }

  $scope.sendCanvas = function(){
    $scope.disableSendCanvas = true;
    $scope.canvasSent = true;
    sendCanvas();
  }

  $scope.clearCanvas = function(){  
    if( !isTimeOut ){  
      $scope.disableSendCanvas = false;
      $scope.canvasSent = false;
      var canvas = document.getElementById('myCanvas');
      var context = canvas.getContext('2d');

      var o = document.getElementById('myCanvas');
      var l =o.offsetLeft; var t = o.offsetTop;
      //while (o=o.offsetParent)
        l += o.offsetLeft;
      o = document.getElementById('myCanvas');
      //while (o=o.offsetParent)
        t += o.offsetTop;

      context.clearRect(0,t,canvas.width, canvas.height);
      project.clear();
    }
  }

  //socket events  
  socket.on('connect', function(){
    teamName = prompt("Enter Team Number", "");
    while(!teamName || teamName == ""){
      teamName = prompt("Enter Team Number", "");
    }    
    $scope.data = {teamName: teamName};
    $scope.team_name = teamName;
    //find teamname in database;
    if(teamName && teamName!= ''){
      socket.emit('identify', {"identity":"school", "schoolName":teamName, "quizId":quizId})      
    }
    

    $http.get('/mapi/getTeamData/'+ quizId + '/' + teamName).success(function(matchedTeam){
      if(matchedTeam){
        $scope.team_score = matchedTeam.teamScore;
      }
    })
  })

  socket.on('refreshPages', function(data){    
    if(data.quizId == quizId){
      teamName = '';
      window.location.reload();
      //$route.reload();
    }
  })
  

  socket.on('clearCanvas', function(data){
    clearCanvas(data);
    var canvas = document.getElementById('myCanvas');
    var dataURL = canvas.toDataURL();
    socket.emit('canvasImage', {'dataUrl': dataURL});
  })

  socket.on('new-question', function(data){ 
    console.log(data);

    if(data.quizId == quizId){  
      clearCanvas(data);

      //unlock canvas
      isTimeOut = false;
      $scope.canvas_class = "black-bordered"

      if(data.categoryName == 'Do or Die'){
        console.log("DO OR DIE");
        $scope.doOrDieMode = true;
      }
      else{
        $scope.doOrDieMode = false;
      }


      $scope.quizmaster_question = data.questionText;
      $scope.quizmaster_image = data.questionImage;
      $scope.countdown_timer = data.time;
      $scope.question_class ="hidden";
      $scope.alert_class ="hidden";
      $scope.timesupalert_class = "hidden";
      $scope.quiz_name = data.quizName;
      $scope.category_name = data.categoryName;

      if (data.time == 60){
        $scope.question_class ="";        
      }
      else{
        $scope.question_class = "hidden";
      }

      $scope.categoryheader = data.quizName + " : " + $scope.category_name;
    }
  })

  socket.on('startTimer', function(data){    
    if(data.quizId == quizId){      
      if($scope.countdown_timer == 60){
        $scope.question_wrapper = "col-md-12 column";      
      }    
      setTimeout(countdownTimer,1000);
    }    
  })

  socket.on('new-result', function(data){
    /*
    if(data.school === socket.socket.socket.sessionid){
      if(data.correct){
        $scope.team_score = data.score;                

        $http.post('/mapi/updateScore', {"quizId":quizId, "teamName":teamName, "teamScore":data.score, "correct": true}).success(function(){

        });
      }
      else{

        $http.post('/mapi/updateScore', {"quizId":quizId, "teamName":teamName, "teamScore":data.score, "correct": false}).success(function(){

        });

      }    
    } 
    */   
  })

  socket.on('update-result', function(data){
    if(quizId == data.quizId){
      var scoreArray = data.scores;
      _.each(scoreArray, function(score){
        if(score.teamName == teamName){
          $scope.team_score += parseInt(score.score);
        }
     })  
    }    
  })
});



app.controller('contestantCtrl', function ($scope, $http, $location){
  $http.get('/mapi/quiz/')
  .success(function(data){
    console.log(data);
    $scope.quizzes = data;
  });

  $scope.joinContest = function(quizId){
    $location.path('/draw/' + quizId)
  }
})

app.controller('indexCtrl', function ($scope, $http){
    
   
});

window.onbeforeunload = function() {

   
  if(window.location.hash == '#/' || window.location.pathname == '/login'){
    return;
  }
  else{  
    return 'A quiz is currently ongoing!!!';  
  }
  
  
}