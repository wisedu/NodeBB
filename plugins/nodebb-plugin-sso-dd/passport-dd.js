/**
 * Module dependencies.
 */
var util = require('util');
var qs = require('qs');
var OAuth2Strategy = require('passport-oauth').OAuth2Strategy;
var InternalOAuthError = require('passport-oauth').InternalOAuthError;
var axios = require('axios');
/*
 * @param {Object} options
 * @param {Function} verify
 * @api public
 */
function Strategy(options, verify) {
    let appid = options.clientID;
    let appsecret = options.clientSecret
    options = options || {};
    var authorizationURL = options.authorizationURL || 'https://oapi.dingtalk.com/sns/gettoken';
    options.authorizationURL = authorizationURL;
    options.tokenURL = options.tokenURL || 'https://oapi.dingtalk.com/sns/gettoken';
    options.clientID = appid;
    options.clientSecret = appsecret;
    options.scopeSeparator = options.scopeSeparator || ',';
    let persistentURL = options.persistentURL || 'https://oapi.dingtalk.com/sns/get_persistent_code';
    let snsTokenURL = options.persistentURL || 'https://oapi.dingtalk.com/sns/get_sns_token';


    OAuth2Strategy.call(this, options, verify);
    this.name = 'dingtalk';

    var getAuthorizeUrl = function(params) {
        var params = params || {};
        //params['appid'] = this._clientId;
        var options = {
            appid: appid,
            appsecret: appsecret
        }
        return authorizationURL + "?" + qs.stringify(options);
    }

    this._oauth2.getOAuthAccessToken = function(code, params, callback) {
        var post_headers = {
            'Content-Type': 'application/x-www-form-urlencoded'
        };
        var self = this;
        //1、获取access_token
        console.log(`0、code，${code}`)
        console.log(`1、获取access_token，${getAuthorizeUrl()}`)
        this._request("GET", getAuthorizeUrl(), post_headers, null, null, function(error, data, response) {
            if (error) callback(error);
            else {
                let results;
                try {
                    results = JSON.parse(data);
                } catch (e) {
                    results = qs.parse(data);
                }
                let access_token = results["access_token"];
                console.log(`2、获取persistent_code，${persistentURL}?access_token=${access_token}`)
                //2、获取persistent_code
                axios.post(`${persistentURL}?access_token=${access_token}`, { tmp_auth_code: code }).then(function({ data }) {
                    let results = data;
                    //3、获取sns_token
                    console.log(`3、获取sns_token，${JSON.stringify(results)}`)
                    axios.post(`${snsTokenURL}?access_token=${access_token}`, {
                        persistent_code: results.persistent_code,
                        access_token: access_token,
                        openid: results.openid
                    }).then(function({ data }) {
                        let results = data;
                        console.log(`3、获取sns_token结果，${JSON.stringify(results)}`)
                        let sns_token = results.sns_token;
                        callback(null, sns_token, null, results); // callback results =-=
                    });
                })
            }
        });
    }
}


/**
 * Inherit from `OAuth2Strategy`.
 */
util.inherits(Strategy, OAuth2Strategy);


OAuth2Strategy.prototype._loadUserProfile = function(sns_token, done, params) {
    this.userProfile(sns_token, done, params)
};

Strategy.prototype.userProfile = function(sns_token, done, params) {
    var _self = this;
    //4、获取用户信息
    console.log(`4、获取用户信息`)
    this._oauth2.get('https://oapi.dingtalk.com/sns/getuserinfo?sns_token=' + sns_token, null, function(err, body, res) {
        try {
            var json = JSON.parse(body);
            var info = json.user_info;
            console.log(`4、获取用户信息，${body}`)
            done(null, {
                provider: 'dingtalk',
                id: info.unionid,
                name: info.nick,
                mobile: info.maskedMobile,
                openId: info.unionid,
                dingId: info.dingId,
                _raw: body,
                _json: json
            });
        } catch (e) {
            done(e);
        }
    });
}

/**
 * Expose `Strategy`.
 */
module.exports = Strategy;