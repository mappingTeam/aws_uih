var express = require("express");
var awsIot = require('aws-iot-device-sdk');
var bodyParser = require("body-parser");
var config = require('./config.json');
var session = require("express-session");
var mysql = require('mysql');
var helper = require('./helper');

var app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

var device = awsIot.device({
  keyPath: config.keyPath,
  certPath: config.certPath,
  caPath: config.caPath,
  clientId: config.clientId,
  host: config.host,
  keepalive: 40
});

app.use(express.static("public"));
app.set("view engine", "ejs");
app.set("views", "./views");
app.engine('html', require('ejs').renderFile);

var authenticated = false;

var server = require("http").Server(app);
var io = require("socket.io")(server);

var conn = mysql.createConnection({
  host: 'db-instance.c1vjyigk0gkh.us-east-2.rds.amazonaws.com',
  user: 'admin_root',
  password: 'admin_root_password',
  database: 'MyDataBase',
  dateStrings: true
});

device.on('connect', function () {
  console.log('connect');
  device.subscribe('/response');
  device.subscribe('/respone_all_info');
  device.subscribe('/response-for-web');
});

device.on('message', function (topic, payload) {
  if ("/respone_all_info" == topic) {
    console.log('message', topic, payload.toString());
    io.emit('respond-env-info', { "status": "OK", "jsondata": payload.toString() });
  }
  if ("/response-for-web" == topic) {
    console.log('message', topic, payload.toString());
    io.emit('response-pin-info', { "status": "OK", "jsondata": payload.toString() });
  }
  if ("/response-all-pin-info" == topic) {
    io.emit('response-all-pin-info', {"status": "OK", "jsondata": payload.toString() });
  }
});

var clients = [];

server.listen(3000);

io.on("connection", function (socket) {

  console.log("Co nguoi ket noi : " + socket.id);

  socket.on("disconnect", function () {
    console.log("Ngat ket noi : " + socket.id);
    delete clients[socket.id];
  });

  socket.on("log-out", function (data) {
    socket.emit("verify-logout");
  });

  socket.on("draw-chart", function (data) {
    var arr_humid = [];
    var arr_temp = [];
    var time = [];
    var light = [];
    var nodes;

    var start = data.date + " 00:00:00";
    var end = data.date + " 23:59:59";
    console.log(start + " - " + end);
    conn.connect(function (err) {
      var sql = "SELECT * FROM sensor_datas where time BETWEEN '" + start + "' AND '" + end + "' limit 50";
      console.log(sql);
      conn.query(sql, function (err, results, fields) {
        if (err) throw err;
        if ("" != results) {
          for (var i = 0; i < results.length; i++) {
            arr_humid.push(results[i]['humid']);
            arr_temp.push(results[i]['temp']);
            var date1 = results[i]['time'];
            light.push(results[i]['light']);
            date = date1.slice(11, 19);
            time.push(date);
          }
          socket.emit("data-for-chart",
            {
              "command": "draw_chart",
              "humid": arr_humid,
              "temp": arr_temp,
              "time": time,
              "node_id": results[0]['node_id'],
              "light": light,
              "date": data.date
            }
          );
        }
        else {
          socket.emit("data-for-chart", { "command": "draw_chart", "error": "Data not found!" });
        }
      });
    });
  })

  socket.on('log-in', (data) => {
    conn.connect((err) => {
      var sql = "SELECT * FROM users";
      conn.query(sql, (err, results, fields) => {
        for (var i = 0; i < results.length; i++)
          if (results[i]['user_name'] == data.username && results[i]['password'] == data.password) {
            socket.user_id = results[i]['user_id'];
            socket.emit('login-respond',
              {
                status: "OK",
                username: results[i]['user_name'],
              });
              authenticated = true;
            return;
          }
        socket.emit('login-respond',
          {
            "status": "FAIL",
            "username": "",
          });
      })
    })
  })

  socket.on("pin-control", function (data) {
    device.publish('/request', JSON.stringify({ gpio: { pin: data.pin, state: data.state } }));
  });

  socket.on("get-data-from-nodes", function (data) {
    device.publish('/request', JSON.stringify({ all_info: { id: 1 } }));
    device.publish('/request', JSON.stringify({ all_info: { id: 2 } }));
  });
});

app.get("/dashboard", (req, res) => {
  if (authenticated)
    res.render("index.html");
  else
    res.redirect('/');
});

app.get("/", function (req, res) {
  res.render("login.html");
});