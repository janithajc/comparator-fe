/**
 * Created by janitha on 11/15/18.
 */
var Comparator = {
  url: null,
  actionBtns : {
    autoGen: null,
    compare: null
  },
  downloadBtns: {
    map: null,
    final: null
  },
  pkCheck: null,
  leftPks: null,
  rightPks: null,
  scenario : null,
  scenarioInput : null,
  scenarioSpan : null,
  webSocket: null,
  stepper: null,
  progress: {
    show: function () {
      Comparator.stepper.activateFeedback();
    },
    hide: function () {
      Comparator.stepper.destroyFeedback();
    }
  },
  utils: {
    stepper: {
      nextButtonClick: function (e) {
        e.preventDefault();
        let form = $('#'+$(this).data('form-id'));
        if(Comparator.utils.forms.validate(form)){
          form.submit();
        }
      },
      prevButtonClick: function (e) {
        Comparator.progress.hide();
      }
    },
    forms: {
      validate: function (f) {
        let required = f.find('input[required]'),
            valid = true;
        $.each(required, function (i,o) {
          if(!$(o).val()) {
            valid = false;
            $(o).addClass('invalid');
          } else {
            $(o).removeClass('invalid');
          }
        });

        return valid;
      },
      ajaxSubmit: function (e) {
        e.preventDefault();

        let form = $(this);
        let data = new FormData(form[0]);

        Comparator.progress.show();

        $.ajax({
          type: "POST",
          enctype: 'multipart/form-data',
          url: form.prop('action'),
          data: data,
          processData: false,
          contentType: false,
          cache: false,
          timeout: 600000,
          success: function (data) {
            Console.log('Upload success');
            Console.log(JSON.stringify(data));
            Comparator.stepper.nextStep();
            Comparator.progress.hide();
            if(Comparator.stepper.getSteps().active.index === 1) {
              Comparator.drawPks();
            }
          },
          error: function (e) {
            Console.error('Upload error');
            Console.error(e.responseText);
          }
        }).done(function (e) {
          Comparator.progress.hide();
          $("#btnSubmit").prop("disabled", false);
        });
      }
    },
    escape: function (str) {
      return str.replace(' ','');
    }
  },
  init: function () {
    Materialize.updateTextFields();

    Comparator.pkCheck = $('.pk-check').detach();
    Comparator.leftPks = $('#leftFile');
    Comparator.rightPks = $('#rightFile');

    let stepper = document.querySelector('.stepper');
    Comparator.stepper = new MStepper(stepper, {
      firstActive: 0,
      linearStepsNavigation: false,
      showFeedbackPreloader: true
    });

    $('#csvUploadForm').on('submit',Comparator.utils.forms.ajaxSubmit);
    $('#mapUploadForm').on('submit',Comparator.utils.forms.ajaxSubmit);

    $('.next-step-btn').on('click', Comparator.utils.stepper.nextButtonClick);
    $('.previous-step').on('click', Comparator.utils.stepper.prevButtonClick);

    Comparator.actionBtns.autoGen = $('#autoGen');
    Comparator.actionBtns.autoGen.on('click', function(){Comparator.ajaxToConsole('/autogen')});

    Comparator.actionBtns.compare = $('#compare');
    Comparator.actionBtns.compare.on('click', function(){Comparator.ajaxToConsole('/compare')});

    Comparator.scenarioInput = $('#scenario');
    Comparator.scenarioSpan = $('#scenarioSpan');

    Comparator.scenario = Comparator.scenarioInput.val();
    Comparator.downloadBtns.map = $('#mapDownload');
    Comparator.downloadBtns.final = $('#finalDownload');

    Comparator.downloadBtns.map.prop('href','/static/' + Comparator.scenario + 'map.csv.csv');
    Comparator.downloadBtns.final.prop('href','/static/' + Comparator.scenario + 'out.xls');

    Comparator.scenarioSpan.text(Comparator.scenario);
    document.title = Comparator.scenario || "Enter Scenario";
    Comparator.scenarioInput.on('input', function (e) {
      Comparator.scenario = Comparator.utils.escape($(this).val());
      document.title = Comparator.scenario || "";
      Comparator.scenarioSpan.text(Comparator.scenario);
      Comparator.downloadBtns.map.prop('href','/static/' + Comparator.scenario + 'map.csv.csv');
      Comparator.downloadBtns.final.prop('href','/static/' + Comparator.scenario + 'out.xls');
      Comparator.downloadBtns.final.prop('download',Comparator.scenario + 'out.xls');
    });

    Comparator.downloadBtns.map.on('click', function (e) {
      Comparator.downloadBtns.map.removeClass('pulse');
    });

    Comparator.downloadBtns.final.on('click', function (e) {
      Comparator.downloadBtns.final.removeClass('pulse');
    });
  },
  ajaxToConsole: function (url) {
    Comparator.progress.show();
    if(url === '/compare'){
      Comparator.startWebSocket();
    }
    $.ajax({
      url: url,
      success: function (data) {
        if(Comparator.url !== '/compare') {
          Comparator.progress.hide();
        }
        if(data.stdout.length > 0){
          Console.log(data.stdout);
          if(Comparator.url !== '/compare'){
            Comparator.downloadBtns.map.addClass('pulse');
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
    Comparator.actionBtns.compare.prop('disabled', true);
    Comparator.downloadBtns.final.addClass('disabled');
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
            Comparator.downloadBtns.final.removeClass('disabled');
            Comparator.downloadBtns.final.addClass('pulse');
            break;
          default:
            Console.error('Error comparing files');
        }

        Comparator.webSocket.close();
      }
    };
    Comparator.webSocket.onclose = function (msg) {
      console.log(msg);
      Comparator.actionBtns.compare.prop('disabled', false);
      Comparator.progress.hide();
    };
    Comparator.webSocket.error = function (msg) {
      Console.warn(msg);
      Comparator.actionBtns.compare.prop('disabled', false);
    }
  },
  drawPks: function () {
    Comparator.clearAllPks();
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
  clearAllPks: function () {
    Comparator.leftPks.find('*').remove();
    Comparator.rightPks.find('*').remove();
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