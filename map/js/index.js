
// settings
var graphWidth = 120;
var graphHeight = 150;

var trailDepth = 30;
var graphN = 60;

// data variables
var positions = [];
var positionsProjected = [];

var data = {
  rates: {
    wifi: [],
    lte: []
  },
  sensors: {
    a: []
  }
};

var map = L.map('map');
L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png', {
  attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

var osm = new L.TileLayer('http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  {
    minZoom: 8,
    maxZoom: 12,
    attribution: 'Map data © <a href="http://openstreetmap.org">OpenStreetMap</a> contributors'
  });
map.addLayer(osm);
map.setView([0, 0], 10);

var svg = d3.select(map.getPanes().overlayPane).append("svg");

d3.xml('marker.svg', "image/svg+xml", function(xml) {
  var importedNode = document.importNode(xml.documentElement, true).getElementsByTagName("g")[0];
  svg.select("defs").append("marker").attr({
    id: 'car',
    viewBox: '0 0 25 40',
    refX: 12,
    refY: 40,
    markerWidth: 25,
    markerHeight: 50,
    orient: '90 deg',
    markerUnits: 'userSpaceOnUse'
  }).node().appendChild(importedNode);
});

var g = svg.append("g").attr("class", "leaflet-zoom-hide");
// Use Leaflet to implement a D3 geometric transformation.
function projectPoint(x, y) {
  var point = map.latLngToLayerPoint(new L.LatLng(y, x));
  this.stream.point(point.x, point.y);
}

function projectLatLon(x, y) {
  var p = map.latLngToLayerPoint(new L.LatLng(x, y));
  return p;
}

var transform = d3.geo.transform({point: projectPoint});
var path = d3.geo.path().projection(transform);

var trace = g.append("path")
  .attr("class", "trace")
  .datum(positionsProjected);

var lineFunction = d3.svg.line()
                       .x(function(d) { return d.x; })
                       .y(function(d) { return d.y; })
                       .interpolate("linear");

d3.json("/wifis.json", function(error, collection) {
  if (error) {
    throw error;
  }
  /*
  var feature = g.selectAll("path")
      .data(collection.features)
      .enter()
      .append("path")
      .attr("class", "country");
  */
  // fit the map
  var geo = L.geoJson(collection);
  map.fitBounds(geo);

  // sizing and panning for the svg
  map.on("viewreset", reset);
  reset();
    // Reposition the SVG to cover the features.
  function reset() {
    var bounds = path.bounds(collection),
      topLeft = bounds[0],
      bottomRight = bounds[1];
    svg.attr("width", bottomRight[0] - topLeft[0])
      .attr("height", bottomRight[1] - topLeft[1])
      .style("left", topLeft[0] + "px")
      .style("top", topLeft[1] + "px");
    g.attr("transform", "translate(" + -topLeft[0] + "," + -topLeft[1] + ")");
    // redraw the path
    positionsProjected = positions.map(function(i) {
      return projectLatLon(i[0], i[1]);
    });
    console.log(positionsProjected);
    trace.attr('d', lineFunction);
  }
});

svg.append("defs").append("clipPath")
    .attr("id", "clip")
  .append("rect")
    .attr("width", graphWidth)
    .attr("height", graphHeight);

var graph = g.append("g")
  .attr({
    class: "graphContainer",
    width: graphWidth + 20,
    height: graphHeight + 20
  });
var graphs = ['wifi', 'lte'].map(function(v, i) {
  var gc = graph.append('g')
    .attr("width", graphWidth)
    .attr("height", (i + 1) * graphHeight / 3)
    .attr("transform", "translate(10," + (i * graphHeight / 3 + 10) + ")");
  gc.append('rect')
    .attr('class', 'plot')
    .attr('x', 0)
    .attr('y', 0)
    .attr('width', graphWidth)
    .attr('height', graphHeight / 3);
  gc.append("text").text(v).attr('class', 'label');
  return gc.append('path')
    .attr("class", "graph " + v)
    .attr("clip-path", "url(#clip)")
    .datum(data.rates[v]);
});

var duration = 1000;

var now = new Date();
var x = d3.time.scale()
    .domain([now - (graphN - 2) * duration, now - duration])
    .range([0, graphWidth]);

var y = d3.scale.linear()
  .domain([0, 1.0])
  .range([0, graphHeight / 3]);

var graphFunction = d3.svg.area()
                      .x(function(d) { return x(d.t); })
                      .y(function(d) { return y(d.v); })
                      .interpolate("linear");

function update() {
  // draw car position
  trace.attr('d', lineFunction);
  trace.datum(positionsProjected);
  // update the graph container location
  var point = positionsProjected.last();
  graph.attr("transform", "translate(" + point.x + "," + point.y + ")");
/*
  graphs.forEach(function(gr) {
    gr.attr('d', graphFunction);
  });
*/
  // set the domain of the time graph
}
var transition = d3.select({}).transition()
    .duration(750)
    .ease("linear");

(function tick() {
  transition = transition.each(function() {
    // update the domains
    var now = new Date();
    x.domain([now - (graphN - 2) * duration, now - duration]);
    // redraw the line
    graphs.forEach(function(gr) {
      gr.attr("d", graphFunction)
        .attr("transform", null);
        /* .transition()
            .attr("transform", "translate(" + x(now() - (n - 2) * duration) + ")");*/
    });
  }).transition().each("start", tick);
})();

function mutateLimitTo(arr, l) {
  if (arr.length > l) {
    arr.shift();
  }
  return arr;
}

function processEvent(event) {
  try {
    var msg = event;
    switch (msg.type) {
      case "position":
        // update the postiion of the car itself and therefore the overlay charts.
        delete (msg.type);
        var lat = parseFloat(msg.latitude_degrees);
        var lon = parseFloat(msg.longitude_degrees);
        positions.push([lat, lon]);
        var projectedPoint = projectLatLon(lat, lon);
        positionsProjected.push(projectedPoint);
        mutateLimitTo(positions, trailDepth);
        mutateLimitTo(positionsProjected, trailDepth);
        break;
      case "rate":
        // get stats from the nifi api on the rates for wifi or lte, show as a rate chart for the car
        mutateLimitTo(data.rates[msg.network].push({t: msg.t, v: msg.v}), graphN);
        break;
      case "sensor":
        // a time series for the car, same as rates, but with a class.
        mutateLimitTo(data.sensors[msg.sensor].push({t: msg.t, v: msg.v}), graphN);
        break;
      default:
        break;
    }
    update();
  } catch (e) {
    console.log('Dodgy data: ', e, event);
  }
}

var eb = new vertx.EventBus('http://ec2-52-33-241-152.us-west-2.compute.amazonaws.com:8050/eventbus/');
eb.onopen = function() {
  eb.registerHandler("test.123", processEvent);
};

function resize() {

}
d3.select(window).on('resize', resize);

if (!Array.prototype.last) {
  Array.prototype.last = function() {
    return this[this.length - 1];
  };
}
