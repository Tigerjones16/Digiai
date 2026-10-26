/**
 * DigAI Natural Speech Synthesizer
 * Provides hands-free audio listening mode for everyday commuting & reading.
 */

type SpeechStatus = 'idle' | 'playing' | 'paused';

class SpeechEngine {
  private synth: SpeechSynthesis | null = null;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private status: SpeechStatus = 'idle';
  private statusListeners: Array<(status: SpeechStatus) => void> = [];
  private currentTextId: string | null = null;

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.synth = window.speechSynthesis;
    }
  }

  public subscribe(listener: (status: SpeechStatus) => void) {
    this.statusListeners.push(listener);
    listener(this.status);
    return () => {
      this.statusListeners = this.statusListeners.filter((l) => l !== listener);
    };
  }

  private setStatus(status: SpeechStatus) {
    this.status = status;
    this.statusListeners.forEach((l) => l(status));
  }

  public getStatus(): SpeechStatus {
    return this.status;
  }

  public getCurrentTextId(): string | null {
    return this.currentTextId;
  }

  public speak(
    textId: string,
    title: string,
    summary: string,
    options: {
      rate?: number;
      onEnd?: () => void;
    } = {}
  ) {
    if (!this.synth) return;

    // If already playing this text, toggle pause/resume
    if (this.currentTextId === textId) {
      if (this.status === 'playing') {
        this.synth.pause();
        this.setStatus('paused');
        return;
      } else if (this.status === 'paused') {
        this.synth.resume();
        this.setStatus('playing');
        return;
      }
    }

    // Stop existing speech
    this.stop();

    const fullNarration = `${title}. ... ${summary}`;
    const utterance = new SpeechSynthesisUtterance(fullNarration);
    utterance.rate = options.rate || 1.0;
    utterance.pitch = 1.0;
    utterance.lang = 'en-US';

    // Pick best available natural voice if loaded
    const voices = this.synth.getVoices();
    const naturalVoice = voices.find(
      (v) =>
        (v.name.includes('Natural') ||
          v.name.includes('Google') ||
          v.name.includes('Samantha') ||
          v.name.includes('Daniel')) &&
        v.lang.startsWith('en')
    );
    if (naturalVoice) {
      utterance.voice = naturalVoice;
    }

    utterance.onstart = () => {
      this.currentTextId = textId;
      this.setStatus('playing');
    };

    utterance.onend = () => {
      this.currentTextId = null;
      this.setStatus('idle');
      if (options.onEnd) options.onEnd();
    };

    utterance.onerror = () => {
      this.currentTextId = null;
      this.setStatus('idle');
    };

    this.currentUtterance = utterance;
    this.synth.speak(utterance);
  }

  public pause() {
    if (this.synth && this.status === 'playing') {
      this.synth.pause();
      this.setStatus('paused');
    }
  }

  public resume() {
    if (this.synth && this.status === 'paused') {
      this.synth.resume();
      this.setStatus('playing');
    }
  }

  public stop() {
    if (this.synth) {
      this.synth.cancel();
    }
    this.currentUtterance = null;
    this.currentTextId = null;
    this.setStatus('idle');
  }
}

export const speechEngine = new SpeechEngine();
