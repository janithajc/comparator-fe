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
  init: function () {
    Materialize.updateTextFields();
    Comparator.progress = $('.progress');
    Comparator.progress.hide();

    Comparator.actionBtn = $('#action');
    Comparator.actionBtn.on('click', Comparator.ajaxToConsole);

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
      Console.log('Comparison Started...');
      Console.log('This may take a few minutes.');
    }
    $.ajax({
      url: Comparator.url,
      success: function (data) {
        Comparator.progress.hide();
        if(data.stdout.length > 0){
          Console.log(data.stdout);
          if(Comparator.url === '/compare'){
            Comparator.downloadBtn.click();
          }
          Comparator.downloadBtn.addClass('pulse');
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