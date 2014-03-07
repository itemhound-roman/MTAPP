var fs = require('fs');
var async = require('async');
var _ = require('underscore');
var quiz = require('../../models/quiz.js');
var PermissionsMiddleware = require('../Middleware/permissionsMiddleware.js');

module.exports = function (app){
  app.get('/mapi/quiz', function(req, res){
    quiz.QUIZ.find({}).exec(function(err, quizzes){
      if (err) req.status(400).send(err);
      else res.send(quizzes);
    })
  })


  app.get('/mapi/quiz/:quizId', function(req, res){
    quiz.QUIZ.findOne({"_id":req.params.quizId}).exec(function(err, result){
      if (err) req.status(400).send(err);
      else res.send(result);
    })
  })

  app.post('/mapi/quiz/', PermissionsMiddleware.OnlyAllowAuthenticated, function(req, res){
    var quizCategories = req.body.obj.quizCategories;   
    var quizName = req.body.obj.quizName;
    var quizObject = req.body.obj;
    

    quizObject.quizCategories = _.map(quizObject.quizCategories, function(category){
      category.questions = _.map(category.questions, function(question, index){
        question.questionImage = quizObject.quizName  + "_" + category.categoryName + "_" + (index+1) + ".png";
        return question;
      })
      return category;
    })

    var q = new quiz.QUIZ(quizObject);

    for(var i = 0; i< req.body.obj.teamCount ; i++){
      var team = new Object();
      team.teamName = "Team " + (i+1);
      team.categoryResult = [];

      for(var j =0; j < quizCategories.length; j++){
        var categoryResult = new Object();
        categoryResult.categoryName = quizCategories[j].categoryName;
        categoryResult.categoryNumber  = (j+1);
        categoryResult.questionResults = [];
        
        for(var k = 0; k < quizCategories[j].questions.length; k++){
          var questionResult = new Object();
          questionResult.questionNumber = (k+1);          
          categoryResult.questionResults.push(questionResult);     
        }
        team.categoryResult.push(categoryResult);        
      }
      q.teams.push(team);
    }
    q.save(function(err, result){
      if (err) res.status(400).send(err);
      else {        //
        var quizName = result.quizName;
        var path = "./public/" + quizName + "/";
        fs.mkdir(path, function(err, thisres){
          if(err) res.status(400).send(err);
          else{
            _.each(result.teams, function(team){
              fs.mkdir(path+"/"+team.teamName, function(){});
            })
          }        
        })
        res.send(result);
      }
    });
  })


  app.post('/mapi/newschool', function(req, res){
    quiz.QUIZ.findOne({"_id":req.body.quizId}).exec(function(err, result){
      if(err || !result){
        res.send("NOT MATCH FOUND");
      }
      else{
        var teams = result.teams;
        _.each(teams, function(team){
          if(team.teamName == req.body.schoolName){
            team.active = true;
            team.schoolId = req.body.schoolId;
          }
        })
        result.teams = teams;
        result.save(function(err, result){
          if(err) res.status(400).send(err);
          else res.send();
        })
      }
    });    
  });


  app.get('/mapi/getTeamData/:quizId/:teamName', function(req, res){
    quiz.QUIZ.findOne({"_id":req.params.quizId}).exec(function(err, result){
      if(err || !result){
        res.send(null);
      }
      else{
        var teams = result.teams;
        var flag = true;
        var matchedTeam = _.find(teams, function(team){ return team.teamName == req.params.teamName});        
        res.send(matchedTeam);        
      }
    })
  })


  app.post('/mapi/schoolLeft', function(req, res){
    quiz.QUIZ.findOne({"_id":req.body.quizId}).exec(function(err, result){
      if(err || !result){
        res.send("NO MATCH FOUND");
      }
      else{
        var teams = result.teams;
        _.each(teams, function(team){
          if(team.teamName == req.body.schoolName){
            team.active = false;
            team.schoolId = '';
          }
        })
        result.teams = teams;
        result.save(function(err, result){
          if(err) res.status(400).send(err);
          else res.send();
        })
      }
    });  
  });

  app.post('/mapi/updateRegion', function(req, res){
    quiz.QUIZ.findOne({"_id":req.body.quizId}).exec(function(err, result){
      if(err || !result){
        res.send("NO MATCH FOUND");
      }
      else{
        result.teams= _.map(result.teams, function(team){
          if(team.teamName == req.body.teamName){
            team.teamRegion= req.body.region;
          }
          return team;
        })
        result.save(function(err, result){
          if(err) res.status(400).send(err);
          else res.send();
        })
      }
    });      
  })



  app.post('/mapi/updateScores', function(req, res){
    var scoreDataArray = req.body.scores;
    var categoryName = req.body.categoryName;   
    
    var processCategoryScores = function(team, callback){

      var scoreData = _.find(scoreDataArray, function(scoreData){
        return scoreData.teamName == team.teamName;
      })

      var process2 = function(category, callback){
        if(category.categoryName == categoryName){
          category.categoryScore += parseInt(scoreData.score);
          for(var i = 0; i< category.questionResults.length; i++){
            if(!category.questionResults[i].questionChecked){
              category.questionResults[i].questionChecked = true;
              category.questionResults[i].score = parseInt(scoreData.score);
              break;
            }
          }
          callback(null, category);
        }
        else{
          callback(null, category);
        }
      }

      team.teamScore += parseInt(scoreData.score);

      async.map(team.categoryResult, process2, function(err, thisAsyncResult){
        team.categoryResult = thisAsyncResult;
        callback(null, team);
      });

    }

    quiz.QUIZ.findOne({"_id":req.body.quizId}).exec(function(err, result){
      if(err || !result){
        res.send("NO MATCH FOUND");
      }
      else{  
        async.map(result.teams, processCategoryScores, function(err, asyncResult){
          if(err) console.log(err);
          else{
            result.teams = asyncResult;
            result.save(function(error, savedresult){
              if(error){
                res.status(400).send(error);
              } 
              else{
                res.send(savedresult);
              }
            })
          } 
        })        
      }
    })
  });


  app.post('/mapi/updateScore', function(req, res){
    quiz.QUIZ.findOne({"_id":req.body.quizId}).exec(function(err, result){
      if(err || !result){
        res.send("NO MATCH FOUND");
      }
      else{
        var teams = result.teams;
        _.each(teams, function(team){
          if(team.teamName == req.body.teamName){
            team.teamScore = req.body.teamScore;
          }
        })
        result.teams = teams;
        result.save(function(err, result){
          if(err) res.status(400).send(err);
          else{
            res.send();
          }
        })
      }
    })
  });


  app.post('/mapi/reset/:quizId', PermissionsMiddleware.OnlyAllowAuthenticated, function(req, res){
    quiz.QUIZ.findOne({"_id":req.params.quizId}).exec(function(err, result){
      if(err || !result){
        res.send("NO MATCH FOUND");        
      }
      else{
        var teams = result.teams;
        _.each(teams, function(team){
          team.teamScore = 0;
          team.schoolId = '';      
          team.teamRegion = '';    
          team.active = false;
          _.each(team.categoryResult, function(categoryResult){
            categoryResult.categoryScore = 0;
            categoryResult.questionResults = _.map(categoryResult.questionResults, function(questionResult){
              questionResult.questionNumber = questionResult.questionNumber;
              questionResult.questionChecked = false;
              questionResult.score = 0;
              return questionResult;
            })
          })
        });
        //refresh team scores. reconnect all.
        result.teams = teams;
        console.log(result.teams);
        result.save(function(err, result){
          if(err) res.status(400).send(err);
          else{            
            res.send("ok");
          }
        })
      }    
    })
  });

}