'use strict';
var nconf = require('nconf');
var user = module.parent.require('./user'),
  Groups = module.parent.require('./groups'),
  meta = module.parent.require('./meta'),
  async = module.parent.require('async');
var mongocli = require('mongodb').MongoClient;
// var db = module.parent.require('./database');
var request = require('request');
var dburl = 'mongodb://172.16.7.75:27017/resshare-session';

var apiserver = "http://localhost:9900/v1/mobile";

var plugin = {};

plugin.loggedIn = function(uids) {
	mongocli.connect(dburl, function (err, db)	{
		db.collection("sessions").find({uid:uids.uid,online:true}).toArray(function(err, isExists){
			if (isExists.length === 0) {
				db.collection("sessions").insertOne({uid:uids.uid, online:true, created:new Date()}, function(){
					db.close();
				});
			} else {
				db.collection("sessions").updateOne({uid:uids.uid,online:true},{$set:{updated:new Date()}}, function(){
					db.close();
				});
			}
		})
	})
	// async.parallel({
	// 	user: async.apply(user.getUserData, uids.uid),
	// 	group: async.apply(Groups.getUserGroups, [uids.uid])
	// }, function(p1, data){
	// 	let group = data.group[0].map(g => {
	// 		console.log(g)
	// 		return {
	// 			name:g.name,
	// 			id:g.res_id,
	// 			description:g.description
	// 		}
	// 	})
	// 	let uname = data.user.fullname || data.user.username;

	// 	mongocli.connect(dburl, function (err, db)	{
	// 		db.collection("sessions").find({uid:uids.uid,online:true}).toArray(function(err, isExists){
	// 			if (isExists.length === 0) {
	// 				db.collection("sessions").insertOne({uid:uids.uid, uname:uname ,group:group, online:true, created:new Date()}, function(){
	// 					db.close();
	// 				});
	// 			} else {
	// 				db.collection("sessions").updateOne({uid:uids.uid,online:true},{$set:{updated:new Date()}}, function(){
	// 					db.close();
	// 				});
	// 			}

	// 		})
	// 	})
	// });
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

plugin.grantOwnership = function(data, callback) {
	console.log("-grantOwnership-")
	console.log(data.uid)
	console.log(data.groupName)
	request.post(apiserver + "/grantOwnership").form(data).on("error", err => {
		console.error(err)
	})
};

plugin.rescindOwnership = function(data, callback) {
	console.log("-rescindOwnership-")
	console.log(data.uid)
	console.log(data.groupName)
	request.post(apiserver + "/rescindOwnership").form(data).on("error", err => {
		console.error(err)
	})
};

plugin.groupJoin = function(data, callback) {
	console.log("--groupJoin--")
	console.log(data.uid)
	console.log(data.groupName)
	if (data.groupName !== "registered-users") {
		request.post(apiserver + "/groupJoin").form(data).on("error", err => {
			console.error(err)
		})
	}
};

plugin.groupLeave = function(data, callback) {
	console.log("-groupLeave-")
	console.log(data.uid)
	console.log(data.groupName)
	request.post(apiserver + "/groupLeave").form(data).on("error", err => {
		console.error(err)
	})
};

plugin.groupRename = function(data, callback) {
	console.log("-groupRename-")
	console.log(data.old)
	console.log(data.new)
	request.post(apiserver + "/groupRename").form(data).on("error", err => {
		console.error(err)
	})
};

plugin.groupDestroy = function(data, callback) {
	console.log("-groupDestroy-")
	console.log(data.group)
	let group = {
		name:data.group.name,
		id:data.group.res_id
	}
	request.post(apiserver + "/groupDestroy").form(group).on("error", err => {
		console.error(err)
	})
};

plugin.userCreate = function(data, callback) {
	console.log("-userCreate-")
	console.log(data.user.uid)
	let user = {
		uid:data.user.uid,
		fullname:data.user.username
	}
	request.post(apiserver + "/userCreate").form(user).on("error", err => {
		console.error(err)
	})
};

plugin.userDelete = function(data, callback) {
	console.log("-userDelete-")
	console.log(data.uid)
	// uid
	// fullname
	request.post(apiserver + "/userDelete").form(data).on("error", err => {
		console.error(err)
	})
};

plugin.userUpdateProfile = function(data, callback) {
	console.log("-userUpdateProfile-")
	console.log(data.uid)
	console.log(data.data)
	if (data.user.fullname !== undefined && data.user.fullname !== "") {
		let user = {
			uid:data.user.uid,
			fullname:data.user.fullname
		}
		request.post(apiserver + "/userUpdateProfile").form(data).on("error", err => {
			console.error(err)
		})
	}
};

module.exports = plugin;