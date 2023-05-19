var SCALE = 2.5;
const app = new PIXI.Application({ width: 256 * SCALE, height: 384 * SCALE });
var websocket;
var playerData = { name: 'Pictochat', color: 0x289acb };
var roomData = {};

var isDrawing = false;
var drawHistory = [{ x: 0, y: 0, type: 3 }];
var pc_sprites = [];
var selectedTextbox = 0;
var prevDrawHistory = [];
var prevTextboxes = [];

var emitter = new PIXI.utils.EventEmitter();

var mousePos = { x: 0, y: 0 };

var sounds = [];
sounds.start_app = new Howl({ src: ['sounds/start_app.mp3'] });
sounds.join_room = new Howl({ src: ['sounds/join_room.mp3'] });
sounds.leave_room = new Howl({ src: ['sounds/leave_room.mp3'] });
sounds.key_down = new Howl({ src: ['sounds/key_down.mp3'] });
sounds.key_up = new Howl({ src: ['sounds/key_up.mp3'] });
sounds.drop_letter = new Howl({ src: ['sounds/drop_letter.mp3'] });
sounds.send = new Howl({ src: ['sounds/send.mp3'] });
sounds.big_pen = new Howl({ src: ['sounds/big_pen.mp3'] });
sounds.clear = new Howl({ src: ['sounds/clear.mp3'] });
sounds.draw = new Howl({ src: ['sounds/draw.mp3'] });
sounds.draw_down = new Howl({ src: ['sounds/draw_down.mp3'] });
sounds.eraser = new Howl({ src: ['sounds/eraser.mp3'] });
sounds.error = new Howl({ src: ['sounds/error.mp3'] });
sounds.pen = new Howl({ src: ['sounds/pen.mp3'] });
sounds.player_join = new Howl({ src: ['sounds/player_join.mp3'] });
sounds.retrieve = new Howl({ src: ['sounds/retrieve.mp3'] });
sounds.scroll = new Howl({ src: ['sounds/scroll.mp3'] });
sounds.send = new Howl({ src: ['sounds/send.mp3'] });
sounds.small_pen = new Howl({ src: ['sounds/small_pen.mp3'] });
sounds.player_leave = new Howl({ src: ['sounds/player_leave.mp3'] });
sounds.receive = new Howl({ src: ['sounds/receive.mp3'] });

PIXI.settings.SCALE_MODE = PIXI.SCALE_MODES.NEAREST;

