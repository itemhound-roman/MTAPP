
/**
 * Module dependencies.
 */

var express = require('express');
var routes = require('./routes');
var user = require('./routes/user');
var http = require('http');
var path = require('path');
var _ = require('underscore');
var fs = require('fs');
var mongoose = require('mongoose')
mongoose.connect("mongodb://localhost:27017/mtap");
var MongoStore = require('connect-mongo')(express)
var quiz = require('./models/quiz.js');

var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;

var users = [
  {id: 1, passkey: 'abcd', userClass:10},
  {id: 2, passkey: 'a8solutions', userClass:1}
];

function findById(id, fn){
  var idx = id-1;
  if(users[idx]){
    fn(null, users[idx]);
  } else{
    fn(new Error('User '+ id + ' does not exist'));
  }
}

function findByPasskey(passkey, fn) {
  for (var i = 0, len = users.length; i < len; i++) {
    var user = users[i];
    if (user.passkey === passkey) {
      return fn(null, user);
    }
  }
  return fn(null, null);
}

passport.use(new LocalStrategy({
    usernameField: 'email',
    passwordField: 'password' 
  },
  function(username, password, done) {
    console.log('checking passkey');    
    process.nextTick(function () {        
      findByPasskey(password, function(err, user){
        if(err) { 
          console.log(err);
          return done(err); 
        }
        else{
          console.log(user);
          return done(null, user);
        }
      });
    });
  }
));

passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  findById(id, function (err, user) {
    done(err, user);
  });
});

var app = express();

// all environments
app.set('port', process.env.PORT || 3000);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.json());
app.use(express.urlencoded());
app.use(express.methodOverride());

app.use(express.cookieParser());
app.use(express.session({    
  secret : 'paulos secret',
  cookie: { maxAge: 24 * 60 * 60 * 1000 },
  store: new MongoStore({ db: mongoose.connections[0].db, clear_interval: 3600 })

}));

app.use(passport.initialize());
app.use(passport.session());

app.use(app.router);

// development only
if ('development' == app.get('env')) {
  app.use(express.errorHandler()); 
}

var API = require('./lib/api/')(app);
var WEB = require('./lib/web/')(app);

//login
app.get('/login', function (req,res){
  if(req.user){
    res.redirect('/facilitate/')
  }
  res.render('login',{});
});

app.post('/login', passport.authenticate('local',{
  successRedirect:'/facilitate/',
  failureRedirect:'/login',
  failureFlash: false
}));

app.get('/logout', function(req, res){
  console.log('logging out');
  req.logout();
  res.redirect('/');
});

app.post('/uploadImage', function(req, res){

  var base64Data = req.body.imgBase64.replace(/^data:image\/png;base64,/,"");
  var quizName = req.body.quizName;
  var category = req.body.category;
  var dateNow = (new Date()).toISOString();
  var teamName = req.body.teamName;
  var fileName = "./public/" + quizName + "/" + teamName + "/" + category.toString() + "-" + dateNow + ".png";
  var fileName = fileName.split(":").join("");
  fs.writeFile(fileName, base64Data, 'base64', function(err) {
    if(err){
      console.log(fileName);
      console.log(err);
      res.status(400).send(err);
    } 
    else
      res.send();
  });
})

app.post('*', function (req, res) {
  console.log(JSON.stringify(req.body))
  res.redirect(req.url);
});

var server = http.createServer(app);

var io = require('socket.io').listen(server, {log:false});
io.sockets.on('connection', require('./routes/socket'));

server.listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});