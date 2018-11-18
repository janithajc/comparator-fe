/**
 * Created by janitha on 11/15/18.
 */
var Comparator = {
  url: null,
  actionBtn : null,
  downloadBtn: null,
  progress: null,
  pkCheck: null,
  leftPks: null,
  rightPks: null,
  scenarioInput : null,
  webSocket: null,
  init: function () {
    Materialize.updateTextFields();
    Comparator.progress = $('.progress');
    Comparator.progress.hide();

    Comparator.actionBtn = $('#action');
    Comparator.actionBtn.on('click', Comparator.ajaxToConsole);

    Comparator.scenarioInput = $('#scenario');

    Comparator.downloadBtn = $('#download');
    Comparator.downloadBtn.on('click', function (e) {
      Comparator.downloadBtn.removeClass('pulse');
    });

    if(Comparator.url === '/autogen') {
      Comparator.pkCheck = $('.pk-check').detach();
      Comparator.leftPks = $('#leftFile');
      Comparator.rightPks = $('#rightFile');

      Comparator.drawPks();
    }
  },
  ajaxToConsole: function () {
    Comparator.progress.show();
    if(Comparator.url === '/compare'){
      Comparator.startWebSocket();
    }
    $.ajax({
      url: Comparator.url,
      success: function (data) {
        Comparator.progress.hide();
        if(data.stdout.length > 0){
          Console.log(data.stdout);
          if(Comparator.url !== '/compare'){
            Comparator.downloadBtn.addClass('pulse');
          }
        }
        if(data.stderr.length > 0){
          Console.error(data.stderr);
        }
      },
      error: function (data) {
        Comparator.progress.hide();
        Console.error(data.responseText);
      }
    });
  },
  startWebSocket: function () {
    Comparator.actionBtn.prop('disabled', true);
    Comparator.downloadBtn.addClass('disabled');
    Comparator.webSocket = new WebSocket(`ws://${document.location.host}/status?scenario=${Comparator.scenarioInput.val()}`);
    Comparator.webSocket.onmessage = function (data) {
      if (data.data.indexOf('[STDOUT]') >= 0) {
        Console.log(data.data);
      }
      if (data.data.indexOf('[STDERR]') >= 0) {
        Console.error(data.data);
      }
      if (data.data.indexOf('[CODE]') >= 0) {
        switch (data.data.replace('[CODE]', '')) {
          case '0':
            Console.log('Comparison complete!');
            Comparator.downloadBtn.removeClass('disabled');
            Comparator.downloadBtn.addClass('pulse');
            break;
          default:
            Console.error('Error comparing files');
        }

        Comparator.webSocket.close();
      }
    };
    Comparator.webSocket.onclose = function (msg) {
      console.log(msg);
      Comparator.actionBtn.prop('disabled', false);
    };
    Comparator.webSocket.error = function (msg) {
      console.error(msg);
      Comparator.actionBtn.prop('disabled', false);
    }
  },
  drawPks: function () {
    $.ajax({
      url: '/pks',
      success: function (data) {
        data.leftHeaders.forEach(function (v) {
          Comparator.addPk(v, 'leftPks');
        });
        data.rightHeaders.forEach(function (v) {
          Comparator.addPk(v, 'rightPks');
        });
      }
    });
  },
  addPk: function (v, side) {
    var pk = Comparator.pkCheck.clone();
    pk.find('input').attr('value',v);
    pk.find('input').attr('id',v);
    pk.find('label').text(v);
    pk.find('label').attr('for',v);

    Comparator[side].append(pk);
  }
};

$(document).ready(function () {
  Comparator.init();
});