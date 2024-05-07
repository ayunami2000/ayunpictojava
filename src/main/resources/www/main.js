const flipHueFilter = new PIXI.filters.ColorMatrixFilter();
flipHueFilter.hue(180);

if (darkMode) {
    const tmtptmtp = PIXI.Sprite.from;
    PIXI.Sprite.from = function (...a) {
        const xd = tmtptmtp(...a);
        xd.filters = [ flipHueFilter ];
        return xd;
    };
}

let PRESSURE = false;
let SCALE = 2.5;
const app = new PIXI.Application({width: 256 * SCALE, height: 384 * SCALE});
let websocket;
let playerData = {name: 'Pictochat', color: 0x289acb};
let roomData = {};

let isDrawing = false;
let drawHistory = [{x: 0, y: 0, type: 3}];
let pc_sprites = [];
let selectedTextbox = 0;
let prevDrawHistory = [];
let prevTextboxes = [];

let emitter = new PIXI.utils.EventEmitter();

let mousePos = {x: 0, y: 0};

let joinedRoom = false;
let gotFirstMsg = 0;

let topyElem = document.getElementById("topy");

let sounds = [];
sounds.start_app = new Howl({src: ['sounds/start_app.mp3']});
sounds.join_room = new Howl({src: ['sounds/join_room.mp3']});
sounds.leave_room = new Howl({src: ['sounds/leave_room.mp3']});
sounds.key_down = new Howl({src: ['sounds/key_down.mp3']});
sounds.key_up = new Howl({src: ['sounds/key_up.mp3']});
sounds.drop_letter = new Howl({src: ['sounds/drop_letter.mp3']});
sounds.send = new Howl({src: ['sounds/send.mp3']});
sounds.big_pen = new Howl({src: ['sounds/big_pen.mp3']});
sounds.clear = new Howl({src: ['sounds/clear.mp3']});
sounds.draw = new Howl({src: ['sounds/draw.mp3']});
sounds.draw_down = new Howl({src: ['sounds/draw_down.mp3']});
sounds.eraser = new Howl({src: ['sounds/eraser.mp3']});
sounds.error = new Howl({src: ['sounds/error.mp3']});
sounds.pen = new Howl({src: ['sounds/pen.mp3']});
sounds.player_join = new Howl({src: ['sounds/player_join.mp3']});
sounds.retrieve = new Howl({src: ['sounds/retrieve.mp3']});
sounds.scroll = new Howl({src: ['sounds/scroll.mp3']});
sounds.send = new Howl({src: ['sounds/send.mp3']});
sounds.small_pen = new Howl({src: ['sounds/small_pen.mp3']});
sounds.player_leave = new Howl({src: ['sounds/player_leave.mp3']});
sounds.receive = new Howl({src: ['sounds/receive.mp3']});

PIXI.settings.SCALE_MODE = PIXI.SCALE_MODES.NEAREST;

app.stage.sortableChildren = true;
let loaderFunc = function () {
};
(new FontFaceObserver('nds')).load().then(function () {
    PIXI.BitmapFont.from('NintendoDSBIOS', {
        fontSize: 10,
        lineHeight: 12,
        fontFamily: 'nds',
        fill: 0xFFFFFF,
    }, {
        scaleMode: PIXI.SCALE_MODES.NEAREST,
        mipmap: PIXI.MIPMAP_MODES.ON,
        chars: " 1234567890-=qwertyuiopasdfghjklzxcvbnm,./;’[]!@#$%^&*()_+QWERTYUIOPASDFGHJKLZXCVBNM<>?:~{}àáâäèéêëìíîïòóôöœùúûüçñßÀÁÂÄÈÉÊËÌÍÎÏÒÓÔÖŒÙÚÛÜÇÑ¡¿€¢£″'⁓~+×÷→←↑↓「」“”()<>{}•♨〒♭♪±\\°|／＼∞∴…™©®☸☹☺☻☼☁☂☃✉☎☄☰☱☲☳☴☵✜♠♦♥♣☶☷✫✲◇□△▽◎➔➕➖➗✬✱◆■▲▼✕あかさたなはまやらわいきしちにひみゆりをうくすつぬふむよるんえけせてねへめ！れ、おこそとのほも？ろ。－がざだばぎじぢびぐずづぶげぜでべごぞどぼぱぴぷぺぽぁゃゎぃゅぅっょぇぉアカサタナハマヤラワイキシチニヒミユリヲウクスツヌフムヨルンエケセテネヘメレオコソトノホモロガザダバギジヂビヴグズヅブゲゼデベゴゾドボパピプペポァヵャヮィュゥッョェヶォ",
        textureWidth: 2048,
        textureHeight: 2048,
        resolution: window.devicePixelRatio * SCALE
    });
    app.loader.load(loaderFunc);
}, function () {
    console.log('Font is not available');
});

