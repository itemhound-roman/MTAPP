
exports.OnlyAllowAuthenticated = function (req, res, next) {
    
  //console.log(req.user);
  if (!req.user) { 
    console.log("no user is defnedd sa middleware"); 
    next("Not allowed to view resource"); 
    return; 
  }  
  else  next();
};
