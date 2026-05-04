/* ==========================================================================
   1. SYNTHETIC AUDIO SYSTEM
   ========================================================================== */

const AudioSys = {
    ctx: null,
    muted: false,
    bgmOsc: null,
    bgmGain: null,
    
    init() {
        if (this.ctx) return;
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AudioContext();
    },
    
    toggleMute() {
        this.muted = !this.muted;
        const icon = this.muted ? ICONS.soundOff : ICONS.soundOn;
        const txt = this.muted ? "Sound: OFF" : "Sound: ON";
        
        document.getElementById('btn-mute-main').innerHTML = `<span class="w-5">${icon}</span> ${txt}`;
        document.getElementById('btn-mute-pause').innerHTML = `<span class="w-5">${icon}</span> ${txt}`;
        document.getElementById('btn-mute-game').innerHTML = icon;
        
        if (this.bgmGain && this.ctx) {
            const now = this.ctx.currentTime;
            this.bgmGain.gain.setValueAtTime(this.bgmGain.gain.value, now);
            this.bgmGain.gain.linearRampToValueAtTime(this.muted ? 0 : 0.05, now + 0.5);
        }
    },
    
    playTone(freq, type, duration, vol, slideToFreq = null) {
        if (this.muted || !this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
        if (slideToFreq) osc.frequency.exponentialRampToValueAtTime(slideToFreq, this.ctx.currentTime + duration);
        
        gain.gain.setValueAtTime(vol, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
        
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + duration);
    },

    rollTick() { this.playTone(600, 'square', 0.05, 0.02); },
    rollResult() { this.playTone(400, 'sine', 0.2, 0.1, 800); },
    moveStep() { this.playTone(300, 'triangle', 0.1, 0.05); },
    ladder() { [300, 400, 500, 600, 700].forEach((f, i) => setTimeout(() => this.playTone(f, 'sine', 0.1, 0.05), i * 80)); },
    snake() { this.playTone(200, 'sawtooth', 0.5, 0.1, 50); },
    trap() { this.playTone(150, 'square', 0.4, 0.1, 80); },
    powerup() { this.playTone(800, 'sine', 0.3, 0.1, 1200); },
    win() { [400, 500, 600, 800, 1000, 1200].forEach((f, i) => setTimeout(() => this.playTone(f, 'square', 0.2, 0.05), i * 150)); },
    
    // Menu-specific sounds
    menuHover() { this.playTone(700, 'sine', 0.08, 0.04); },
    menuClick() { this.playTone(500, 'square', 0.12, 0.08, 350); },
    
    startBGM() {
        this.init();
        if (this.bgmOsc) return;
        this.bgmOsc = this.ctx.createOscillator();
        this.bgmGain = this.ctx.createGain();
        this.bgmOsc.type = 'sine';
        this.bgmOsc.frequency.setValueAtTime(100, this.ctx.currentTime);
        setInterval(() => {
            if(!this.muted && this.bgmOsc) this.bgmOsc.frequency.linearRampToValueAtTime(100 + Math.random()*20, this.ctx.currentTime + 2);
        }, 2000);
        this.bgmGain.gain.value = this.muted ? 0 : 0.05;
        this.bgmOsc.connect(this.bgmGain);
        this.bgmGain.connect(this.ctx.destination);
        this.bgmOsc.start();
    }
};
