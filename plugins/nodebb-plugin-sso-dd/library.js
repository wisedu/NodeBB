(function(module) {
    "use strict";

    var User = module.parent.require('./user'),
        db = module.parent.require('./database'),
        meta = module.parent.require('./meta'),
        nconf = module.parent.require('nconf'),
        passport = module.parent.require('passport'),
        DDStrategy = require('./passport-dd').Strategy;

    var constants = Object.freeze({
        'name': "DD",
        'admin': {
            'icon': 'fa-dd',
            'route': '/plugins/sso-dd'
        }
    });

    var DD = {};

    DD.getStrategy = function(strategies, callback) {
        meta.settings.get('sso-dd', function(err, settings) {
            if (!err && settings.id && settings.secret) {
                passport.use(new DDStrategy({
                    clientID: settings.id,
                    clientSecret: settings.secret,
                    callbackURL: nconf.get('url') + '/auth/dd/callback'
                }, function(token, tokenSecret, profile, done) {
                    DD.login(profile.id, profile.nickname, function(err, user) {
                        if (err) {
                            return done(err);
                        }
                        done(null, user);
                    });
                }));

                strategies.push({
                    name: 'dd',
                    url: '/auth/dd',
                    callbackURL: '/auth/dd/callback',
                    icon: 'fa-dd',
                    scope: 'get_user_info'
                });
            }

            callback(null, strategies);
        });
    };

    DD.login = function(ddID, username, callback) {
        var email = username + '@users.noreply.dd.com';

        DD.getUidByDDID(ddID, function(err, uid) {
            if (err) {
                return callback(err);
            }

            if (uid) {
                // Existing User
                callback(null, {
                    uid: uid
                });
            } else {
                // New User
                var success = function(uid) {
                    User.setUserField(uid, 'ddid', ddID);
                    db.setObjectField('ddid:uid', ddID, uid);
                    callback(null, {
                        uid: uid
                    });
                };

                User.getUidByEmail(email, function(err, uid) {
                    if (!uid) {
                        User.create({username: username, email: email}, function(err, uid) {
                            if (err !== null) {
                                callback(err);
                            } else {
                                success(uid);
                            }
                        });
                    } else {
                        success(uid); // Existing account -- merge
                    }
                });
            }
        });
    };

    DD.getUidByDDID = function(ddID, callback) {
        db.getObjectField('ddid:uid', ddID, function(err, uid) {
            if (err) {
                callback(err);
            } else {
                callback(null, uid);
            }
        });
    };

    DD.addMenuItem = function(custom_header, callback) {
        custom_header.authentication.push({
            "route": constants.admin.route,
            "icon": constants.admin.icon,
            "name": constants.name
        });

        callback(null, custom_header);
    };

   DD.init = function(data, callback) {
        function renderAdmin(req, res) {
            res.render('admin/plugins/sso-dd', {});
        }

        data.router.get('/admin/plugins/sso-dd', data.middleware.admin.buildHeader, renderAdmin);
        data.router.get('/api/admin/plugins/sso-dd', renderAdmin);

        callback();
    };

    module.exports = DD;
}(module));
