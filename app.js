
var express = require('express');
var app = express();
var fs = require('fs');
var options = {
  key: fs.readFileSync('server.key'),
  cert: fs.readFileSync('server.crt')
};
var https = require('http').Server(app);
var io = require('socket.io')(https);

var session = require('cookie-session')

// upload and filesystem ======================================================================
var dateFormat = require('dateformat');
var now = new Date();
var path = require('path');// To make the uploads folder accessible
var uploadname = new String();
var multer = require('multer');
var mkdirp = require('mkdirp');


// app enviroment ======================================================================
var cfenv = require('cfenv');
var appEnv = cfenv.getAppEnv();



//ressources ======================================================================
app.use(express.static(path.join(__dirname, 'uploads')));
app.use(express.static(__dirname + '/views/ressources'));

// Storage ======================================================================
var uploadPath = './uploads';
mkdirp.sync(uploadPath);

var storage = multer.diskStorage({

  destination: function (req, file, callback) {
    callback(null, './uploads');
  },
  filename: function (req, file, callback) {
    uploadname = Date.now() + '-' + file.originalname;
    // console.log("name: " + uploadname);
    callback(null, uploadname);
  }
});
var upload = multer({ storage: storage }).single('media');

// configure app ======================================================================

app.set('view engine', 'ejs');
app.set('views', __dirname + '/views');

// scale out ======================================================================
// vertically
var cluster = require("cluster");
var numCPUs = require("os").cpus().length;
// horizontally

// use middleware ======================================================================
app.use(session({
  name: 'session',
  keys: ['key1', 'key2'],
  secret: 'chatroom',
  maxAge: '60000'
  // Cookie Options
}))

// https redirect ======================================================================
// function requireHTTPS(req, res, next) {
//     if (!req.secure) {
//         //FYI this should work for local development as well
//         return res.redirect(appEnv.url);
//     }
//     next();
// }

// app.use(requireHTTPS);

// internal modules ======================================================================
require(__dirname + '/routes.js')(app, upload, appEnv);
require(__dirname + '/events.js')(app);
// require(__dirname + '/balancer.js')(app,io,servers);


// socket.io ======================================================================
io.on('connection', function (socket) {

  socket.on('upload', function () {
    if (uploadname != "") {
      var inner = socket.username + " at " + dateFormat(now) + ': ';
      // console.dir(ip.address());
      msg = appEnv.url + '/' + uploadname;
      io.sockets.in(socket.chatroom).emit('upload', msg, inner);
      uploadname = "";
    }
  });
  socket.on('message', function (msg) {

    // create Date
    now = new Date();

    // Check wether input is a command
    if (msg.charAt(0) == "/") {
      var command = msg.split(" ");
      if (msg.charAt(1) == "p") {
        var text = String(command.slice(2, command.length));
        app.emit('privateMessage', socket, io, command[1], text.split(",").join(" "));
        return;
      }

      if (command[0] == "/list") {
        app.emit('listAllUsers', socket);
        return;
      }
      socket.emit('message', "Server: " + command[0] + " is not a command");
    } else {
      io.sockets.in(socket.chatroom).emit('message', socket.username + " at " + dateFormat(now) + ': ' + msg);
    }
  });

  socket.on('add user', function (username, chatroom) {
    socket.username = username;
    socket.chatroom = chatroom;
    socket.join(chatroom);
    app.emit('addUserToList', socket, io);
    io.sockets.in(socket.chatroom).emit('message', username + "  joined the Chat!!!");
  });

  socket.on('disconnect', function () {
    app.emit('deleteUserFromList', socket);
  });

});



// HTTP ======================================================================
// if (cluster.isMaster) {
//   for (var i = 0; i < numCPUs; i++) {
//     cluster.fork();
//   }
//   cluster.on("exit", function (worker, code, signal) {
//     cluster.fork();
//   });


// } else {
  https.listen(appEnv.port, '0.0.0.0', function (req, res) {
    // app.emit('cleanup');
    console.log("app starting on " + appEnv.url);
    // app.emit('test');
  });
// }

