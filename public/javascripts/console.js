/**
 * Created by janitha on 11/15/18.
 */
var Console = {
  console: $('#console'),
  consoleLine: $('.console-line').clone(),
  scrollToBottom: true,
  init: function () {
    Console.consoleLine.removeClass('green-text');
  },
  line: 0,
  log: function (str) {
    var line = Console.consoleLine.clone();
    line.addClass('green-text');
    line.text('[' + Console.line++ + '] ' + str);
    Console.write(line);
  },
  warn: function (str) {
    var line = Console.consoleLine.clone();
    line.addClass('orange-text');
    line.text('[' + Console.line++ + '] ' + '[WARN]\t: '+str);
    Console.write(line);
  },
  error: function (str) {
    var line = Console.consoleLine.clone();
    line.addClass('red-text');
    line.text('[' + Console.line++ + '] ' + '[ERROR]\t: '+str);
    Console.write(line);
  },
  write: function (element) {
    Console.console.append(element);
    if(Console.scrollToBottom) {
      Console.console.stop();
      Console.console.animate({ scrollTop: Console.console.prop("scrollHeight")}, 1000);
    }
  }
};

$(document).ready(function () {
  Console.init();
});
