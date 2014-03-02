app = angular.module('mtap-admin', ['ngRoute'])

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

//add quizmasterview + timerview
app.config(['$routeProvider',
  function($routeProvider) {
    $routeProvider.
      when('/', {
        templateUrl: '/templates/admin/index.html',
        controller: 'indexCtrl'
      }).
      when('/create', {
        templateUrl: '/templates/admin/create.html',
        controller: 'createCtrl'
      }).
      when('/judges/:quizId',{
        templateUrl: '/templates/admin/judges.html',
        controller: 'judgesCtrl'
      }).
      when('/quizmaster/:quizId',{
        templateUrl: '/templates/admin/quizmaster.html',
        controller: 'quizmasterCtrl'
      }).
      when('/admin/',{
        templateUrl: '/templates/admin/superAdmin.html',
        controller: 'superAdminCtrl'
      }).
      when('/timerDisplay/:quizId',{
        templateUrl: '/templates/admin/timerDisplay.html',
        controller: 'timerDisplayCtrl'
      }).
      when('/scoreboard/:quizId',{
        templateUrl: '/templates/admin/scoreboard.html',
        controller: 'scoreboardCtrl'
      }).
      otherwise({
        redirectTo: '/'
      });
}]);

app.controller('indexCtrl', function ($scope, $http, $location){
  $http.get('/mapi/quiz/')
  .success(function(data){
    console.log(data);
    $scope.quizzes = data;
  });

  $scope.joinContest = function(quizId){
    $location.path('/judges/' + quizId)
  }

  $scope.quizMaster = function(quizId){
    $location.path('/quizmaster/' + quizId);
  }

  $scope.timerRedirect = function(quizId){
    $location.path('/timerDisplay/' + quizId);
  }

  $scope.scoreboard = function(quizId){
    $location.path('/scoreboard/' + quizId);
  }

});


app.controller('scoreboardCtrl', function ($scope, $http, $routeParams, socket){
  var quizId = $routeParams.quizId;

  $http.get('/mapi/quiz/'+quizId).success(function(data){
    $scope.quizName = data.quizName;
    console.log(data);
  });

});


app.controller('timerDisplayCtrl', function ($scope, $http, $routeParams, socket){
  var quizId = $routeParams.quizId;

  $http.get('/mapi/quiz/'+quizId).success(function(data){
    $scope.quizName = data.quizName;
  });

  $scope.timer = 0;

  socket.on('startTimer', function(data){
    if(data.quizId == quizId){
      setTimeout(decrementTimer, 1000);
    }
  });

  var decrementTimer = function(){
    if ($scope.timer > 0) {
      $scope.timer--;
      $scope.$apply();
      setTimeout(decrementTimer, 1000);
    }
  }

  socket.on('new-question', function(data){
    if(data.quizId == quizId){
      $scope.timer = data.time;
    }    
  })
});


app.controller('superAdminCtrl', function ($scope, $http, $routeParams, socket){
  $http.get('/mapi/quiz/')
  .success(function(data){
    console.log(data);
    $scope.quizzes = data;
  });
  $scope.resetQuiz = function(quizId){
    console.log(quizId + " reset");
    $http.post('/mapi/reset/' + quizId, {}).success(function(data){
      if(data == 'ok'){
        socket.emit('refreshPages', {"quizId":quizId});
      }
    })
  }
});


app.controller('quizmasterCtrl', function ($scope, $http, $routeParams, socket){
  var quizId = $routeParams.quizId;
  $scope.timer = 0;
  $scope.startTimeButtonDisable = true;
  $scope.hidelabel = false;

  socket.on('new-question', function(data){
    $scope.hidelabel = true;
    if(data.quizId == quizId){
      $scope.question_text = data.questionText;
      $scope.timer = data.time;
      $scope.startTimeButtonDisable = false;
    }    
  })

  $scope.startTimer = function(){    
    $scope.startTimeButtonDisable = true;
    socket.emit('startTimer',{'quizId':quizId});
    setTimeout(decrementTimer, 1000);
  }

  var decrementTimer = function(){
    if ($scope.timer > 0) {
      $scope.timer--;
      $scope.$apply();
      setTimeout(decrementTimer, 1000);
    }
    else{
      $scope.question_text = '';
      $scope.hidelabel = false;
      $scope.$apply();
    }
  }

});


