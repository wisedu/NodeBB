$('document').ready(function() {
	require(['https://g.alicdn.com/dingding/dinglogin/0.0.5/ddLogin.js'], function() {
		var redirect_uri = location.origin + config.relative_path + "/auth/dd/callback";
		window.ddScan = function() {
			if (document.getElementById('login_container')) {
				var url = encodeURIComponent("https://oapi.dingtalk.com/connect/oauth2/sns_authorize?appid=dingoaayvshm80gqcbmvpd&response_type=code&scope=snsapi_login&state=123&redirect_uri=" + redirect_uri)
				var obj = DDLogin({
					id: "login_container",
					goto: url,
					style: "border:none;background-color:#FFFFFF;",
					width: "365",
					height: "400"
				});

				var hanndleMessage = function(event) {
					var origin = event.origin;
					console.log("origin", event.origin);
					if (origin == "https://login.dingtalk.com") { //判断是否来自ddLogin扫码事件。
						var loginTmpCode = event.data; //拿到loginTmpCode后就可以在这里构造跳转链接进行跳转了
						console.log("loginTmpCode", loginTmpCode);
						window.location.href = "https://oapi.dingtalk.com/connect/oauth2/sns_authorize?appid=APPID&response_type=code&scope=snsapi_login&state=STATE&redirect_uri=" + redirect_uri + "&loginTmpCode=" + loginTmpCode
					}
				};
				if (typeof window.addEventListener != 'undefined') {
					window.addEventListener('message', hanndleMessage, false);
				} else if (typeof window.attachEvent != 'undefined') {
					window.attachEvent('onmessage', hanndleMessage);
				}
			}
		}
		window.ddScan();
	});
});