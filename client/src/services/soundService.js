// Sound utility for race countdown and alerts
class SoundService {
  constructor() {
    this.audioContext = null;
  }

  init() {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
  }

  // Play a beep sound with specific frequency
  playBeep(frequency = 440, duration = 0.2, volume = 0.5) {
    this.init();
    
    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);
    
    oscillator.frequency.value = frequency;
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(volume, this.audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);
    
    oscillator.start(this.audioContext.currentTime);
    oscillator.stop(this.audioContext.currentTime + duration);
  }

  // Red light sound - low tone
  playRedLight() {
    this.playBeep(300, 0.3, 0.4);
  }

  // Yellow light sound - medium tone  
  playYellowLight() {
    this.playBeep(500, 0.3, 0.4);
  }

  // Green light sound - high tone (GO!)
  playGreenLight() {
    this.playBeep(800, 0.5, 0.6);
  }

  // Race finish sound
  playFinish() {
    this.init();
    
    // Play a victory tune
    const notes = [523, 659, 784, 1047]; // C5, E5, G5, C6
    notes.forEach((freq, index) => {
      setTimeout(() => {
        this.playBeep(freq, 0.15, 0.4);
      }, index * 100);
    });
  }

  // Error sound
  playError() {
    this.playBeep(200, 0.1, 0.3);
  }

  // Success sound
  playSuccess() {
    this.playBeep(600, 0.15, 0.3);
    setTimeout(() => this.playBeep(800, 0.15, 0.3), 100);
  }
}

const soundService = new SoundService();
export default soundService;