app.controller('judgesCtrl', function ($scope, $http, $routeParams, $route, socket){

  var quizId = $routeParams.quizId;  

  $scope.startTimer_class = "btn btn-danger disabled"

  socket.on('connect', function(){
    socket.emit('identify', {"identity":"quizmaster"})
  })

  socket.on('refreshPages', function(data){
    if(data.quizId == quizId){
      $route.reload();
    }
  })

  socket.on('new-school', function(data){
    console.log("new school joined")
    console.log(data.schoolName);        
    if(quizId == data.quizId){
      $http.post('/mapi/newschool/',{"schoolName":data.schoolName,"quizId":quizId, "schoolId":data.schoolId}).success(function(){
        _.each($scope.schools, function(school){
          if(school.teamName == data.schoolName){
            school.active = true;
            school.schoolId = data.schoolId;
          }
        })
      });
    }     
  })

  socket.on('school-left', function(data){
    console.log('a team disconnected');
    console.log(data.schoolName);
    

    _.each($scope.schools, function(school){
      if(school.schoolId == data.schoolId){
        school.active = false;
        school.schoolId = '';
        $http.post('/mapi/schoolLeft/',{"schoolName":data.schoolName, "quizId":quizId}).success(function(){ 
        });
      }
    })       
  })

  $scope.timer = 0;
  $scope.allowEntry = false;
  var external_paths = {};
  var start = {};
  var path = {};

  var addSchool = function(data){  
  
    data.currentAnswer = {
      judged: true
    };

    data.clearAnswer = function(){
      socket.emit('clearAllCanvases', {"quizId":quizId});
      //data.currentAnswer.src = '';
    }
    
    data.acceptAnswer = function(){      
      this.teamScore += $scope.activeQuestion.points;
      this.currentAnswer.judged = true;
      socket.emit('new-result',{
          school: this.schoolId
        , correct: true
        , score: this.teamScore
      })
    };
    
    data.rejectAnswer = function(){
      this.currentAnswer.judged = true;
      socket.emit('new-result',{
          school: this.schoolId
        , correct: false
        , score: this.teamScore
      })
    }      
    $scope.schools.push(data);    
  }

  $http.get('/mapi/quiz/'+quizId)
  .success(function(data){
    console.log(data);
    var that = this;
    if(data.isRunning) $scope.quizStatus = "Running";
    else $scope.quizStatus="Not Started";    
    $scope.inviteCode = data.inviteCode;
    $scope.quizName = data.quizName;
    $scope.schools = [];

    _.each(data.teams, function(team){
      addSchool(team);
    });    

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

  var toggleQuestionsModal = function(){
    $("#questionsModal").modal('toggle');
  }

  $scope.sendQuestion = function(){
    $scope.schools = $scope.schools.map(function(school){
      school.currentAnswer.src = "/img/no-answer.png"
      school.currentAnswer.judged = true;
      return school;
    })
    var toSend = {
        quizName: $scope.quizName
      , quizId : quizId
      , questionText: $scope.activeQuestion.questionText
      , points : $scope.activeQuestion.points
      , time   : $scope.activeQuestion.time
    }
    $scope.timer = $scope.activeQuestion.time;
    $scope.startTimer_class = "btn btn-danger "
    socket.emit('new-question',toSend);    
  }

  socket.on('startTimer', function(data){
    if(data.quizId == quizId){
      $scope.activeQuestion.used = true;  
      $scope.allowEntry = true;
      setTimeout(decrementTimer, 1000);
      $scope.allowJudging();
    }
  });

  var decrementTimer = function(){
    if ($scope.timer > 0) {
      $scope.timer--;
      $scope.$apply();
      setTimeout(decrementTimer, 1000);
    }
    else{
      /*
      for (var i = 0; i < $scope.schools.length; i++){
        $scope.schools[i].endPath(null);
      }
      */
      $scope.allowEntry = false;
    }
  }

  $scope.allowJudging = function(){
    for(var i = 0; i < $scope.schools.length; i++){
      if($scope.schools[i].active){
        $scope.schools[i].currentAnswer.judged = false;  
      }      
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

  socket.on('canvasImage', function(data){    
    var artist = data.schoolId;
    var uid = socket.socket.sessionid;
    var school = {};
    for (var i = 0; i < $scope.schools.length; i++){
      if ($scope.schools[i].schoolId == artist){
        school = $scope.schools[i];
        school.currentAnswer.src = data.dataUrl;
        break;
      }
    }   
  });
});


app.controller('createCtrl', function ($scope, $http, socket){
  $scope.categories = [];
  //$scope.quizname = "";
  $scope.saveQuiz = function(){
    console.log($scope.categories);
    var obj = {
        quizName : $scope.quizName
      , quizCategories : $scope.categories
      , teamCount : $scope.participants
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
          //, questionNumber : $index
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
  
   

});