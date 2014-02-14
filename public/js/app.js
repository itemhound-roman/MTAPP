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
  if($location.path() != "/draw"){
    $rootScope.sidebar_class = "col-sm-2 col-md-1 sidebar ";  
    $rootScope.Quizmaster_Controls = "Quizmaster Controls";
  }
  else{
   $rootScope.sidebar_class = "col-sm-2 col-md-1 sidebar hidden";
   $rootScope.Quizmaster_Controls = "MTAP App";
  }
  

}]);

app.config(['$routeProvider',
  function($routeProvider) {
    $routeProvider.
      when('/', {
        templateUrl: '/templates/index.html',
        controller: 'indexCtrl'
      }).
      when('/quiz/:quizId', {
        templateUrl: '/templates/quiz.html',
        controller: 'quizCtrl'
      }).
      when('/draw', {
        templateUrl: '/templates/draw.html',
        controller: 'drawCtrl'
      }).
      when('/create', {
        templateUrl: '/templates/create.html',
        controller: 'createCtrl'
      }).
      otherwise({
        redirectTo: '/'
      });
}]);


app.controller('drawCtrl', function ($scope, $http, $routeParams, socket){

  //var isTimeOut = false;
  var isTimeOut = true;
  $scope.team_score = 0;
  $scope.countdown_timer = 0;
  $scope.timesupalert_class = "hidden";
  $scope.alert_class = "hidden";
  $scope.question_wrapper = "col-md-12 column hidden";

  var countdownTimer = function(){

    if ($scope.countdown_timer > 0) {
      $scope.countdown_timer--;
      $scope.$apply();
      setTimeout(countdownTimer, 1000);
    }
    else{
      isTimeOut = true;
      $scope.timesupalert_class = "alert alert-danger alert-dismissable";
      $scope.$apply();
    }
  }

  paper.install(window);
  socket.on('connect', function(){
    teamName = prompt("Enter School Team", "");
    while(!teamName || teamName == ""){
      teamName = prompt("Enter School Team", "");
    }    
    $scope.data = {teamName: teamName};
    $scope.team_name = teamName;

    socket.emit('identify', {"identity":"school", "schoolName":teamName})
    
  })
  paper.setup('myCanvas');
    // Create a simple drawing tool:
  var tool = new Tool();
  tool.minDistance = 2;
  tool.maxDistance = 15;

  var external_paths = {};
  var start = {};
  var path = {};

  // Define a mousedown and mousedrag handler
  tool.onMouseDown = function(event) {
    path = new Path();
    path.strokeColor = 'black';
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
      path.smooth();

      var dataToEmit = {"top": top, "bottom": bottom};
      socket.emit('draw:progress', {"uid":uid, start:start, dataToEmit: dataToEmit});
    }
  }

  tool.onMouseOut = function(event){
    if( !isTimeOut ){
      path.add(event.point);
      path.closed = false;
      path.smooth();
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
      path.smooth();
      var end = event.point;
      var dataToEmit = {end:end};
      var uid = socket.socket.sessionid;
      socket.emit('draw:end', dataToEmit); 
    }
  }  

  socket.on('new-question', function(data){
    project.clear();
    paper.setup('myCanvas');

    $scope.quizmaster_question = data.questionText;
    $scope.countdown_timer = data.time;
    $scope.question_class ="hidden";
    $scope.alert_class ="hidden";
    $scope.timesupalert_class = "hidden";
    
    if($scope.countdown_timer == 60){
      $scope.category_name = "Difficult"
    }
    if($scope.countdown_timer == 15){
      $scope.category_name = "Easy"
    }
    if($scope.countdown_timer == 30){
      $scope.category_name = "Average"
    }

  })

  socket.on('startTimer', function(data){
    isTimeOut = false;
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
      }
      else{
        $scope.alert_message = "Wrong Answer!";
        $scope.alert_class = "alert alert-danger alert-dismissable";           
      }    
    }    
  })

  $scope.clearCanvas = function(){    
    project.clear();
    socket.emit('clear', {data:"dummy"})
  }
});


