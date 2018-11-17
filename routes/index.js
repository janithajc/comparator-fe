var express = require('express');
const { exec , spawn } = require('child_process');
const config = require('config');
var session = require('express-session');
var csv = require('fast-csv');
var fs = require("fs");

var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  var scen = req.session.scenario;
  res.render('index', { title: 'Step 1', scenario: scen });
});

/* GET home page. */
router.get('/step2', function(req, res, next) {
  var scen = req.session.scenario;
  if(scen === undefined){
    res.redirect('/');
    return;
  }
  res.render('step2', { title: 'Step 2', scenario: scen });
});

/* GET home page. */
router.get('/step3', function(req, res, next) {
  var scen = req.session.scenario;
  if(scen === undefined){
    res.redirect('/');
    return;
  }
  res.render('step3', { title: 'Step 3', scenario: scen });
});

/* GET home page. */
router.get('/autogen', function(req, res, next) {
  var basePath = config.get('Paths.base')+req.session.scenario;
  var cmd = 'python ' + config.get('Paths.tool') + ' m ' + basePath+req.session.leftFile+' ' + basePath+req.session.rightFile+' ' + basePath+'map.csv ' + basePath+'out.xls';
  exec(cmd, (err, stdout, stderr) => {
    if (err) {
      // render the error page
      res.status(err.status || 500);
      res.send(err.message);
      return;
    }

    // the *entire* stdout and stderr (buffered)
    console.log(`stdout: ${stdout}`);
    console.log(`stderr: ${stderr}`);

    res.send({stdout, stderr});
  });
});

let logs = {};

router.get('/compare', function(req, res, next) {
  let scenario = req.session.scenario;
  let basePath = config.get('Paths.base')+scenario,
      cmd = 'python',
      opts = [
        config.get('Paths.tool'),
        basePath+req.session.leftFile,
        basePath+req.session.rightFile,
        basePath+'map.csv',
        basePath+'out.xls',
        req.session.pks.join(',')
      ];
  let proc = spawn(cmd, opts);

  logs[scenario] = {
    stdout: [],
    stderr: [],
    code: null
  };

  proc.stdout.on('data', (data) => {
    logs[scenario].stdout.push(data.toString());
  });

  proc.stderr.on('data', (data) => {
    logs[scenario].stderr.push(data.toString());
  });

  proc.on('close', (code) => {
    logs[scenario].code = code;
  });

  res.send({stdout: 'Comparison started!', stderr: ''});
});

router.get('/status', function (req, res) {
  let scenario = req.session.scenario;

  let response = {
    stdout: logs[scenario].stdout,
    stderr: logs[scenario].stderr,
    code: logs[scenario].code
  };

  logs[scenario].stdout = [];
  logs[scenario].stderr = [];

  res.send(response);
});

/* GET home page. */
router.get('/pks', function(req, res, next) {
  var basePath = config.get('Paths.base')+req.session.scenario;
  var leftStream = fs.createReadStream(basePath+req.session.leftFile);
  var rightStream = fs.createReadStream(basePath+req.session.rightFile);

  var leftHeaders = [], rightHeaders = [], doneSides = [];

  var leftCsvStream = csv({headers: true})
      .on("data", function(data){
        if(leftHeaders.length === 0){
          leftHeaders = Object.keys(data);
          done('left');
          return;
        } else {
          return;
        }
      })
      .on("end", function(){
        console.log("done");
      });

  leftStream.pipe(leftCsvStream);

  var rightCsvStream = csv({headers: true})
      .on("data", function(data){
        if(rightHeaders.length === 0){
          rightHeaders = Object.keys(data);
          done('right');
          return;
        } else {
          return;
        }
      })
      .on("end", function(){
        console.log("done");
      });

  rightStream.pipe(rightCsvStream);

  function done(side) {
    doneSides.push(side);

    if(doneSides.length >= 2) {
      res.send({
        leftHeaders,
        rightHeaders
      });
    }
  }
});

module.exports = router;
