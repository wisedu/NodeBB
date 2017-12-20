'use strict';
var request = require('request');
var user = module.parent.require('./user'),
  Groups = module.parent.require('./groups'),
  meta = module.parent.require('./meta'),
  async = module.parent.require('async');

var plugin = {};

plugin.loggedIn = function(uids) {
	// console.log("uid:" + uids.uid)
	async.parallel({
		isDesginer: async.apply(Groups.isMember, uids.uid, "desginer"),
		isDeveloper: async.apply(Groups.isMember, uids.uid, "developer")
	}, function(p1, data){
		console.log(uids.uid)
		console.log(data)
		request({
			method: 'POST',
			url: "http://127.0.0.1:8360/index/home",
			data: {
				uid:uids.uid,
				groups:data
			},
			json: true,
		}, function (err, res, body) {
			// console.log(err)
			// console.log(res)
			console.log(body)
		});
	});
};

plugin.loggedOut = function(data, callback) {
	console.log(data.uid)
	if (typeof callback === 'function')	{
		callback();
	} else {
		return true;
	}
}

module.exports = plugin;