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
  $scope.showSummary = true;

  socket.on('update-result', function(data){
    if(data.quizId == quizId){
      getScores(function(){
        selectCategory(data.categoryName);
      });
    }      
  });

  socket.on('update-region', function(data){
    console.log('new-region!');
    if(data.quizId == quizId){
      getScores(function(){

      })
    }

  })

  socket.on('refreshPages', function(data){    
    if(data.quizId == quizId){
      $scope.showSummary = true;
      window.location.reload();
      //$route.reload();
    }
  })
  
  var getScores = function(callback){
    $http.get('/mapi/quiz/'+quizId).success(function(data){
      $scope.quizName = data.quizName;
      $scope.teams = data.teams;
      $scope.categories = data.quizCategories;
      callback();
    });  
  }

  getScores( function(){});
  
  var selectCategory = function(categId){
    if(!categId){
      $scope.table_category = '';
      $scope.matchedCategory = null;
      $scope.showTable = false;
      $scope.showSummary = true;
    }
    else{      
      $scope.showSummary = false;
      $scope.showTable = true;
      $scope.table_category = categId;

      $scope.teams = $scope.teams.map(function(team){
        team.matchedCategory = _.find(team.categoryResult, function(result){ return result.categoryName == categId});
        team.scores = team.matchedCategory.scores;        
        return team;
      });
    }
  }

  $scope.selectCategory = function(categId){
    selectCategory(categId);       
  }
});