app.controller('quizCtrl', function ($scope, $http, $routeParams, socket){
  var quizId = $routeParams.quizId;
  $scope.startTimer_class = "btn btn-danger disabled"

  socket.on('connect', function(){
    socket.emit('identify', {"identity":"quizmaster"})
  })
  $scope.schools = [];
  $scope.timer = 0;
  $scope.allowEntry = false;
  var external_paths = {};
  var start = {};
  var path = {};



  socket.on('new-school', function(data){
    console.log("new school joined")
    addSchool(data);
  })

  socket.on('answer', function(data){
    $scope.schools = $scope.schools.map(function(school){
      if (school.schoolId == parseInt(data.schoolId)){
        school.currentAnswer.src = data.answerSrc;
        school.currentAnswer.judged = false;
      }
      return school;
    })
    console.log($scope.schools)
  });

  socket.on('clear', function(data){
    var schoolId = data.schoolId;
    for (var i = 0; i < $scope.schools.length; i++){
      if ($scope.schools[i].schoolId == schoolId){
        school = $scope.schools[i];
        school.clearSlate();
        break;
      }
    }
  })


  socket.on('draw:progress', function(data){
    if (!$scope.allowEntry) return;
    var artist = data.artist;
    var uid = socket.socket.sessionid;
    
    var school = {};
    for (var i = 0; i < $scope.schools.length; i++){
      if ($scope.schools[i].schoolId == artist){
        school = $scope.schools[i];
        break;
      }
    }
      
    if (!school) return;
    if(school.path.length == 0){
      school.createPath(data);
      //school.updatePath(data);
    }
    else{
      school.updatePath(data);      
    }
  
  })


  socket.on('draw:end', function(data){
    if (!$scope.allowEntry) return;
    var artist = data.artist;
    var uid = socket.socket.sessionid;
    var school = {};
    for (var i = 0; i < $scope.schools.length; i++){
      if ($scope.schools[i].schoolId == artist){
        school = $scope.schools[i];
        break;
      }
    }
    school.endPath(data);
  });

  var toggleQuestionsModal = function(){
    $("#questionsModal").modal('toggle');
  }

  var addSchool = function(data){
    data.paper = new paper.PaperScope();
    data.path = [];
    data.canvasCreated = false;
    data.points = 0;

    data.updatePath = function(data){
      var thistop = {x: data.dataToEmit.top[1]/2, y: data.dataToEmit.top[2]/2};
      var x = this.path.length - 1;
      (this.path[x]).push(thistop);
    };
    data.clearSlate = function(){
     this.paper.setup('canvas'+this.schoolId); 
     this.canvasCreated = true; 
     this.path = [];
    }
    data.endPath = function(data){
      this.paper = new paper.PaperScope();
      this.paper.setup('canvas'+this.schoolId); 

      if( this.path.length > 0 ){
        if (data){
          var thisend = {x: (data.end[1])/2, y: (data.end[2])/2};
          this.path[this.path.length-1].push(thisend);  
        }
        for (var j = 0; j < this.path.length; j++){
          var _path = new this.paper.Path();
          for (var i = 0; i < this.path[j].length; i++){
            var pt = new this.paper.Point(this.path[j][i]);
            _path.add(pt)
          }
          _path.strokeColor = 'black';
          paper.view.draw();
        }
        var emptyArray = [];
        this.path.push(emptyArray);
        
      }
    }
    data.createPath = function(data){
      this.canvasCreated = true;
      this.path = [];
      var p = [];
      var thisstart = {x: data.start.start[1]/2, y : data.start.start[2]/2};
      p.push(thisstart);
      this.path.push(p);
      console.log("created path");
      console.log(this.path)

    }
    data.drawData = function(path){
      var _path = new this.paper.Path();
      for (var i = 0; i < path._segments.length; i++){
        _path.add(path._segments[i])
      }
      this.paper.view.draw();
    };
    data.currentAnswer = {
      judged: true
    };
    data.acceptAnswer = function(){      
      this.points += $scope.activeQuestion.points;
      this.currentAnswer.judged = true;
      socket.emit('new-result',{
          school: this.schoolId
        , correct: true
        , score: this.points
      })
    };
    data.rejectAnswer = function(){
      this.currentAnswer.judged = true;
      socket.emit('new-result',{
          school: this.schoolId
        , correct: false
        , score: this.points
      })
    }
    $scope.schools.push(data);
    console.log($scope.schools);
  }

  $scope.sendQuestion = function(){
    $scope.schools = $scope.schools.map(function(school){
      school.currentAnswer.src = "/img/no-answer.png"
      school.currentAnswer.judged = true;
      return school;
    })
    var toSend = {
        questionText: $scope.activeQuestion.questionText
     ,  points : $scope.activeQuestion.points
     ,  time   : $scope.activeQuestion.time
    }
    $scope.startTimer_class = "btn btn-danger "
    socket.emit('new-question',toSend);
    
  }

  $scope.startTimer = function(){
    $scope.activeQuestion.used = true;
    $scope.timer = $scope.activeQuestion.time;
    
    socket.emit('startTimer');
    $scope.allowEntry = true;
    setTimeout(decrementTimer, 1000);
    $scope.allowJudging();
    $scope.clearCanvases();
  }


  var decrementTimer = function(){

    if ($scope.timer > 0) {
      $scope.timer--;
      $scope.$apply();
      setTimeout(decrementTimer, 1000);
    }
    else{
      for (var i = 0; i < $scope.schools.length; i++){
        $scope.schools[i].endPath(null);
      }
      $scope.allowEntry = false;
    }
  }

  $scope.clearCanvases = function(){
    for(var i = 0; i < $scope.schools.length; i++){
      $scope.schools[i].clearSlate();
    }
  }


  $scope.allowJudging = function(){
    for(var i = 0; i < $scope.schools.length; i++){
      $scope.schools[i].currentAnswer.judged = false;
    }
  }
  $scope.disallowJudging = function(){
    for(var i = 0; i < $scope.schools.length; i++){
      $scope.schools[i].currentAnswer.judged = true;
    }
  }

  $scope.selectQuestion = function(){
    $scope.startTimer_class = "btn btn-danger disabled"
    toggleQuestionsModal();
  };
  
  $scope.activeQuestion = {
    used: true
  };

  $http.get('/mapi/quiz/'+quizId)
  .success(function(data){
    var that = this;
    $scope.inviteCode = data.inviteCode;
    $scope.quizName = data.quizName;
    $scope.quiz = data.quizCategories.map(function(category){
      var secs = category.categoryTime;
      var points = category.categoryPoints;
      var categoryId = category._id;
      category.questions = category.questions.map(function(question){
        question.used = question.used || false;
        question.points = points;
        question.time = secs;
        question.categoryId = categoryId;
        question.select = function(){
          toggleQuestionsModal();
          $scope.activeQuestion = this;
        }
        return question;
      })
      return category;
    });

  });

;});

