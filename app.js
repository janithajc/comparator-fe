var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var fileUpload = require('express-fileupload');
var config = require('config');
var session = require('express-session');

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use(fileUpload());
app.use(session({secret: "Shh, its a secret!"}));

app.use('/', indexRouter);

app.post('/upload', function (req, res, next) {
  var step = req.param('step');
  switch (step) {
    case '1':
      let leftFile = req.files.left,
          rightFile = req.files.right;

      if(!leftFile || !rightFile) {
        res.status(400);
        res.send('Left file or right file is not defined');
        return;
      }

      let scenario = req.param('scenario').replace(' ','');
      let basePath = config.get('Paths.base') + scenario;

      req.session.scenario = scenario;

      req.session.leftFile = leftFile.name.replace(' ','');
      req.session.rightFile = rightFile.name.replace(' ','');

      leftFile.mv(basePath + req.session.leftFile);
      rightFile.mv(basePath + req.session.rightFile);

      res.send({success: true});
      break;
    case '2':
      let map = req.files.map;

      let pks = req.param('pks');
      req.session.pks = pks;

      if(map){
        map.mv(config.get('Paths.base')+req.session.scenario+'map.csv.csv');
      }

      res.send({success:true});
  }
});

app.use('/static', express.static(config.get('Paths.base')));
app.use('/users', usersRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;