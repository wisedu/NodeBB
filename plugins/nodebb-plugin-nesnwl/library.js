'use strict';
var nconf = require('nconf');
var user = module.parent.require('./user'),
  Groups = module.parent.require('./groups'),
  meta = module.parent.require('./meta'),
  async = module.parent.require('async');
var mongocli = require('mongodb').MongoClient;
// var db = module.parent.require('./database');
var dburl = 'mongodb://172.16.7.75:27017/resshare-session';


var plugin = {};

plugin.loggedIn = function(uids) {
	async.parallel({
		user: async.apply(user.getUserData, uids.uid),
		group: async.apply(Groups.getUserGroups, [uids.uid])
	}, function(p1, data){
		let group = data.group[0].map(g => {
			return {
				name:g.name,
				id:g.res_id,
				description:g.description
			}
		})
		let uname = data.user.fullname || data.user.username;

		mongocli.connect(dburl, function (err, db)	{
			db.collection("sessions").find({uid:uids.uid,online:true}).toArray(function(err, isExists){
				if (isExists.length === 0) {
					db.collection("sessions").insertOne({uid:uids.uid, uname:uname ,group:group, online:true, created:new Date()}, function(){
						db.close();
					});
				} else {
					db.collection("sessions").updateOne({uid:uids.uid,online:true},{$set:{updated:new Date()}}, function(){
						db.close();
					});
				}

			})
		})
	});
};

plugin.loggedOut = function(data, callback) {
	mongocli.connect(dburl, function (err, db)	{
		db.collection("sessions").update({uid:data.uid,online:true},{$set:{online:false, logout:new Date()}}, function(){
			db.close();
		});
	});
	if (typeof callback === 'function')	{
		callback();
	} else {
		return true;
	}
}

plugin.groupCreate = function(data, callback) {
	data.group.res_id = new Date().valueOf().toString(36);
	console.log(data)
	callback(null, data)
};

module.exports = plugin;