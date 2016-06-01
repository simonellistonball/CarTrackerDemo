var url = require('url');
var gulp = require('gulp');
var browserSync = require('browser-sync');

gulp.task('browser-sync', function() {
  var proxy = require('http-proxy-middleware');
  // var proxy = require('proxy-middleware');
  // var proxyOptions = url.parse('http://localhost:5000/');
  var proxyOptions = {
    target: 'ec2-52-33-241-152.us-west-2.compute.amazonaws.com:8050',
    ws: true,
    logLevel: 'debug',
    pathRewrite: function(path) { return path.replace('/api', '/eventbus/test.123'); }
  };
  browserSync({
    server: {
      baseDir: "./",
      middleware: [proxy('/api/*', proxyOptions)]
    }
  });
});

gulp.task('default', ['browser-sync']);
