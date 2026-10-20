/**
 * Web Audio Playback Queue
 * Manages streaming audio playback with instant cancel/flush for barge-in.
 */
export class PlaybackQueue {
  private ctx: AudioContext;
  private botGainNode: GainNode;
  private queue: ArrayBuffer[] = [];
  private isPlaying = false;
  private activeSource: AudioBufferSourceNode | null = null;
  private onLevelChange?: (level: number) => void;
  private analyser: AnalyserNode;

  constructor(ctx: AudioContext, onLevelChange?: (level: number) => void) {
    this.ctx = ctx;
    this.onLevelChange = onLevelChange;

    this.botGainNode = this.ctx.createGain();
    this.botGainNode.gain.value = 1.0;

    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 64;

    this.botGainNode.connect(this.analyser);
    this.botGainNode.connect(this.ctx.destination);

    if (this.onLevelChange) {
      this.startAnalyserLoop();
    }
  }

  public getGainNode(): GainNode {
    return this.botGainNode;
  }

  public async enqueue(audioData: ArrayBuffer) {
    this.queue.push(audioData);
    if (!this.isPlaying) {
      this.playNext();
    }
  }

  private async playNext() {
    if (this.queue.length === 0) {
      this.isPlaying = false;
      return;
    }

    this.isPlaying = true;
    const chunk = this.queue.shift();
    if (!chunk) return;

    try {
      // Decode audio data (MP3/WAV/WebM)
      const buffer = await this.ctx.decodeAudioData(chunk.slice(0));
      const source = this.ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(this.botGainNode);

      this.activeSource = source;

      source.onended = () => {
        this.activeSource = null;
        this.playNext();
      };

      source.start(0);
    } catch (e) {
      console.warn('Audio decode error, skipping chunk', e);
      this.playNext();
    }
  }

  /**
   * Barge-in: immediately stops any playing bot audio and clears queue.
   */
  public flush() {
    this.queue = [];
    if (this.activeSource) {
      try {
        this.activeSource.stop();
        this.activeSource.disconnect();
      } catch (e) {
        // Source may already have ended
      }
      this.activeSource = null;
    }
    this.isPlaying = false;
  }

  private startAnalyserLoop() {
    const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
    const loop = () => {
      if (this.isPlaying) {
        this.analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avg = sum / dataArray.length / 255;
        this.onLevelChange?.(avg);
      } else {
        this.onLevelChange?.(0);
      }
      requestAnimationFrame(loop);
    };
    loop();
  }
}
