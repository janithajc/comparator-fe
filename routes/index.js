var express = require('express');
const { exec } = require('child_process');
const config = require('config');
var session = require('express-session');

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
  var basePath = config.get('Paths.base')+req.session.scenario.replace(' ','\\ ');
  var cmd = 'python ' + config.get('Paths.tool') + ' m ' + basePath+'left.csv ' + basePath+'right.csv ' + basePath+'map.csv ' + basePath+'out.xls';
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

/* GET home page. */
router.get('/compare', function(req, res, next) {
  var basePath = config.get('Paths.base')+req.session.scenario.replace(' ','\\ ');
  var cmd = 'python ' + config.get('Paths.tool')+ ' ' + basePath+'left.csv ' + basePath+'right.csv ' + basePath+'map.csv ' + basePath+'out.xls';
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

module.exports = router;
