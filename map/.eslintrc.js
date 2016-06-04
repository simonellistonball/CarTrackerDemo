module.exports = {
    "extends": "google",
    "installedESLint": true,
    "globals": {
      "L": true,
      "d3": true,
      "WebSocket": true,
      "vertx": true,
      "document": true,
      "window": true
    },
    "rules": {
      "one-var": 0,
      "brace-style": ["error", "1tbs", { "allowSingleLine": true }],
      "no-extend-native": 0,
      "require-jsdoc": 0,
      "max-len": ["warn", 120, 2]
    }
};
