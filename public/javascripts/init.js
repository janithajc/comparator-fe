/**
 * Created by janitha on 11/15/18.
 */
var Comparator = {
  url: null,
  actionBtn : null,
  downloadBtn: null,
  progress: null,
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
          Comparator.downloadBtn.addClass('pulse');
        }
        if(data.stderr.length > 0){
          Console.error(data.stderr);
        }
      },
      error: function (data) {
        Comparator.progress.hide();
        Console.log(data.responseText);
      }
    });
  }
};

$(document).ready(function () {
  Comparator.init();
});