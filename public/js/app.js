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


app.controller('drawCtrl', function ($scope, $http, $routeParams, socket){

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

  var external_paths = {};
  var start = {};
  var path = {};

  tool.onMouseDown = function(event) {
    path = new Path();
    path.strokeColor = 'black';
    path.strokeWidth = 5;
    path.add(event.point);
    start.start = event.point;
  }

  tool.onMouseDrag = function(event) {
    if( !isTimeOut ){
      var uid = socket.socket.sessionid;
      
      var top = new Point({
          x: event.middlePoint.x
        , y: event.middlePoint.y
      })  
      var bottom = new Point({
          x: event.middlePoint.x
        , y: event.middlePoint.y
      })      

      path.add(top);
      path.insert(0, bottom);
      //path.smooth();
    }
  }

  tool.onMouseOut = function(event){
    if( !isTimeOut ){
      path.add(event.point);
      path.closed = false;
      //path.smooth();
      var end = event.point;
      var dataToEmit = {end:end};
      var uid = socket.socket.sessionid;
      socket.emit('draw:end', dataToEmit); 
    }
  }  

  tool.onMouseUp = function(event){
    if( !isTimeOut ){
      path.add(event.point);
      path.closed = false;
      //path.smooth();
      var end = event.point;
    }
  }  

  var clearCanvas = function(data){
    if(data.quizId == quizId){
      var canvas = document.getElementById('myCanvas');
      canvas.width = canvas.width;
      project.clear();      
    }    
  }

  var sendCanvas = function(){
    var canvas = document.getElementById('myCanvas');
    var dataURL = canvas.toDataURL();
    socket.emit('canvasImage', {'dataUrl': dataURL});
    //team name. question number. 
    
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
  $scope.team_score = 0;
  $scope.countdown_timer = 0;
  $scope.canvas_class = "red-bordered"

  $scope.clearCanvas = function(){  
    if( !isTimeOut ){  
      var canvas = document.getElementById('myCanvas');
      canvas.width = canvas.width;
      project.clear();
    }
  }

  //socket events  
  socket.on('connect', function(){
    teamName = prompt("Enter School Team", "");
    while(!teamName || teamName == ""){
      teamName = prompt("Enter School Team", "");
    }    
    $scope.data = {teamName: teamName};
    $scope.team_name = teamName;
    //find teamname in database;
    socket.emit('identify', {"identity":"school", "schoolName":teamName, "quizId":quizId})    

    $http.get('/mapi/getTeamData/'+ quizId + '/' + teamName).success(function(matchedTeam){
      if(matchedTeam){
        $scope.team_score = matchedTeam.teamScore;
      }
    })

  })
  

  socket.on('clearCanvas', function(data){
    clearCanvas(data);
    var canvas = document.getElementById('myCanvas');
    var dataURL = canvas.toDataURL();
    socket.emit('canvasImage', {'dataUrl': dataURL});
  })

  socket.on('new-question', function(data){

    //clear canvas;
    var canvas = document.getElementById('myCanvas');
    canvas.width = canvas.width;
    project.clear();

    //unlock canvas
    isTimeOut = false;
    $scope.canvas_class = "black-bordered"


    $scope.quizmaster_question = data.questionText;
    $scope.countdown_timer = data.time;
    $scope.question_class ="hidden";
    $scope.alert_class ="hidden";
    $scope.timesupalert_class = "hidden";
    $scope.quiz_name = data.quizName;
    
    if($scope.countdown_timer == 60){
      $scope.category_name = "60-Second Round"
    }
    if($scope.countdown_timer == 15){
      $scope.category_name = "15-Second Round"
    }
    if($scope.countdown_timer == 30){
      $scope.category_name = "30-Second Round"
    }

    $scope.categoryheader = data.quizName + " : " + $scope.category_name;

  })

  socket.on('startTimer', function(data){
    $scope.question_class ="";
    if($scope.countdown_timer == 60){
      $scope.question_wrapper = "col-md-12 column";      
    }    
    setTimeout(countdownTimer,1000);
  })

  socket.on('new-result', function(data){
    if(data.school === socket.socket.socket.sessionid){
      if(data.correct){
        $scope.team_score = data.score;                
        $scope.alert_message = "Correct Answer!";
        $scope.alert_class = "alert alert-success alert-dismissable";     

        $http.post('/mapi/updateScore', {"quizId":quizId, "teamName":teamName, "teamScore":data.score}).success(function(){

        });
      }
      else{
        $scope.alert_message = "Wrong Answer!";
        $scope.alert_class = "alert alert-danger alert-dismissable";           
      }    
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
  if(window.location.pathname == '/' || window.location.pathname == '/login'){
    return;
  }
  else{
    return 'A quiz is currently ongoing!!!';  
  }
  
}