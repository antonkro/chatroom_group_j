
var express = require('express');
var multer = require('multer');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
// var session = require('express-session');
// var DataCacheStore = require('connect-datacache')(session)
var session = require('cookie-session')
// var ip = require("ip");

var dateFormat = require('dateformat');
var now = new Date();
var path = require('path');// To make the uploads folder accessible
var uploadname = new String();

// var credentials = {
//   "catalogEndPoint": "23.246.238.90:2809,23.246.238.91:2809",
//   "restResource": "http://23.246.238.90/resources/datacaches/EzsLGyQDTwCz9ohzGMEscwAP",
//   "restResourceSecure": "https://ecaas74.ng.bluemix.net/resources/datacaches/EzsLGyQDTwCz9ohzGMEscwAP",
//   "gridName": "EzsLGyQDTwCz9ohzGMEscwAP",
//   "username": "AFpC2U8ORx65dzvMSaXFAgBI",
//   "password": "uxpQvHJ6SBFkkzdr2utBVwWA"
// };

// var store = new DataCacheStore({
//   // required parameters when no custom client provided or no ENV credentials are set 
//   restResource: 'http://dcsdomain.bluemix.net/resources/datacaches/{gridName}',
//   restResourceSecure: 'https://dcsdomain.bluemix.net/resources/datacaches/{gridName}',
//   gridName: credentials.gridName,
//   username: credentials.username,
//   password: credentials.password,
//   //optional
//   contentType: 'other'

// }
// );
var port = (process.env.VCAP_APP_PORT || 3000);
var host = (process.env.VCAP_APP_HOST || 'localhost');

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
dcStore = null;
try {
  // by default is looking into bluemix cfenv services 
  dcStore = new DataCacheStore(store);
} catch (err) {
  // log fallback on memory store for no DataCache service linked to app 
}

// app.use(session({
//   store: dcStore,
//   secret: 'chatroom',
//   cookie: { maxAge: 60000 },
//   resave: false,
//   saveUninitialized: false
// }))
app.use(session({
  name: 'session',
  keys: ['key1', 'key2'],
 secret:'chatroom',
 maxAge: '60000'
  // Cookie Options
}))

// internal modules ======================================================================
require(__dirname + '/routes.js')(app);
require(__dirname + '/events.js')(app);


// socket.io ======================================================================
io.on('connection', function (socket) {
  // upload on post
  app.post('/api/upload', function (req, res) {
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
      msg = "http://" + (host+ ':3000/' + uploadname);
      io.emit('upload', msg, inner);
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
      //uploadname = "";
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
http.listen(port, host,function (req, res) {

  //  setInterval(function() { sessionCleanup() }, 1000);
  console.log('listening on *:'+port);
});

// function sessionCleanup() {
//     dcStore.all(function(err, sessions) {
//         for (var i = 0; i < sessions.length; i++) {
//             dcStore.get(sessions[i], function() {} );
//         }
//     });
// }