

var express = require('express');
var app = express();
var fs = require('fs');

var options = {
  key: fs.readFileSync('server.key'),
  cert: fs.readFileSync('server.crt')
};
var server = require('http').Server(app);

var net = require('net');
var io = require('socket.io')(server);
// var socketio =require('socket.io');
// var io=io=socketio.listen(app);

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

// redirect
app.enable('trust proxy');
if (!appEnv.url.includes("localhost")) {
  app.use(function (req, res, next) {
    if (req.secure) {
      // request was via https, so do no special handling
      next();
    } else {
      // request was via http, so redirect to https
      res.redirect('https://' + req.headers.host + req.url);
    }
  });
}

// scale out ======================================================================
// vertically
var cluster = require("cluster");
var num_processes = require("os").cpus().length;
console.log(num_processes);
// horizontally
var redis_port = 12889;
var redis_host = "pub-redis-12889.dal-05.1.sl.garantiadata.com";
var redis = require('redis').createClient;
var adapter = require('socket.io-redis');
var pub = redis(redis_port, redis_host, { auth_pass: "gB4v1oWdzYh5ivfi" });
var sub = redis(redis_port, redis_host, { return_buffers: true, auth_pass: "gB4v1oWdzYh5ivfi" });


var httpProxy = require('http-proxy');
var proxy = httpProxy.createProxyServer(options); // See (†) 

// use middleware ======================================================================
app.use(session({
  name: 'session',
  keys: ['key1', 'key2'],
  secret: 'chatroom',
  maxAge: '60000',
  secure: true
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
// sub.on("message", function (channel, data) {
//   data = JSON.parse(data);
//   console.log("Inside Redis_Sub: data from channel " + channel + ": " + (data.sendType));
//   if (parseInt("sendToSelf".localeCompare(data.sendType)) === 0) {
//     io.emit(data.method, data.data);
//   } else if (parseInt("sendToAllConnectedClients".localeCompare(data.sendType)) === 0) {
//     io.sockets.emit(data.method, data.data);
//   } else if (parseInt("sendToAllClientsInRoom".localeCompare(data.sendType)) === 0) {
//     io.sockets.in(channel).emit(data.method, data.data);
//   }

// });


io.sockets.on('connection', function (socket) {
  // var sub = redis.createClient();
  // sub.subscribe("messages");
  // sub.on("subscribe", function (channel, count) {
  //   console.log("Subscribed to " + channel + ". Now subscribed to " + count + " channel(s).");
  // });
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

  socket.on('add user', function (username, chatroom, err) {
    if (err) console.err(err);
    socket.username = username;
    socket.chatroom = chatroom;
    // sub.subscribe(chatroom);
    socket.join(chatroom);
    app.emit('addUserToList', socket, io);
    // socket.emit('message', username + "  joined the Chat!!!");
    io.sockets.in(socket.chatroom).emit('message', username + "  joined the Chat!!!");
  });

  socket.on('disconnect', function () {
    // sub.unsubscribe("messages");
    // sub.quit();
    app.emit('deleteUserFromList', socket);
  });

});



// HTTP ======================================================================
if (cluster.isMaster) {
  // reference to forkes (e.g restart a fork)
  var workers = [];

  // Helper function for spawning worker at index 'i'.
  var spawn = function (i) {
    workers[i] = cluster.fork();

    // Optional: Restart worker on exit
    workers[i].on('exit', function (code, signal) {
      console.log('respawning worker', i);
      spawn(i);
    });
  };

  // Spawn workers.
  for (var i = 0; i < num_processes; i++) {
    spawn(i);
  }

  // Helper function for getting a worker index based on IP address.
  // This is a hot path so it should be really fast. The way it works
  // is by converting the IP address to a number by removing non numeric
  // characters, then compressing it to the number of slots we have.
  //
  // Compared against "real" hashing (from the sticky-session code) and
  // "real" IP number conversion, this function is on par in terms of
  // worker index distribution only much faster.
  var worker_index = function (ip, len) {
    var s = '';
    for (var i = 0, _len = ip.length; i < _len; i++) {
      if (!isNaN(ip[i])) {
        s += ip[i];
      }
    }

    return Number(s) % len;
  };
  // Create the outside  server listening on the one and only port
  var server = net.createServer({ pauseOnConnect: true }, function (connection) {
    // We received a connection and need to pass it to the appropriate
    // worker. Get the worker for this connection's source IP and pass
    // it the connection.
    var worker = workers[worker_index(connection.remoteAddress, num_processes)];
    worker.send('sticky-session:connection', connection);
  }).listen(appEnv.port);
  console.log("master starting on " + appEnv.url);
} else {


  var app = new express();
  require(__dirname + '/routes.js')(app, upload, appEnv);
  require(__dirname + '/events.js')(app);
  // Here you might use middleware, attach routes, etc.
  io.adapter(adapter({ pubClient: pub, subClient: sub }));
  // Don't expose our internal server to the outside.
  server.listen(0, '0.0.0.0', function (req, res) {
    console.log("child starting on " + appEnv.url);
  });

  process.on('message', function (message, connection) {
    if (message !== 'sticky-session:connection') {
      return;
    }

    // Emulate a connection event on the server by emitting the
    // event with the connection the master sent us.
    server.emit('connection', connection);

    connection.resume();
  });
  // server.listen(appEnv.port, '0.0.0.0', function (req, res) {
  //   // app.emit('cleanup');

  //   console.log("app starting on " + appEnv.url);
  //   // app.emit('test');
  // });
}