app.stage.sortableChildren = true;
app.loader.add('nds', 'nds.fnt');
for(var i = 1; i < 6; i++) {
	app.loader.add('box_bg' + i, 'images/box_bg' + i + '.png');
	app.loader.add('box_outline' + i, 'images/box_outline' + i + '.png');
	app.loader.add('box_lines' + i, 'images/box_lines' + i + '.png');
}
app.loader.add('opening_message', 'images/opening_message.png');
app.loader.add('enter_room_a', 'images/enter_room_a.png');
app.loader.add('enter_room_b', 'images/enter_room_b.png');
app.loader.add('enter_room_c', 'images/enter_room_c.png');
app.loader.add('enter_room_d', 'images/enter_room_d.png');
app.loader.add('leave_room_a', 'images/leave_room_a.png');
app.loader.add('leave_room_b', 'images/leave_room_b.png');
app.loader.add('leave_room_c', 'images/leave_room_c.png');
app.loader.add('leave_room_d', 'images/leave_room_d.png');
app.loader.add('connection_bad', 'images/connection_bad.png');
app.loader.load((loader, resources) => {
	websocket = new WebSocket("ws"+window.location.href.slice(4));

	document.getElementById("root").appendChild(app.view);
	//document.getElementById("root").appendChild(canvas);

	

	var ndsFont = { font: '-16px NintendoDSBIOS', align: 'center', tint: 0 };
	var ndsFont_name = { font: '-16px NintendoDSBIOS', align: 'left', tint: playerData.color };
	var ndsFont_jl = { font: '-16px NintendoDSBIOS', align: 'left', tint: 0xd3cbc3 };
	const pixel = PIXI.Texture.from("images/pixel.png");
	var redraw = false;
	var draggedTb = new PIXI.BitmapText("", ndsFont);
	var dragOffset = { x: -10, y: -10};
	var kbMode = 0;
	var drawMode = 0;
	var scrolling = false;
	var scrollPos = 0;
	var inRoom = false;
	var inputFlag = false;
	var drawQueue = [];
	const keys_NORMAL = ["1","2","3","4","5","6","7","8","9","0","-","=","q","w","e","r","t","y","u","i","o","p","BACKSPACE","CAPS","a","s","d","f","g","h","j","k","l","ENTER","SHIFT","z","x","c","v","b","n","m",",",".","/",";","\'"," ","[","]"];
	const keys_CAPS = ["1","2","3","4","5","6","7","8","9","0","-","=","Q","W","E","R","T","Y","U","I","O","P","BACKSPACE","CAPS","A","S","D","F","G","H","J","K","L","ENTER","SHIFT","Z","X","C","V","B","N","M",",",".","/",";","\'"," ","[","]"];
	const keys_SHIFT = ["!","@","#","$","%","^","&","*","(",")","_","+","Q","W","E","R","T","Y","U","I","O","P","BACKSPACE","CAPS","A","S","D","F","G","H","J","K","L","ENTER","SHIFT","Z","X","C","V","B","N","M","<",">","?",":","~"," ","{","}"];
  var joinedRoom = false;
  
  window.onkeydown=function(e){
    if(joinedRoom){
      sounds.key_down.play();
    }
  };
  
  window.onkeyup=function(e){
    if(joinedRoom){
      const key = e.key.replace("Backspace","BACKSPACE").replace("Enter","ENTER");
      if(key!="Shift"&&key!="CapsLock"&&(keys_NORMAL.includes(key)||keys_CAPS.includes(key)||keys_SHIFT.includes(key)))addCharacterDirect(key);
      sounds.key_up.play();
    }
  };

	function generateRoomButtons(obj) {
		pc_sprites.roomButtons = [];
		var urlArray = ["images/room_a.png", "images/room_b.png", "images/room_c.png", "images/room_d.png"];
		for(var i = 0; i < obj.count.length; i++) {
			var roomButton = PIXI.Sprite.from(urlArray[i % 4]);
			roomButton.x = 31;
			roomButton.y = 224 + i * 32;
			roomButton.interactive = true;
			roomButton.buttonMode = true;
			roomButton.roomId = obj.ids[i];
			roomButton.on('pointerdown', function(event) { 
				const filter = new PIXI.filters.ColorMatrixFilter();
				filter.brightness(0.5);
				this.filters = [filter];
				this.blendMode = PIXI.BLEND_MODES.NORMAL;
			});
			roomButton.on('pointerup', function() { 
				this.filters = [new PIXI.filters.ColorMatrixFilter()];
				this.blendMode = PIXI.BLEND_MODES.NORMAL; 
				var obj = { type: 'cl_joinRoom', player: playerData, id: this.roomId };
				websocket.send(JSON.stringify(obj));
			});
			roomButton.on('pointerupoutside', function() { 
				this.filters = [new PIXI.filters.ColorMatrixFilter()];
				this.blendMode = PIXI.BLEND_MODES.NORMAL;
			});
			
			roomButton.pcText = new PIXI.BitmapText("" + obj.count[i] + "/16", ndsFont);
			roomButton.pcText.x = 161;
			roomButton.pcText.y = 234 + i * 32;
			
			pc_sprites.roomButtons.push(roomButton);
			app.stage.addChild(pc_sprites.roomButtons[i]);
			app.stage.addChild(pc_sprites.roomButtons[i].pcText);
		}
	}
	
	function generateStageButtons() {
		var stageButtons = [];
		var keyIndex = 0;
		
		// 1-=
		for(var i = 0; i < 12; i++) {
			createKbButton(26 + 16 * i, 297, 15, 14, keyIndex);
			keyIndex++;
		}
		// q-p
		for(var i = 0; i < 10; i++) {
			createKbButton(35 + 16 * i, 312, 15, 15, keyIndex);
			keyIndex++;
		}
		// BACKSPACE
		createKbButton(195, 312, 25, 15, keyIndex);
		keyIndex++;
		// CAPS-l
		for(var i = 0; i < 10; i++) {
			createKbButton(26 + 16 * i, 328, 15, 15, keyIndex);
			keyIndex++;
		}
		// ENTER
		createKbButton(186, 328, 34, 15, keyIndex);
		keyIndex++;
		// SHIFT
		createKbButton(24, 344, 25, 15, keyIndex);
		keyIndex++;
		// z-/
		for(var i = 0; i < 10; i++) {
			createKbButton(50 + 16 * i, 344, 15, 15, keyIndex);
			keyIndex++;
		}
		// ;
		createKbButton(58, 360, 15, 14, keyIndex);
		keyIndex++;
		// '
		createKbButton(74, 360, 15, 14, keyIndex);
		keyIndex++;
		// SPACE
		createKbButton(90, 360, 79, 14, keyIndex);
		keyIndex++;
		// [
		createKbButton(170, 360, 15, 14, keyIndex);
		keyIndex++;
		// ]
		createKbButton(186, 360, 15, 14, keyIndex);
		keyIndex++;
		
		createStageButton(225, 296, 31, 30, "SEND");
		createStageButton(225, 327, 31, 23, "RENEW");
		createStageButton(225, 351, 31, 24, "CLEAR");
		
		createStageButton(2, 263, 14, 14, "BIG_PEN");
		createStageButton(2, 278, 14, 14, "SMALL_PEN");
		
		createStageButton(2, 230, 14, 13, "PEN_MODE");
		createStageButton(2, 244, 14, 13, "ERASER_MODE");
		
		createStageButton(2, 194, 14, 14, "SCROLL_UP");
		createStageButton(2, 209, 14, 14, "SCROLL_DOWN");
		
		createStageButton(245, 193, 10, 10, "EXIT");
		
		scaleStage();
	}
	
	function createKbButton(x, y, w, h, keyIndex) {
		var sb = new PIXI.Sprite(pixel);
		sb.x = x;
		sb.y = y;
		sb.scale.x = w;
		sb.scale.y = h;
		sb.interactive = true;
		sb.buttonMode = true;
		sb.keyIndex = keyIndex;
		sb.alpha = 0;
		sb.tint = playerData.color;
		sb.draggingState = 0;
		sb.spriteType = "kb";
		sb.on('pointerdown', function() {
			this.draggingState = 1;
			this.alpha = 0.4;
			sounds.key_down.play();
		});
		sb.on('pointerup', function() {
			addCharacter(this.keyIndex);
			this.draggingState = 0;
			draggedTb.text = "";
			this.alpha = 0;
			if(kbMode == 1 && this.keyIndex != 34) {
				kbMode = 0;
				pc_sprites.shift.alpha = 0;
			}
			sounds.key_up.play();
		});
		sb.on('pointerupoutside', function() {
			if(this.draggingState == 2) {
				if(mousePos.x > 23 - dragOffset.x && mousePos.x < 21+245 + dragOffset.x && mousePos.y > 208 - dragOffset.y && mousePos.y < 208+70 - dragOffset.y
				&& !(mousePos.x <= 110 - dragOffset.x && mousePos.y <= 226 - dragOffset.y)) {
					var txt = new PIXI.BitmapText(draggedTb.text, ndsFont);
					txt.x = draggedTb.x / SCALE;
					txt.y = draggedTb.y / SCALE;
					pc_sprites.textboxes.push(txt);
					app.stage.addChild(pc_sprites.textboxes[pc_sprites.textboxes.length - 1]);
					selectedTextbox = pc_sprites.textboxes.length - 1;
					sounds.drop_letter.play();
					scaleStage();
				}
			}
			this.draggingState = 0;
			draggedTb.text = "";
			this.alpha = 0;
		});
		sb.on('pointermove', function() {
			var key = getKey(keyIndex);
			if(this.draggingState == 1 && key != "BACKSPACE" && key != "CAPS" && key != "ENTER" && key != "SHIFT") {
				this.draggingState = 2;
				draggedTb.text = key;
			}
		});
		app.stage.addChild(sb);
		return sb;
	}
	
	function createStageButton(x, y, w, h, action) {
		function performSbAction(act) {
			switch(act) {
				case "SEND": {
					var message = constructMessageObject();
					if(isMessageValid(message)) {
						sounds.send.play();
						recordHistory(message);
						clearStage();
						var obj = { type: "cl_sendMessage", message: message };
						websocket.send(JSON.stringify(obj));
						scrollPos = pc_sprites.scrollContainer.children.length - 1;
						scrollTo(scrollPos, -1);
						var box = generateMessageBox(message).box;
						var height = box.height + 2;
						scrollMessages(height);
					} else {
						sounds.error.play();
					}
					break;
				}
				case "RENEW": {
					if(isPrevStageEmpty()) {
						sounds.error.play();
					} else {
						sounds.retrieve.play();
					}
					restoreHistory();
					break;
				}
				case "CLEAR": {
					if(isStageEmpty()) {
						sounds.error.play();
					} else {
						sounds.clear.play();
					}
					clearStage();
					break;
				}
				case "BIG_PEN": {
					sounds.big_pen.play();
					var action = { x: 0, y: 0, type: 3 };
					drawHistory.push(action);
					pc_sprites.drawWidthSelect.y = 263 * SCALE;
					break;
				}
				case "SMALL_PEN": {
					sounds.small_pen.play();
					var action = { x: 0, y: 0, type: 4 };
					drawHistory.push(action);
					pc_sprites.drawWidthSelect.y = 278 * SCALE;
					break;
				}
				case "PEN_MODE": {
					sounds.pen.play();
					var action = { x: 0, y: 0, type: 5 };
					drawHistory.push(action);
					pc_sprites.drawModeSelect.y = 230 * SCALE;
					break;
				}
				case "ERASER_MODE": {
					sounds.eraser.play();
					var action = { x: 0, y: 0, type: 6 };
					drawHistory.push(action);
					pc_sprites.drawModeSelect.y = 244 * SCALE;
					break;
				}
				case "SCROLL_UP": {
					sounds.scroll.play();
					scrollPos--;
					if(scrollPos < 0) scrollPos = 0;
					scrollTo(scrollPos, 1);
					break;
				}
				case "SCROLL_DOWN": {
					sounds.scroll.play();
					scrollPos++;
					if(scrollPos > pc_sprites.scrollContainer.children.length - 1)
						scrollPos = pc_sprites.scrollContainer.children.length - 1;
					scrollTo(scrollPos, 1);
					break;
				}
				case "EXIT": {
					var obj = { type: "cl_leaveRoom" };
					websocket.send(JSON.stringify(obj));
					leaveRoom();
					break;
				}
			}
		}
		
		var sb = new PIXI.Sprite(pixel);
		sb.x = x;
		sb.y = y;
		sb.scale.x = w;
		sb.scale.y = h;
		sb.interactive = true;
		sb.buttonMode = true;
		sb.alpha = 0;
		sb.tint = playerData.color;
		sb.action = action;
		sb.spriteType = "kb";
		sb.on('pointerdown', function() {
			this.alpha = 0.4;
		});
		sb.on('pointerup', function() {
			this.alpha = 0;
			performSbAction(this.action);
		});
		sb.on('pointerupoutside', function() {
			this.alpha = 0;
		});
		app.stage.addChild(sb);
		return sb;
	}
	
	function getKey(keyIndex) {
		var keys = [];
		switch(kbMode) {
			case 0:
				keys = keys_NORMAL; break;
			case 1:
				keys = keys_SHIFT; break;
			case 2:
				keys = keys_CAPS; break;
		}
		return keys[keyIndex];
	}
  
  function addCharacter(keyIndex) {
    return addCharacterDirect(getKey(keyIndex));
  }
	
	function addCharacterDirect(key) {
		if(key == "BACKSPACE") {
			var txt = pc_sprites.textboxes[selectedTextbox].text;
			if(txt.length > 0) {
				pc_sprites.textboxes[selectedTextbox].text = txt.substring(0, txt.length - 1);
			} else {
				if(selectedTextbox > 4) {
					pc_sprites.textboxes.splice(selectedTextbox, 1);
				}
				if(selectedTextbox > 0) {
					selectedTextbox--;
				}
			}
		} else if(key == "SHIFT") {
			if(kbMode != 1) {
				pc_sprites.shift.alpha = 1;
				pc_sprites.caps.alpha = 0;
				kbMode = 1;
			} else {
				pc_sprites.shift.alpha = 0;
				pc_sprites.caps.alpha = 0;
				kbMode = 0;
			}
		} else if(key == "CAPS") {
			if(kbMode != 2) {
				pc_sprites.shift.alpha = 0;
				pc_sprites.caps.alpha = 1;
				kbMode = 2;
			} else {
				pc_sprites.shift.alpha = 0;
				pc_sprites.caps.alpha = 0;
				kbMode = 0;
			}
		} else if(key == "ENTER") {
			if(selectedTextbox < 4) {
				selectedTextbox++;
			} else if(selectedTextbox > 4 && pc_sprites.textboxes[selectedTextbox].y/SCALE + 16 < 278) {
				var tb = new PIXI.BitmapText("", ndsFont);
				tb.x = 27 * SCALE;
				tb.y = pc_sprites.textboxes[selectedTextbox].y + 16 * SCALE;
				tb.scale.x *= SCALE;
				tb.scale.y *= SCALE;
				pc_sprites.textboxes.push(tb);
				app.stage.addChild(pc_sprites.textboxes[pc_sprites.textboxes.length - 1]);
				selectedTextbox = pc_sprites.textboxes.length - 1;
			}
		} else {
			if(pc_sprites.textboxes[selectedTextbox] == null) {
				addInitialTextboxes();
				selectedTextbox = 0;
			}
			pc_sprites.textboxes[selectedTextbox].text += key;
			if(pc_sprites.textboxes[selectedTextbox].textWidth*SCALE > 225*SCALE - (pc_sprites.textboxes[selectedTextbox].x - 27*SCALE)) {
				var txt = pc_sprites.textboxes[selectedTextbox].text;
				pc_sprites.textboxes[selectedTextbox].text = txt.substring(0, txt.length - 1);
				if(selectedTextbox < 4) {
					selectedTextbox++;
					addCharacterDirect(key);
				} else if(selectedTextbox > 4 && pc_sprites.textboxes[selectedTextbox].y/SCALE + 16 < 278) {
					var tb = new PIXI.BitmapText(key, ndsFont);
					tb.x = 27 * SCALE;
					tb.y = pc_sprites.textboxes[selectedTextbox].y + 16 * SCALE;
					tb.scale.x *= SCALE;
					tb.scale.y *= SCALE;
					pc_sprites.textboxes.push(tb);
					app.stage.addChild(pc_sprites.textboxes[pc_sprites.textboxes.length - 1]);
					selectedTextbox = pc_sprites.textboxes.length - 1;
				}
			}
		}
	}
	
	function clearStage() {
		for(var i = 0; i < pc_sprites.textboxes.length; i++)
			pc_sprites.textboxes[i].destroy();
		pc_sprites.textboxes = [];
		drawHistory = [{ x: 0, y: 0, type: 3 }];
		addInitialTextboxes();
		selectedTextbox = 0;
		redraw = true;
	}
	
	function isStageEmpty() {
		for(var i = 0; i < pc_sprites.textboxes.length; i++)
			if(pc_sprites.textboxes[i].text != "")
				return false;
		if(drawHistory.length > 1)
			return false;
		return true;
	}
	
	function isPrevStageEmpty() {
		for(var i = 0; i < prevTextboxes.length; i++)
			if(prevTextboxes[i].text != "")
				return false;
		if(prevDrawHistory.length > 1)
			return false;
		return true;
	}
	
	function addInitialTextboxes() {
		pc_sprites.textboxes = [];
		pc_sprites.textboxes[0] = new PIXI.BitmapText("", ndsFont);
		pc_sprites.textboxes[0].x = 113;
		pc_sprites.textboxes[0].y = 211;
		app.stage.addChild(pc_sprites.textboxes[0]);
		pc_sprites.textboxes[1] = new PIXI.BitmapText("", ndsFont);
		pc_sprites.textboxes[1].x = 27;
		pc_sprites.textboxes[1].y = 227;
		app.stage.addChild(pc_sprites.textboxes[1]);
		pc_sprites.textboxes[2] = new PIXI.BitmapText("", ndsFont);
		pc_sprites.textboxes[2].x = 27;
		pc_sprites.textboxes[2].y = 243;
		app.stage.addChild(pc_sprites.textboxes[2]);
		pc_sprites.textboxes[3] = new PIXI.BitmapText("", ndsFont);
		pc_sprites.textboxes[3].x = 27;
		pc_sprites.textboxes[3].y = 259;
		app.stage.addChild(pc_sprites.textboxes[3]);
		pc_sprites.textboxes[4] = new PIXI.BitmapText("", ndsFont);
		pc_sprites.textboxes[4].x = 27;
		pc_sprites.textboxes[4].y = 275;
		app.stage.addChild(pc_sprites.textboxes[4]);
		scaleStage();
	}
	
	function recordHistory(message) {
		prevDrawHistory = message.drawing.slice();
		prevTextboxes = message.textboxes.slice();
	}
	
	function restoreHistory() {
		console.log("Restoring History...", prevDrawHistory, prevTextboxes);
		for(var i = 0; i < prevDrawHistory.length; i++) {
			var value = { x: prevDrawHistory[i].x + pc_sprites.box.x / SCALE, y: prevDrawHistory[i].y + pc_sprites.box.y / SCALE, type: prevDrawHistory[i].type };
			drawHistory.push(value);
		}
		for(var i = 0; i < prevTextboxes.length; i++) {
			var txt = prevTextboxes[i];
			var tb = new PIXI.BitmapText(txt.text, ndsFont);
			tb.x = txt.x * SCALE;
			tb.y = txt.y * SCALE;
			tb.scale.x *= SCALE;
			tb.scale.y *= SCALE;
			pc_sprites.textboxes.push(tb);
			app.stage.addChild(pc_sprites.textboxes[pc_sprites.textboxes.length - 1]);
		}
		selectedTextbox = 0;
		redraw = true;
	}
	
	function generateMessageBox(message) {
		var container = new PIXI.Container();
		var box = new PIXI.Sprite(resources["box_bg" + message.lines].texture);
		var box_lines = new PIXI.Sprite(resources["box_lines" + message.lines].texture);
		var box_outline = new PIXI.Sprite(resources["box_outline" + message.lines].texture);
		
		container.box = box;
		container.addChild(box);
		container.addChild(box_lines);
		container.addChild(box_outline);
		box_outline.tint = message.player.color;
		box_lines.tint = increase_brightness(message.player.color, 75);
		var height = (189 * SCALE - pc_sprites.scrollContainer.y) / SCALE + 4;
		container.x = 0;
		
		
		var ndsFont_msg = { font: '-16px NintendoDSBIOS', align: 'left', tint: message.player.color };
		var box_name = new PIXI.BitmapText(message.player.name, ndsFont_msg);
		box_name.x = 6;
		box_name.y = 4;
		container.addChild(box_name);
		
		var graphics = new PIXI.Graphics();
		graphics.drawMode = 0;
		for(var i = 0; i < message.drawing.length; i++) {
			var action = message.drawing[i];
			action.x -= pc_sprites.box.x/SCALE;
			action.y -= pc_sprites.box.y/SCALE;
			switch(action.type) {
				case 0: {
					graphics.lineTo(action.x, action.y);
					break;
				}
				case 1: {
					graphics.moveTo(action.x, action.y);
					break;
				}
				case 2: {
					graphics.moveTo(action.x, action.y);
					break;
				}
				case 3: {
					graphics.drawWidth = 2;
					break;
				}
				case 4: {
					graphics.drawWidth = 1;
					break;
				}
				case 5: {
					graphics.drawMode = 0;
					break;
				}
				case 6: {
					graphics.drawMode = 0xfbfbfb;
					break;
				}
			}
			graphics.lineStyle(graphics.drawWidth + ((graphics.drawMode > 0) * (graphics.drawWidth == 2)), graphics.drawMode);
		}
		
		container.addChild(graphics);
		
		for(var i = 0; i < message.textboxes.length; i++) {
			var txt = message.textboxes[i];
			var tb = new PIXI.BitmapText(txt.text, ndsFont);
			tb.x = txt.x - pc_sprites.box.x/SCALE;
			tb.y = txt.y - pc_sprites.box.y/SCALE;
			container.addChild(tb);
		}
		
		pc_sprites.scrollContainer.addChild(container);
		container.y = height;
		scrollPos = pc_sprites.scrollContainer.children.length - 1;
		scaleStage();
		return container;
	}
	
	function scrollMessages(amount) {
		scrolling = true;
		var finalScrollPos = pc_sprites.scrollContainer.y - amount * SCALE;
		var childrenLength = pc_sprites.scrollContainer.children.length - 1;
		var interval = setInterval(function() {
			if(scrolling) {
				pc_sprites.scrollContainer.y -= 4 * SCALE;
				if(pc_sprites.scrollContainer.y <= finalScrollPos) {
					clearInterval(interval);
					pc_sprites.scrollContainer.y = finalScrollPos;
					scrolling = false;
				}
				pc_sprites.scrollContainer.origy = pc_sprites.scrollContainer.y / SCALE;
			} else {
				clearInterval(interval);
				scrollPos = childrenLength;
				scrollTo(scrollPos, -1);
			}
		}, 1000/60);
	}
	
	function scrollTo(index, speed) {
		scrolling = false;
		var box = pc_sprites.scrollContainer.children[index];
		var targetY = (191 - box.y - box.height) * SCALE;
		if(speed > 0) {
			var direction = (targetY - pc_sprites.scrollContainer.y) > 0 ? 1 : -1;
			var interval = setInterval(function() {
				pc_sprites.scrollContainer.y += 4 * SCALE * direction * speed;
				if(direction == 1) {
					if(pc_sprites.scrollContainer.y >= targetY) {
						clearInterval(interval);
						pc_sprites.scrollContainer.y = targetY;
					}
				} else {
					if(pc_sprites.scrollContainer.y <= targetY) {
						clearInterval(interval);
						pc_sprites.scrollContainer.y = targetY;
					}
				}
				pc_sprites.scrollContainer.origy = pc_sprites.scrollContainer.y / SCALE;
			}, 1000/60);
		} else {
			pc_sprites.scrollContainer.y = targetY;
			pc_sprites.scrollContainer.origy = pc_sprites.scrollContainer.y / SCALE;
		}
	}

	// Tell the server to join a room and send data about the client too
	function joinRoom(roomId) {
    joinedRoom = true;
		// Bottom screen fade animation
		sounds.join_room.play();
		pc_sprites.roomBadge = PIXI.Sprite.from("images/letter_" + roomData.id + ".png");
		pc_sprites.roomBadge.x = 1;
		pc_sprites.roomBadge.y = 192;
		app.stage.addChildAt(pc_sprites.roomBadge, 2);
		scaleStage();
		var fadeBSInterval = setInterval(function() {
			for(var i = 0; i < pc_sprites.roomButtons.length; i++) {
				pc_sprites.roomButtons[i].interactive = false;
				pc_sprites.roomButtons[i].buttonMode = false;
				pc_sprites.roomButtons[i].alpha -= 0.15;
				pc_sprites.roomButtons[i].pcText.alpha -= 0.15;
			}
			pc_sprites.choose.alpha -= 0.15;
			if(pc_sprites.choose.alpha <= 0) {
				clearInterval(fadeBSInterval);
				var fadeDrawIn = setInterval(function() {
					pc_sprites.connection.y = lerp(-16, 1, pc_sprites.box.alpha) * SCALE;
					pc_sprites.roomBadge.y = lerp(192, 175, pc_sprites.box.alpha) * SCALE;
					pc_sprites.drawui.alpha += 0.2;
					pc_sprites.box.alpha += 0.2;
					pc_sprites.box_name.alpha += 0.2;
					pc_sprites.box_lines.alpha += 0.2;
					pc_sprites.drawWidthSelect.alpha += 0.1;
					pc_sprites.drawModeSelect.alpha += 0.1;
					if(pc_sprites.box.alpha >= 1) {
						clearInterval(fadeDrawIn);
						pc_sprites.connection.origy = 1;
						pc_sprites.connection.y = 1;
						pc_sprites.roomBadge.origy = 175;
						pc_sprites.roomBadge.y = 175;
						pc_sprites.box.alpha = 1;
						generateStageButtons();
					}
				}, 1000/30);
			}
		}, 1000/30);
		
		selectedTextbox = 0;
	}
	
	function leaveRoom() {
    joinedRoom = false;
		sounds.leave_room.play();
		clearStage();
		var fadeDrawIn = setInterval(function() {
			pc_sprites.connection.y = lerp(1, -16, (1-pc_sprites.box.alpha)) * SCALE;
			pc_sprites.roomBadge.y = lerp(175, 192, (1-pc_sprites.box.alpha)) * SCALE;
			pc_sprites.drawui.alpha -= 0.2;
			pc_sprites.box.alpha -= 0.2;
			pc_sprites.box_name.alpha -= 0.2;
			pc_sprites.box_lines.alpha -= 0.2;
			pc_sprites.drawWidthSelect.alpha -= 0.1;
			pc_sprites.drawModeSelect.alpha -= 0.1;
			if(pc_sprites.box.alpha <= 0) {
				clearInterval(fadeDrawIn);
				pc_sprites.connection.origy = -16 * SCALE;
				pc_sprites.connection.y = -16 * SCALE;
				pc_sprites.roomBadge.origy = 192 * SCALE;
				pc_sprites.roomBadge.y = 192 * SCALE;
				for(var i = 0; i < app.stage.children.length; i++) {
					var child = app.stage.children[i];
					if(child.spriteType == "kb") {
						// removeChild doesn't work and idk why so just move the
						// keys 100,000 units right and disable interaction lol
						//app.stage.removeChild(child);
						child.x += 100000;
						child.interactive = false;
						child.buttonMode = false;
					}
				}
				var fadeBSInterval = setInterval(function() {
					for(var i = 0; i < pc_sprites.roomButtons.length; i++) {
						pc_sprites.roomButtons[i].interactive = true;
						pc_sprites.roomButtons[i].buttonMode = true;
						pc_sprites.roomButtons[i].alpha += 0.15;
						pc_sprites.roomButtons[i].pcText.alpha += 0.15;
					}
					pc_sprites.choose.alpha += 0.15;
					if(pc_sprites.choose.alpha >= 1) {
						clearInterval(fadeBSInterval);
					}
				}, 1000/30);
			}
		}, 1000/30);
		
		inRoom = false;
	}

	function setupWebSocket() {
		function heartbeat() {
			websocket.send("pong");
			clearTimeout(websocket.pingTimeout);
			websocket.pingTimeout = setTimeout(() => {
				websocket.terminate();
			}, 11000);
		}
		
		websocket.onopen = function(event) {
			console.log("WebSocket connection established.", event);
			heartbeat();
		};

		websocket.onmessage = function(event) {
			if(event.data == "ping") {
				heartbeat();
			} else {
				var obj = JSON.parse(event.data);
				//console.log(obj);
				switch(obj.type) {
					case "sv_roomIds": {
						roomIds = obj.ids;
						generateRoomButtons(obj);
						scaleStage();
						break;
					}
					case "sv_roomData": {
						roomData = obj;
						joinRoom(obj.id); 
						break;
					}
					case "sv_error": {
						console.log(obj.message);
						break;
					}
					case "sv_playerJoined": {
						if(inRoom)
							sounds.player_join.play();
						scrollPos = pc_sprites.scrollContainer.children.length - 1;
						scrollTo(scrollPos, -1);
						var joinMsg = new PIXI.Sprite(resources["enter_" + roomData.id].texture);
						var height = (189 * SCALE - pc_sprites.scrollContainer.y) / SCALE + 4;
						joinMsg.y = height;
						joinMsg.textbox = new PIXI.BitmapText(obj.player.name, ndsFont_jl);
						joinMsg.textbox.x = 89;
						joinMsg.textbox.y = 4;
						joinMsg.addChild(joinMsg.textbox);
						pc_sprites.scrollContainer.addChild(joinMsg);
						scrollPos = pc_sprites.scrollContainer.children.length - 1;
						scaleStage();
						scrollMessages(joinMsg.height + 2);
						console.log("Player " + obj.player.name + " joined " + obj.id + ".");
						inRoom = true;
						break;
					}
					case "sv_playerLeft": {
						scrollPos = pc_sprites.scrollContainer.children.length - 1;
						scrollTo(scrollPos, -1);
						var leaveMsg = new PIXI.Sprite(resources["leave_" + roomData.id].texture);
						var height = (189 * SCALE - pc_sprites.scrollContainer.y) / SCALE + 4;
						leaveMsg.y = height;
						leaveMsg.textbox = new PIXI.BitmapText(obj.player.name, ndsFont_jl);
						leaveMsg.textbox.x = 82;
						leaveMsg.textbox.y = 4;
						leaveMsg.addChild(leaveMsg.textbox);
						pc_sprites.scrollContainer.addChild(leaveMsg);
						scrollPos = pc_sprites.scrollContainer.children.length - 1;
						scaleStage();
						scrollMessages(leaveMsg.height + 2);
						console.log("Player " + obj.player.name + " left " + obj.id + ".");
						sounds.player_leave.play();
						break;
					}
					case "sv_receivedMessage": {
						var message = obj.message;
						if(isMessageValid(message)) {
							console.log(message);
							scrollPos = pc_sprites.scrollContainer.children.length - 1;
							scrollTo(scrollPos, -1);
							var box = generateMessageBox(message).box;
							var height = box.height + 2;
							scrollMessages(height);
							sounds.receive.play();
						}
						break;
					}
					case "sv_leaveRoom": {
						scrollPos = pc_sprites.scrollContainer.children.length - 1;
						scrollTo(scrollPos, -1);
						var leaveMsg = new PIXI.Sprite(resources["leave_" + roomData.id].texture);
						var height = (189 * SCALE - pc_sprites.scrollContainer.y) / SCALE + 4;
						leaveMsg.y = height;
						leaveMsg.textbox = new PIXI.BitmapText(playerData.name, ndsFont_jl);
						leaveMsg.textbox.x = 82;
						leaveMsg.textbox.y = 4;
						leaveMsg.addChild(leaveMsg.textbox);
						pc_sprites.scrollContainer.addChild(leaveMsg);
						scrollPos = pc_sprites.scrollContainer.children.length - 1;
						scaleStage();
						scrollMessages(leaveMsg.height + 2);
						//leaveRoom();
						break;
					}
					case "sv_nameVerified": {
						playerData = obj.player;
						localStorage.setItem("username", playerData.name);
						var hex = playerData.color.toString(16);
						if(hex.length == 3){
							hex = hex.replace(/(.)/g, '$1$1');
						}
						hex = hex.padStart(6, '0');
						hex = '#' + hex;
						localStorage.setItem("color", hex);
						start();
						break;
					}
					case "sv_dbMessage": {
						var box = generateMessageBox(JSON.parse(obj.message));
						app.stage.addChild(box);
						scaleStage();
						break;
					}
					default: {
						
					}
				}
			}
		}
		
		websocket.onclose = function() {
			connectionClosed();
			clearTimeout(websocket.pingTimeout);
		}
	}
	
	function isMessageValid(message) {
		var passed = false;
		for(var i = 0; i < message.textboxes.length; i++) {
			if(/\S/.test(message.textboxes[i].text)) {
				passed = true;
			}
		}
		if(message.drawing.length > 1 || passed == true) {
			passed = true;
		}
		return passed;
	}
	
	function connectionClosed() {
		pc_sprites.connection.texture = resources["connection_bad"].texture;
		for(var i = 0; i < app.stage.children.length; i++) {
			app.stage.children[i].interactive = false;
			app.stage.children[i].buttonMode = false;
		}
		var interval = setInterval(function() {
			pc_sprites.connection_closed.y -= 6 * SCALE;
			if(pc_sprites.connection_closed.y <= 254 * SCALE) {
				clearInterval(interval);
				pc_sprites.connection_closed.y = 254 * SCALE;
			}
		}, 1000/60);
	}


	// Set up sprites
	pc_sprites.background = PIXI.Sprite.from("images/background.png");
	pc_sprites.bottom_screen = PIXI.Sprite.from("images/bottom_screen.png");
	pc_sprites.connection = PIXI.Sprite.from("images/connection.png");
	pc_sprites.choose = PIXI.Sprite.from("images/choose.png");
	pc_sprites.choose_mask = PIXI.Sprite.from("images/choose_mask.png");
	pc_sprites.drawui = PIXI.Sprite.from("images/drawui.png");
	pc_sprites.box = PIXI.Sprite.from("images/box_bg5.png");
	pc_sprites.shift = PIXI.Sprite.from("images/shift.png");
	pc_sprites.caps = PIXI.Sprite.from("images/caps.png");
	pc_sprites.box_lines = PIXI.Sprite.from("images/box_lines.png");
	pc_sprites.box_outline = PIXI.Sprite.from("images/box_outline5.png");
	pc_sprites.opening_message = new PIXI.Sprite(resources["opening_message"].texture);
	pc_sprites.connection_closed = PIXI.Sprite.from("images/connection_closed.png");


	pc_sprites.background.x = 0;
	pc_sprites.background.y = 0;
	app.stage.addChild(pc_sprites.background);
	pc_sprites.scrollContainer = new PIXI.Container();
	pc_sprites.scrollContainer.x = 21;
	pc_sprites.scrollContainer.y = 189;
	app.stage.addChild(pc_sprites.scrollContainer);
	pc_sprites.bottom_screen.x = 0;
	pc_sprites.bottom_screen.y = 192;
	app.stage.addChild(pc_sprites.bottom_screen);
	pc_sprites.connection_closed.x = 24;
	pc_sprites.connection_closed.y = 384;
	pc_sprites.connection_closed.zIndex = 1;
	app.stage.addChild(pc_sprites.connection_closed);
	pc_sprites.connection.x = 1;
	pc_sprites.connection.y = -16;
	app.stage.addChild(pc_sprites.connection);
	pc_sprites.choose.x = 0;
	pc_sprites.choose.y = 192;
	pc_sprites.choose.zIndex = 2;
	pc_sprites.choose_mask.zIndex = 2;
	pc_sprites.choose_mask.tint = playerData.color;
	pc_sprites.choose.addChild(pc_sprites.choose_mask);
	app.stage.addChild(pc_sprites.choose);
	pc_sprites.scrollContainer.addChild(pc_sprites.opening_message);
	scrollPos = pc_sprites.scrollContainer.children.length - 1;
	
	pc_sprites.drawui.x = 0;
	pc_sprites.drawui.y = 192;
	pc_sprites.drawui.alpha = 0;
	app.stage.addChild(pc_sprites.drawui);
	pc_sprites.shift.x = 0;
	pc_sprites.shift.y = 192;
	pc_sprites.shift.alpha = 0;
	app.stage.addChild(pc_sprites.shift);
	pc_sprites.caps.x = 0;
	pc_sprites.caps.y = 192;
	pc_sprites.caps.alpha = 0;
	app.stage.addChild(pc_sprites.caps);
	pc_sprites.box_outline.tint = playerData.color;
	pc_sprites.box_lines.tint = increase_brightness(playerData.color, 75);
	pc_sprites.box.x = 21;
	pc_sprites.box.y = 207;
	pc_sprites.box.alpha = 0;
	pc_sprites.box.interactive = true;
	pc_sprites.box.on("pointerdown", function(event) {
		inputFlag = true;
		
	});
	pc_sprites.box.on("pointerup", function() {
		if(this.alpha == 1) {
			isDrawing = false;
			var action = { x: 0, y: 0, type: 1 };
			drawHistory.push(action);
			redraw = true;
		}
		
	});
	pc_sprites.box.on("pointerupoutside", function() {
		if(this.alpha == 1) {
			isDrawing = false;
			var action = { x: 0, y: 0, type: 1 };
			drawHistory.push(action);
			redraw = true;
		}
	});
	pc_sprites.box_name = new PIXI.BitmapText(playerData.name, ndsFont_name);
	pc_sprites.box_name.x = 27;
	pc_sprites.box_name.y = 211;
	pc_sprites.box_name.alpha = 0;
	app.stage.addChild(pc_sprites.box);
	pc_sprites.drawing = new PIXI.Graphics();
	pc_sprites.box_lines.blendMode = PIXI.BLEND_MODES.MULTIPLY;
	pc_sprites.box_lines.x = pc_sprites.box.x;
	pc_sprites.box_lines.y = pc_sprites.box.y;
	pc_sprites.box_lines.alpha = 0;
	pc_sprites.box.addChild(pc_sprites.box_outline);
	app.stage.addChild(pc_sprites.drawing);
	app.stage.addChild(pc_sprites.box_lines);
	app.stage.addChild(pc_sprites.box_name);
	
	pc_sprites.drawWidthSelect = new PIXI.Sprite(pixel);
	pc_sprites.drawWidthSelect.x = 2;
	pc_sprites.drawWidthSelect.y = 263;
	pc_sprites.drawWidthSelect.scale.x = 14;
	pc_sprites.drawWidthSelect.scale.y = 14;
	pc_sprites.drawWidthSelect.tint = playerData.color;
	//pc_sprites.drawWidthSelect.blendMode = PIXI.BLEND_MODES.SCREEN;
	pc_sprites.drawWidthSelect.alpha = 0;
	app.stage.addChild(pc_sprites.drawWidthSelect);
	
	pc_sprites.drawModeSelect = new PIXI.Sprite(pixel);
	pc_sprites.drawModeSelect.x = 2;
	pc_sprites.drawModeSelect.y = 230;
	pc_sprites.drawModeSelect.scale.x = 14;
	pc_sprites.drawModeSelect.scale.y = 13;
	pc_sprites.drawModeSelect.tint = playerData.color;
	//pc_sprites.drawModeSelect.blendMode = PIXI.BLEND_MODES.SCREEN;
	pc_sprites.drawModeSelect.alpha = 0;
	app.stage.addChild(pc_sprites.drawModeSelect);
	
	addInitialTextboxes();
	
	app.stage.addChild(draggedTb);
	




	
	scaleStage();
	setupWebSocket();
	scrollMessages(pc_sprites.opening_message.height - 2);
	
	app.renderer.plugins.interaction.on('pointermove', function(event) {
		mousePos.x = event.data.global.x / SCALE;
		mousePos.y = event.data.global.y / SCALE;
	});
	app.renderer.plugins.interaction.on('pointerdown', function(event) {
		mousePos.x = event.data.global.x / SCALE;
		mousePos.y = event.data.global.y / SCALE;
		if(inputFlag) {
			if(pc_sprites.box.alpha == 1) {
				isDrawing = true;
				var action = { x: mousePos.x, y: mousePos.y, type: 2 };
				drawHistory.push(action);
				redraw = true;
				sounds.draw_down.play();
			}
			inputFlag = false;
		}
	});
	app.renderer.plugins.interaction.on('pointerup', function(event) {
		mousePos.x = event.data.global.x / SCALE;
		mousePos.y = event.data.global.y / SCALE;
	});
	
	function emptyQueue() {
		drawHistory = drawHistory.concat(drawQueue);
		drawQueue = [];
	}
	
	var drawSound;
	app.ticker.add((delta) => {
		if(isDrawing) {
			var lastAction = drawHistory[drawHistory.length - 1];
			if(mousePos.x > 22 && mousePos.x < 22+232 && mousePos.y > 208 && mousePos.y < 208+83
			&& !(mousePos.x <= 110 && mousePos.y <= 226)) {
				if(lastAction.type == 1) {
					var action = { x: mousePos.x, y: mousePos.y, type: 2 };
					drawHistory.push(action);
					lastAction = action;
					redraw = true;
				}
				
				var distanceBetween = Math.sqrt((lastAction.x - mousePos.x)*(lastAction.x - mousePos.x)+(lastAction.y - mousePos.y)*(lastAction.y - mousePos.y));
				sounds.draw.volume(distanceBetween / 2.0, drawSound);
				if(distanceBetween >= 2) {
					var action = { x: mousePos.x, y: mousePos.y, type: 0 };
					drawHistory.push(action);
					redraw = true;
					sounds.draw.stop(drawSound);
					drawSound = sounds.draw.play();
					sounds.draw.seek(Math.random() * 0.4, drawSound);
				}
			} else {
				if(lastAction.type != 1) {
					var action = { x: 0, y: 0, type: 1 };
					drawHistory.push(action);
					redraw = true;
				}
			}
		} else {
			sounds.draw.stop(drawSound);
		}
		
		draggedTb.x = (mousePos.x + dragOffset.x) * SCALE;
		draggedTb.y = (mousePos.y + dragOffset.y) * SCALE;
		
		if(redraw) drawDrawing();
	});

	function drawDrawing() {
		pc_sprites.drawing.clear();
		pc_sprites.drawing.drawMode = 0;
		for(var i = 0; i < drawHistory.length; i++) {
			var action = drawHistory[i];
			switch(action.type) {
				case 0: {
					pc_sprites.drawing.lineTo(action.x, action.y);
					break;
				}
				case 1: {
					pc_sprites.drawing.moveTo(action.x, action.y);
					break;
				}
				case 2: {
					pc_sprites.drawing.moveTo(action.x, action.y);
					break;
				}
				case 3: {
					pc_sprites.drawing.drawWidth = 2;
					break;
				}
				case 4: {
					pc_sprites.drawing.drawWidth = 1;
					break;
				}
				case 5: {
					pc_sprites.drawing.drawMode = 0;
					break;
				}
				case 6: {
					pc_sprites.drawing.drawMode = 0xfbfbfb;
					break;
				}
			}
			pc_sprites.drawing.lineStyle(pc_sprites.drawing.drawWidth + ((pc_sprites.drawing.drawMode > 0) * (pc_sprites.drawing.drawWidth == 2)), pc_sprites.drawing.drawMode);
		}
		redraw = false;
	}
});