app.controller('createCtrl', function ($scope, $http, socket){
  socket.on('erika', function (data) {
    //console.log(data)
  });

  
  $scope.categories = [];
  $scope.quizname = "";
  $scope.saveQuiz = function(){
    console.log($scope.categories);
    var obj = {
        quizName : $scope.quizName
      , quizCategories : $scope.categories
    }
    console.log(obj);
    $http.post('/mapi/quiz/', {"obj":obj}).success(function(){
        alert('Successfully uploaded Quiz')
      }).error(function(){
        alert('Failed to upload Quiz');
      })
  },
  $scope.addCategory = function(){
    $scope.categories.push({
        categoryName : ""
      , categoryHash : Date.now()
      , categoryTime : 60
      , questions : []
      , removeCategory : function(){
            for (var i = 0; i < $scope.categories.length; i++){
              if ($scope.categories[i].categoryHash == this.categoryHash){
                $scope.categories.splice(i,1);
                break;
              }
            }
      }
      , addQuestion : function(){
        this.questions.push({
            categoryHash : this.categoryHash
          , questionHash : Date.now()
          , questionText : ""
          , answerText   : ""
          , removeQuestion : function(){
            for (var i = 0; i < $scope.categories.length; i++){
              if ($scope.categories[i].categoryHash == this.categoryHash){
                for (var j = 0; j < $scope.categories[i].questions.length; j++){
                  if ($scope.categories[i].questions[j].questionHash == this.questionHash){
                    $scope.categories[i].questions.splice(j,1);
                    break;
                  }
                }
                break;
              }
            }
          }
        })

      }
    })
  }
  
   
;});



app.controller('indexCtrl', function ($scope, $http){
  

  
   
;});

/*
window.onbeforeunload = function() {
  return 'A quiz is currently ongoing!!!';
}*/
