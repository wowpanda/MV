window.Imported = Imported || {};
Imported.RS_MessageEffects = true;

window.RS = RS || {};
window.RS.MessageEffects = window.RS.MessageEffects || {};

var parameters = $plugins.filter(function (i) {
  return i.description.contains('<RS_MessageEffects>');
});

parameters = (parameters.length > 0) && parameters[0].parameters;

RS.MessageEffects.Params = {};

RS.MessageEffects.Params.defaultTextEffect = parameters["Default Text Effect"] || "none";
RS.MessageEffects.Params.currentEffect = RS.MessageEffects.Params.defaultTextEffect;
RS.MessageEffects.Params.clearFlag = Boolean(parameters["Clear Flag"] === "true");

RS.MessageEffects.DEG_TO_RAD  = (Math.PI / 180.0);

//================================================================
// TextEffect
//================================================================
class TextEffect extends Sprite {
    constructor(bitmap) {
        super(bitmap);
        this._isStarted = false;
        this._effectType = "pingpong";
    }

    update() {
        super.update();
        this.updateEffects();
    }

    flush() {
        this._isStarted = false;
        this.x = this._startX;
        this.y = this._startY;
        this.opacity = this._tempOpacity;
    }

    updateEffects() {
    }

    /**
     * @param {MV.TextState} textState
     */
    start(textState) {
        this._now = performance.now();
        this._isStarted = true;       
        this._power = 1;   
        this.x = textState.x;
        this.y = textState.y;
        this._startX = this.x;
        this._startY = this.y;
        this._random = Math.floor(Math.random() * 60);
        this._index = textState.index;
        this._tempOpacity = this.opacity;
    };
}

window.TextEffect = TextEffect;

//================================================================
// Added TextEffects
//================================================================    

class PingPong extends TextEffect {
    
    constructor(bitmap) {
        super(bitmap);
        this._effectType = "pingpong";
    }

    updateEffects() {
        if(!this._isStarted) return;            
        if(this._power <= 60) {
            this.y = this._startY + (PIXI.PI_2 / this._power) * 4.0;
            this._power++;
        } else {
            this.flush();
        }
    }
}    

class EffectFactory {
    static create(effectType) {
        
        let sprite;

        var keys = Object.keys(EffectFactory.TYPE);

        if(keys.contains(effectType)) {
            var ET_CLASS = EffectFactory.TYPE[effectType];
            sprite = new ET_CLASS();
        } else {
            sprite = new TextEffect();
        }

        return sprite;
        
        // switch(effectType) {
        //     case 'pingpong':
        //         sprite = new PingPong();
        //         break;
        //     case 'slide':
        //         sprite = new Slide();
        //         break;
        //     case 'high_rot':
        //         sprite = new HighRotation();
        //         break;
        //     case 'normal_rot':
        //         sprite = new NormalRotation();
        //         break;
        //     case 'random_rot':
        //         sprite = new RandomRotation();
        //         break;
        //     case 'star': // 별 마스크
        //         break;
        //     case 'nico_cloud': // 니코동 구름 메시지
        //         break;
        //     case 'circular': // 원형 확대
        //         break;
        //     case 'blood': // 피 흘리는 메시지
        //         break;
        //     case 'spoiler': // 스포일러 상태; 아이템을 보여해야만 오픈됨
        //         break;
        //     case 'shock': // 감전
        //         sprite = new Shock();
        //         break;
        //     case 'wave_electronic_board': // 사인파 전광판; 오른쪽에서 왼쪽으로 파동으로 파면서 이동함
        //         break;
        //     case 'pixelrate': // 글자가 표시된 후 이후 쪼개짐 (필터 효과)
        //         break;
        //     case 'lock_character': // 특정 문자가 모두 *로 대체됨
        //         break;        
        //     default:
        //         sprite = new TextEffect();
        //         break;                                
        // }
    }

    static add(values) {
        Object.assign( EffectFactory.TYPE, values );
    }

}

EffectFactory.TYPE = {
    'pingpong': PingPong,
};

window.EffectFactory = EffectFactory;

//================================================================
// Window_MessageImpl
//================================================================    
class Window_MessageImpl extends Window_Message {
    constructor() {
        super();

        this.createMainTextLayer();

        this.once("removed", () => {
            this.terminateMainTextLayer();
        });

    }

    clearFlags() {
        super.clearFlags();
        if(RS.MessageEffects.Params.clearFlag) {
            RS.MessageEffects.Params.currentEffect = 'none';
        }
    }

    /**
     * 
     * @param {MV.TextState} textState 
     */        
    newPage(textState) {
        super.newPage(textState);
        this._mainTextLayer.removeChildren();

        //=> this.createTextures(textState) -> this.setFrame(x, y, w, h);
    }

    _updateContents() {
        super._updateContents();

    }