function scaleStage() {
	// Scale stage by SCALE amount
	app.view.width = 256 * SCALE;
	app.view.height = 384 * SCALE;
	var stageChildren = app.stage.children;
	for(var i = 0; i < stageChildren.length; i++) {
		if(stageChildren[i].origx == null) {
			stageChildren[i].origx = stageChildren[i].x;
			stageChildren[i].origy = stageChildren[i].y;
			stageChildren[i].scale.origx = stageChildren[i].scale.x;
			stageChildren[i].scale.origy = stageChildren[i].scale.y;
		} else {
			stageChildren[i].x = stageChildren[i].origx;
			stageChildren[i].y = stageChildren[i].origy;
			stageChildren[i].scale.x = stageChildren[i].scale.origx;
			stageChildren[i].scale.y = stageChildren[i].scale.origy;
		}
		stageChildren[i].x *= SCALE;
		stageChildren[i].y *= SCALE;
		stageChildren[i].scale.x *= SCALE;
		stageChildren[i].scale.y *= SCALE;
	}
	
	document.getElementById("root").style.width = app.view.width;
	document.getElementById("root").style.height = app.view.height;
	document.getElementById("intro").style.width = app.view.width;
	document.getElementById("intro").style.height = app.view.height;
	document.getElementById("settings").style.width = app.view.width;
	document.getElementById("settings").style.height = app.view.height;
	document.getElementById("logo").style.marginTop = 50 * SCALE;
	document.getElementById("main-settings").style.transform = "scale(" + SCALE + ")";
	document.getElementById("settings-container").style.transform = "scale(" + SCALE + ")";
}