for (let i = 1; i < 6; i++) {
    app.loader.add('box_bg' + i, 'images/box_bg' + i + '.png');
    app.loader.add('box_outline' + i, 'images/box_outline' + i + '.png');
    app.loader.add('box_lines' + i, 'images/box_lines' + i + '.png');
}
app.loader.add('opening_message', 'images/opening_message.png');
app.loader.add('enter_room_a', 'images/enter_room_a.png');
app.loader.add('enter_room_b', 'images/enter_room_b.png');
app.loader.add('enter_room_c', 'images/enter_room_c.png');
app.loader.add('enter_room_d', 'images/enter_room_d.png');
app.loader.add('enter_room_e', 'images/enter_room_e.png');
app.loader.add('leave_room_a', 'images/leave_room_a.png');
app.loader.add('leave_room_b', 'images/leave_room_b.png');
app.loader.add('leave_room_c', 'images/leave_room_c.png');
app.loader.add('leave_room_d', 'images/leave_room_d.png');
app.loader.add('leave_room_e', 'images/leave_room_e.png');
app.loader.add('connection_bad', 'images/connection_bad.png');
loaderFunc = (loader, resources) => {
    let wsUrl = "ws" + window.location.href.slice(4);
    if (window.location.hash) wsUrl = wsUrl.slice(0, wsUrl.indexOf(window.location.hash));
    if (window.location.search) wsUrl = wsUrl.slice(0, wsUrl.indexOf(window.location.search));
    websocket = new WebSocket(wsUrl);

    document.getElementById("root").appendChild(app.view);

    let ndsFont = {font: '10px NintendoDSBIOS', align: 'center', tint: 0};
    let ndsFont_name = {font: '10px NintendoDSBIOS', align: 'left', tint: darkIt(playerData.color)};
    let ndsFont_jl = {font: '10px NintendoDSBIOS', align: 'left', tint: 0xd3cbc3};
    const pixel = PIXI.Texture.from("images/pixel.png");
    let redraw = false;
    let draggedTb = new PIXI.BitmapText("", ndsFont);
    let dragOffset = {x: -10, y: -10};
    let kbMode = 0;
    let jpKbMode = 0;
    let scrolling = false;
    let scrollPos = 0;
    let inRoom = false;
    let inputFlag = false;
    const keys_NORMAL = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "-", "=", "q", "w", "e", "r", "t", "y", "u", "i", "o", "p", "BACKSPACE", "CAPS", "a", "s", "d", "f", "g", "h", "j", "k", "l", "ENTER", "SHIFT", "z", "x", "c", "v", "b", "n", "m", ",", ".", "/", ";", "\'", " ", "[", "]"];
    const keys_CAPS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "-", "=", "Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P", "BACKSPACE", "CAPS", "A", "S", "D", "F", "G", "H", "J", "K", "L", "ENTER", "SHIFT", "Z", "X", "C", "V", "B", "N", "M", ",", ".", "/", ";", "\'", " ", "[", "]"];
    const keys_SHIFT = ["!", "@", "#", "$", "%", "^", "&", "*", "(", ")", "_", "+", "Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P", "BACKSPACE", "CAPS", "A", "S", "D", "F", "G", "H", "J", "K", "L", "ENTER", "SHIFT", "Z", "X", "C", "V", "B", "N", "M", "<", ">", "?", ":", "~", " ", "{", "}"];
    const keys_ACCENTS = [" ", "ENTER", "BACKSPACE", "à", "ï", "ñ", "Í", "Ü", "á", "â", "ä", "è", "é", "ê", "ë", "ì", "í", "î", "ò", "ó", "ô", "ö", "œ", "ù", "ú", "û", "ü", "ç", "ß", "À", "Á", "Â", "Ä", "È", "É", "Ê", "Ë", "Ì", "Î", "Ï", "Ò", "Ó", "Ô", "Ö", "Œ", "Ù", "Ú", "Û", "Ç", "Ñ", "¡", "¿", "€", "¢", "£"];
    const keys_JAPANESE = [" ", "ENTER", "BACKSPACE", "", "", "", "", "", "あ", "か", "さ", "た", "な", "は", "ま", "や", "ら", "わ", "い", "き", "し", "ち", "に", "ひ", "み", "ゆ", "り", "を", "う", "く", "す", "つ", "ぬ", "ふ", "む", "よ", "る", "ん", "え", "け", "せ", "て", "ね", "へ", "め", "！", "れ", "、", "お", "こ", "そ", "と", "の", "ほ", "も", "？", "ろ", "。", "－"];
    const keys_JAPANESE2 = [" ", "ENTER", "BACKSPACE", "", "", "", "", "", "ア", "カ", "サ", "タ", "ナ", "ハ", "マ", "ヤ", "ラ", "ワ", "イ", "キ", "シ", "チ", "ニ", "ヒ", "ミ", "ユ", "リ", "ヲ", "ウ", "ク", "ス", "ツ", "ヌ", "フ", "ム", "ヨ", "ル", "ン", "エ", "ケ", "セ", "テ", "ネ", "ヘ", "メ", "！", "レ", "、", "オ", "コ", "ソ", "ト", "ノ", "ホ", "モ", "？", "ロ", "。", "－"];
    const keys_SYMBOLS = [" ", "ENTER", "BACKSPACE", "!", "+", "「", "%", "^", "?", "&", "″", "'", "⁓", ":", ";", "@", "~", "_", "-", "*", "/", "×", "÷", "=", "→", "←", "↑", "↓", "」", "“", "”", "(", ")", "<", ">", "{", "}", "•", "♨", "〒", "#", "♭", "♪", "±", "$", "¢", "£", "\\", "°", "|", "／", "＼", "∞", "∴", "…", "™", "©", "®"];
    const keys_EMOJIS = [" ", "ENTER", "BACKSPACE", "1", "☸", "☰", "☶", "➔", "2", "3", "4", "5", "6", "7", "8", "9", "0", "=", "☹", "☺", "☻", "☼", "☁", "☂", "☃", "✉", "☎", "☄", "☱", "☲", "☳", "☴", "☵", "✜", "♠", "♦", "♥", "♣", "☷", "+", "-", "✫", "✲", "◇", "□", "△", "▽", "◎", "➕", "➖", "➗", "✬", "✱", "◆", "■", "▲", "▼", "✕"];
    const jpModChars = ["がざだばぎじぢびぐずづぶげぜでべごぞどぼガザダバギジヂビヴグズヅブゲゼデベゴゾドボ".split(""), "ぱぴぷぺぽパピプペポ".split(""), "ぁゃゎぃゅぅっょぇぉァヵャヮィュゥッョェヶォ".split("")];

    topyElem.onkeydown = function () {
        if (joinedRoom) sounds.key_down.play();
    };

    window.onkeydown = function (e) {
        if (e.target !== topyElem) topyElem.onkeydown(e);
    };

    let sendBtn, renewBtn, bigPenBtn, smallPenBtn, penBtn, eraserBtn, scrollUpBtn, scrollDownBtn, clearBtn;

    let eraserPenMode = false,
        bigPenMode = true,
        rainbowPenMode = false;

    window.onwheel = function (e) {
        if (e.deltaY === 0) return;
        if (e.deltaY > 0) {
            if (doubleTapTimeout !== -1) {
                clearTimeout(doubleTapTimeout);
                doubleTapTimeout = -1;
            }
            scrollDownBtn.emit("pointerup");
        } else {
            scrollUpBtn.emit("pointerup");
        }
    };

    topyElem.onpaste = function (e) {
        if (!joinedRoom) return;
        e.preventDefault();
        let chars = (e.clipboardData || window.clipboardData).getData("text").split("");
        for (let i = 0; i < chars.length; i++) {
            if (chars[i] === "\n") {
                addCharacterDirect("ENTER");
            } else {
                addCharacterDirect(chars[i]);
            }
        }
    };

    window.onpaste = function (e) {
        if (e.target !== topyElem) topyElem.onpaste(e);
    };

    //Lets use KeyUp for graphical states
    let keyUpEv = function (e) {
        if (e.ctrlKey) return;
        if (!joinedRoom) return;
        const key = e.key.replace("Backspace", "BACKSPACE").replace("Enter", "ENTER");
        //If the keyboard is not emojis or jap crap
        if (kbMode < 3)
        {
            //If shift got lifted up, change the graphics
            if (key === "Shift")
            {
                pc_sprites.shift.alpha = 0;
                pc_sprites.caps.alpha = 0;
                kbMode = 0;
            }
            //Capslock is currently toggled on
            if (e.getModifierState && e.getModifierState('CapsLock'))
            {
                pc_sprites.shift.alpha = 0;
                pc_sprites.caps.alpha = 1;
                kbMode = 2;
            } else if(key === "CapsLock") //caplock lifted, and nowtoggled off
            {
                pc_sprites.shift.alpha = 0;
                pc_sprites.caps.alpha = 0;
                kbMode = 0;
            }
        }
    }

    //Keydown is far more reliable than keyup
    let keyDownEv = function (e) {
        if (e.ctrlKey) return;
        if (!joinedRoom) return;
        const key = e.key.replace("Backspace", "BACKSPACE").replace("Enter", "ENTER");
        if (key !== "Shift" && key !== "CapsLock" && (keys_NORMAL.includes(key) || keys_CAPS.includes(key) || keys_SHIFT.includes(key))) addCharacterDirect(key);
        //If shift is currently helt down, and the keyboard mode is the US character set
        if (key === "Shift")
        {
            //Update graphics to shift mode
            if (kbMode < 3) {
                pc_sprites.shift.alpha = 1;
                pc_sprites.caps.alpha = 0;
                kbMode = 1;
            }
        }
        //Enter now sends messages, unless shift is held then its a new line like most chat apps
        if (key === "ENTER")
        {
            if (!e.shiftKey)
            {
                sendBtn.emit("pointerup");
            }

        }else if (key === "ArrowUp") {
            sendBtn.emit("pointerup");
        } else if (key === "ArrowDown") {
            renewBtn.emit("pointerup");
        } else if (key === "ArrowLeft") {
            if (bigPenMode) {
                smallPenBtn.emit("pointerup");
            } else {
                bigPenBtn.emit("pointerup");
            }
        } else if (key === "ArrowRight") {
            if (eraserPenMode || !rainbowPenMode) {
                penBtn.emit("pointerup");
            } else {
                eraserBtn.emit("pointerup");
            }
        } else if (key === "Alt") {
            e.preventDefault();
            if (kbMode < 3) {
                kbMode = 3;
            } else if (kbMode === 4 && jpKbMode === 0) {
                jpKbMode = 1;
            } else {
                kbMode = (kbMode + 1) % 7;
            }
            pc_sprites.keyboardSelect.origy = 299 + 17 * Math.max(0, kbMode - 2);
            pc_sprites.keyboardSelect.y = pc_sprites.keyboardSelect.origy * SCALE;
            updKb();
        } else if (key === "PageUp") {
            scrollUpBtn.emit("pointerup");
        } else if (key === "PageDown") {
            if (doubleTapTimeout !== -1) {
                clearTimeout(doubleTapTimeout);
                doubleTapTimeout = -1;
            }
            scrollDownBtn.emit("pointerup");
        } else if (key === "End") {
            scrollDownBtn.emit("pointerup");
            scrollDownBtn.emit("pointerup");
        } else if (key === "Delete") {
            clearBtn.emit("pointerup");
        } else {
            sounds.key_up.play();
        }
    };

    if (/apple/i.test(navigator.vendor)) {
        topyElem.onkeyup = keyUpEv;
    } else {
        topyElem.onbeforeinput = function (e) {
            if (!joinedRoom) return;
            if (e.inputType === "deleteContentBackward") return addCharacterDirect("BACKSPACE");
            if (e.inputType === "insertLineBreak") return addCharacterDirect("ENTER");
            if (!e.data) return;
            let chars = e.data.split("");
            for (let i = 0; i < chars.length; i++) {
                if (chars[i] === "\n") {
                    addCharacterDirect("ENTER");
                } else {
                    addCharacterDirect(chars[i]);
                }
            }
        };
    }
    window.onkeydown = function (e) {
        if (e.target !== topyElem) keyDownEv(e);
    };
    window.onkeyup = function (e) {
        if (e.target !== topyElem) keyUpEv(e);
    };

    let roomDir = -1;

    function generateRoomButtons(obj) {
        if (pc_sprites.roomButtons) {
            for (let i = 0; i < pc_sprites.roomButtons.length; i++) {
                if (obj.count.length > i) {
                    pc_sprites.roomButtons[i].pcText.text = obj.count[i] + "/16";
                }
            }
            return;
        }
        pc_sprites.roomButtons = [];
        let urlArray = ["images/room_a.png", "images/room_b.png", "images/room_c.png", "images/room_d.png", "images/room_e.png"];
        for (let i = 0; i < obj.ids.length; i++) {
            let roomButton = PIXI.Sprite.from(urlArray[i % urlArray.length]);
            roomButton.x = 31;
            roomButton.y = 224 + i * 32;
            roomButton.interactive = i < 4;
            roomButton.buttonMode = true;
            roomButton.roomId = obj.ids[i];
            roomButton.on('pointerdown', function () {
                const filter = new PIXI.filters.ColorMatrixFilter();
                filter.brightness(0.5);
                this.filters = [filter];
                this.blendMode = PIXI.BLEND_MODES.NORMAL;
            });
            roomButton.on('pointerup', function () {
                this.filters = [new PIXI.filters.ColorMatrixFilter()];
                this.blendMode = PIXI.BLEND_MODES.NORMAL;
                const f = this.roomId === "room_e" && window.location.hash && window.location.hash.length === 7;
                let obj = {type: 'cl_joinRoom', player: playerData, id: f ? window.location.hash.slice(1) : this.roomId};
                websocket.send(JSON.stringify(obj));
                if (f) {
                    gotFirstMsg = 2;
                }
            });
            roomButton.on('pointerupoutside', function () {
                this.filters = [new PIXI.filters.ColorMatrixFilter()];
                this.blendMode = PIXI.BLEND_MODES.NORMAL;
            });

            if (obj.count.length > i) {
                roomButton.pcText = new PIXI.BitmapText("" + obj.count[i] + "/16", ndsFont);
                roomButton.pcText.x = 161;
                roomButton.pcText.y = 234 + i * 32;
            }

            pc_sprites.roomButtons.push(roomButton);
            app.stage.addChild(pc_sprites.roomButtons[i]);
            if (obj.count.length > i) app.stage.addChild(pc_sprites.roomButtons[i].pcText);
        }

        let roomScroll = PIXI.Sprite.from("images/scroll.png");
        roomScroll.x = 240;
        roomScroll.y = 351;
        roomScroll.interactive = true;
        roomScroll.buttonMode = true;
        roomScroll.anchor.y = 0.5;
        roomScroll.on('pointerdown', function () {
            sounds.scroll.play();
            pc_sprites.roomScroll.interactive = false;
            pc_sprites.roomScroll.buttonMode = false;
            let o = 0;
            let int = setInterval(function () {
                if (o > 8) return;
                for (let i = 0; i < pc_sprites.roomButtons.length; i++) {
                    pc_sprites.roomButtons[i].y += 4 * SCALE * roomDir;
                    if (pc_sprites.roomButtons[i].pcText != null) pc_sprites.roomButtons[i].pcText.y += 4 * SCALE * roomDir;
                }
                if (++o >= 8 * (pc_sprites.roomButtons.length - 4)) {
                    clearInterval(int);
                    roomDir = -roomDir;
                    pc_sprites.roomScroll.scale.y = -roomDir * SCALE;
                    pc_sprites.roomScroll.interactive = true;
                    pc_sprites.roomScroll.buttonMode = true;
                    for (let i = 0; i < pc_sprites.roomButtons.length; i++) {
                        pc_sprites.roomButtons[i].interactive = pc_sprites.roomButtons[i].buttonMode = roomDir > 0 ? (i >= pc_sprites.roomButtons.length - 4) : (i < 4);
                    }
                }
            }, 1000 / 60);
        });
        pc_sprites.roomScroll = roomScroll;
        app.stage.addChild(pc_sprites.roomScroll);
    }

    function generateStageButtons() {
        pc_sprites.kb_normal = [];

        let keyIndex = 0;

        // 1-=
        for (let i = 0; i < 12; i++) {
            pc_sprites.kb_normal.push(createKbButton(26 + 16 * i, 297, 15, 14, keyIndex));
            keyIndex++;
        }
        // q-p
        for (let i = 0; i < 10; i++) {
            pc_sprites.kb_normal.push(createKbButton(35 + 16 * i, 312, 15, 15, keyIndex));
            keyIndex++;
        }
        // BACKSPACE
        pc_sprites.kb_normal.push(createKbButton(195, 312, 25, 15, keyIndex));
        keyIndex++;
        // CAPS-l
        for (let i = 0; i < 10; i++) {
            pc_sprites.kb_normal.push(createKbButton(26 + 16 * i, 328, 15, 15, keyIndex));
            keyIndex++;
        }
        // ENTER
        pc_sprites.kb_normal.push(createKbButton(186, 328, 34, 15, keyIndex));
        keyIndex++;
        // SHIFT
        pc_sprites.kb_normal.push(createKbButton(24, 344, 25, 15, keyIndex));
        keyIndex++;
        // z-/
        for (let i = 0; i < 10; i++) {
            pc_sprites.kb_normal.push(createKbButton(50 + 16 * i, 344, 15, 15, keyIndex));
            keyIndex++;
        }
        // ;
        pc_sprites.kb_normal.push(createKbButton(58, 360, 15, 14, keyIndex));
        keyIndex++;
        // '
        pc_sprites.kb_normal.push(createKbButton(74, 360, 15, 14, keyIndex));
        keyIndex++;
        // SPACE
        pc_sprites.kb_normal.push(createKbButton(90, 360, 79, 14, keyIndex));
        keyIndex++;
        // [
        pc_sprites.kb_normal.push(createKbButton(170, 360, 15, 14, keyIndex));
        keyIndex++;
        // ]
        pc_sprites.kb_normal.push(createKbButton(186, 360, 15, 14, keyIndex));
        keyIndex++;

        pc_sprites.kb_abnormal = [];
        pc_sprites.kb_abnormal_lastThree = [];

        keyIndex = 0;

        // space
        pc_sprites.kb_abnormal.push(createKbButton(202, 360, 18, 15, keyIndex));
        keyIndex++;
        // enter
        pc_sprites.kb_abnormal.push(createKbButton(202, 328, 18, 31, keyIndex));
        keyIndex++;
        // backspace
        pc_sprites.kb_abnormal.push(createKbButton(202, 312, 18, 15, keyIndex));
        keyIndex++;

        // left side
        for (let i = 0; i < 5; i++) {
            pc_sprites.kb_abnormal.push(createKbButton(24, 296 + 16 * i, 17, 15, keyIndex));
            keyIndex++;
        }

        // the rest
        for (let i = 0; i < 50; i++) {
            pc_sprites.kb_abnormal.push(createKbButton(42 + 16 * (i % 10), 296 + 16 * Math.floor(i / 10), 15, 15, keyIndex));
            keyIndex++;
            if (i > 46) pc_sprites.kb_abnormal_lastThree.push(pc_sprites.kb_abnormal[pc_sprites.kb_abnormal.length - 1]);
        }

        pc_sprites.kb_abnormal.push(createKbButton(202, 296, 18, 15, keyIndex));
        keyIndex++;
        pc_sprites.kb_abnormal_strayJapanese = pc_sprites.kb_abnormal[pc_sprites.kb_abnormal.length - 1];

        updKb();

        sendBtn = createStageButton(225, 296, 31, 30, "SEND");
        renewBtn = createStageButton(225, 327, 31, 23, "RENEW");
        clearBtn = createStageButton(225, 351, 31, 24, "CLEAR");

        bigPenBtn = createStageButton(2, 263, 14, 14, "BIG_PEN");
        smallPenBtn = createStageButton(2, 278, 14, 14, "SMALL_PEN");

        penBtn = createStageButton(2, 230, 14, 13, "PEN_MODE");
        eraserBtn = createStageButton(2, 244, 14, 13, "ERASER_MODE");

        scrollUpBtn = createStageButton(2, 194, 14, 14, "SCROLL_UP");
        scrollDownBtn = createStageButton(2, 209, 14, 14, "SCROLL_DOWN");

        createStageButton(245, 193, 10, 10, "EXIT");

        pc_sprites.kb_btn_normal = createStageButton(2, 299, 14, 14, "KB_NORMAL");
        pc_sprites.kb_btn_accents = createStageButton(2, 316, 14, 14, "KB_ACCENTS");
        pc_sprites.kb_btn_japanese = createStageButton(2, 333, 14, 14, "KB_JAPANESE");
        pc_sprites.kb_btn_symbols = createStageButton(2, 350, 14, 14, "KB_SYMBOLS");
        pc_sprites.kb_btn_emojis = createStageButton(2, 367, 14, 14, "KB_EMOJIS");

        scaleStage();
    }

    function updKb() {
        for (let i = 0; i < pc_sprites.kb_normal.length; i++) pc_sprites.kb_normal[i].interactive = pc_sprites.kb_normal[i].buttonMode = kbMode < 3;
        for (let i = 0; i < pc_sprites.kb_abnormal.length; i++) pc_sprites.kb_abnormal[i].interactive = pc_sprites.kb_abnormal[i].buttonMode = kbMode > 2;
        if (kbMode === 3) {
            for (let i = 0; i < pc_sprites.kb_abnormal_lastThree.length; i++) pc_sprites.kb_abnormal_lastThree[i].interactive = pc_sprites.kb_abnormal_lastThree[i].buttonMode = false;
        }
        if (kbMode !== 4) {
            pc_sprites.kb_abnormal_strayJapanese.interactive = pc_sprites.kb_abnormal_strayJapanese.buttonMode = false;
            jpKbMode = 0;
            pc_sprites.kb_abnormal[3].alpha = pc_sprites.kb_abnormal[4].alpha = 0;
        }
        pc_sprites.shift.alpha = pc_sprites.caps.alpha = pc_sprites.accents.alpha = pc_sprites.symbols.alpha = pc_sprites.japanese.alpha = pc_sprites.japanese2.alpha = pc_sprites.emojis.alpha = 0;
        switch (kbMode) {
            case 0:
                break;
            case 1:
                pc_sprites.shift.alpha = 1;
                break;
            case 2:
                pc_sprites.caps.alpha = 1;
                break;
            case 3:
                pc_sprites.accents.alpha = 1;
                break;
            case 4:
                if (jpKbMode === 0) {
                    pc_sprites.kb_abnormal[4].alpha = 0;
                    pc_sprites.kb_abnormal[3].alpha = 0.4;
                    pc_sprites.japanese.alpha = 1;
                } else if (jpKbMode === 1) {
                    pc_sprites.kb_abnormal[3].alpha = 0;
                    pc_sprites.kb_abnormal[4].alpha = 0.4;
                    pc_sprites.japanese2.alpha = 1;
                }
                break;
            case 5:
                pc_sprites.symbols.alpha = 1;
                break;
            case 6:
                pc_sprites.emojis.alpha = 1;
                break;
        }
    }

    function createKbButton(x, y, w, h, keyIndex) {
        let sb = new PIXI.Sprite(pixel);
        sb.x = x;
        sb.y = y;
        sb.scale.x = w;
        sb.scale.y = h;
        sb.interactive = true;
        sb.buttonMode = true;
        sb.keyIndex = keyIndex;
        sb.alpha = 0;
        sb.tint = darkIt(playerData.color);
        sb.draggingState = 0;
        sb.spriteType = "kb";
        sb.on('pointerdown', function () {
            this.draggingState = 1;
            this.alpha = 0.4;
            sounds.key_down.play();
        });
        sb.on('pointerup', function () {
            let resetAlpha = true;
            if (kbMode === 4 && this.keyIndex > 2 && this.keyIndex < 5) {
                jpKbMode = this.keyIndex - 3;
                updKb();
                resetAlpha = false;
                pc_sprites.kb_abnormal[4 - jpKbMode].alpha = 0;
            } else if (kbMode === 4 && this.keyIndex > 4 && this.keyIndex < 8) {
                let amt = this.keyIndex - 4;
                if (amt > 2) amt = -1;
                let lastChar = addCharacterDirect("BACKSPACE");
                if (lastChar.length > 0) {
                    if (jpModChars[this.keyIndex - 5].includes(lastChar)) {
                        addCharacterDirect(String.fromCharCode(lastChar.charCodeAt(0) - amt));
                    } else {
                        let nextChar = String.fromCharCode(lastChar.charCodeAt(0) + amt);
                        if (jpModChars[this.keyIndex - 5].includes(nextChar)) {
                            addCharacterDirect(nextChar);
                        } else {
                            addCharacterDirect(lastChar);
                        }
                    }
                }
            } else {
                addCharacter(this.keyIndex);
            }
            this.draggingState = 0;
            draggedTb.text = "";
            if (resetAlpha) this.alpha = 0;
            if (kbMode === 1 && this.keyIndex !== 34) {
                kbMode = 0;
                pc_sprites.shift.alpha = 0;
            }
            sounds.key_up.play();
        });
        sb.on('pointerupoutside', function () {
            if (this.draggingState === 2) {
                if (mousePos.x > 23 - dragOffset.x && mousePos.x < 21 + 245 + dragOffset.x && mousePos.y > 208 - dragOffset.y && mousePos.y < 208 + 70 - dragOffset.y
                    && !(mousePos.x <= 110 - dragOffset.x && mousePos.y <= 226 - dragOffset.y)) {
                    let txt = new PIXI.BitmapText(draggedTb.text, ndsFont);
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
        sb.on('pointermove', function () {
            let key = getKey(keyIndex);
            if (this.draggingState === 1 && key !== "BACKSPACE" && key !== "CAPS" && key !== "ENTER" && key !== "SHIFT" && (kbMode !== 4 || this.keyIndex < 3 || this.keyIndex > 7)) {
                this.draggingState = 2;
                draggedTb.text = key;
            }
        });
        app.stage.addChild(sb);
        return sb;
    }

    function constructMessageObject() {
        let lowestY = 0;
        let message = {player: playerData, drawing: [], textboxes: [], lines: 1};
        drawHistory = cleanupDrawing(drawHistory);
        for (let i = 0; i < drawHistory.length; i++) {
            if (drawHistory[i].x < 0) drawHistory[i].x = 0;
            if (drawHistory[i].y < 0) drawHistory[i].y = 0;
            if (drawHistory[i].y > lowestY)
                lowestY = drawHistory[i].y;
        }
        message.drawing = drawHistory;
        for (let i = 0; i < pc_sprites.textboxes.length; i++) {
            if (pc_sprites.textboxes[i].text !== "") {
                let tbObj = {
                    text: pc_sprites.textboxes[i].text,
                    x: pc_sprites.textboxes[i].x / SCALE,
                    y: pc_sprites.textboxes[i].y / SCALE
                };
                message.textboxes.push(tbObj);
                if ((pc_sprites.textboxes[i].y / SCALE + 12) > lowestY) {
                    lowestY = (pc_sprites.textboxes[i].y / SCALE + 12);
                }
            }
        }
        // console.log(lowestY);
        if (lowestY > 226)
            message.lines = 2;
        if (lowestY > 240)
            message.lines = 3;
        if (lowestY > 256)
            message.lines = 4;
        if (lowestY > 274)
            message.lines = 5;
        return message;
    }

    let dontAutoScroll = false;

    let doubleTapTimeout = -1;

    let rainbowTintInterval = -1;

    function createStageButton(x, y, w, h, action) {
        function performSbAction(act) {
            if (act === "ERASER_MODE" || act === "PEN_MODE") {
                if (rainbowTintInterval !== -1) {
                    clearInterval(rainbowTintInterval);
                    rainbowTintInterval = -1;
                }
                pc_sprites.drawModeSelect.tint = darkIt(playerData.color);
            }
            switch (act) {
                case "SEND": {
                    let message = constructMessageObject();
                    if (isMessageValid(message)) {
                        sounds.send.play();
                        recordHistory(message);
                        clearStage();
                        if (roomData.private) {
                            for (let i = 0; i < message.textboxes.length; i++) {
                                if (message.textboxes[i].text.trim().toLowerCase().startsWith("!join ")) {
                                    gotFirstMsg = 2;
                                    break;
                                }
                            }
                        }
                        let obj = {type: "cl_sendMessage", message: message};
                        websocket.send(JSON.stringify(obj));
                        let oldScrollPos = scrollPos;
                        scrollPos = pc_sprites.scrollContainer.children.length - 1;
                        scrollTo(scrollPos, -1);
                        let box = generateMessageBox(message).box;
                        let height = box.height + 2;
                        scrollMessages(height);
                        if (dontAutoScroll) {
                            scrollPos = oldScrollPos;
                            scrollTo(scrollPos, -1);
                        }
                    } else {
                        sounds.error.play();
                    }
                    break;
                }
                case "RENEW": {
                    if (isPrevStageEmpty()) {
                        sounds.error.play();
                    } else {
                        sounds.retrieve.play();
                    }
                    restoreHistory();
                    break;
                }
                case "CLEAR": {
                    if (isStageEmpty()) {
                        sounds.error.play();
                    } else {
                        sounds.clear.play();
                    }
                    clearStage();
                    break;
                }
                case "BIG_PEN": {
                    bigPenMode = true;
                    sounds.big_pen.play();
                    let action = {x: 0, y: 0, type: 3};
                    drawHistory.push(action);
                    pc_sprites.drawWidthSelect.y = 263 * SCALE;
                    pc_sprites.drawWidthSelect.origy = 263;
                    break;
                }
                case "SMALL_PEN": {
                    bigPenMode = false;
                    sounds.small_pen.play();
                    let action = {x: 0, y: 0, type: 4};
                    drawHistory.push(action);
                    pc_sprites.drawWidthSelect.y = 278 * SCALE;
                    pc_sprites.drawWidthSelect.origy = 278;
                    break;
                }
                case "PEN_MODE": {
                    if (!eraserPenMode) rainbowPenMode = !rainbowPenMode;
                    eraserPenMode = false;
                    sounds.pen.play();
                    let action = {x: 0, y: 0, type: rainbowPenMode ? 7 : 5};
                    drawHistory.push(action);
                    pc_sprites.drawModeSelect.y = 230 * SCALE;
                    pc_sprites.drawModeSelect.origy = 230;
                    if (rainbowPenMode) {
                        let deg = 0;
                        rainbowTintInterval = setInterval(function () {
                            deg = (deg + 3) % 360;
                            pc_sprites.drawModeSelect.tint = darkIt(hsl2rgb2dec(deg, 1, 0.5));
                        }, 100);
                    }
                    break;
                }
                case "ERASER_MODE": {
                    eraserPenMode = true;
                    rainbowPenMode = false;
                    sounds.eraser.play();
                    let action = {x: 0, y: 0, type: 6};
                    drawHistory.push(action);
                    pc_sprites.drawModeSelect.y = 244 * SCALE;
                    pc_sprites.drawModeSelect.origy = 244;
                    break;
                }
                case "SCROLL_UP": {
                    sounds.scroll.play();
                    scrollPos--;
                    if (scrollPos < 0) scrollPos = 0;
                    dontAutoScroll = scrollPos !== pc_sprites.scrollContainer.children.length - 1;
                    scrollTo(scrollPos, 1);
                    break;
                }
                case "SCROLL_DOWN": {
                    sounds.scroll.play();
                    if (doubleTapTimeout === -1) {
                        doubleTapTimeout = setTimeout(function() {
                            doubleTapTimeout = -1;
                        }, 200);
                        scrollPos++;
                        if (scrollPos > pc_sprites.scrollContainer.children.length - 1)
                            scrollPos = pc_sprites.scrollContainer.children.length - 1;
                    } else {
                        scrollPos = pc_sprites.scrollContainer.children.length - 1;
                    }
                    dontAutoScroll = scrollPos !== pc_sprites.scrollContainer.children.length - 1;
                    scrollTo(scrollPos, 1);
                    break;
                }
                case "EXIT": {
                    let obj = {type: "cl_leaveRoom"};
                    websocket.send(JSON.stringify(obj));
                    leaveRoom();
                    break;
                }
                case "KB_NORMAL": {
                    sounds.scroll.play();
                    kbMode = 0;
                    updKb();
                    pc_sprites.keyboardSelect.y = 299 * SCALE;
                    pc_sprites.keyboardSelect.origy = 299;
                    break;
                }
                case "KB_ACCENTS": {
                    sounds.scroll.play();
                    kbMode = 3;
                    updKb();
                    pc_sprites.keyboardSelect.y = 316 * SCALE;
                    pc_sprites.keyboardSelect.origy = 316;
                    break;
                }
                case "KB_JAPANESE": {
                    sounds.scroll.play();
                    kbMode = 4;
                    updKb();
                    pc_sprites.keyboardSelect.y = 333 * SCALE;
                    pc_sprites.keyboardSelect.origy = 333;
                    break;
                }
                case "KB_SYMBOLS": {
                    sounds.scroll.play();
                    kbMode = 5;
                    updKb();
                    pc_sprites.keyboardSelect.y = 350 * SCALE;
                    pc_sprites.keyboardSelect.origy = 350;
                    break;
                }
                case "KB_EMOJIS": {
                    sounds.scroll.play();
                    kbMode = 6;
                    updKb();
                    pc_sprites.keyboardSelect.y = 367 * SCALE;
                    pc_sprites.keyboardSelect.origy = 367;
                    break;
                }
            }
        }

        let sb = new PIXI.Sprite(pixel);
        sb.x = x;
        sb.y = y;
        sb.scale.x = w;
        sb.scale.y = h;
        sb.interactive = true;
        sb.buttonMode = true;
        sb.alpha = 0;
        sb.tint = darkIt(playerData.color);
        sb.action = action;
        sb.spriteType = "kb";
        sb.on('pointerdown', function () {
            this.alpha = 0.4;
        });
        sb.on('pointerup', function () {
            this.alpha = 0;
            performSbAction(this.action);
        });
        sb.on('pointerupoutside', function () {
            this.alpha = 0;
        });
        app.stage.addChild(sb);
        return sb;
    }

    function getKey(keyIndex) {
        let keys = [];
        switch (kbMode) {
            case 0:
                keys = keys_NORMAL;
                break;
            case 1:
                keys = keys_SHIFT;
                break;
            case 2:
                keys = keys_CAPS;
                break;
            case 3:
                keys = keys_ACCENTS;
                break;
            case 4:
                keys = jpKbMode === 0 ? keys_JAPANESE : keys_JAPANESE2;
                break;
            case 5:
                keys = keys_SYMBOLS;
                break;
            case 6:
                keys = keys_EMOJIS;
                break;
        }
        return keys[keyIndex];
    }

    function addCharacter(keyIndex) {
        return addCharacterDirect(getKey(keyIndex));
    }

    function addCharacterDirect(key) {
        if (key === "BACKSPACE") {
            let txt = pc_sprites.textboxes[selectedTextbox].text;
            if (txt.length > 0) {
                pc_sprites.textboxes[selectedTextbox].text = txt.substring(0, txt.length - 1);
                return txt.slice(-1);
            } else {
                if (selectedTextbox > 4) {
                    pc_sprites.textboxes.splice(selectedTextbox, 1);
                }
                if (selectedTextbox > 0) {
                    selectedTextbox--;
                }
                return "";
            }
        } else if (key === "SHIFT") {
            if (kbMode < 3) {
                if (kbMode !== 1) {
                    pc_sprites.shift.alpha = 1;
                    pc_sprites.caps.alpha = 0;
                    kbMode = 1;
                } else {
                    pc_sprites.shift.alpha = 0;
                    pc_sprites.caps.alpha = 0;
                    kbMode = 0;
                }
            }
        } else if (key === "CAPS") {
            if (kbMode < 3) {
                if (kbMode !== 2) {
                    pc_sprites.shift.alpha = 0;
                    pc_sprites.caps.alpha = 1;
                    kbMode = 2;
                } else {
                    pc_sprites.shift.alpha = 0;
                    pc_sprites.caps.alpha = 0;
                    kbMode = 0;
                }
            }
        } else if (key === "ENTER") {
            if (selectedTextbox < 4) {
                selectedTextbox++;
            } else if (selectedTextbox > 4 && pc_sprites.textboxes[selectedTextbox].y / SCALE + 16 < 278) {
                let tb = new PIXI.BitmapText("", ndsFont);
                tb.x = 27 * SCALE;
                tb.y = pc_sprites.textboxes[selectedTextbox].y + 16 * SCALE;
                tb.scale.x *= SCALE;
                tb.scale.y *= SCALE;
                pc_sprites.textboxes.push(tb);
                app.stage.addChild(pc_sprites.textboxes[pc_sprites.textboxes.length - 1]);
                selectedTextbox = pc_sprites.textboxes.length - 1;
            }
        } else {
            if (pc_sprites.textboxes[selectedTextbox] == null) {
                addInitialTextboxes();
                selectedTextbox = 0;
            }
            pc_sprites.textboxes[selectedTextbox].text += key;
            if (pc_sprites.textboxes[selectedTextbox].textWidth * SCALE > 225 * SCALE - (pc_sprites.textboxes[selectedTextbox].x - 27 * SCALE)) {
                let txt = pc_sprites.textboxes[selectedTextbox].text;
                pc_sprites.textboxes[selectedTextbox].text = txt.substring(0, txt.length - 1);
                if (selectedTextbox < 4) {
                    selectedTextbox++;
                    addCharacterDirect(key);
                } else if (selectedTextbox > 4 && pc_sprites.textboxes[selectedTextbox].y / SCALE + 16 < 278) {
                    let tb = new PIXI.BitmapText(key, ndsFont);
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
        for (let i = 0; i < pc_sprites.textboxes.length; i++)
            pc_sprites.textboxes[i].destroy();
        pc_sprites.textboxes = [];
        drawHistory = [{x: 0, y: 0, type: bigPenMode ? 3 : 4}];
        if (eraserPenMode) {
            drawHistory.push({x: 0, y: 0, type: 6});
        } else if (rainbowPenMode) {
            drawHistory.push({x: 0, y: 0, type: 7});
        }
        addInitialTextboxes();
        selectedTextbox = 0;
        redraw = true;
    }

    function cleanupDrawing(drawing) {
        let fard = '';
        for (let i = 0; i < drawing.length; i++) {
            fard += drawing[i].type;
        }
        fard = fard.replace(/([34]+)([34])|([567]+)([567])/g, (_, a, b, c, d) => '_'.repeat((a ? a : c).length) + (b ? b : d));
        let prev = 5;
        let prev2 = null;
        return drawing.filter((v, i) => {
            if (fard[i] === '_') return false;
            if (v.type === prev || v.type === prev2) return false;
            if (v.type === 3 || v.type === 4) {
                prev2 = v.type;
            } else if (v.type === 5 || v.type === 6 || v.type === 7) {
                prev = v.type;
            }
            return true;
        });
    }

    function isStageEmpty() {
        for (let i = 0; i < pc_sprites.textboxes.length; i++)
            if (pc_sprites.textboxes[i].text !== "")
                return false;
        drawHistory = cleanupDrawing(drawHistory);
        if (drawHistory.length === 2 && (drawHistory[1].type === 6 || drawHistory[1].type === 7)) return true;
        return drawHistory.length <= 1;
    }

    function isPrevStageEmpty() {
        if (!prevDrawHistory[scrollPos] || !prevTextboxes[scrollPos]) return true;
        for (let i = 0; i < prevTextboxes[scrollPos].length; i++)
            if (prevTextboxes[scrollPos][i].text !== "")
                return false;
        prevDrawHistory[scrollPos] = cleanupDrawing(prevDrawHistory[scrollPos]);
        if (prevDrawHistory[scrollPos].length === 2 && (prevDrawHistory[scrollPos][1].type === 6 || prevDrawHistory[scrollPos][1].type === 7)) return true;
        return prevDrawHistory[scrollPos].length <= 1;
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
        prevDrawHistory.length = pc_sprites.scrollContainer.children.length + 1;
        prevTextboxes.length = pc_sprites.scrollContainer.children.length + 1;
        prevDrawHistory[pc_sprites.scrollContainer.children.length] = message.drawing.slice();
        prevTextboxes[pc_sprites.scrollContainer.children.length] = message.textboxes.slice();
    }

    function restoreHistory() {
        if (!prevDrawHistory[scrollPos] || !prevTextboxes[scrollPos]) return;
        console.log("Restoring History...", prevDrawHistory[scrollPos], prevTextboxes[scrollPos]);
        for (let i = 0; i < prevDrawHistory[scrollPos].length; i++) {
            let value = {
                x: prevDrawHistory[scrollPos][i].x + pc_sprites.box.x / SCALE,
                y: prevDrawHistory[scrollPos][i].y + pc_sprites.box.y / SCALE,
                type: prevDrawHistory[scrollPos][i].type
            };
            drawHistory.push(value);
        }
        for (let i = 0; i < prevTextboxes[scrollPos].length; i++) {
            let txt = prevTextboxes[scrollPos][i];
            let tb = new PIXI.BitmapText(txt.text, ndsFont);
            tb.x = txt.x;
            tb.y = txt.y;
            pc_sprites.textboxes.push(tb);
            app.stage.addChild(pc_sprites.textboxes[pc_sprites.textboxes.length - 1]);
        }
        selectedTextbox = 0;
        drawHistory.push({x: 0, y: 0, type: bigPenMode ? 3 : 4});
        if (eraserPenMode) {
            drawHistory.push({x: 0, y: 0, type: 6});
        } else if (rainbowPenMode) {
            drawHistory.push({x: 0, y: 0, type: 7});
        } else {
            drawHistory.push({x: 0, y: 0, type: 5});
        }
        drawHistory = cleanupDrawing(drawHistory);
        scaleStage();
        redraw = true;
    }

    function generateMessageBox(messageRaw) {
        let message = {};
        message.lines = isNaN(messageRaw.lines) ? 1 : Math.max(1, Math.min(5, messageRaw.lines));
        message.textboxes = Array.isArray(messageRaw.textboxes) ? messageRaw.textboxes : [];
        message.drawing = Array.isArray(messageRaw.drawing) ? messageRaw.drawing : [];
        message.player = messageRaw.player;

        let container = new PIXI.Container();
        let box = new PIXI.Sprite(resources["box_bg" + message.lines].texture);
        let box_lines = new PIXI.Sprite(resources["box_lines" + message.lines].texture);
        let box_outline = new PIXI.Sprite(resources["box_outline" + message.lines].texture);

        container.box = box;
        container.addChild(box);
        container.addChild(box_lines);
        container.addChild(box_outline);
        box_outline.tint = darkIt(message.player.color);
        box_lines.tint = darkIt(increase_brightness(message.player.color, 75));
        let height = (189 * SCALE - pc_sprites.scrollContainer.y) / SCALE + 4;
        container.x = 0;


        let ndsFont_msg = {font: '10px NintendoDSBIOS', align: 'left', tint: darkIt(message.player.color)};
        let box_name = new PIXI.BitmapText(message.player.name, ndsFont_msg);
        box_name.x = 6;
        box_name.y = 4;
        container.addChild(box_name);

        let graphics = new PIXI.Graphics();
        graphics.drawMode = 0;
        graphics.rainbowDeg = 0;
        message.drawing = cleanupDrawing(message.drawing);
        for (let i = 0; i < message.drawing.length; i++) {
            let action = message.drawing[i];
            if (action == null) continue;
            action.x = isNaN(action.x) ? 22 : Math.max(22, Math.min(254, action.x));
            action.y = isNaN(action.y) ? 208 : Math.max(208, Math.min(291, action.y));
            if (action.x <= 110 && action.y <= 226) {
                action.x = 110;
                action.y = 226;
            }
            action.type = isNaN(action.type) ? -1 : Math.max(0, Math.min(7, action.type));
            action.x -= pc_sprites.box.x / SCALE;
            action.y -= pc_sprites.box.y / SCALE;
            switch (action.type) {
                case -1: {
                    break;
                }
                case 0: {
                    if (graphics.drawMode === 0xffffff) graphics.rainbowDeg = (graphics.rainbowDeg + 12) % 360;
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
                case 7: {
                    graphics.drawMode = 0xffffff;
                    break;
                }
            }
            if (graphics.drawMode === 0xffffff) {
                graphics.lineStyle(graphics.drawWidth, darkIt(hsl2rgb2dec(graphics.rainbowDeg, 1, 0.5)));
            } else {
                graphics.lineStyle(graphics.drawWidth + ((graphics.drawMode > 0) * (graphics.drawWidth === 2)), graphics.drawMode);
            }
        }

        container.addChild(graphics);

        let ii = 0;

        for (let i = 0; i < message.textboxes.length; i++) {
            let txt = message.textboxes[i];
            if (txt == null) continue;
            txt.x = isNaN(txt.x) ? 13 : Math.max(13, Math.min(256, txt.x));
            txt.y = isNaN(txt.y) ? 198 : Math.max(204, Math.min(274, txt.y));
            if (txt.x <= 110 && txt.y <= 226) {
                txt.x = 110;
                txt.y = 226;
            }
            txt.text = "" + txt.text;
            if (txt.text.length > 255) txt.text = txt.text.slice(0, 255);
            let tb = new PIXI.BitmapText(txt.text, ndsFont);
            tb.x = txt.x - pc_sprites.box.x / SCALE;
            tb.y = txt.y - pc_sprites.box.y / SCALE;
            container.addChild(tb);
            if (++ii > 255) break;
        }

        pc_sprites.scrollContainer.addChild(container);
        container.y = height;
        let oldScrollPos = scrollPos;
        scrollPos = pc_sprites.scrollContainer.children.length - 1;
        scaleStage();
        if (dontAutoScroll) {
            scrollPos = oldScrollPos;
            scrollTo(scrollPos, -1);
        }
        return container;
    }

    function scrollMessages(amount) {
        if (interval !== -1) {
            clearInterval(interval);
            interval = -1;
        }
        scrolling = true;
        let finalScrollPos = pc_sprites.scrollContainer.y - amount * SCALE;
        let childrenLength = pc_sprites.scrollContainer.children.length - 1;
        interval = setInterval(function () {
            if (scrolling) {
                pc_sprites.scrollContainer.y -= 4 * SCALE;
                if (pc_sprites.scrollContainer.y <= finalScrollPos) {
                    clearInterval(interval);
                    interval = -1;
                    pc_sprites.scrollContainer.y = finalScrollPos;
                    scrolling = false;
                }
                pc_sprites.scrollContainer.origy = pc_sprites.scrollContainer.y / SCALE;
            } else {
                clearInterval(interval);
                interval = -1;
                let oldScrollPos = scrollPos;
                scrollPos = childrenLength;
                scrollTo(scrollPos, -1);
                if (dontAutoScroll) {
                    scrollPos = oldScrollPos;
                    scrollTo(scrollPos, -1);
                }
            }
        }, 1000 / 60);
    }

    let interval = -1;

    function scrollTo(index, speed) {
        scrolling = false;
        if (interval !== -1) {
            clearInterval(interval);
            interval = -1;
        }
        let box = pc_sprites.scrollContainer.children[index];
        let targetY = (191 - box.y - box.height) * SCALE;
        if (speed > 0) {
            let direction = (targetY - pc_sprites.scrollContainer.y) > 0 ? 1 : -1;
            interval = setInterval(function () {
                pc_sprites.scrollContainer.y += 4 * SCALE * direction * speed;
                if (direction === 1) {
                    if (pc_sprites.scrollContainer.y >= targetY) {
                        clearInterval(interval);
                        interval = -1;
                        pc_sprites.scrollContainer.y = targetY;
                    }
                } else {
                    if (pc_sprites.scrollContainer.y <= targetY) {
                        clearInterval(interval);
                        interval = -1;
                        pc_sprites.scrollContainer.y = targetY;
                    }
                }
                pc_sprites.scrollContainer.origy = pc_sprites.scrollContainer.y / SCALE;
            }, 1000 / 60);
        } else {
            pc_sprites.scrollContainer.y = targetY;
            pc_sprites.scrollContainer.origy = pc_sprites.scrollContainer.y / SCALE;
        }
    }

    // Tell the server to join a room and send data about the client too
    function joinRoom() {
        joinedRoom = true;
        gotFirstMsg = 0;
        // Bottom screen fade animation
        sounds.join_room.play();
        pc_sprites.roomBadge = PIXI.Sprite.from("images/letter_" + roomData.id + ".png");
        pc_sprites.roomBadge.x = 1;
        pc_sprites.roomBadge.y = 192;
        app.stage.addChildAt(pc_sprites.roomBadge, 2);
        scaleStage();
        roomDir = -1;
        pc_sprites.roomScroll.scale.y = -roomDir * SCALE;
        let fadeBSInterval = setInterval(function () {
            for (let i = 0; i < pc_sprites.roomButtons.length; i++) {
                pc_sprites.roomButtons[i].interactive = false;
                pc_sprites.roomButtons[i].buttonMode = false;
                pc_sprites.roomButtons[i].alpha -= 0.15;
                if (pc_sprites.roomButtons[i].pcText != null) pc_sprites.roomButtons[i].pcText.alpha -= 0.15;
            }
            pc_sprites.roomScroll.alpha -= 0.15;
            pc_sprites.roomScroll.interactive = false;
            pc_sprites.roomScroll.buttonMode = false;
            pc_sprites.choose.alpha -= 0.15;
            if (pc_sprites.choose.alpha <= 0) {
                clearInterval(fadeBSInterval);
                let fadeDrawIn = setInterval(function () {
                    pc_sprites.connection.y = lerp(-16, 1, pc_sprites.box.alpha) * SCALE;
                    pc_sprites.roomBadge.y = lerp(192, 175, pc_sprites.box.alpha) * SCALE;
                    pc_sprites.drawui.alpha += 0.2;
                    if (roomData.private) pc_sprites.copyprivate.alpha += 0.2;
                    pc_sprites.box.alpha += 0.2;
                    pc_sprites.box_name.alpha += 0.2;
                    pc_sprites.box_lines.alpha += 0.2;
                    pc_sprites.drawWidthSelect.alpha += 0.1;
                    pc_sprites.drawModeSelect.alpha += 0.1;
                    pc_sprites.keyboardSelect.alpha += 0.1;
                    if (pc_sprites.box.alpha >= 1) {
                        clearInterval(fadeDrawIn);
                        pc_sprites.connection.origy = 1;
                        pc_sprites.connection.y = 1;
                        pc_sprites.roomBadge.origy = 175;
                        pc_sprites.roomBadge.y = 175;
                        pc_sprites.box.alpha = 1;
                        generateStageButtons();
                        if (roomData.private) pc_sprites.copyprivate.interactive = pc_sprites.copyprivate.buttonMode = true;
                    }
                }, 1000 / 30);
            }
        }, 1000 / 30);

        selectedTextbox = 0;
    }

    function leaveRoom() {
        joinedRoom = false;
        sounds.leave_room.play();
        clearStage();
        if (pc_sprites.copyprivate.alpha > 0) pc_sprites.copyprivate.interactive = pc_sprites.copyprivate.buttonMode = false;
        kbMode = 0;
        updKb();
        let fadeDrawIn = setInterval(function () {
            pc_sprites.connection.y = lerp(1, -16, (1 - pc_sprites.box.alpha)) * SCALE;
            pc_sprites.roomBadge.y = lerp(175, 192, (1 - pc_sprites.box.alpha)) * SCALE;
            pc_sprites.drawui.alpha -= 0.2;
            if (pc_sprites.copyprivate.alpha > 0) pc_sprites.copyprivate.alpha -= 0.2;
            pc_sprites.box.alpha -= 0.2;
            pc_sprites.box_name.alpha -= 0.2;
            pc_sprites.box_lines.alpha -= 0.2;
            pc_sprites.drawWidthSelect.alpha -= 0.1;
            pc_sprites.drawModeSelect.alpha -= 0.1;
            pc_sprites.keyboardSelect.alpha -= 0.1;
            if (pc_sprites.box.alpha <= 0) {
                clearInterval(fadeDrawIn);
                pc_sprites.connection.origy = -16 * SCALE;
                pc_sprites.connection.y = -16 * SCALE;
                pc_sprites.roomBadge.origy = 192 * SCALE;
                pc_sprites.roomBadge.y = 192 * SCALE;
                for (let i = 0; i < app.stage.children.length; i++) {
                    let child = app.stage.children[i];
                    if (child.spriteType === "kb") {
                        // removeChild doesn't work and idk why so just move the
                        // keys 100,000 units right and disable interaction lol
                        //app.stage.removeChild(child);
                        child.x += 100000;
                        child.interactive = false;
                        child.buttonMode = false;
                    }
                }
                let fadeBSInterval = setInterval(function () {
                    for (let i = 0; i < pc_sprites.roomButtons.length; i++) {
                        if (i < 4) {
                            pc_sprites.roomButtons[i].interactive = true;
                            pc_sprites.roomButtons[i].buttonMode = true;
                        }
                        pc_sprites.roomButtons[i].alpha += 0.15;
                        if (pc_sprites.roomButtons[i].pcText != null) pc_sprites.roomButtons[i].pcText.alpha += 0.15;
                    }
                    pc_sprites.roomScroll.interactive = true;
                    pc_sprites.roomScroll.buttonMode = true;
                    pc_sprites.roomScroll.alpha += 0.15;
                    pc_sprites.choose.alpha += 0.15;
                    if (pc_sprites.choose.alpha >= 1) {
                        clearInterval(fadeBSInterval);
                    }
                }, 1000 / 30);
            }
        }, 1000 / 30);

        inRoom = false;
    }

    function setupWebSocket() {
        //Keeps the connection alive
        function heartbeat() {
            websocket.send("pong");
            //console.log("Pong sent");
        }

        websocket.onopen = function (event) {
            console.log("WebSocket connection established.", event);

            //Enable the button!
            var logo_element = document.getElementById('logo');
            logo_element.src = 'images/logo.png';
            logo_element.title = 'Click to join PictoChat Session!';
            logo_element.onclick = requestVerification;

            //heartbeat();
            websocket.send("handshake");
        };

        websocket.onmessage = function (event) {
            if (event.data === "ping") {
                //console.log("Ping received");
                heartbeat();
            } else {
                let oldScrollPos;
                let obj = JSON.parse(event.data);
                //console.log(obj);
                switch (obj.type) {
                    case "sv_roomIds": {
                        roomIds = obj.ids;
                        generateRoomButtons(obj);
                        scaleStage();
                        break;
                    }
                    case "sv_roomData": {
                        roomData = obj;
                        joinRoom();
                        break;
                    }
                    case "sv_error": {
                        console.log(obj.message);
                        break;
                    }
                    case "sv_playerJoined": {
                        if (inRoom)
                            sounds.player_join.play();
                        oldScrollPos = scrollPos;
                        scrollPos = pc_sprites.scrollContainer.children.length - 1;
                        scrollTo(scrollPos, -1);
                        let joinMsg = new PIXI.Sprite(resources["enter_" + roomData.id].texture);
                        joinMsg.y = (189 * SCALE - pc_sprites.scrollContainer.y) / SCALE + 4;
                        joinMsg.textbox = new PIXI.BitmapText(obj.player.name, ndsFont_jl);
                        joinMsg.textbox.x = 89;
                        joinMsg.textbox.y = 4;
                        joinMsg.addChild(joinMsg.textbox);
                        pc_sprites.scrollContainer.addChild(joinMsg);
                        scrollPos = pc_sprites.scrollContainer.children.length - 1;
                        scaleStage();
                        scrollMessages(joinMsg.height + 2);
                        if (dontAutoScroll) {
                            scrollPos = oldScrollPos;
                            scrollTo(scrollPos, -1);
                        }
                        console.log("Player " + obj.player.name + " joined " + obj.id + ".");
                        inRoom = true;
                        break;
                    }
                    case "sv_playerLeft": {
                        oldScrollPos = scrollPos;
                        scrollPos = pc_sprites.scrollContainer.children.length - 1;
                        scrollTo(scrollPos, -1);
                        let leaveMsg = new PIXI.Sprite(resources["leave_" + roomData.id].texture);
                        leaveMsg.y = (189 * SCALE - pc_sprites.scrollContainer.y) / SCALE + 4;
                        leaveMsg.textbox = new PIXI.BitmapText(obj.player.name, ndsFont_jl);
                        leaveMsg.textbox.x = 82;
                        leaveMsg.textbox.y = 4;
                        leaveMsg.addChild(leaveMsg.textbox);
                        pc_sprites.scrollContainer.addChild(leaveMsg);
                        scrollPos = pc_sprites.scrollContainer.children.length - 1;
                        scaleStage();
                        scrollMessages(leaveMsg.height + 2);
                        if (dontAutoScroll) {
                            scrollPos = oldScrollPos;
                            scrollTo(scrollPos, -1);
                        }
                        console.log("Player " + obj.player.name + " left " + obj.id + ".");
                        sounds.player_leave.play();
                        break;
                    }
                    case "sv_receivedMessage": {
                        let message = obj.message;
                        if (isMessageValid(message)) {
                            // console.log(message);
                            recordHistory(message);
                            if (roomData.private && (gotFirstMsg === 0 || (gotFirstMsg === 2 && (message.textboxes[0].text.startsWith("Joined room: ")))) && message.textboxes[0].text.length > 6) {
                                gotFirstMsg = 1;
                                const code = message.textboxes[0].text.slice(message.textboxes[0].text.length - 6);
                                window.location.hash = code;
                                pc_sprites.copyprivate.on("pointerup", function() {
                                    navigator.clipboard.writeText("http" + wsUrl.slice(2) + "#" + code).then(function() {
                                        sounds.retrieve.play();
                                    });
                                });
                            }
                            oldScrollPos = scrollPos;
                            scrollPos = pc_sprites.scrollContainer.children.length - 1;
                            scrollTo(scrollPos, -1);
                            let box = generateMessageBox(message).box;
                            let height = box.height + 2;
                            scrollMessages(height);
                            if (dontAutoScroll) {
                                scrollPos = oldScrollPos;
                                scrollTo(scrollPos, -1);
                            }
                            sounds.receive.play();
                        }
                        break;
                    }
                    case "sv_leaveRoom": {
                        oldScrollPos = scrollPos;
                        scrollPos = pc_sprites.scrollContainer.children.length - 1;
                        scrollTo(scrollPos, -1);
                        let leaveMsg = new PIXI.Sprite(resources["leave_" + roomData.id].texture);
                        leaveMsg.y = (189 * SCALE - pc_sprites.scrollContainer.y) / SCALE + 4;
                        leaveMsg.textbox = new PIXI.BitmapText(playerData.name, ndsFont_jl);
                        leaveMsg.textbox.x = 82;
                        leaveMsg.textbox.y = 4;
                        leaveMsg.addChild(leaveMsg.textbox);
                        pc_sprites.scrollContainer.addChild(leaveMsg);
                        scrollPos = pc_sprites.scrollContainer.children.length - 1;
                        scaleStage();
                        scrollMessages(leaveMsg.height + 2);
                        if (dontAutoScroll) {
                            scrollPos = oldScrollPos;
                            scrollTo(scrollPos, -1);
                        }
                        //leaveRoom();
                        break;
                    }
                    case "sv_nameVerified": {
                        playerData = obj.player;
                        localStorage.setItem("username", playerData.name);
                        let hex = playerData.color.toString(16);
                        if (hex.length === 3) {
                            hex = hex.replace(/(.)/g, '$1$1');
                        }
                        hex = hex.padStart(6, '0');
                        hex = '#' + hex;
                        localStorage.setItem("color", hex);
                        start();
                        break;
                    }
                    default: {

                    }
                }
            }
        }

        websocket.onclose = function () {
            connectionClosed();
        }
    }

    function isMessageValid(message) {
        let passed = false;
        for (let i = 0; i < message.textboxes.length; i++) {
            if (/\S/.test(message.textboxes[i].text)) {
                passed = true;
            }
        }
        if (message.drawing.length === 2 && (message.drawing[1].type === 6 || message.drawing[1].type === 7)) {
            return passed;
        }
        if (message.drawing.length > 1) {
            return true;
        }
        return passed;
    }

    function connectionClosed() {
        pc_sprites.connection.texture = resources["connection_bad"].texture;
        for (let i = 0; i < app.stage.children.length; i++) {
            app.stage.children[i].interactive = false;
            app.stage.children[i].buttonMode = false;
        }
        let interval = setInterval(function () {
            pc_sprites.connection_closed.y -= 6 * SCALE;
            if (pc_sprites.connection_closed.y <= 254 * SCALE) {
                clearInterval(interval);
                pc_sprites.connection_closed.y = 254 * SCALE;
            }
        }, 1000 / 60);
    }

    // Set up sprites
    pc_sprites.background = PIXI.Sprite.from("images/background.png");
    pc_sprites.bottom_screen = PIXI.Sprite.from("images/bottom_screen.png");
    pc_sprites.connection = PIXI.Sprite.from("images/connection.png");
    pc_sprites.choose = PIXI.Sprite.from("images/choose.png");
    pc_sprites.choose_mask = PIXI.Sprite.from("images/choose_mask.png");
    pc_sprites.drawui = PIXI.Sprite.from("images/drawui.png");
    pc_sprites.copyprivate = PIXI.Sprite.from("images/copy_link.png");
    pc_sprites.box = PIXI.Sprite.from("images/box_bg5.png");
    pc_sprites.shift = PIXI.Sprite.from("images/shift.png");
    pc_sprites.caps = PIXI.Sprite.from("images/caps.png");
    pc_sprites.accents = PIXI.Sprite.from("images/accents.png");
    pc_sprites.symbols = PIXI.Sprite.from("images/symbols.png");
    pc_sprites.japanese = PIXI.Sprite.from("images/japanese.png");
    pc_sprites.japanese2 = PIXI.Sprite.from("images/japanese2.png");
    pc_sprites.emojis = PIXI.Sprite.from("images/emojis.png");
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
    pc_sprites.choose_mask.tint = darkIt(playerData.color);
    pc_sprites.choose.addChild(pc_sprites.choose_mask);
    app.stage.addChild(pc_sprites.choose);
    pc_sprites.scrollContainer.addChild(pc_sprites.opening_message);
    scrollPos = pc_sprites.scrollContainer.children.length - 1;

    pc_sprites.drawui.x = 0;
    pc_sprites.drawui.y = 192;
    pc_sprites.drawui.alpha = 0;
    app.stage.addChild(pc_sprites.drawui);
    pc_sprites.copyprivate.x = 19;
    pc_sprites.copyprivate.y = 193;
    pc_sprites.copyprivate.alpha = 0;
    app.stage.addChild(pc_sprites.copyprivate);
    pc_sprites.shift.x = 0;
    pc_sprites.shift.y = 192;
    pc_sprites.shift.alpha = 0;
    app.stage.addChild(pc_sprites.shift);
    pc_sprites.caps.x = 0;
    pc_sprites.caps.y = 192;
    pc_sprites.caps.alpha = 0;
    app.stage.addChild(pc_sprites.caps);
    pc_sprites.accents.x = 0;
    pc_sprites.accents.y = 192;
    pc_sprites.accents.alpha = 0;
    app.stage.addChild(pc_sprites.accents);
    pc_sprites.symbols.x = 0;
    pc_sprites.symbols.y = 192;
    pc_sprites.symbols.alpha = 0;
    app.stage.addChild(pc_sprites.symbols);
    pc_sprites.japanese.x = 0;
    pc_sprites.japanese.y = 192;
    pc_sprites.japanese.alpha = 0;
    app.stage.addChild(pc_sprites.japanese);
    pc_sprites.japanese2.x = 0;
    pc_sprites.japanese2.y = 192;
    pc_sprites.japanese2.alpha = 0;
    app.stage.addChild(pc_sprites.japanese2);
    pc_sprites.emojis.x = 0;
    pc_sprites.emojis.y = 192;
    pc_sprites.emojis.alpha = 0;
    app.stage.addChild(pc_sprites.emojis);
    pc_sprites.box_outline.tint = darkIt(playerData.color);
    pc_sprites.box_lines.tint = darkIt(increase_brightness(playerData.color, 75));
    pc_sprites.box.x = 21;
    pc_sprites.box.y = 207;
    pc_sprites.box.alpha = 0;
    pc_sprites.box.interactive = true;
    pc_sprites.box.on("pointerdown", function () {
        inputFlag = true;

    });
    pc_sprites.box.on("pointerup", function () {
        if (this.alpha === 1) {
            isDrawing = false;
            let action = {x: 0, y: 0, type: 1};
            drawHistory.push(action);
            redraw = true;
        }

    });
    pc_sprites.box.on("pointerupoutside", function () {
        if (this.alpha === 1) {
            isDrawing = false;
            let action = {x: 0, y: 0, type: 1};
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
    pc_sprites.drawWidthSelect.tint = darkIt(playerData.color);
    //pc_sprites.drawWidthSelect.blendMode = PIXI.BLEND_MODES.SCREEN;
    pc_sprites.drawWidthSelect.alpha = 0;
    app.stage.addChild(pc_sprites.drawWidthSelect);

    pc_sprites.drawModeSelect = new PIXI.Sprite(pixel);
    pc_sprites.drawModeSelect.x = 2;
    pc_sprites.drawModeSelect.y = 230;
    pc_sprites.drawModeSelect.scale.x = 14;
    pc_sprites.drawModeSelect.scale.y = 13;
    pc_sprites.drawModeSelect.tint = darkIt(playerData.color);
    //pc_sprites.drawModeSelect.blendMode = PIXI.BLEND_MODES.SCREEN;
    pc_sprites.drawModeSelect.alpha = 0;
    app.stage.addChild(pc_sprites.drawModeSelect);

    pc_sprites.keyboardSelect = new PIXI.Sprite(pixel);
    pc_sprites.keyboardSelect.x = 2;
    pc_sprites.keyboardSelect.y = 299;
    pc_sprites.keyboardSelect.scale.x = 14;
    pc_sprites.keyboardSelect.scale.y = 14;
    pc_sprites.keyboardSelect.tint = darkIt(playerData.color);
    pc_sprites.keyboardSelect.alpha = 0;
    app.stage.addChild(pc_sprites.keyboardSelect);

    addInitialTextboxes();

    app.stage.addChild(draggedTb);


    scaleStage();
    setupWebSocket();
    scrollMessages(pc_sprites.opening_message.height - 2);

    function pressureSwitch(pressure) {
        if (!PRESSURE) return;
        if (!joinedRoom) return;
        if (pressure > 0.625) {
            if (!bigPenMode) {
                bigPenBtn.emit("pointerup");
            }
        } else {
            if (bigPenMode) {
                smallPenBtn.emit("pointerup");
            }
        }
    }

    app.renderer.plugins.interaction.on('pointermove', function (event) {
        pressureSwitch(event.pressure);
        mousePos.x = event.data.global.x / SCALE;
        mousePos.y = event.data.global.y / SCALE;
    });
    app.renderer.plugins.interaction.on('pointerdown', function (event) {
        pressureSwitch(event.pressure);
        mousePos.x = event.data.global.x / SCALE;
        mousePos.y = event.data.global.y / SCALE;
        if (inputFlag) {
            if (pc_sprites.box.alpha === 1) {
                isDrawing = true;
                let action = {x: mousePos.x, y: mousePos.y, type: 2};
                drawHistory.push(action);
                redraw = true;
                sounds.draw_down.play();
            }
            inputFlag = false;
        }
    });
    app.renderer.plugins.interaction.on('pointerup', function (event) {
        pressureSwitch(event.pressure);
        mousePos.x = event.data.global.x / SCALE;
        mousePos.y = event.data.global.y / SCALE;
    });

    let drawSound;
    app.ticker.add(() => {
        if (isDrawing) {
            let lastAction = drawHistory[drawHistory.length - 1];
            if (mousePos.x > 22 && mousePos.x < 22 + 232 && mousePos.y > 208 && mousePos.y < 208 + 83
                && !(mousePos.x <= 110 && mousePos.y <= 226)) {
                if (lastAction.type === 1) {
                    let action = {x: mousePos.x, y: mousePos.y, type: 2};
                    drawHistory.push(action);
                    lastAction = action;
                    redraw = true;
                }

                let distanceBetween = Math.sqrt((lastAction.x - mousePos.x) * (lastAction.x - mousePos.x) + (lastAction.y - mousePos.y) * (lastAction.y - mousePos.y));
                sounds.draw.volume(distanceBetween / 2.0, drawSound);
                if (distanceBetween >= 2) {
                    let action = {x: mousePos.x, y: mousePos.y, type: 0};
                    drawHistory.push(action);
                    redraw = true;
                    sounds.draw.stop(drawSound);
                    drawSound = sounds.draw.play();
                    sounds.draw.seek(Math.random() * 0.4, drawSound);
                }
            } else {
                if (lastAction.type !== 1) {
                    let action = {x: 0, y: 0, type: 1};
                    drawHistory.push(action);
                    redraw = true;
                }
            }
        } else {
            sounds.draw.stop(drawSound);
        }

        draggedTb.x = (mousePos.x + dragOffset.x) * SCALE;
        draggedTb.y = (mousePos.y + dragOffset.y) * SCALE;

        if (redraw) drawDrawing();
    });

    function drawDrawing() {
        pc_sprites.drawing.clear();
        pc_sprites.drawing.drawMode = 0;
        pc_sprites.drawing.rainbowDeg = 0;
        drawHistory = cleanupDrawing(drawHistory);
        for (let i = 0; i < drawHistory.length; i++) {
            let action = drawHistory[i];
            switch (action.type) {
                case 0: {
                    pc_sprites.drawing.lineTo(action.x, action.y);
                    if (pc_sprites.drawing.drawMode === 0xffffff) pc_sprites.drawing.rainbowDeg = (pc_sprites.drawing.rainbowDeg + 12) % 360;
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
                case 7: {
                    pc_sprites.drawing.drawMode = 0xffffff;
                    break;
                }
            }
            if (pc_sprites.drawing.drawMode === 0xffffff) {
                pc_sprites.drawing.lineStyle(pc_sprites.drawing.drawWidth, darkIt(hsl2rgb2dec(pc_sprites.drawing.rainbowDeg, 1, 0.5)));
            } else {
                pc_sprites.drawing.lineStyle(pc_sprites.drawing.drawWidth + ((pc_sprites.drawing.drawMode > 0) * (pc_sprites.drawing.drawWidth === 2)), pc_sprites.drawing.drawMode);
            }
        }
        redraw = false;
    }
};

function scaleStage() {
    // Scale stage by SCALE amount
    app.view.width = 256 * SCALE;
    app.view.height = 384 * SCALE;
    if (joinedRoom) {
        topyElem.style = "width: " + app.view.width + "; height: " + (app.view.height / 2) + ";";
    } else {
        topyElem.style = "display: none;";
    }
    let stageChildren = app.stage.children;
    for (let i = 0; i < stageChildren.length; i++) {
        if (stageChildren[i].origx == null) {
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
    document.getElementById("logo").style.marginTop = 50 * SCALE - 65;
    document.getElementById("captcha").style.marginTop = (50 - 57.5) * SCALE;
    document.getElementById("captcha").style.marginBottom = -50 * SCALE + 57.5;
    document.getElementById("main-settings").style.transform = "scale(" + SCALE + ")";
    document.getElementById("settings-container").style.transform = "scale(" + SCALE + ")";
}

function updatePlayerData() {
    pc_sprites.box_name.text = playerData.name;
    pc_sprites.box_name.tint = darkIt(playerData.color);
    pc_sprites.box_outline.tint = darkIt(playerData.color);
    pc_sprites.box_lines.tint = darkIt(increase_brightness(playerData.color, 75));
    pc_sprites.drawWidthSelect.tint = darkIt(playerData.color);
    pc_sprites.drawModeSelect.tint = darkIt(playerData.color);
    pc_sprites.keyboardSelect.tint = darkIt(playerData.color);
    pc_sprites.choose_mask.tint = darkIt(playerData.color);
    for (let i = 0; i < app.stage.children.length; i++) {
        if (app.stage.children[i].spriteType === "kb")
            app.stage.children[i].tint = darkIt(playerData.color);
    }
}

// https://stackoverflow.com/questions/6443990/javascript-calculate-brighter-colour
function increase_brightness(dec, percent) {
    let r = (dec >> 16) & 0xff,
        g = (dec >> 8) & 0xff,
        b = dec & 0xff;

    let f = n => Math.min(255, n + (255 - n) * percent / 100);
    return Math.floor((f(r) << 16) + (f(g) << 8) + f(b));
}

function lerp(v0, v1, t) {
    return (1 - t) * v0 + t * v1;
}

// https://stackoverflow.com/a/64090995/6917520
function hsl2rgb2dec(h, s, l) {
    let a = s * Math.min(l, 1 - l);
    let f = (n, k = (n + h / 30) % 12) => 255 * (l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1));
    return (f(0) << 16) + (f(8) << 8) + f(4);
}

function darkIt(dec) {
    if (darkMode) {
        const r = (dec >> 16) & 0xff,
            g = (dec >> 8) & 0xff,
            b = dec & 0xff;
        let f = n => 255 - n;
        dec = (f(r) << 16) + (f(g) << 8) + f(b);
    }
    return dec;
}
