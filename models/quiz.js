/*
  Mongoose model for Events
*/

var mongoose = require('mongoose')
  , Schema = mongoose.Schema;

var questionSchema = new Schema({
    questionText    : String
  , answerText      : String
  , questionImage   : String
  , questionUsed    : { type: Boolean, default: false }
});

var categorySchema = new Schema({
    categoryName     : String
  , categoryPoints   : { type: Number, default: 5 }
  , categoryTime     : { type: Number, default: 60 }
  , questions        : [questionSchema]
})


var questionResultSchema = new Schema({
    questionNumber : Number
  , questionChecked : {type: Boolean, default: false}
  , score : {type: Number, default: 0}
})


var categoryResultSchema = new Schema({
    categoryScore : {type: Number, default: 0}
  , categoryName : String
  , categoryNumber : Number
  , questionResults : [questionResultSchema]
})



var teamSchema = new Schema({
    teamName  : String
  , teamRegion: String
  , teamScore : {type: Number, default: 0 }
  , schoolId  : String
  , active    : {type: Boolean, default: false  }
  , categoryResult : [categoryResultSchema]
})

var quizSchema = new Schema({
    quizName    : String
  , quizCategories : [categorySchema]
  , teamCount : Number
  , teams : [teamSchema]
  , isStopped : {type: Boolean, default:true } 
})



var Quiz = mongoose.model('QuizModel', quizSchema);

exports.QUIZ = Quiz;
