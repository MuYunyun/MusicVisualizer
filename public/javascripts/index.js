function $(s) {
	return document.querySelectorAll(s);
}

var lis = $('#list li');

for (var i = 0; i < lis.length; i++) {
	lis[i].onclick = function() {
		for (var j = 0; j < lis.length; j++) {
			lis[j].className = "";
		}
		this.className = "selected";
		load("/media/" + this.title);
	}
}

var xhr = new XMLHttpRequest();
var ac = new(window.AudioContext || window.webkitAudioContext)();
var gainNode = ac[ac.createGain ? "createGain" : "createGainNode"](); // 改变音频音量的对象
gainNode.connect(ac.destination); //所有音频输出聚集地

var analyser = ac.createAnalyser(); //音频分析对象
var size = 128;
analyser.fftSize = size * 2; //设置FFT的大小(用于将一个信号变换到频域，默认是2048)
analyser.connect(gainNode);

var source = null;

var count = 0;

var box = $('#box')[0];
var height, width;
var canvas = document.createElement("canvas");
var ctx = canvas.getContext("2d");
box.appendChild(canvas);
var Dots = [];

function random(m, n) { // 随机生成两个数之间的数
	return Math.round(Math.random() * (n - m) + m);
}

function getDots() { //获取点的坐标信息和颜色信息
	Dots = [];
	for (var i = 0; i < size; i++) {
		var x = random(0, width);
		var y = random(0, height);
		var color = "rgb(" + random(0, 255) + "," + random(0, 255) + "," + random(0, 255) + ")"
		Dots.push({
			x: x,
			y: y,
			color: color
		});
	}
}
var line;

function resize() { //动态改变canvas区域的宽高
	height = box.clientHeight;
	width = box.clientWidth;
	canvas.height = height;
	canvas.width = width;
	line = ctx.createLinearGradient(0, 0, 0, height); //创建线性渐变
	line.addColorStop(0, "red");
	line.addColorStop(0.5, "yellow");
	line.addColorStop(1, "green");
	getDots();
}
resize();

window.onresize = resize;

function draw(arr) { // 绘制矩形函数
	ctx.clearRect(0, 0, width, height); // 清除上次canvas,保证流畅效果
	var w = width / size;
	ctx.fillStyle = line; // 每次点击矩形展示，会到矩形展示
	for (var i = 0; i < size; i++) {
		if (draw.type === 'column') {
			var h = arr[i] / 256 * height;
			ctx.fillRect(w * i, height - h, w * 0.6, h); //x轴坐标,y轴坐标,宽度(0.4留为间隙),高度
		} else if (draw.type === 'dot') {
			ctx.beginPath(); // 表示要开始绘制，没有该方法会有连线
			var o = Dots[i];
			var r = arr[i] / 256 * 50; //绘制圆的半径
			ctx.arc(o.x, o.y, r, 0, Math.PI * 2, true);
			var g = ctx.createRadialGradient(o.x, o.y, 0, o.x, o.y, r); //创建径向渐变
			g.addColorStop(0, "#fff");
			g.addColorStop(1, o.color);
			ctx.fillStyle = g;
			ctx.fill();
			//ctx.strokeStyle = "#fff";  //描边颜色
			//ctx.stroke(); //描边
		}
	}
}

/* 切换柱状图或者点状的展现 */
draw.type = "column"; // 在draw函数上绑定一个属性，默认展现柱状图
var types = $("#type li");
for (var i = 0; i < types.length; i++) {
	types[i].onclick = function() {
		for (var j = 0; j < types.length; j++) {
			types[j].className = "";
		}
		this.className = "selected";
		draw.type = this.getAttribute('data-type');
	}
}

function load(url) {
	var n = ++count
	source && source[source.stop ? "stop" : "noteOff"]();
	xhr.abort(); // 终止之前的异步请求(目前没有实际作用)
	xhr.open("GET", url);
	xhr.responseType = "arraybuffer"; //音频数据已二进制形式返回，便于解压缩
	xhr.onload = function() { //加载完成
		if (n !== count) return; //正常情况n和count是相等的,用到了闭包的知识
		ac.decodeAudioData(xhr.response, function(buffer) { // 异步解码包含在arrayBuffer中的音频数据
			if (n !== count) return;
			var bufferSource = ac.createBufferSource(); // 创建AudioBufferSourceNode对象
			bufferSource.buffer = buffer; // 表示要播放的音频资源数据
			bufferSource.connect(analyser); // 连接到分析对象上
			bufferSource[bufferSource.start ? "start" : "noteOn"](0); // 老版本是noteOn
			source = bufferSource;
		}, function(err) {
			console.log(err);
		});
	}
	xhr.send();
}

function visualizer() {
	var arr = new Uint8Array(analyser.frequencyBinCount); //实时得到的音频频域的数据个数为前面设置的fftSize的一半
	requestAnimationFrame = window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame; //动画函数

	function v() {
		analyser.getByteFrequencyData(arr); // 复制音频当前的频域数据到Unit8Array中
		//console.log(arr);
		draw(arr);
		requestAnimationFrame(v);
	}
	requestAnimationFrame(v); //动画函数
}

visualizer();

function changeVolume(percent) { // 改变音量大小函数
	gainNode.gain.value = percent * percent;
}

$('#volume')[0].onmousemove = function() {
	changeVolume(this.value / this.max); //频率
}
$('#volume')[0].onmousemove(); // 让它默认60生效