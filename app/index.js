var express = require('express');
var path = require('path');
var app = express();
var expressWs = require('express-ws')(app);

app.use(function (req, res, next) {
  console.log(req.url);
  return next();
});

app.get('/', function(req, res, next){
  console.log('get route');
  res.end();
});


app.get('/wifis.json', function(req, res, next) {
  res.sendFile(path.join(__dirname, './wifis.json'));
});

var position = [0.0,0.0];
var bearing = 0;
var velocity = 0.1

var connected = false;

expressWs.getWss().on('connection', function(ws) {
  function sendPoint() {
    bearing += Math.random() * 0.5 - 0.25;
    position[0] = (position[0] + Math.cos(bearing) * velocity);
    position[1] = (position[1] + Math.sin(bearing) * velocity) % 90;

    // check limits of the world
    if (Math.abs(position[0]) > 180) {
      bearing = Math.Pi + bearing
      position[0] = (position[0] + Math.cos(bearing) * velocity * 2);
    }
    if (Math.abs(position[1]) > 90) {
      bearing = Math.Pi + bearing
      position[1] = (position[1] + Math.sin(bearing) * velocity * 2);
    }

    if (connected) {
      try {
        ws.send(JSON.stringify({
          type: "position",
          lat: position[0],
          lon: position[1]
        }));
        var t = new Date().getTime();
        ws.send(JSON.stringify({ type: 'rate', network: 'wifi', t: t, v: Math.random()}));
        ws.send(JSON.stringify({ type: 'rate', network: 'lte', t: t, v: Math.random()}));
      } catch(e) {
      }
    }
    setTimeout(sendPoint, 2000);
  }

  connected = true;
  sendPoint();
})

expressWs.getWss().on('close', function(ws) {
  connected = false;
})

app.ws('/ws', function(ws, req) {
  ws.on('message', function(msg) {
    console.log(msg);
  });
  // generate some data - in the real version this will come direct from nifi.
});


app.listen(5000);
