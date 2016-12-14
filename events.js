
module.exports = function (app) {
    var events = require('events');
    var formidable = require("formidable");
    var helpers = require(__dirname + '/helpers');

    var dateFormat = require('dateformat');
    var now = new Date();

    // cloudant cfg
    var async = require('async');
    var Cloudant = require('cloudant');
    var cloudant_cfg = {
        "username": "00225cdc-2ec6-4065-818a-f6a1618bfb96-bluemix",
        "password": "8e10d4bf291b5a90441ce0161f342c24f0d4de697bd36e060d4ff3c842c94e47",
        "host": "00225cdc-2ec6-4065-818a-f6a1618bfb96-bluemix.cloudant.com",
        "port": 443,
        "url": "https://00225cdc-2ec6-4065-818a-f6a1618bfb96-bluemix:8e10d4bf291b5a90441ce0161f342c24f0d4de697bd36e060d4ff3c842c94e47@00225cdc-2ec6-4065-818a-f6a1618bfb96-bluemix.cloudant.com",
        "dbname": "chatroom_db"
    };
    var cloudant = Cloudant({ account: cloudant_cfg.username, password: cloudant_cfg.password });

    //cloudant prepare
    function generateID(key, identificator) {
        return key + identificator;
    }
    cloudant.db.list(function (err, allDbs) {
        if (!allDbs.join(', ').includes(cloudant_cfg.dbname)) {
            cloudant.db.create(cloudant_cfg.dbname, function (err) {
                if (err) console.err("Error:", err);
            });
        }
    });
    db = cloudant.db.use(cloudant_cfg.dbname);
    db_keys = {
        user: "user:",
        active: "active:",
        chatroom: "chatroom:"
    }
    function generateID(key, identificator) {
        return key + identificator;
    }




    // // mongodb schema 
    // var mongoose = require('mongoose');
    // mongoose.connect('mongodb://localhost/chatroom_db');
    // var Schema = mongoose.Schema;
    // ObjectId = Schema.ObjectId;
    // // collection definition
    // var userCollection = new Schema({
    //     username: { type: String, unique: true, required: true, dropDups: true },
    //     salt: String,
    //     pw: String,
    //     profile: String
    // });

    // var activeCollection = new Schema({
    //     onlineUser: { type: String, unique: true, required: true, dropDups: true },
    //     sessionId: String,
    //     chatroom: String
    // });

    // var chatroomsCollection = new Schema({
    //     chatroom: { type: String, unique: true, required: true, dropDups: true },
    //     salt: String,
    //     pw: String
    // });

    // var User = mongoose.model('users', userCollection);
    // var Active = mongoose.model('active', activeCollection);
    // var Chatroom = mongoose.model('chatrooms', chatroomsCollection);


    // UserManagement Events======================================================================
    app.on('registration', function (req, res) {
        var form = new formidable.IncomingForm();
        form.parse(req, function (err, fields) {
            var password = fields.password;
            var username = fields.username;

            var passwordData = helpers.saltHashPassword(password, 0);


            //make sure no empty entires will be made
            if (username == '' || password == '') {
                res.render('register', { message: ' Invalid Username or Password!' });
                return;
            }

            // mongodb
            // User.findOne({ username: fields.username }, 'username', function (err, person) {
            //     if (err) return handleError(err);
            //     if (person) {
            //         res.render('register', { message: ' User with this Username allready exists!' });
            //         return;
            //     }

            // cloudant
            db.get(generateID(db_keys.user, username), function (err, data) {
                if (err) {
                    if (err.reason != "missing") return console.error(err);

                } else {
                    doc = data;
                    if (doc) {
                        res.render('register', { message: ' User with this Username allready exists!' });
                        return;
                    }
                }
            });



            helpers.recognizeFace(fields.image, function (result) {
                if (result) {

                    // mongodb
                    // var user = new User({
                    //     username: username,
                    //     salt: passwordData.salt,
                    //     pw: passwordData.passwordHash,
                    //     profile: fields.image
                    // });
                    // user.save(function (err) {
                    //     if (err) return console.error(err);
                    // });

                    // cloudant
                    db.insert({
                        _id: generateID(db_keys.user, username),
                        type: 'user',
                        username: username,
                        salt: passwordData.salt,
                        pw: passwordData.passwordHash,
                        profile: fields.image
                    }, function (err) {
                        if (err) return console.error(err);
                    });
                    res.redirect('/');
                    return;
                }
                else {
                    res.render('register', { message: ' Please use a Picture with a Face' });
                }
            });

        });
    });

    app.on('authentication', function (req, res) {
        var form = new formidable.IncomingForm();
        form.parse(req, function (err, fields) {
            // mongodb
            // User.findOne({ username: fields.username }, 'username salt pw', function (err, doc) {
            //     if (err) return handleError(err);
            //     if (doc) {
            //         var passwordData = helpers.saltHashPassword(fields.password, doc.salt);
            //         if (passwordData.passwordHash == doc.pw) {

            //             Chatroom.findOne({ chatroom: fields.chatroom }, 'chatroom salt pw', function (err, docCR) {
            //                 if (docCR) {
            //                     var passwordDataCR = helpers.saltHashPassword(fields.crpassword, docCR.salt);
            //                     if (passwordDataCR.passwordHash == docCR.pw) {
            //                         // req.session.regenerate(function () {
            //                         req.session.user = fields.username;
            //                         req.session.chatroom = fields.chatroom;
            //                         res.redirect('/chatroom');
            //                         // });
            //                     } else {
            //                         app.emit('renderLogin', req, res, ' Chatroom password invalid!');
            //                     }
            //                 }
            //             });
            //         }
            //     }
            //     else {
            //         // res.render('login', { message: ' Username or Password invalid!' });
            //         app.emit('renderLogin', req, res, ' Username or Password invalid!');
            //     };

            // });

            // cloudant
            db.find({ selector: { _id: generateID(db_keys.user, fields.username) } }, function (err, result) {
                if (err) return console.error(err);
                if (result.docs.length != 0) {
                    var doc = result.docs[0];
                    var passwordData = helpers.saltHashPassword(fields.password, doc.salt);
                    if (passwordData.passwordHash == doc.pw) {
                        db.find({ selector: { _id: generateID(db_keys.chatroom, fields.chatroom) } }, function (errCR, resultCR) {
                            if (err) return console.error(errCR);
                            if (resultCR.docs.length != 0) {
                                var docCR = resultCR.docs[0];
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
        // // active.ensureIndex({
        // //     fieldName: 'onlineUser', unique: true,
        // // }, function (err) { });

        // mongodb
        // Active.findOne({ onlineUser: socket.username }, 'onlineUser sessionId _id', function (err, doc) {
        //     if (err) return handleError(err);
        //     if (doc) {
        //         if (io.sockets.connected[doc.sessionId]) {
        //             var oldsocket = io.sockets.connected[doc.sessionId];
        //             oldsocket.emit('message', "DISCONNECTED!!!");
        //             oldsocket.disconnect();
        //         }
        //         Active.where({ _id: doc._id }).update({ $set: { sessionId: socket.id, chatroom: socket.chatroom } }).exec();
        //         return;
        //     } else {
        //         var active = new Active({
        //             onlineUser: socket.username,
        //             sessionId: socket.id,
        //             chatroom: socket.chatroom
        //         });
        //         active.save(function (err) {
        //             if (err) return console.error(err);
        //         });
        //     }
        // });
        // console.log("events.js");
        var doc = null;
        var findDocument = function (callback) {
            db.find({ selector: { _id: generateID(db_keys.active, socket.username) } }, function (err, result) {
                // if (err) return console.error(err);
                if (result.docs.length != 0) {
                    // console.log("here");
                    doc = result.docs[0];
                    // db.get(generateID(db_keys.active, socket.username), function (err, data) {
                    //     doc = data;
                    if (io.sockets.connected[doc.sessionId]) {
                        var oldsocket = io.sockets.connected[doc.sessionId];
                        oldsocket.emit('message', "DISCONNECTED!!!");
                        oldsocket.disconnect();
                    }
                   
                }
                 callback(err);
            });
            
        };
        // var updateDocument = function (callback) {
        //     doc.sessionId = socket.id;
        //     doc.chatroom = socket.chatroom;
        //     db.insert(doc, function (err, data) {
        //         if (err) return console.error(err);
        //         // doc._rev = data.rev
        //         // callback(err, data);
        //         return
        //     });
        // };

        var createDocument = function (callback) {
            // console.log("here2");
            db.insert({
                _id: generateID(db_keys.active, socket.username),
                type: 'active',
                onlineUser: socket.username,
                sessionId: socket.id,
                chatroom: socket.chatroom
            }, function (err) {
              
                 callback(err);
            });

            
        }
        // console.log("here3");
        async.series([findDocument, createDocument]);



    });

    app.on('privateMessage', function (socket, io, rcv, msg) {

        // mongodb
        // Active.findOne({ onlineUser: rcv }, 'onlineUser sessionId', function (err, doc) {
        //     if (doc) {
        //         var rcvsocket = io.sockets.connected[doc.sessionId]
        //         if (rcvsocket.chatroom == socket.chatroom) {
        //             socket.emit('message', 'PRIVATE ' + socket.username + " at " + dateFormat(now) + ': ' + msg);
        //             rcvsocket.emit('message', 'PRIVATE ' + socket.username + " at " + dateFormat(now) + ': ' + msg);
        //             return;
        //         }
        //         else {
        //             socket.emit('message', 'User with name ' + rcv + ' was not found or is not online');
        //         }
        //     }
        //     else {
        //         socket.emit('message', 'User with name ' + rcv + ' was not found or is not online');
        //     }
        // });
        // cloudant

        var findDocuments = function (callback) {
            db.find({ selector: { type: 'active', onlineUser: rcv } }, function (err, result) {
                if (err) return console.error(err);

                if (result.docs.length == 1) {
                    var doc = result.docs[0];
                    // console.log(io.sockets.connected[doc.sessionId]);
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


        };
        async.series([findDocuments]);

    });

    app.on('deleteUserFromList', function (socket) {
        // mongodb
        // Active.findOne({ onlineUser: socket.username }, 'onlineUser', function (err, doc) {
        //     if (doc) {
        //         doc.remove(function (err) {
        //             if (err) return handleError(err);
        //         });
        //     }
        // });

        // cloudant

        db.find({ selector: { _id: generateID(db_keys.active, socket.username) } }, function (err, result) {
            if (err) return console.error(err);
            if (result.docs.length != 0) {
                var doc = result.docs[0];
                db.destroy(doc._id, doc._rev, function (err, data) {
                    if (err) return console.error(err);
                });
            }
        });
    });

    app.on('listAllUsers', function (socket) {

        // mongodb
        // Active.find({ chatroom: socket.chatroom }, 'onlineUser', function (err, docs) {
        //     //    console.log(docs)
        //     for (i in docs) {
        //         socket.emit('message', docs[i].onlineUser);
        //     }
        // });
        // cloudant
        var findDocuments = function (callback) {
            db.find({ selector: { type: 'active', chatroom: socket.chatroom } }, function (err, result) {
                if (err) return console.error(err);
                console.log(result.docs.length);
                for (i in result.docs) {
                    socket.emit('message', result.docs[i].onlineUser);
                }

            });
        };
        async.series([findDocuments]);
    });

    app.on("createChatroom", function (req, res) {
        var form = new formidable.IncomingForm();
        form.parse(req, function (err, fields) {
            var password = fields.password;
            var chatroom = fields.chatroom;

            var passwordData = helpers.saltHashPassword(password, 0);


            //make sure no empty entires will be made
            if (chatroom == '' || password == '') {
                res.render('createChatroom', { message: ' Invalid Name or Password!' });
                return;
            }

            //make sure that username is unique 
            // chatrooms.ensureIndex({ fieldName: 'chatroom', unique: true }, function (err) {
            // });

            // mongodb

            // Chatroom.findOne({ chatroom: fields.chatroom }, 'chatroom', function (err, doc) {
            //     if (doc) {
            //         res.render('createChatroom', { message: ' Chatroom with this name allready exists!' });
            //         return;
            //     } else {

            // var chatroom = new Chatroom({
            //     chatroom: chatroom,
            //     salt: passwordData.salt,
            //     pw: passwordData.passwordHash
            // });
            //         chatroom.save(function (err) {
            //             if (err) return console.error(err);
            //         });

            //         res.redirect('/login');
            //     }
            // });

            // cloudant
            db.get(generateID(db_keys.chatroom, fields.chatroom), function (err, data) {
                if (err) {
                    if (err.reason != "missing") return console.error(err);

                } else {
                    doc = data;
                    if (doc) {
                        res.render('createChatroom', { message: ' Chatroom with this name allready exists!' });
                        return;
                    }
                }
            });

            db.insert({
                _id: generateID(db_keys.chatroom, fields.chatroom),
                type: 'chatroom',
                chatroom: chatroom,
                salt: passwordData.salt,
                pw: passwordData.passwordHash
            }, function (err) {
                if (err) return console.error(err);
                res.redirect('/login');
            });


        });

    });

    app.on('renderLogin', function (req, res, msg) {
        var list = []
        // mongodb
        // Chatroom.find({}, 'chatroom', function (err, docs) {
        //     if (err) {
        //         console.log(err);
        //     } else {
        //         for (i in docs) {
        //             list.push(docs[i].chatroom);
        //         }
        //         res.render('login', {
        //             message: msg,
        //             rooms: list
        //         });
        //     }
        // });

        // cloudant
        var findDocuments = function (callback) {
            db.find({ selector: { type: 'chatroom' } }, function (err, result) {
                if (err) return console.error(err);
                for (i in result.docs) {
                    list.push(result.docs[i].chatroom);
                }
                res.render('login', {
                    message: msg,
                    rooms: list
                });

            });
        };
        async.series([findDocuments]);

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


    // app.on('cleanup', function () {
    //     active.remove({}, { multi: true }, function (err, numRemoved) {
    //     });
    // });

    // app.on('test', function () {

    //     cloudant.db.list(function (err, allDbs) {
    //         console.log('All my databases: %s', allDbs.join(', '))
    //     });
    // });


}




