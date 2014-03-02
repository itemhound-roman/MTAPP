var fs = require('fs');
var _ = require('underscore')
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
    var q = new quiz.QUIZ(req.body.obj);
    for(var i = 0; i< req.body.obj.teamCount ; i++){
      var team = new Object();
      team.teamName = "Team " + (i+1);
      q.teams.push(team);
    }
    q.save(function(err, result){
      if (err) res.status(400).send(err);
      else {
        var quizName = result.quizName;
        var path = "./public/" + quizName + "/";
        fs.mkdir(path, function(err, res){
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

  //app.post

  app.post('/mapi/newschool', function(req, res){
    quiz.QUIZ.findOne({"_id":req.body.quizId}).exec(function(err, result){
      if(err || !result){
        res.send("NOT MATCH FOUND");
      }
      else{
        //find teamname == schoolName. set active to true;
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
        //find teamname == schoolName. set active to true;
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
          team.active = false;
        });
        //refresh team scores. reconnect all.
        result.teams = teams;
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