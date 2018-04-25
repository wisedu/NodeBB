(function (module) {
    "use strict";

    var User = module.parent.require('./user'),
        db = module.parent.require('./database'),
        meta = module.parent.require('./meta'),
        nconf = module.parent.require('nconf'),
        passport = module.parent.require('passport'),
        DDStrategy = require('./passport-dd'),
        Topics = module.parent.require('./topics'),
        Posts = module.parent.require('./posts'),
        qs = require('qs'),
        axios = require('axios');

    var constants = Object.freeze({
        'name': "DD",
        'icon': 'fa-dd',
        'admin': {
            'route': '/plugins/sso-dd'
        }
    });

    const corpid = 'ding5b727efd1035c355';
    const corpsecret = 'YIRR_BE9tQjSZUnACGO4dMnAnl14ZloX77mUvegFavnnCd2bx3WLAk9I--0aKrTB';
    const agentid = '169933468';

    var DD = {};

    DD.getStrategy = function (strategies, callback) {
        console.log(nconf.get('url'))
        passport.use('dd', new DDStrategy({
            clientID: 'dingoaayvshm80gqcbmvpd',
            clientSecret: 'AbvP2WAh_sta2_TjhZRg68B1rpnrvNRX73RPB61d2jMYZ5VkBJNN6u-Jq6LMgxBl',
            callbackURL: nconf.get('url') + '/auth/dd/callback'
        }, function (token, tokenSecret, profile, done) {
            DD.login(profile.id, profile.name, function (err, user) {
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

        callback(null, strategies);
    };

    DD.login = function (ddID, username, callback) {
        var email = ddID + '@dingtalk.com';
        DD.makeUniqUserName(username).then(function (username) {
            DD.getUidByDDID(ddID, function (err, uid) {
                if (err) {
                    return callback(err);
                }
                console.log('uid', uid);
                if (uid) {
                    // Existing User
                    console.log('Existing User');
                    callback(null, {
                        uid: uid
                    });
                } else {
                    // New User
                    var success = function (uid) {
                        User.setUserField(uid, 'ddid', ddID);
                        db.setObjectField('ddid:uid', ddID, uid);
                        callback(null, {
                            uid: uid
                        });
                    };

                    DD.getEmailByDDID(ddID, function (err, _email) {
                        if (!_email) {
                            User.getUidByEmail(email, function (err, uid) {
                                if (!uid) {
                                    User.create({ username: username, email: email }, function (err, uid) {
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
                        } else {
                            success(uid); // Existing account -- merge
                        }
                    });
                }
            });
        });
    };

    DD.getEmailByDDID = function (ddID, callback) {
        db.getObjectField('email', ddID, function (err, email) {
            if (err) {
                callback(err);
            } else {
                callback(null, email);
            }
        });
    };

    DD.getUidByDDID = function (ddID, callback) {
        db.getObjectField('ddid:uid', ddID, function (err, uid) {
            if (err) {
                callback(err);
            } else {
                callback(null, uid);
            }
        });
    };

    DD.addMenuItem = function (custom_header, callback) {
        custom_header.authentication.push({
            "route": constants.admin.route,
            "icon": constants.admin.icon,
            "name": constants.name
        });

        callback(null, custom_header);
    };

    DD.init = function (data, callback) {
        function renderAdmin(req, res) {
            res.render('admin/plugins/sso-dd', {});
        }

        data.router.get('/admin/plugins/sso-dd', data.middleware.admin.buildHeader, renderAdmin);
        data.router.get('/api/admin/plugins/sso-dd', renderAdmin);

        callback();
    };

    DD.makeUniqUserName = function (username) {
        var isUniq = function (name) {
            return new Promise(function (resolve, reject) {
                User.getUidByUsername(name, function (err, uid) {
                    if (err) {
                        resolve(true);
                    } else {
                        if (uid) {
                            resolve(false);
                        } else {
                            resolve(true);
                        }
                    }
                });
            });
        };
        return new Promise(function (resolve, reject) {
            let i = 0;
            let makeUniq = function (name) {
                isUniq(name).then(function (uniq) {
                    if (uniq) {
                        resolve(name);
                    } else {
                        i++;
                        makeUniq(username + i);
                    }
                });
            };
            makeUniq(username);
        });
    };

    DD.notifyMessage = function (data) {
        notifyMessageToDD(data);
    };

    var getAccessToken = function () {
        return axios.get('https://oapi.dingtalk.com/gettoken', {
            params: {
                corpid: corpid,
                corpsecret: corpsecret
            }
        }).then(function ({ data }) {
            if (data.errcode === 0) {
                return data.access_token;
            } else {
                console.log(`1、获取access_token失败`)
            }
        });
    };

    var getUseridByUnionid = function (unionid, access_token) {
        return axios.get('https://oapi.dingtalk.com/user/getUseridByUnionid', {
            params: {
                access_token: access_token,
                unionid: unionid
            }
        }).then(function ({ data }) {
            if (data.errcode === 0) {
                console.log(`2、获取的userid，${data.userid}`)
                return data.userid;
            } else {
                console.log(`2、获取userid失败, ${data.errmsg}`)
            }
        });
    };

    var getUserIdsByUids = function (keys, access_token) {
        return new Promise(function (resolve, reject) {
            db.getObjectsFields(keys, ['ddid'], function (err, ddids) {
                if (err) {
                    console.log(err);
                    resolve([]);
                    return;
                }
                console.log('ddids,', JSON.stringify(ddids))
                //去除无效值
                ddids = ddids.map(d => d.ddid).filter(v => v);
                console.log(`根据获取ddid，${JSON.stringify(ddids)}`)
                if (ddids.length) {
                    //根据unionid获取userids
                    let reqs = ddids.map(function (ddid) {
                        return getUseridByUnionid(ddid, access_token);
                    });
                    Promise.all(reqs).then(function (tousers) {
                        resolve(tousers.filter(v => v));
                    });
                } else {
                    resolve([]);
                }
            });
        });
    };

    var notifyMessageToDD = function (data) {
        let uid = data.post.uid;
        console.log(`uid,${uid}`)
        console.log(`post, ${JSON.stringify(data.post)}`)
        let tid = data.post.tid;
        let set = 'tid:' + tid + ':posts';
        let postContent = data.post.content;
        let atUsers = [];
        postContent.replace(/(^@|@)([\S]*)?/g, function (u) {
            atUsers.push(u.replace(/@/g, ''));
            return '';
        })
        User.getUserField(uid, 'username', function (err, username) {
            //1、获取主题
            Topics.getTopicData(tid, function (err, topic) {
                console.log(`topic，${JSON.stringify(topic)}`)
                let tuid = topic.uid;
                let topicTitle = topic.title;
                //2、获取主题回复
                Topics.getTopicPosts(parseInt(tid, 10), set, 0, 1000, false, tuid, function (err, posts) {
                    //3、获取回复人员uid，添加主题新建人uid,并去重
                    posts.push({ uid: tuid })
                    let puids = [...new Set(posts.map(p => p.uid))];
                    let keys = puids.map(p => `user:${p}`);
                    //获取access_token
                    getAccessToken().then(function (access_token) {
                        var notifyMessage = function (uids, title) {
                            getUserIdsByUids(uids, access_token).then(function (tousers) {
                                console.log('tousers', JSON.stringify(tousers));
                                if (tousers.length) {
                                    axios.post(`https://oapi.dingtalk.com/message/send?access_token=${access_token}`, {
                                        touser: tousers.join('|'),
                                        agentid: agentid,
                                        msgtype: "link",
                                        link: {
                                            title: title,
                                            text: postContent,
                                            picUrl: "",
                                            messageUrl: "https://res.wisedu.com/forum/topic/" + tid
                                        }
                                    });
                                }
                            });
                        };
                        console.log('atUsers', JSON.stringify(atUsers))
                        // 判断是否@人员
                        if (atUsers.length) {
                            User.getUidsByUsernames(atUsers, function (err, uids) {
                                //生成查询key
                                uids = uids.map(p => `user:${p}`);
                                //过滤出非@人员
                                keys = keys.filter(function (u) {
                                    return uids.indexOf(u) === -1;
                                });
                                console.log('@用户keys',JSON.stringify(keys))
                                if (keys.length) {
                                    notifyMessage(uids, `亲，${username}@了您，请及时查看话题<${topicTitle}>`);
                                }
                                console.log('普通uids',JSON.stringify(uids))
                                notifyMessage(keys, `亲，${username}回复了论坛中的话题<${topicTitle}>`);
                            });
                        } else {
                            notifyMessage(keys, `亲，${username}回复了论坛中的话题<${topicTitle}>`);
                        }
                    });
                });
            });
        });
    };

    module.exports = DD;
}(module));