/*
  Mongoose model for Events
*/

var mongoose = require('mongoose')
  , Schema = mongoose.Schema;

var questionSchema = new Schema({
  //questionImage   : String ,
  //  questionNumber  : Number
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


var questionResultSchema = new Schema({
    questionNumber : Number
  , questionChecked : {type: Boolean, default: false}
  , result : {type: Boolean, default: false}
})

var categoryResultSchema = new Schema({
    categoryScore : {type: Number, default: 0}
  , categoryName : String
  , categoryNumber : Number
  , questionResult : [questionResultSchema]
})


var teamSchema = new Schema({
    teamName  : String
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
