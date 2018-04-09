/**
 * Module dependencies.
 */
var util = require('util');
var qs = require('qs');
var OAuth2Strategy = require('passport-oauth').OAuth2Strategy;
var InternalOAuthError = require('passport-oauth').InternalOAuthError;

/*
 * @param {Object} options
 * @param {Function} verify
 * @api public
 */
function Strategy(options, verify) {
    let appid = options.clientID;
    let appsecret = options.clientSecret
    options = options || {};
    options.authorizationURL = options.authorizationURL || 'https://oapi.dingtalk.com/sns/gettoken';
    options.tokenURL = options.tokenURL || 'https://oapi.dingtalk.com/sns/gettoken';
    options.clientID = appid;
    options.clientSecret = appsecret;
    options.scopeSeparator = options.scopeSeparator || ',';
    let persistentURL = options.persistentURL || 'https://oapi.dingtalk.com/sns/get_persistent_code';
    let snsToken = options.persistentURL || 'https://oapi.dingtalk.com/sns/get_sns_token';


    OAuth2Strategy.call(this, options, verify);
    this.name = 'dingtalk';

    this._oauth2.getAuthorizeUrl = function(params) {
        var params = params || {};
        //params['appid'] = this._clientId;
        var options = {
            appid: appid,
            appsecret: appsecret
        }
        return this._authorizeUrl + "?" + qs.stringify(options);
    }

    this._oauth2.getOAuthAccessToken = function(code, params, callback) {
        var params = params || {};
        var codeParam = (params.grant_type === 'refresh_token') ? 'refresh_token' : 'code';
        params[codeParam] = code;

        var post_data = qs.stringify(params);
        var post_headers = {
            'Content-Type': 'application/x-www-form-urlencoded'
        };
        var self = this;
        //1、获取access_token
        this._request("GET", this._getAccessTokenUrl(), post_headers, null, null, function(error, data, response) {
            if (error) callback(error);
            else {
                let results;
                try {
                    // As of http://tools.ietf.org/html/draft-ietf-oauth-v2-07
                    // responses should be in JSON
                    results = JSON.parse(data);
                } catch (e) {
                    // .... However both Facebook + Github currently use rev05 of the spec
                    // and neither seem to specify a content-type correctly in their response headers :(
                    // clients of these services will suffer a *minor* performance cost of the exception
                    // being thrown
                    results = qs.parse(data);
                }
                let access_token = results["access_token"];
                //2、获取persistent_code
                self._request("POST", persistentURL, post_headers, { code: code }, access_token, function(error, data, response) {
                    if (error) callback(error);
                    let results;
                    try {
                        results = JSON.parse(data);
                    } catch (e) {
                        results = qs.parse(data);
                    }
                    //3、获取sns_token
                    self._request('POST', snsToken, post_headers, {
                        persistent_code: results.persistent_code,
                        access_token: access_token,
                        openid: results.openid
                    }, access_token, function(error, data, response) {
                        if (error) callback(error);
                        let results;
                        try {
                            results = JSON.parse(data);
                        } catch (e) {
                            results = qs.parse(data);
                        }
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
    this._oauth2.get('https://oapi.dingtalk.com/sns/getuserinfo?sns_token=' + sns_token, null, function(err, body, res) {
        try {
            var json = JSON.parse(body);
            var info = json.user_info;
            done(null, {
                provider: 'dingtalk',
                id: info.openid,
                name: info.nick,
                mobile: info.maskedMobile,
                unionId: info.unionid,
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