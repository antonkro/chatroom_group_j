module.exports = function(app,upload,appEnv) {
    var helpers = require(__dirname + '/helpers');

    // HTTP get ======================================================================   
    app.get('/', function(req, res) {
        res.render('index');
    });

    app.get('/login', function(req, res) {
        app.emit('renderLogin', req, res, '');
    });

    app.get('/logout', function(req, res) {
        app.emit('logout', req, res);
    });

    app.get('/register', isAdmin, function(req, res) {
        res.render('register', { message: '' });
    });
    app.get('/createChatroom', isAdmin, function(req, res) {
        res.render('createChatroom', { message: '' });
    });

    app.get('/adminLogin', function(req, res) {
        res.render('adminLogin', { message: '' });
    });

    app.get('/chatroom', requiredAuthentication, function(req, res) {
        res.render('chatroom', {
            user: req.session.user,
            chatroom: req.session.chatroom,
            appUrl:appEnv.host

        });
        // res.sendFile(__dirname + '/views/chatroom.html');
    });

    // HTTP post ======================================================================
    app.post('/register', function(req, res) {
        app.emit('registration', req, res);
    });

    app.post('/createChatroom', function(req, res) {
        app.emit('createChatroom', req, res);
    });

    app.post('/login', function(req, res) {
        app.emit('authentication', req, res);
    })
    app.post('/adminLogin', function(req, res) {
        app.emit('authAdmin', req, res);
    })

    app.post('/api/upload', function (req, res) {
    upload(req, res, function (err) {
      if (err) {
        return res.end("Error uploading file.");
      }
      res.end(req.file.filename);    
    });
    
  });
}
function requiredAuthentication(req, res, next) {
    if (req.session.user) {
        next();
    } else {
        req.session.error = 'Access denied!';
        res.redirect('/login');
    }
}
function isAdmin(req, res, next) {
    if (req.session.admin) {
        next();
    } else {
        req.session.error = 'Access denied!';
        res.redirect('/adminLogin');
    }
}

