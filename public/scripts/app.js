const NUM_DEV = 5;
const DEVICE_PIN = [13, 14, 26, 25, 33];
var DEVICE_PIN_STATE = [0, 0, 0, 0, 0];
var monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

var line_chart;
var chart_config;

$(document).on('scroll load', function () {
  $(this).scrollTop();
})

$(document).ready(function () {
  menuSP();
  chartjs();
  updateBtnStyle();
  createButtonCallbacks();
  createSocketCallbacks();
  getStartupData();
})

function menuSP() {
  $('.js-menu').on('click', function (e) {
    $(this).toggleClass('open');
    $('.sidebar').toggleClass('open');
    $('body').toggleClass('open');
    if ($('body').hasClass('open') === false) {
      rescroll = $('body').css('top').replace(/-|px/g, '');
      $('body,html').scrollTop(rescroll);
    } else {
      $('body').css('top', -st);
    }
  });
}

function chartjs() {
  chart_config = {
    type: 'line',
    data: {
      labels: ["January", "February", "March", "April", "May", "June", "July"],
      datasets: [{
        label: "Temperature",
        data: [65, 59, 80, 81, 56, 55, 40],
        backgroundColor: ['rgba(221, 199, 167, .4)'],
        borderColor: ['rgba(221, 199, 167, 0.9)'],
        yAxisID: 'y-axis-1',
      }, {
        label: "Humidity",
        data: [28, 48, 40, 19, 86, 27, 90],
        backgroundColor: ['rgba(154, 196, 159, .8)'],
        borderColor: ['rgba(154, 196, 159, .9)'],
        yAxisID: 'y-axis-2',
      }]
    },
    options: {
      responsive: true,
      legend: {
        display: false
      },
      tooltips: {
        mode: 'index',
        intersect: false,
      },
      hover: {
        mode: 'nearest',
        intersect: true
      },
      scales: {
        yAxes: [{
          type: 'linear',
          display: true,
          position: 'left',
          id: 'y-axis-1',
        }, {
          type: 'linear',
          display: true,
          position: 'right',
          id: 'y-axis-2',

          gridLines: {
            drawOnChartArea: false,
          },
        }],
      }
    }
  }

  var context = document.getElementById("chart").getContext('2d');
  line_chart = new Chart(context, chart_config);
}

function createButtonCallbacks() {
  var today = new Date();
  $('#datepicker').datepicker();
  $('#datepicker').datepicker("setDate", `${today.getMonth() + 1}/${today.getDate()}/${today.getFullYear()}`);
  $('#datepicker').datepicker("option", "dateFormat", "dd M, yy");
  $('#datepicker').on("change", () => {
    var date = $('#datepicker').datepicker('getDate');
    socket.emit("draw-chart", { date: $.datepicker.formatDate('yy-mm-dd', date) });
  })

  $('#btn-update').click(function () {
    socket.emit("get-data-from-nodes");
  })

  for (let i = 0; i < NUM_DEV; i++) {
    $(`#btn-dev-${i + 1}`).click(() => {
      DEVICE_PIN_STATE[i] ^= 1;
      socket.emit('pin-control', {
        pin: DEVICE_PIN[i],
        state: DEVICE_PIN_STATE[i]
      })
    })
  }
}

function createSocketCallbacks() {
  socket.on('data-for-chart', function (data) {
    if (!data.error) {
      chart_config.data.labels = data.time;
      chart_config.data.datasets[0].data = data.temp;
      chart_config.data.datasets[1].data = data.humid;
      line_chart.update();

      chart_date = new Date(data.date);
      _date = chart_date.getDate();
      _month = monthNames[chart_date.getMonth()];
      _year = chart_date.getFullYear();
      _start_time = data.time[0].split(":");
      _am_pm = _start_time[0] > 12 ? "PM" : "AM"
      _end_time = data.time[data.time.length - 1].split(":");
      $('#txt-chart-time').html(`${_start_time[0] > 12 ? _start_time[0] - 12 : _start_time[0]}:${_start_time[1]} ${_am_pm} - ${_date} ${_month}, ${_year} <em><-></em> ${_end_time[0] > 12 ? _end_time[0] - 12 : _end_time[0]}:${_end_time[1]} ${_am_pm} - ${_date} ${_month}, ${_year}`);
    } else {
      chart_config.data.labels = [];
      chart_config.data.datasets[0].data = [];
      chart_config.data.datasets[1].data = [];
      line_chart.update();
      $('#txt-chart-time').html("NO DATA");
    }
  });

  socket.on('respond-env-info', (data) => {
    if (data.status == "OK") {
      var env_info = JSON.parse(data.jsondata);
      var today = new Date();
      $('.info__date').html(`<em>Last update:</em> ${formatDateTime(today)}`)
      $('#txt-temperature').html(`${env_info.temp.toFixed(2)}<em>C</em>`);
      $('#txt-humidity').html(`${env_info.humid.toFixed(2)}<em>%</em>`);
      $('#txt-light-intensity').html(`${env_info.light.toFixed(2)}<em>lx</em>`);
      // $('#txt-dust-density').html(`${env_info.dust.toFixed(2)}<em>mg/m3</em>`);
    }
  });

  socket.on('response-pin-info', (data) => {
    if (data.status == "OK") {
      var pin_info = JSON.parse(data.jsondata);
      for (let i = 0; i < NUM_DEV; i++) {
        if (DEVICE_PIN[i] == pin_info.pin) {
          DEVICE_PIN_STATE[i] = pin_info.state;
          break;
        }
      }
      updateBtnStyle();
    }
  });

  socket.on('response-all-pin-info', (data) => {
    if (data.stats == "OK") {
      var pin_info = JSON.parse(data.jsondata);
      DEVICE_PIN_STATE[0] = pin_info.dev1;
      DEVICE_PIN_STATE[1] = pin_info.dev2;
      DEVICE_PIN_STATE[2] = pin_info.dev3;
      DEVICE_PIN_STATE[3] = pin_info.dev4;
      DEVICE_PIN_STATE[4] = pin_info.dev5;

      updateBtnStyle();
    }
  });
}

function updateBtnStyle() {
  for (let i = 0; i < NUM_DEV; i++) {
    $(`#txt-dev-${i + 1}`).html(`Current state: <em>${DEVICE_PIN_STATE[i] ? "ON" : "OFF"}</em>`);
    $(`#btn-dev-${i + 1}`).html(DEVICE_PIN_STATE[i] == 1 ? "TURN OFF" : "TURN ON");
  }
}

function formatDateTime(date, isContainsDate = false) {
  var hourAmPm = date.getHours() > 12 ? [(date.getHours() - 12), "PM"] : [date.getHours(), "AM"];
  var fmt = `${("0" + hourAmPm[0]).slice(-2)}:${("0" + date.getMinutes()).slice(-2)}:${("0" + date.getSeconds()).slice(-2)} ${hourAmPm[1]}`;
  if (isContainsDate)
    fmt += ` ${date.getDate()} ${monthNames[date.getMonth()]}, ${date.getFullYear()}`
  return fmt;
}

function getStartupData() {
  var date = $('#datepicker').datepicker('getDate');
  socket.emit("draw-chart", { date: $.datepicker.formatDate('yy-mm-dd', date) });
  socket.emit("get-data-from-nodes");
  for (let i = 0; i < NUM_DEV; i++) {
    socket.emit('pin-control', {
      pin: DEVICE_PIN[i],
      state: DEVICE_PIN_STATE[i]
    })
  }
}
