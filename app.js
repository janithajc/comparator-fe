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
      var leftFile = req.files.left,
          rightFile = req.files.right;

      if(!leftFile || !rightFile) {
        res.redirect('/?err=noFiles');
        return;
      }

      var scenario = req.param('scenario').replace(' ','');
      var basePath = config.get('Paths.base') + scenario;

      req.session.scenario = scenario;

      req.session.leftFile = leftFile.name.replace(' ','');
      req.session.rightFile = leftFile.name.replace(' ','');

      leftFile.mv(basePath + 'left.csv');
      rightFile.mv(basePath + 'right.csv');

      res.redirect('/step2');
      break;
    case '2':
      var map = req.files.map;
      if(map){
        map.mv(config.get('Paths.base')+req.session.scenario+'map.csv.csv');
      }

      res.redirect('/step3');
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
