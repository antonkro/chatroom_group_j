var redis = require('socket.io-redis');
module.exports = function (app,io, servers) {


    app.on('balanceRegister', function (data, callback) {
    });

    app.on('broadcastToChannel', function (msg, room) {
    });

     app.on('broadcastToUser', function (msg, room) {
    });


}