function scaleStageTo(scale) {
	SCALE = scale;
	scaleStage();
}

function updatePlayerData() {
	pc_sprites.box_name.text = playerData.name;
	pc_sprites.box_name.tint = playerData.color;
	pc_sprites.box_outline.tint = playerData.color;
	pc_sprites.box_lines.tint = increase_brightness(playerData.color, 75);
	pc_sprites.drawWidthSelect.tint = playerData.color;
	pc_sprites.drawModeSelect.tint = playerData.color;
	pc_sprites.choose_mask.tint = playerData.color;
	for(var i = 0; i < app.stage.children.length; i++) {
		if(app.stage.children[i].spriteType == "kb")
			app.stage.children[i].tint = playerData.color;
	}
}

function getMousePos() {
	const appMousePos = app.renderer.plugins.interaction.mouse.global;
	var mousePos = { x: appMousePos.x / SCALE, y: appMousePos.y / SCALE };
	mousePos.x = Math.floor(mousePos.x);
	mousePos.y = Math.floor(mousePos.y);
	return mousePos;
}

function constructMessageObject() {
	var lowestY = 0;
	var message = { player: playerData, drawing: [], textboxes: [], lines: 1 };
	for(var i = 0; i < drawHistory.length; i++) {
		if(drawHistory[i].x < 0) drawHistory[i].x = 0;
		if(drawHistory[i].y < 0) drawHistory[i].y = 0;
		if(drawHistory[i].y > lowestY)
			lowestY = drawHistory[i].y;
	}
	message.drawing = drawHistory;
	for(var i = 0; i < pc_sprites.textboxes.length; i++) {
		if(pc_sprites.textboxes[i].text != "") {
			var tbObj = {
				text: pc_sprites.textboxes[i].text,
				x: pc_sprites.textboxes[i].x / SCALE,
				y: pc_sprites.textboxes[i].y / SCALE
			};
			message.textboxes.push(tbObj);
			if((pc_sprites.textboxes[i].y / SCALE + 12) > lowestY) {
				lowestY = (pc_sprites.textboxes[i].y / SCALE + 12);
			}
		}
	}
	// console.log(lowestY);
	if(lowestY > 225)
		message.lines = 2;
	if(lowestY > 240)
		message.lines = 3;
	if(lowestY > 256)
		message.lines = 4;
	if(lowestY > 273)
		message.lines = 5;
	return message;
}

// https://stackoverflow.com/questions/6443990/javascript-calculate-brighter-colour
function increase_brightness(hex, percent) {
	hex = hex.toString(16);

	// convert 3 char codes --> 6, e.g. `E0F` --> `EE00FF`
	if(hex.length == 3){
		hex = hex.replace(/(.)/g, '$1$1');
	}
	hex = hex.padStart(6, '0');

	var r = parseInt(hex.substr(0, 2), 16),
		g = parseInt(hex.substr(2, 2), 16),
		b = parseInt(hex.substr(4, 2), 16);

	var hexString = '0x' +
	   ((0|(1<<8) + r + (256 - r) * percent / 100).toString(16)).substr(1) +
	   ((0|(1<<8) + g + (256 - g) * percent / 100).toString(16)).substr(1) +
	   ((0|(1<<8) + b + (256 - b) * percent / 100).toString(16)).substr(1);
	return parseInt(hexString);
}

function lerp(v0, v1, t) {
	return (1 - t) * v0 + t * v1;
}

function getDbMessage(index, username, password) {
	var obj = { type: 'cl_getDbMessage', index: index, username: username, password: password };
	websocket.send(JSON.stringify(obj));
}