/*
  Mongoose model for Events


*/

var mongoose = require('mongoose')
  , Schema = mongoose.Schema;

var questionSchema = new Schema({
    questionText    : String
  , answerText      : String
  , questionUsed    : { type: Boolean, default: false }
});

var categorySchema = new Schema({
    categoryName     : String
  , categoryPoints   : { type: Number, default: 5 }
  , categoryTime     : { type: Number, default: 60 }
  , questions        : [questionSchema]
})



var quizSchema = new Schema({
    quizName    : String
  , quizCategories : [categorySchema]

})



var Quiz = mongoose.model('QuizModel', quizSchema);

exports.QUIZ = Quiz;

// exports.fetchRace = function (params, callback) {
//   if (params.find.raceId) params.find.raceId = parseInt(params.find.raceId);
//   params.lean = params.lean || false;
//   Race.findOne(params.find).populate('owner').setOptions({lean:params.lean}).exec(callback);;
// };

// exports.createRace = function(params, callback){
//   if (params.waves){
//     for (var i = 0; i < params.waves.length; i++ ){
//       params.waves[i].waveId = (i+1);
//     }
//   }
//   var newRace = new Race(params);
//   newRace.save(callback);
// };

// exports.fetchRaces = function(params, callback){  
//   Race.find(params.find).sort({raceDate:-1}).skip(10*params.pageNum).limit(10).select(params.select).setOptions({lean:true}).exec(callback);
// }

// exports.deleteRace = function(params, callback){
//   Race.remove(params).exec(callback);
// }

// exports.Race = Race; 
