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
	// console.log("uid:" + uids.uid)
	async.parallel({
		user: async.apply(user.getUserData, uids.uid),
		designer: async.apply(Groups.isMember, uids.uid, "designer"),
		developer: async.apply(Groups.isMember, uids.uid, "developer"),
		demander: async.apply(Groups.isMember, uids.uid, "demander"),
		des_data: async.apply(Groups.getGroupFields, "designer", ["res_id"]),
		dev_data: async.apply(Groups.getGroupFields, "developer", ["res_id"]),
		dem_data: async.apply(Groups.getGroupFields, "demander", ["res_id"]),
	}, function(p1, data){
		// console.log(uids.uid)
		// console.log(data)
		let group = []
		if (data.designer === true){
			group.push({name:"designer", id:data.des_data.res_id})
		}
		if (data.developer === true){
			group.push({name:"developer", id:data.dev_data.res_id})
		}
		if (data.demander === true){
			group.push({name:"demander", id:data.dem_data.res_id})
		}
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