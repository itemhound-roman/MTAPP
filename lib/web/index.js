
var PermissionsMiddleware = require('../Middleware/permissionsMiddleware.js');

module.exports = function (app){

  app.get('/', function (req, res){
    res.render('index');
  });

  app.get('/facilitate', PermissionsMiddleware.OnlyAllowAuthenticated, function (req, res){
    res.sendfile('./public/templates/admin.html');
  })
}