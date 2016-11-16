
var express = require('express');
var multer = require('multer');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var session = require('express-session');
var ip = require("ip");

var dateFormat = require('dateformat');
var now = new Date();
var uploadname = new String();

// To make the uploads folder accessible
var path = require('path');
app.use(express.static(path.join(__dirname, 'uploads')));

// Storage ======================================================================
// upload format like name of file
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

// use middleware ======================================================================
app.use(session({
  secret: 'chatroom',
  cookie: { maxAge: 60000 },
  resave: false,
  saveUninitialized: false
}))


// internal modules ======================================================================
require(__dirname + '/routes.js')(app);
require(__dirname + '/events.js')(app);


// socket.io ======================================================================
io.on('connection', function (socket) {
  // upload on post
  app.post('/api/photo', function (req, res) {
    upload(req, res, function (err) {
      if (err) {
        return res.end("Error uploading file.");
      }
      res.end("File is uploaded");


    });
  });

  socket.on('upload', function (msg) {
    if (uploadname != "") {
      var inner = socket.username + " at " + dateFormat(now) + ': ';
      // console.dir(ip.address());
      msg = "http://" + (ip.address() + ':3000/' + uploadname);
      io.emit('upload', msg, inner);
      uploadname="";
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
      //uploadname = "";
    }
  });

  socket.on('add user', function (username,chatroom) {
    socket.username = username;
    socket.chatroom=chatroom;
    socket.join(chatroom);
    app.emit('addUserToList', socket, io);
    io.sockets.in(socket.chatroom).emit('message', username + "  joined the Chat!!!");
  });

  socket.on('disconnect', function () {
   app.emit('deleteUserFromList', socket);
  });

});



// HTTP ======================================================================
http.listen(3000, function (req, res) {
  console.log('listening on *:3000');
});

