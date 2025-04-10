(function(){

	window.onload = function() {
		setTimeout(function() {
			game.load();
		}, 10);
	};
	
	var ns = Q.use("fish");
	
	var game = ns.game = {
		container: null,
		width: 480,
		height: 320,
		fps: 60,
		frames: 0,
		params: null,
		events: Q.supportTouch ? ["touchstart", "touchend"] : ["mousedown", "mouseup"],
		fireInterval: 30,
		fireCount: 0
	};
	
	game.load = function(container) {
		var params = this.params = Q.getUrlParams();
		if(params.mode == undefined) params.mode = 2;
		if(params.fps) this.fps = params.fps;
		this.fireInterval = this.fps * 0.5;
	
		// Kiểm tra nếu là thiết bị di động
		var isMobile = Q.isMobile || window.innerWidth <= 768;
		var screenWidth = window.innerWidth;
		var screenHeight = window.innerHeight;
	
		if(Q.isIpod || Q.isIphone) {
			this.width = 980;
			this.height = 545;
			Q.addMeta({name:"viewport", content:"user-scalable=no"});
		} else {
			Q.addMeta({name:"viewport", content:"user-scalable=no, initial-scale=1.0, minimum-scale=1, maximum-scale=1"});
			// Nếu là thiết bị di động, giả lập chế độ nằm ngang
			if(isMobile) {
				// Giả lập chế độ nằm ngang: lấy chiều cao làm chiều rộng và ngược lại
				this.width = Math.min(1024, Math.max(screenWidth, screenHeight));
				this.height = Math.min(768, Math.min(screenWidth, screenHeight));
			} else {
				this.width = Math.min(1024, screenWidth);
				this.height = Math.min(768, screenHeight);
			}
		}
	
		if(params.width) this.width = Number(params.width) || this.width;
		if(params.height) this.height = Number(params.height) || this.height;
	
		this.container = container || Q.getDOM("container");
		this.container.style.overflow = "hidden";
		this.container.style.width = this.width + "px";
		this.container.style.height = this.height + "px";
		this.screenWidth = window.innerWidth;
		this.screenHeight = window.innerHeight;
	
		// Load info
		var div = Q.createDOM("div", {innerHTML: "Đang tải game, vui lòng chờ...<br>", style: {
			id: "loader",
			position: "absolute",
			width: this.width + "px",
			left: "0px",
			top: (this.height >> 1) + "px",
			textAlign: "center",
			color: "#fff",
			font: Q.isMobile ? 'bold 16px Đen' : 'bold 16px Times New Roman',
			textShadow: "0 2px 2px #111"
		}});
		this.container.appendChild(div);
		this.loader = div;
	
		// Hide nav bar
		this.hideNavBar();
		if(Q.supportOrientation) {
			window.onorientationchange = function(e) {
				game.hideNavBar();
				game.updateSize(); // Cập nhật kích thước khi xoay thiết bị
				if(game.stage) game.stage.updatePosition();
			};
		}
	
		// Start load image
		var imgLoader = new Q.ImageLoader();
		imgLoader.addEventListener("loaded", Q.delegate(this.onLoadLoaded, this));
		imgLoader.addEventListener("complete", Q.delegate(this.onLoadComplete, this));
		imgLoader.load(ns.R.sources);
	};
	
	// Thêm hàm cập nhật kích thước
	game.updateSize = function() {
		var screenWidth = window.innerWidth;
		var screenHeight = window.innerHeight;
		var isMobile = Q.isMobile || screenWidth <= 768;
	
		if(Q.isIpod || Q.isIphone) {
			this.width = 980;
			this.height = 545;
		} else if(isMobile) {
			// Giả lập chế độ nằm ngang
			this.width = Math.min(1024, Math.max(screenWidth, screenHeight));
			this.height = Math.min(768, Math.min(screenWidth, screenHeight));
		} else {
			this.width = Math.min(1024, screenWidth);
			this.height = Math.min(768, screenHeight);
		}
	
		this.container.style.width = this.width + "px";
		this.container.style.height = this.height + "px";
		this.screenWidth = window.innerWidth;
		this.screenHeight = window.innerHeight;
	
		// Cập nhật kích thước stage và các thành phần
		if(this.stage) {
			this.stage.width = this.width;
			this.stage.height = this.height;
			this.stage.updatePosition();
	
			// Cập nhật kích thước các thành phần giao diện
			if(this.bg) {
				this.bg.width = this.width;
				this.bg.height = this.height;
			}
			if(this.fishContainer) {
				this.fishContainer.width = this.width;
				this.fishContainer.height = this.height;
			}
			if(this.bottom) {
				this.bottom.x = (this.width - this.bottom.width) >> 1;
				this.bottom.y = this.height - this.bottom.height + 2;
			}
		}
	};
	
	game.onLoadLoaded = function(e) {
		var content = "Đang tải game, vui lòng chờ...<br>(" + Math.round(e.target.getLoadedSize()/e.target.getTotalSize()*100) + "%)";
		this.loader.innerHTML = content;
	};
	
	game.onLoadComplete = function(e) {
		e.target.removeAllEventListeners();
		this.init(e.images);
	};
	
	game.init = function(images) {
		ns.R.init(images);
		this.startup();
	};
	
	game.startup = function() {
		var me = this;
		this.container.removeChild(this.loader);
		this.loader = null;
	
		if(Q.isWebKit && !Q.supportTouch) {
			document.body.style.webkitTouchCallout = "none";
			document.body.style.webkitUserSelect = "none";
			document.body.style.webkitTextSizeAdjust = "none";
			document.body.style.webkitTapHighlightColor = "rgba(0,0,0,0)";
		}
	
		var context = null;
		if(this.params.mode == 1) {
			var canvas = Q.createDOM("canvas", {id:"canvas", width:this.width, height:this.height, style:{position:"absolute"}});
			this.container.appendChild(canvas);
			this.context = new Q.CanvasContext({canvas:canvas});
		} else {
			this.context = new Q.DOMContext({canvas:this.container});
		}
	
		this.stage = new Q.Stage({width:this.width, height:this.height, context:this.context, update:Q.delegate(this.update, this)});
	
		var em = this.evtManager = new Q.EventManager();
		em.registerStage(this.stage, this.events, true, true);
	
		this.initUI();
		this.initPlayer();
	
		this.fishManager = new ns.FishManager(this.fishContainer);
		this.fishManager.makeFish();
	
		var timer = this.timer = new Q.Timer(1000 / this.fps);
		timer.addListener(this.stage);
		timer.addListener(Q.Tween);
		timer.start();
	
		this.showFPS();
	};
	
	game.initUI = function() {
		this.bg = new Q.Bitmap({id:"bg", image:ns.R.mainbg, transformEnabled:false});
	
		this.fishContainer = new Q.DisplayObjectContainer({id:"fishContainer", width:this.width, height:this.height, eventChildren:false, transformEnabled:false});
		this.fishContainer.onEvent = function(e) {
			if(e.type == game.events[0] && game.fireCount >= game.fireInterval) {
				game.fireCount = 0;
				game.player.fire({x:e.eventX, y:e.eventY});
			}
		};
	
		this.bottom = new Q.Bitmap(ns.R.bottombar);
		this.bottom.id = "bottom";
		this.bottom.x = this.width - this.bottom.width >> 1;
		this.bottom.y = this.height - this.bottom.height + 2;
		this.bottom.transformEnabled = false;
	
		this.stage.addChild(this.bg, this.fishContainer, this.bottom);
	};
	
	game.initPlayer = function() {
		var coin = Number(this.params.coin) || 10000;
		this.player = new ns.Player({id:"quark", coin:coin});
	};
	
	game.update = function(timeInfo) {
		this.frames++;
		this.fireCount++;
		this.fishManager.update();
	};
	
	game.testFish = function() {
		var num = this.params.num || 50, len = ns.R.fishTypes.length;
		for(var i = 0; i < num; i++) {
			var chance = Math.random() * (len - 1) >> 0;
			var index = Math.random() * chance + 1 >> 0;
			var type = ns.R.fishTypes[index];
	
			var fish = new ns.Fish(type);
			fish.x = Math.random()*this.width >> 0;
			fish.y = Math.random()*this.height >> 0;
			fish.moving = true;
			fish.rotation = Math.random() * 360 >> 0;
			fish.init();
			this.fishContainer.addChild(fish);
		}
	};
	
	game.testFishDirection = function() {
		var dirs = [0, 45, 90, 135, 180, 225, 270, 315];
	
		for(var i = 0; i < 8; i++) {
			var fish = new ns.Fish(ns.R.fishTypes[1]);
			fish.x = this.width >> 1;
			fish.y = this.height >> 1;
			fish.speed = 0.5;
			fish.setDirection(dirs[i]);
			fish.moving = true;
			this.stage.addChild(fish);
		}
	};
	
	game.testFishALL = function() {
		var sx = 100, sy = 50, y = 0, len = ns.R.fishTypes.length;
		for(var i = 0; i < len - 1; i++) {
			var type = ns.R.fishTypes[i+1];
			var fish = new ns.Fish(type);
			if(i == 9) fish.x = sx;
			else fish.x = sx + Math.floor(i/5)*200;
			if(i == 9) y = sy + 320;
			else if(i%5 == 0) y = sy;
			fish.y = y + (i%5) * 20;
			y += fish.height;
			fish.update = function(){ };
			this.stage.addChild(fish);
		}
	};
	
	game.showFPS = function() {
		var me = this, fpsContainer = Quark.getDOM("fps");
		if(fpsContainer) {
			setInterval(function() {
				fpsContainer.innerHTML = "FPS:" + me.frames;
				me.frames = 0;
			}, 1000);
		}
	};
	
	game.hideNavBar = function() {
		window.scrollTo(0, 1);
	};
	
	})();