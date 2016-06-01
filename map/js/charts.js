var positions = [{lat: 0, lon: 0}];

var data = {
  rates: {
    wifi: [],
    lte: []
  },
  sensors: {
    a: []
  }
};

/**
  * Redraw the charts
  */
function update() {

}

/**
  * Slide the data to a given limit size
  * @param {Array} arr - the original Array
  * @param {Number} l - the target length of the array
  * @return {Array} the array
  */
function mutateLimitTo(arr, l) {
  arr = arr.slice(-l);
  return arr;
}

var ws = new WebSocket("ws://localhost:3000/api");
ws.onmessage = function(event) {
  try {
    var msg = JSON.parse(event.data);

    switch (msg.type) {
      case "position":
        // update the postiion of the car itself and therefore the overlay charts.
        positions.push(msg.position);
        break;
      case "rate":
        // get stats from the nifi api on the rates for wifi or lte, show as a rate chart for the car
        mutateLimitTo(data.rates[msg.network].push(msg.value), 60);
        break;
      case "sensor":
        // a time series for the car, same as rates, but with a class.
        mutateLimitTo(data.sensors[msg.sensor].push(msg.value), 60);
        break;
      default:
        break;
    }
    update();
  } catch (e) {
    console.log('Dodgy data: ', e);
  }
};
