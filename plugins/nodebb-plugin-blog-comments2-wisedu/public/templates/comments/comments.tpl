<!-- IF isValid -->
	<div class="top-tool-box">
		<!--a href="" class='need-more-share2'
		    data-shareUrl='{redirect_url}'
		    title="Share"
		>
			<i class="i-share icon-share" aria-hidden="true"></i>
		</a-->

		<a component="post/bookmark" style="color: inherit; text-decoration: none;" title="Mark">
			<i class="i-bookmark icon-bookmark"></i>
		</a>
		<a component="post/upvote" style="color: inherit; text-decoration: none; margin-right: 5px;" title="Upvote">
			<i class="i-upvote icon-thumbs-up-alt"></i>
			<span class="upvote-count">
			</span>
		</a>
	</div>
	<!-- IF atTop -->
		<div class="topic-profile-pic user first-image">

			<!-- IF !isLoggedIn -->
				<img src="https://1.gravatar.com/avatar/177d180983be7a2c95a4dbe7451abeba?s=95&d=&r=PG" class="profile-image" />
			<!-- ELSE -->
				<!-- IF user.picture -->
				<img data-uid="{user.uid}" src="{user.picture}" class="profile-image" title="{user.username}" />
				<!-- ELSE -->
				<div class="profile-image" style="background-color: {user.icon:bgColor};" title="{user.username}">{user.icon:text}</div>
				<!-- ENDIF user.picture -->
			<!-- ENDIF !isLoggedIn -->
		</div>

		<form action="{relative_path}/comments/reply" class="clearfix" method="post">
			<textarea id="nodebb-content" class="form-control" name="content" placeholder="你可以在这里填写评论内容，最少得要8个字哦" rows="3"></textarea>
		<!-- IF isLoggedIn -->
			<small>你正在用这个账号登录： <strong>{user.username}</strong>. <strong id="nodebb-error"></strong></small>
			<button class="btn btn-primary">发表一个评论</button>
			<input type="hidden" name="_csrf" value="{token}" />
			<input type="hidden" name="tid" value="{tid}" />
			<input type="hidden" name="url" value="{redirect_url}" />
		</form>
		<br />
		<!-- ELSE -->
		</form>
		<button class="btn btn-primary" id="nodebb-register">注册</button>
		<button class="btn btn-primary" id="nodebb-login">登录</button>

		<!-- This button is here just for making the css margin right -->
		<button style="visibility: hidden; padding-top: 8px;"> </button>

		<!-- ENDIF isLoggedIn -->
	<!-- ENDIF atTop -->

	<ul id="nodebb-comments-list" data-mainpid="{mainPost.pid}">
		<!-- BEGIN posts -->
		<li <!-- IF pagination --> class="nodebb-post-fadein" <!-- ENDIF pagination --> <!-- IF !posts.index --> class="nodebb-post-fadein" <!-- ENDIF !posts.index --> >
			<div class="topic-item" data-pid="{posts.pid}" data-userslug="{user.userslug}" data-uid="{posts.uid}">
				<div class="topic-body">
					<div class="topic-profile-pic">
						<a href="{relative_path}/user/{user.userslug}">
							<!-- IF user.picture -->
							<img src="{user.picture}" alt="{user.username}" class="profile-image" title="{user.username}">
							<!-- ELSE -->
							<div class="profile-image" style="background-color: {user.icon:bgColor}" title="{user.username}" alt="{user.username}">{user.icon:text}</div>
							<!-- ENDIF user.picture -->
						</a>
					</div>
					<div class="topic-text">
						<div class="post-content" itemprop="text">
							<small>
								<span class="nodebb-post-tools post-tools no-select">
									<a component="post/reply" style="color: inherit; text-decoration: none;" title="Reply">
										<i class="icon-reply"></i>
									</a>
									<a component="post/quote" style="color: inherit; text-decoration: none;" title="Quote">
										<i class="icon-quote-right"></i>
									</a>
									<a component="post/bookmark" data-bookmarked="{posts.bookmarked}" style="color: inherit; text-decoration: none;" title="Mark">
										<i class="i-bookmark <!-- IF posts.bookmarked --> icon-bookmark <!-- ELSE --> icon-bookmark-empty <!-- ENDIF posts.bookmarked -->"></i>
									</a>
									<a component="post/upvote" data-upvoted="{posts.upvoted}" date-votes="{posts.votes}" style="color: inherit; text-decoration: none; margin-right: 5px;" title="Upvote">
										<i class="i-upvote <!-- IF posts.upvoted --> icon-thumbs-up-alt <!-- ELSE --> icon-thumbs-up <!-- ENDIF posts.upvoted -->"></i>
										<span class="upvote-count <!-- IF !posts.votes --> hidden <!-- ENDIF !posts.votes -->">
											{posts.votes}
										</span>
									</a>
									<!-- <a component="post/quote"><i class="fa fa-quote-left"></i> quote</a> -->
								</span>
								<a href="{relative_path}/user/{user.userslug}" style="color: inherit; text-decoration: none;"><strong>{user.username}</strong></a>
								<span title="{posts.timestampISO}">commented {posts.timestamp}</span>
								<!-- IF posts.isReply -->
								<!-- IF !posts.deletedReply -->
									<button component="post/parent" class="reply-label no-select" data-topid="{posts.toPid}">
										<i class="icon-reply"></i> @{posts.parentUsername}
									</button>
								<!-- ENDIF !posts.deletedReply -->
								<!-- ENDIF posts.isReply -->
							</small>
							<br />
							<div class="post-body">{posts.content}</div>
						</div>
					</div>
				</div>

				<form action="{relative_path}/comments/reply" method="post" class="sub-reply-input hidden">
 					<textarea id="nodebb-content" class="form-control" name="content" placeholder="你可以在这里填写评论内容，最少得要8个字哦" rows="3"></textarea>
 					<button class="btn btn-primary">回复 {user.username}</button>
 					<input type="hidden" name="_csrf" value="{token}" />
 					<input type="hidden" name="tid" value="{tid}" />
 					<input type="hidden" name="toPid" value="{posts.pid}" />
 					<input type="hidden" name="url" value="{redirect_url}" />
 				</form>
			</div>
		</li>
		<!-- END posts -->
	</ul>
	<br />

	<!-- IF atBottom -->
		<div class="topic-profile-pic user">
			<!-- IF isLoggedIn -->
			<img src="{user.picture}" class="profile-image" />
			<!-- ELSE -->
			<img src="http://1.gravatar.com/avatar/177d180983be7a2c95a4dbe7451abeba?s=95&d=&r=PG" class="profile-image" />
			<!-- ENDIF isLoggedIn -->
		</div>
		<form action="{relative_path}/comments/reply" method="post">
			<textarea id="nodebb-content" class="form-control" name="content" placeholder="你可以在这里填写评论内容，最少得要8个字哦" rows="3"></textarea>
		<!-- IF isLoggedIn -->
			<small>你正在用这个账号登录： <strong>{user.username}</strong>. <strong id="nodebb-error"></strong></small>
			<button class="btn btn-primary">发表一个评论</button>
			<input type="hidden" name="_csrf" value="{token}" />
			<input type="hidden" name="tid" value="{tid}" />
			<input type="hidden" name="url" value="{redirect_url}" />
		</form>
		<!-- ELSE -->
		</form>
		<button class="btn btn-primary" id="nodebb-register">注册</button>
		<button class="btn btn-primary" id="nodebb-login">登录</button>

		<!-- This button is here just for making the css margin right -->
		<button style="visibility: hidden; padding-top: 8px;"> </button>

		<!-- ENDIF isLoggedIn -->
	<!-- ENDIF atBottom -->

	<small class="nodebb-copyright">Powered by <a href="{relative_path}" target="_blank">{siteTitle}</a> &bull; <a href="{relative_path}/topic/{tid}">View original thread</a></small>
	<button class="btn btn-primary" <!-- IF !posts.length -->style="display: none"<!-- ENDIF !posts.length --> id="nodebb-load-more">Load more comments...</button>
<!-- ELSE -->
	{siteTitle} 评论功能暂未开启.
	<!-- IF isAdmin -->
	<form action="{relative_path}/comments/publish" method="post">
		<button class="btn btn-primary">发布主题至 {siteTitle}</button>
		<input type="hidden" name="markdown" id="nodebb-content-markdown" />
		<input type="hidden" name="title" id="nodebb-content-title" />
		<input type="hidden" name="cid" id="nodebb-content-cid" />
		<input type="hidden" name="blogger" id="nodebb-content-blogger" />
		<input type="hidden" name="tags" id="nodebb-content-tags" />
		<input type="hidden" name="id" value="{article_id}" />
		<input type="hidden" name="url" value="{redirect_url}" />
		<input type="hidden" name="_csrf" value="{token}" />
	</form>
	<!-- ENDIF isAdmin -->
<!-- ENDIF isValid -->