    createMainTextLayer() {
        var w = this._width - this._padding * 2;
        var h = this._height - this._padding * 2;

        this._mainTextLayer = new Sprite();
        this._mainTextLayer.setFrame(this.origin.x, this.origin.y, w, h);
        this._mainTextLayer.on("effect", this.startTextEffect, this);
        this._windowContentsSprite.addChild(this._mainTextLayer);
    }

    terminateMainTextLayer() {
        this._windowContentsSprite.removeChild(this._mainTextLayer);
        this._mainTextLayer = null;
    }

    terminateMessage() {
        super.terminateMessage();

        if(this._mainTextLayer) {
            this._mainTextLayer.removeChildren();
        }
    }

    /**
     * @param {Array} args
     */
    startTextEffect(args) {

        /**
         * @type {TextEffect}
         */
        const bitmap = args[0];  
        const effectType = RS.MessageEffects.Params.currentEffect;
        const textState = args[1];

        if(!bitmap) return;                       

        let sprite = EffectFactory.create(effectType);

        sprite.bitmap = bitmap;
             
        this._mainTextLayer.addChild(sprite);       

        sprite.start(textState);

    }

    /**
     * 
     * @param {MV.TextState} textState 
     */
    addText(textState) {
        if(!this.contents) {
            this.createContents();
        }

        let c = textState.text[textState.index++];
        
        let w = this.textWidth(c);
        let h = textState.height;

        var bitmap = new Bitmap(w * 2, h);

        // FontFace를 먼저 설정해야 색깔이 정상적으로 변경됨
        bitmap.fontFace = this.standardFontFace();

        bitmap.fontSize = this.standardFontSize();
        bitmap.fontItalic = this.contents.fontItalic;
        bitmap.textColor = this.contents.textColor;
        bitmap.outlineColor = this.contents.outlineColor;
        bitmap.outlineWidth = this.contents.outlineWidth;

        if(this.contents.width < Math.floor(textState.x + w * 2)) {
            return;
        }

        // 자동 개행, 배경색 설정을 위해서.
        if(Imported.RS_MessageSystem) {
            bitmap.fontBold = this.contents.fontBold;

            var width = this.contentsWidth();

            var isValid = ($gameMessage.getBalloon() === -2) && !this._isUsedTextWidthEx && RS.MessageSystem.Params.isParagraphMinifier;
        
            this.processWordWrap(textState, w, width, isValid);
        
            if($gameMessage.faceName() !== "") {
              width = this.contents.width - (Window_Base._faceWidth);
              isValid = (RS.MessageSystem.Params.faceDirection === 2);
              this.processWordWrap(textState, w, width, isValid);
            }

            if(this.contents.highlightTextColor != null) {
                bitmap.fillRect( 0, 0, w + 1.0, textState.height, this.contents.highlightTextColor);
            }
            
        }

        bitmap.drawText(c, 0, 0, w * 2 , h, "left");

        this._mainTextLayer.emit("effect", [
            bitmap,
            textState
        ]);
        
        textState.x += w;

        if(Imported.RS_MessageSystem) {
            !this._showFast && this.startWait($gameMessage.getWaitTime() || 0);
            if((textState.index % RS.MessageSystem.Params.textSoundInterval) === 0) this._requestTextSound();                
        }
    }

    initMembers() {
        super.initMembers();
    }

    /**
     * @method obtainTextEffectName
     * @param {MV.TextState} textState 
     */
    obtainTextEffectName(textState) {
        var arr = /\<(.*)\>/.exec(textState.text.slice(textState.index));
        if (arr) {
            textState.index += arr[0].length;
            return String(arr[1]);
        } else {
            return "";
        }
    }

    setTextEffect(textEffect) {
        RS.MessageEffects.Params.currentEffect = textEffect;
    }

    /**
     * 
     * @param {String} code 
     * @param {MV.TextState} textState 
     */
    processEscapeCharacter(code, textState) {                          
        switch (code) {
            case '텍스트효과':
            case 'TE':
                if(this._isUsedTextWidthEx) break;
                this.setTextEffect(this.obtainTextEffectName(textState));
                break;
            default:
                super.processEscapeCharacter(code, textState);
                break;
        }
    }

    /**
     * @param {MV.TextState} textState 
     */        
    processNormalCharacter(textState) {
        if(RS.MessageEffects.Params.currentEffect !== "none") {
            this.addText(textState);
        } else {
            super.processNormalCharacter(textState);
        }
    }

    startPause() {
        super.startPause();
        this._mainTextLayer.children.forEach(i => i.flush());
    }

}

window.Window_Message = Window_MessageImpl;

var alias_Game_Interpreter_pluginCommand = Game_Interpreter.prototype.pluginCommand;
Game_Interpreter.prototype.pluginCommand = function(command, args) {
    alias_Game_Interpreter_pluginCommand.call(this, command, args);
    if(command === "MessageEffectMap") {
        RS.MessageEffects.Params.currentEffect = args[0];
    }
};                 