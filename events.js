
module.exports = function (app) {
    var events = require('events');
    var formidable = require("formidable");
    var helpers = require(__dirname + '/helpers');
    var Datastore = require('nedb'), db = new Datastore({ filename: __dirname + '/.db', autoload: true });
    var active = new Datastore({ filename: __dirname + '/.active', autoload: true });
    var chatrooms = new Datastore({ filename: __dirname + '/.chatrooms', autoload: true });


    var dateFormat = require('dateformat');
    var now = new Date();
    // UserManagement Events======================================================================
    app.on('registration', function (req, res) {
        var form = new formidable.IncomingForm();
        form.parse(req, function (err, fields) {
            var password = fields.password;
            var username = fields.username;

            var passwordData = helpers.saltHashPassword(password, 0);
            var data = {
                username: username,
                salt: passwordData.salt,
                pw: passwordData.passwordHash
            }

            //make sure no empty entires will be made
            if (username == '' || password == '') {
                res.render('register', { message: ' Invalid Username or Password!' });
                return;
            }

            //make sure that username is unique 
            db.ensureIndex({ fieldName: 'username', unique: true }, function (err) {
            });

            db.findOne({ username: fields.username }, function (err, doc) {
                if (doc) {
                    res.render('register', { message: ' User with this Username allready exists!' });
                    return;
                } else {
                    // console.log(helpers.recognizeFace(fields.image));
                    // console.log(fields);
                    // helpers.recognizeFace(function(err,fields.image){
// CALLBACK
                    // });
                    // if () {

                        db.insert(data, function (err, newDoc) {
                        });
                        res.redirect('/');
                    // }
                    // else{
                        //  res.render('register', { message: ' Please use a Picture with a Face' });
                    return;
                    }
                }
            });
        });
    });

    app.on('authentication', function (req, res) {
        var form = new formidable.IncomingForm();
        form.parse(req, function (err, fields) {
            db.findOne({ username: fields.username }, function (err, doc) {
                if (doc) {
                    var passwordData = helpers.saltHashPassword(fields.password, doc.salt);
                    if (passwordData.passwordHash == doc.pw) {

                        chatrooms.findOne({ chatroom: fields.chatroom }, function (err, docCR) {
                            if (docCR) {
                                var passwordDataCR = helpers.saltHashPassword(fields.crpassword, docCR.salt);
                                if (passwordDataCR.passwordHash == docCR.pw) {
                                    // req.session.regenerate(function () {
                                    req.session.user = fields.username;
                                    req.session.chatroom = fields.chatroom;
                                    res.redirect('/chatroom');
                                    // });
                                } else {
                                    app.emit('renderLogin', req, res, ' Chatroom password invalid!');
                                }
                            }
                        });
                    }
                }
                else {
                    // res.render('login', { message: ' Username or Password invalid!' });
                    app.emit('renderLogin', req, res, ' Username or Password invalid!');
                };

            });
        });
    });

    app.on('logout', function (req, res) {
        req.session = null;
        res.redirect('/');
    });

    // chat events ======================================================================

    app.on('addUserToList', function (socket, io) {
        active.ensureIndex({
            fieldName: 'onlineUser', unique: true,
        }, function (err) { });

        active.findOne({ onlineUser: socket.username }, function (err, doc) {
            if (doc) {
                // io.clients[doc.sessionId].disconnected();
                if (io.sockets.connected[doc.sessionId]) {
                    var oldsocket = io.sockets.connected[doc.sessionId];
                    oldsocket.emit('message', "DISCONNECTED!!!");
                    oldsocket.disconnect();

                }
                // console.log('NEU##########################' + io.sockets.connected[socket.id])
                active.update({ onlineUser: socket.username }, { $set: { sessionId: socket.id, chatroom: socket.chatroom } }, function (err, numReplaced) {

                });
                // res.render('register', { message: ' User allready!' });
                return;
            } else {
                active.insert({ onlineUser: socket.username, sessionId: socket.id, chatroom: socket.chatroom }, function (err, newDoc) {
                });
            }
        });
    });

    app.on('privateMessage', function (socket, io, rcv, msg) {
        // socket.emit('message', rcv + ': ' + msg);
        //    console.log(socket);
        active.findOne({ onlineUser: rcv }, function (err, doc) {
            if (doc) {
                var rcvsocket = io.sockets.connected[doc.sessionId]
                if (rcvsocket.chatroom == socket.chatroom) {
                    socket.emit('message', 'PRIVATE ' + socket.username + " at " + dateFormat(now) + ': ' + msg);
                    rcvsocket.emit('message', 'PRIVATE ' + socket.username + " at " + dateFormat(now) + ': ' + msg);
                    return;
                }
                else {
                    socket.emit('message', 'User with name ' + rcv + ' was not found or is not online');
                }
            }
            else {
                socket.emit('message', 'User with name ' + rcv + ' was not found or is not online');
            }
        });

    });

    app.on('deleteUserFromList', function (socket) {
        active.findOne({ onlineUser: socket.username }, function (err, doc) {
            if (doc) {
                active.remove({ onlineUser: socket.username }, function (err, numRemoved) {
                });
            }
        });
    });

    app.on('listAllUsers', function (socket) {
        active.find({ chatroom: socket.chatroom }, function (err, docs) {
            //    console.log(docs)
            for (i in docs) {
                socket.emit('message', docs[i].onlineUser);
            }
        });
    });

    app.on("createChatroom", function (req, res) {
        var form = new formidable.IncomingForm();
        form.parse(req, function (err, fields) {
            var password = fields.password;
            var chatroom = fields.chatroom;

            var passwordData = helpers.saltHashPassword(password, 0);
            var data = {
                chatroom: chatroom,
                salt: passwordData.salt,
                pw: passwordData.passwordHash
            }

            //make sure no empty entires will be made
            if (chatroom == '' || password == '') {
                res.render('createChatroom', { message: ' Invalid Name or Password!' });
                return;
            }

            //make sure that username is unique 
            chatrooms.ensureIndex({ fieldName: 'chatroom', unique: true }, function (err) {
            });

            chatrooms.findOne({ chatroom: fields.chatroom }, function (err, doc) {
                if (doc) {
                    res.render('createChatroom', { message: ' Chatroom with this name allready exists!' });
                    return;
                } else {
                    chatrooms.insert(data, function (err, newDoc) {
                    });
                    res.redirect('/login');
                }
            });
        });

    });


    app.on('renderLogin', function (req, res, msg) {
        var list = []
        chatrooms.find({}, function (err, docs) {
            if (err) {
                console.log(err);
            } else {
                for (i in docs) {
                    list.push(docs[i].chatroom);
                }
                res.render('login', {
                    message: msg,
                    rooms: list
                });
            }
        });

    });
    app.on('authAdmin', function (req, res) {
        var form = new formidable.IncomingForm();
        form.parse(req, function (err, fields) {
            if (fields.password == "admin") {
                req.session.admin = true;
                res.redirect("/");
            } else {
                res.render('adminLogin', { message: 'admin password wrong!' });
            }

        });
    });
    app.on('test', function () {
        helpers.recognizeFace();
    });
    app.on('cleanup', function () {
        active.remove({}, { multi: true }, function (err, numRemoved) {
        });
    });
}




