(function(module) {
	"use strict";

	var Comments = {};

	var db = module.parent.require('../src/database.js'),
		meta = module.parent.require('../src/meta.js'),
		posts = module.parent.require('../src/posts.js'),
		topics = module.parent.require('../src/topics.js'),
		user = module.parent.require('../src/user.js'),
		groups = module.parent.require('../src/groups.js'),
		fs = module.parent.require('fs'),
		path = module.parent.require('path'),
		async = module.parent.require('async'),
		winston = module.parent.require('winston');

	module.exports = Comments;

	function CORSSafeReq (req) {
		var hostUrls = (meta.config['blog-comments:url'] || '').split(','),
			url;

		hostUrls.forEach(function(hostUrl) {
			hostUrl = hostUrl.trim();
			if (hostUrl[hostUrl.length - 1] === '/') {
				hostUrl = hostUrl.substring(0, hostUrl.length - 1);
			}

			if (hostUrl === req.get('origin')) {
				url = req.get('origin');
			}
		});

		if (!url) {
			winston.warn('[nodebb-plugin-blog-comments2] Origin (' + req.get('origin') + ') does not match hostUrls: ' + hostUrls.join(', '));
		}
		return url;
	}

	function CORSFilter (req, res) {
		var url = CORSSafeReq(req);

		if (!url) {
			return;
		}

		res.header("Access-Control-Allow-Origin", url);
		res.header('Access-Control-Allow-Headers', 'X-Requested-With, X-HTTP-Method-Override, Content-Type, Accept');
		res.header("Access-Control-Allow-Credentials", "true");
		return res;
	}

	Comments.getTopicIDByCommentID = function(commentID, blogger, callback) {
		db.getObjectField('blog-comments:'+blogger, commentID, function(err, tid) {
			callback(err, tid);
		});
	};

	Comments.getCommentData = function(req, res) {
		var commentID = req.params.id,
			blogger = req.params.blogger || 'default',
			uid = req.user ? req.user.uid : 0;

		Comments.getTopicIDByCommentID(commentID, blogger, function(err, tid) {
			var disabled = false;

			async.parallel({
				posts: function(next) {
					if (disabled) {
						next(err, []);
					} else {
						topics.getTopicPosts(tid, 'tid:' + tid + ':posts', 0 + req.params.pagination * 10, 9 + req.params.pagination * 9, uid, true, next);
					}
				},
				postCount: function(next) {
					topics.getTopicField(tid, 'postcount', next);
				},
				user: function(next) {
					user.getUserData(uid, next);
				},
				isAdministrator: function(next) {
					user.isAdministrator(uid, next);
				},
				isPublisher: function(next) {
					groups.isMember(uid, 'publishers', next);
				},
				category: function(next) {
					topics.getCategoryData(tid, next);
				},
				mainPost: function(next) {
					topics.getMainPost(tid, uid, next);
				}
			}, function(err, data) {
				CORSFilter(req, res);

				var posts = data.posts.filter(function(post) {
					return post.deleted === false;
				});
				posts.forEach(function(post){
					post.isReply = post.hasOwnProperty('toPid') && parseInt(post.toPid) !== parseInt(data.tid) - 1;
					post.parentUsername = post.parent ? post.parent.username || '' : '';
					post.deletedReply = (post.parent && !post.parent.username) ? true : false;
				});

				var top = true;
				var bottom = false;
				var compose_location = meta.config['blog-comments:compose-location'];
				if (compose_location == "bottom"){ bottom = true; top = false;}

				res.json({
					posts: posts,
					postCount: data.postCount,
					user: data.user,
					template: Comments.template,
					token: req.csrfToken(),
					isAdmin: !data.isAdministrator ? data.isPublisher : data.isAdministrator,
					isLoggedIn: !!uid,
					tid: tid,
					category: data.category,
					mainPost: data.mainPost,
					isValid: !!data.mainPost && !!tid,
					atBottom: bottom,
					atTop: top,
					siteTitle: meta.config.title
				});
			});
		});
	};

	function get_redirect_url(url, err) {
		var rurl = url + '#nodebb-comments';
		if (url.indexOf('#') !== -1) {
			// compatible for mmmw's blog, he uses hash in url;
			rurl = url;
		}

		if(err) {
			rurl = url + '?error=' + err.message + '#nodebb-comments';
			if (url.indexOf('#') !== -1) {
				rurl = url.split('#')[0] + '?error=' + err.message + '#' + url.split('#')[1];
			}
		}
		return rurl;
	}

	Comments.votePost = function (req, res, callback) {
		if (!CORSSafeReq(req)) {
			return;
		}
		var toPid = req.body.toPid,
		    isUpvote = JSON.parse(req.body.isUpvote),
			uid = req.user ? req.user.uid : 0;

		var func = isUpvote ? 'upvote' : 'unvote';

		posts[func](toPid, uid, function (err, result) {
			CORSFilter(req, res);
			res.json({error: err && err.message, result: result});
		});
	};

	Comments.bookmarkPost = function (req, res, callback) {
		if (!CORSSafeReq(req)) {
			return;
		}
		var toPid = req.body.toPid,
			isBookmark = JSON.parse(req.body.isBookmark),
			uid = req.user ? req.user.uid : 0;

		var func = isBookmark ? 'bookmark' : 'unbookmark';

		posts[func](toPid, uid, function (err, result) {
			CORSFilter(req, res);
			res.json({error: err && err.message, result: result});
		});
	};

	Comments.replyToComment = function(req, res, callback) {
		var content = req.body.content,
			tid = req.body.tid,
			url = req.body.url,
			toPid = req.body.toPid,
			uid = req.user ? req.user.uid : 0;

		topics.reply({
			tid: tid,
			uid: uid,
			toPid: toPid,
			content: content
		}, function(err, postData) {
			res.redirect(get_redirect_url(url, err));
		});
	};

	Comments.publishArticle = function(req, res, callback) {
		var markdown = req.body.markdown,
			title = req.body.title,
			url = req.body.url,
			commentID = req.body.id,
			tags = req.body.tags,
			blogger = req.body.blogger || 'default',
			uid = req.user ? req.user.uid : 0,
			cid = JSON.parse(req.body.cid);

		if (cid === -1) {
			var hostUrls = (meta.config['blog-comments:url'] || '').split(','),
				position = 0;

			hostUrls.forEach(function(hostUrl, i) {
				hostUrl = hostUrl.trim();
				if (hostUrl[hostUrl.length - 1] === '/') {
					hostUrl = hostUrl.substring(0, hostUrl.length - 1);
				}

				if (hostUrl === req.get('origin')) {
					position = i;
				}
			});

			cid = meta.config['blog-comments:cid'].toString() || '';
			cid = parseInt(cid.split(',')[position], 10) || parseInt(cid.split(',')[0], 10) || 1;
		}

		async.parallel({
			isAdministrator: function(next) {
				user.isAdministrator(uid, next);
			},
			isPublisher: function(next) {
				groups.isMember(uid, 'publishers', next);
			}
		}, function(err, userStatus) {
			if (!userStatus.isAdministrator && !userStatus.isPublisher) {
				return res.json({error: "Only Administrators or members of the publishers group can publish articles"});
			}

			topics.post({
				uid: uid,
				title: title,
				content: markdown,
				tags: tags ? JSON.parse(tags) : [],
				req: req,
				externalLink: url,  // save externalLink and externalComment to topic, only v2mm theme can do this.
				externalComment: markdown,
				cid: cid
			}, function(err, result) {
				if (!err && result && result.postData && result.postData.tid) {
					posts.setPostField(result.postData.pid, 'blog-comments:url', url, function(err) {
						if (err) {
							return res.json({error: "Unable to post topic", result: result});
						}

						db.setObjectField('blog-comments:'+blogger, commentID, result.postData.tid);
						var rurl = (req.header('Referer') || '/') + '#nodebb-comments';
						if (url.indexOf('#') !== -1) {
							// compatible for mmmw's blog, he uses hash in url;
							rurl = url;
						}

						res.redirect(rurl);
					});
				} else {
					res.json({error: "Unable to post topic", result: result});
				}
			});
		});

	};

	Comments.addLinkbackToArticle = function(post, callback) {
		var hostUrls = (meta.config['blog-comments:url'] || '').split(','),
			position;

		posts.getPostField(post.pid, 'blog-comments:url', function(err, url) {
			if (url) {
				hostUrls.forEach(function(hostUrl, i) {
					if (url.indexOf(hostUrl.trim().replace(/^https?:\/\//, '')) !== -1) {
						position = i;
					}
				});

				var blogName = (meta.config['blog-comments:name'] || '');
				blogName = parseInt(blogName.split(',')[position], 10) || parseInt(blogName.split(',')[0], 10) || 1;

				post.profile.push({
					content: "Posted from <strong><a href="+ url +" target='blank'>" + blogName + "</a></strong>"
				});
			}

			callback(err, post);
		});
	};

	Comments.addAdminLink = function(custom_header, callback) {
		custom_header.plugins.push({
			"route": "/blog-comments",
			"icon": "fa-book",
			"name": "Blog Comments"
		});

		callback(null, custom_header);
	};

	function renderAdmin(req, res, callback) {
		res.render('comments/admin', {});
	}

	Comments.init = function(params, callback) {
		var app = params.router,
			middleware = params.middleware,
			controllers = params.controllers;

		fs.readFile(path.resolve(__dirname, './public/templates/comments/comments.tpl'), function (err, data) {
			Comments.template = data.toString();
		});

		app.get('/comments/get/:blogger/:id/:pagination?', middleware.applyCSRF, Comments.getCommentData);
		app.post('/comments/reply', Comments.replyToComment);
		app.post('/comments/publish', Comments.publishArticle);
		app.post('/comments/vote', Comments.votePost);
		app.post('/comments/bookmark', Comments.bookmarkPost);

		app.get('/admin/blog-comments', middleware.admin.buildHeader, renderAdmin);
		app.get('/api/admin/blog-comments', renderAdmin);

		callback();
	};

}(module));
