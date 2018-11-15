/**
 * Created by janitha on 11/15/18.
 */
var Console = {
  console: $('#console'),
  consoleLine: $('.console-line').clone(),
  init: function () {
    Console.consoleLine.removeClass('green-text');
  },
  line: 0,
  log: function (str) {
    var line = Console.consoleLine.clone();
    line.addClass('green-text');
    line.text('[' + Console.line++ + '] ' + str);
    Console.console.append(line);
  },
  warn: function (str) {
    var line = Console.consoleLine.clone();
    line.addClass('orange-text');
    line.text('[' + Console.line++ + '] ' + '[WARN]\t: '+str);
    Console.console.append(line);
  },
  error: function (str) {
    var line = Console.consoleLine.clone();
    line.addClass('red-text');
    line.text('[' + Console.line++ + '] ' + '[ERROR]\t: '+str);
    Console.console.append(line);
  }
};

$(document).ready(function () {
  Console.init();
});
