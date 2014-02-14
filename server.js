
/**
 * Module dependencies.
 */

var express = require('express');
var routes = require('./routes');
var user = require('./routes/user');
var http = require('http');
var path = require('path');
var mongoose = require('mongoose')
mongoose.connect("mongodb://localhost:27017/mtap");
var quiz = require('./models/quiz.js');

var app = express();

// all environments
app.set('port', process.env.PORT || 3000);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.json());
app.use(express.urlencoded());
app.use(express.methodOverride());
app.use(app.router);
app.use(express.static(path.join(__dirname, 'public')));

// development only
if ('development' == app.get('env')) {
  app.use(express.errorHandler()); 
}

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

app.post('/mapi/quiz/', function(req, res){

  var q = new quiz.QUIZ(req.body.obj);
  q.save(function(err, result){
    if (err) res.status(400).send(err);
    else res.send(result);
  });
})


app.post('*', function (req, res) {
  console.log(JSON.stringify(req.body))
  res.redirect(req.url);
});


// app.get('/', routes.index);
// app.get('/users', user.list);

var server = http.createServer(app);

var io = require('socket.io').listen(server, {log:false});
io.sockets.on('connection', require('./routes/socket'));

server.listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});