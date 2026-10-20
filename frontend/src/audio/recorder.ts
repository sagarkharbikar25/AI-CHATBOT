/**
 * Synchronized Client-Side Dual-Stream Audio Recorder
 * Mixes both user microphone and bot audio node into a single MediaStreamDestination.
 */
export class MixedAudioRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];
  private destNode: MediaStreamAudioDestinationNode;
  private micSource: MediaStreamAudioSourceNode | null = null;

  constructor(ctx: AudioContext, micStream: MediaStream, botGainNode: GainNode) {
    this.destNode = ctx.createMediaStreamDestination();

    // 1. Connect user microphone to recorder destination
    this.micSource = ctx.createMediaStreamSource(micStream);
    this.micSource.connect(this.destNode);

    // 2. Connect bot audio output to recorder destination
    botGainNode.connect(this.destNode);

    // 3. Determine best supported MIME type
    let mimeType = 'audio/webm;codecs=opus';
    if (!MediaRecorder.isTypeSupported(mimeType)) {
      if (MediaRecorder.isTypeSupported('audio/mp4')) {
        mimeType = 'audio/mp4';
      } else {
        mimeType = 'audio/webm';
      }
    }

    try {
      this.mediaRecorder = new MediaRecorder(this.destNode.stream, { mimeType });
      this.mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          this.recordedChunks.push(e.data);
        }
      };
    } catch (err) {
      console.error('Failed to initialize MediaRecorder', err);
    }
  }

  public start() {
    this.recordedChunks = [];
    if (this.mediaRecorder && this.mediaRecorder.state === 'inactive') {
      this.mediaRecorder.start(500); // 500ms time slice
    }
  }

  public async stop(): Promise<Blob | null> {
    return new Promise((resolve) => {
      if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') {
        resolve(null);
        return;
      }

      this.mediaRecorder.onstop = () => {
        const mimeType = this.mediaRecorder?.mimeType || 'audio/webm';
        const blob = new Blob(this.recordedChunks, { type: mimeType });
        resolve(blob);
      };

      this.mediaRecorder.stop();
    });
  }

  public cleanup() {
    if (this.micSource) {
      try {
        this.micSource.disconnect();
      } catch (e) {}
    }
  }
}