app.controller('timerDisplayCtrl', function ($scope, $http, $routeParams, socket){
  var quizId = $routeParams.quizId;


  $scope.buzzer = function(){    
    console.log(document.getElementById('audiotag1'));    
  }


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
      if($scope.timer == 1 || $scope.timer == 2 || $scope.timer == 3 || $scope.timer == 4 || $scope.timer == 5){
        document.getElementById('audiobeep').play();    
      }
      $scope.timer--;
      $scope.$apply();
      setTimeout(decrementTimer, 1000);
    }
    else{
      document.getElementById('audiobuzzer').play();    
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


app.controller('quizmasterCtrl', function ($scope, $http, $route, $routeParams, socket){
  var quizId = $routeParams.quizId;
  var categoryId = '';
  var categoryName = '';
  var activeCategoryName = '';
  
  $scope.timer = 0;
  $scope.startTimeButtonDisable = true;
  $scope.hidelabel = false;
  $scope.disableUpdate = true;
  $scope.isUpdated = true;
  $scope.schools = [
    {
      teamName: 'Spare 1',
      active: false,
      schoolId: '',
      teamScore: 0,
      currentAnswer: {
        src: ''
      }

    },
    {
      teamName: 'Spare 2',
      active: false,
      schoolId: '',
      teamScore: 0,
      currentAnswer:{
        src: ''
      }
    }
  ]

  $http.get('/mapi/quiz/'+quizId)
  .success(function(data){
    var that = this;
    if(data.isRunning) $scope.quizStatus = "Running";
    else $scope.quizStatus="Not Started";    
    $scope.inviteCode = data.inviteCode;
    $scope.quizName = data.quizName;
    $scope.teams = [];

    var addTeam = function(data){  
      data.score = 0;  
      $scope.teams.push(data);
    };
    
    _.each(data.teams, function(team){
      addTeam(team);      
    });    

    $scope.quiz = data.quizCategories.map(function(category){
      var secs = category.categoryTime;
      var points = category.categoryPoints;
      categoryId = category._id;
      categoryName = category.categoryName;
      category.questions = category.questions.map(function(question){
        question.used = question.used || false;
        question.points = points;
        question.time = secs;
        question.categoryId = categoryId;
        question.categoryName = categoryName;
        question.select = function(){
          toggleQuestionsModal();          
          $scope.activeQuestion = this;
        }
        return question;
      })
      return category;
    });
  });

  var toggleQuestionsModal =  function(){
    $("#questionsModal").modal('toggle');
  }

  $scope.selectQuestion = function(){
    $scope.startTimer_class = "btn btn-danger disabled"
    toggleQuestionsModal();
  };

  $scope.activeQuestion = {
    used: true
  };
  

  $scope.sendQuestion = function(){  
    
    var toSend = {
        quizName: $scope.quizName
      , quizId : quizId
      , questionText: $scope.activeQuestion.questionText
      , categoryName : $scope.activeQuestion.categoryName
      , points : $scope.activeQuestion.points
      , time   : $scope.activeQuestion.time
      , questionImage : $scope.activeQuestion.questionImage
    }

    activeCategoryName = $scope.activeQuestion.categoryName;
    console.log(activeCategoryName);
    $scope.teams = $scope.teams.map(function(team){ team.score = 0; return team; });
    $scope.schools = $scope.schools.map(function(school){ school.currentAnswer.src = '/img/no-answer.png'; return school;})
    $scope.timer = $scope.activeQuestion.time;
    $scope.startTimer_class = "btn btn-danger "
    $scope.startTimeButtonDisable = false;
    socket.emit('new-question',toSend);    
    $scope.disableUpdate = false;
    $scope.isUpdated = true;
  }

  socket.on('new-school', function(data){
    console.log("new school joined")
    console.log(data.schoolName);        
    if(quizId == data.quizId){
      _.each($scope.schools, function(school){
        if(school.teamName == data.schoolName){
          school.active = true;
          school.schoolId = data.schoolId;
        }
      })    
    }     
  })

  socket.on('school-left', function(data){
    console.log('a team disconnected');
    console.log(data.schoolName);
  
    _.each($scope.schools, function(school){
      if(school.schoolId == data.schoolId){
        school.active = false;
        school.schoolId = '';        
      }
    })       
  })

  socket.on('canvasImage', function(data){    
    var artist = data.schoolId;
    var uid = socket.socket.sessionid;
    var school = {};
    var receivedTime = new Date();
    var hours = receivedTime.getHours();
    var minutes = receivedTime.getMinutes() < 10 ? '0' + receivedTime.getMinutes().toString() : receivedTime.getMinutes();
    var seconds = receivedTime.getSeconds() < 10 ? '0' + receivedTime.getSeconds().toString() : receivedTime.getSeconds();
    var milliseconds = receivedTime.getMilliseconds();
    for (var i = 0; i < $scope.schools.length; i++){
      if ($scope.schools[i].schoolId == artist){
        school = $scope.schools[i];
        school.currentAnswer.src = data.dataUrl;
        school.currentAnswer.judged = false;  
        school.timeReceived = hours + ":" + minutes +":" + seconds + "." + milliseconds;
        break;
      }
    }   
  });
  
  socket.on('refreshPages', function(data){
    console.log('refresh?');
    if(data.quizId == quizId){
      $route.reload();
    }
  })

  socket.on('scoreboard-data', function(data){
    console.log(data);
  })

  socket.on('new-result', function(data){
    console.log(data);
    if(data.action != 'undo'){
      $scope.teams = _.map($scope.teams, function(team){
        if(team.teamName == data.schoolName){
          if(data.correct){
            console.log('correct');
            team.score = data.questionPoints;
          }
          else{
            team.score = 0;
          }
        }
        return team;
      })
    }
  })

  $scope.updateScoreboard = function(){
    $scope.disableUpdate = true;
    $scope.isUpdated = false;
    var scoreboardData = new Object();
    scoreboardData.quizId = quizId;
    scoreboardData.categoryName = activeCategoryName;
    scoreboardData.scores = $scope.teams.map(function(team){
      var teamData = new Object;
      teamData.teamName = team.teamName;
      teamData.score = team.score;
      return teamData;
    })
    

    $http.post('/mapi/updateScores', scoreboardData).success(function(){
    });
    
    socket.emit('update-result', scoreboardData);
  }

  $scope.startTimer = function(){    
    $scope.startTimeButtonDisable = true;
    $scope.activeQuestion.used = true;
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
  $scope.doOrDieMode = false;

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

    data.undoHistory = {
      disabled : true,
      lastAction : ''
    }

    data.answer = '';
    data.timeReceived = '';

    data.clearAnswer = function(){
      socket.emit('clearAllCanvases', {"quizId":quizId});
    }
    
    data.acceptAnswer = function(){          
      this.teamScore += $scope.activeQuestion.points;
      this.currentAnswer.judged = true;      
      this.undoHistory.disabled = false;
      this.undoHistory.lastAction = 'accept';
      this.answer = 'correct';      
      socket.emit('new-result',{
          school: this.schoolId
        , schoolName: this.teamName
        , correct: true
        , action: 'accept'
        , score: this.teamScore
        , questionPoints : $scope.activeQuestion.points
      })
    }
    
    data.rejectAnswer = function(){
      this.currentAnswer.judged = true;
      this.undoHistory.disabled = false;
      this.answer = 'wrong';
      this.undoHistory.lastAction = 'reject';
      socket.emit('new-result',{
          school: this.schoolId
        , schoolName: this.teamName
        , correct: false
        , action: 'reject'
        , score: this.teamScore
        , questionPoints : $scope.activeQuestion.points
      })
    }

    data.undoChecking = function(){
      this.currentAnswer.judged = false;
      this.undoHistory.disabled = true;
      this.answer = '';
      if(this.undoHistory.lastAction == 'accept'){
        this.teamScore -= $scope.activeQuestion.points;
        socket.emit('new-result',{          
            school: this.schoolId 
          , schoolName: this.teamName
          , correct: true 
          , action: 'undo' 
          , score: this.teamScore
          , questionPoints : $scope.activeQuestion.points
        })
      }      
    }  
    $scope.schools.push(data);    
  }

  $http.get('/mapi/quiz/'+quizId)
  .success(function(data){    
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


  socket.on('new-result', function(data){    
    console.log($scope.schools);
    if(data.correct){
      _.each($scope.schools, function(school){
        if(school.schoolId == data.school){
          school.currentAnswer.judged = true;
          school.teamScore = data.score;
        }
      })
    }
  });


  socket.on('new-question', function(data){
    if(data.quizId == quizId){      
      console.log(data.categoryName);
      if(data.categoryName == 'Do or Die'){
        $scope.doOrDieMode = true;  
      }
      else{
        $scope.doOrDieMode = false;
      }
      $scope.activeQuestion.questionText = data.questionText;
      $scope.activeQuestion.points = data.points;
      $scope.activeQuestion.time = data.time;
      $scope.timer = data.time;
    }
    clearJudgesCanvas();
  });

  var clearJudgesCanvas = function(){
    $scope.schools = $scope.schools.map(function(school){
      school.currentAnswer.src = "/img/no-answer.png";
      school.currentAnswer.judged = true;
      school.answer = '';
      return school;
    });
  }

  var decrementTimer = function(){
    if ($scope.timer > 0) {
      $scope.timer--;
      $scope.$apply();
      setTimeout(decrementTimer, 1000);
    }
    else{      
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
    var receivedTime = new Date();
    var hours = receivedTime.getHours();
    var minutes = receivedTime.getMinutes() < 10 ? '0' + receivedTime.getMinutes().toString() : receivedTime.getMinutes();
    var seconds = receivedTime.getSeconds() < 10 ? '0' + receivedTime.getSeconds().toString() : receivedTime.getSeconds();
    var milliseconds = receivedTime.getMilliseconds();
    for (var i = 0; i < $scope.schools.length; i++){
      if ($scope.schools[i].schoolId == artist){
        school = $scope.schools[i];
        school.currentAnswer.src = data.dataUrl;
        //if(data.categoryName == 'Do or Die'){
        school.currentAnswer.judged = false;  
        school.timeReceived = hours + ":" + minutes +":" + seconds + "." + milliseconds;
        //}
        break;
      }
    }   
  });
});


app.controller('createCtrl', function ($scope, $http ,socket){
  $scope.categories = [];
  //$scope.quizname = "";
  $scope.saveQuiz = function(){
    var obj = {
        quizName : $scope.quizName
      , quizCategories : $scope.categories
      , teamCount : $scope.participants
    }
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
}); 