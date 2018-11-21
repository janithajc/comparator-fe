var express = require('express');
const { exec , spawn } = require('child_process');
const config = require('config');
var session = require('express-session');
var csv = require('fast-csv');
var fs = require("fs");
const EventEmitter = require('events').EventEmitter;
const processEvents = new EventEmitter;

var router = express.Router();

let expressWs = require('express-ws')(router);

/* GET home page. */
router.get('/', function(req, res, next) {
  var scen = req.session.scenario;
  res.render('index', { title: 'Step 1', scenario: scen });
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
  let pks = null;
  if(Array.isArray(req.session.pks)) {
    pks = req.session.pks.join(',');
  } else {
    pks = req.session.pks;
  }
  let basePath = config.get('Paths.base')+scenario,
      cmd = 'python',
      opts = [
        config.get('Paths.tool'),
        basePath+req.session.leftFile,
        basePath+req.session.rightFile,
        basePath+'map.csv',
        basePath+'out.xls',
        pks
      ];
  let proc = spawn(cmd, opts);

  logs[scenario] = {
    stdout: [],
    stderr: [],
    code: null
  };

  proc.stdout.on('data', (data) => {
    processEvents.emit(scenario,{level: 'stdout', data: data.toString()});
  });

  proc.stderr.on('data', (data) => {
    processEvents.emit(scenario,{level: 'stderr', data: data.toString()});
  });

  proc.on('close', (code) => {
    processEvents.emit(scenario,{level: 'close', code: code});
  });

  res.send({stdout: `Comparison started!\n${cmd} ${opts.join(' ')}`, stderr: ''});
});

router.ws('/status', function (ws, req) {
  let scenario = req.param('scenario');

  processEvents.on(scenario, (data) => {
    if(ws.readyState !== 1) {
      console.warn('Trying to send with no websocket');
      return;
    }
    switch(data.level) {
      case 'stdout':
        ws.send('[STDOUT]'+data.data);
        break;
      case 'stderr':
        ws.send('[STDERR]'+data.data);
        break;
      case 'close':
        ws.send('[CODE]'+data.code);
        ws.close();
        processEvents.removeAllListeners(scenario);
    }
  });
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
