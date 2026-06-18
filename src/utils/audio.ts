export function bufferToWav(buffer: AudioBuffer): Blob {
  const numOfChan = 1; // force mono for smaller file size
  const sampleRate = buffer.sampleRate;
  const format = 1; // raw PCM
  const bitDepth = 16;
  
  const resultLength = buffer.length * 2 + 44;
  const arrayBuffer = new ArrayBuffer(resultLength);
  const view = new DataView(arrayBuffer);
  
  let pos = 0;

  const writeString = (str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(pos + i, str.charCodeAt(i));
    }
    pos += str.length;
  };

  const writeUint16 = (val: number) => {
    view.setUint16(pos, val, true);
    pos += 2;
  };

  const writeUint32 = (val: number) => {
    view.setUint32(pos, val, true);
    pos += 4;
  };

  // RIFF identifier
  writeString('RIFF');
  // file length minus RIFF identifier length
  writeUint32(resultLength - 8);
  // RIFF type
  writeString('WAVE');
  // format chunk identifier
  writeString('fmt ');
  // format chunk length
  writeUint32(16);
  // sample format (raw PCM)
  writeUint16(format);
  // channel count
  writeUint16(numOfChan);
  // sample rate
  writeUint32(sampleRate);
  // byte rate = sampleRate * channelCount * bytesPerSample
  writeUint32(sampleRate * numOfChan * (bitDepth / 8));
  // block align = channelCount * bytesPerSample
  writeUint16(numOfChan * (bitDepth / 8));
  // bits per sample
  writeUint16(bitDepth);
  // data chunk identifier
  writeString('data');
  // chunk length
  writeUint32(buffer.length * 2);

  // Write samples
  const channelData = buffer.getChannelData(0);
  for (let i = 0; i < channelData.length; i++) {
    // Clamp sample to [-1, 1]
    const sample = Math.max(-1, Math.min(1, channelData[i]));
    // Convert to 16-bit PCM
    const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
    view.setInt16(pos, intSample, true);
    pos += 2;
  }

  return new Blob([arrayBuffer], { type: 'audio/wav' });
}

export const mergeAudioResponses = async (
  reviews: any[], 
  onProgress: (progress: number) => void
): Promise<Blob | null> => {
  const speakingReviews = reviews.filter(r => r.section === 'speaking' && r.audioUrl);
  if (speakingReviews.length === 0) return null;

  const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
  const audioCtx = new AudioCtx();
  const audioBuffers: AudioBuffer[] = [];

  const getMarkerText = (partTitle: string, index: number) => {
    const t = partTitle.toLowerCase();
    if (t.includes('part 1')) return index === 0 ? "Part 1, Question 1" : "Question 2";
    if (t.includes('part 2')) return index === 2 ? "Part 2, Question 3" : "Question 4";
    if (t.includes('part 3')) {
      if (index === 4) return "Part 3, Question 5";
      if (index === 5) return "Question 6";
      return "Question 7";
    }
    if (t.includes('part 4')) {
      if (index === 7) return "Part 4, Question 8";
      if (index === 8) return "Question 9";
      return "Question 10";
    }
    if (t.includes('part 5')) return "Part 5, Question 11";
    return `Question ${index + 1}`;
  };

  try {
    for (let i = 0; i < speakingReviews.length; i++) {
      const rev = speakingReviews[i];
      onProgress(Math.round((i / speakingReviews.length) * 80));

      // 1. Fetch and decode AI marker
      try {
        const markerText = getMarkerText(rev.partTitle, i);
        const markerRes = await fetch(`/api/tts?text=${encodeURIComponent(markerText)}`);
        if (markerRes.ok) {
          const markerBuf = await markerRes.arrayBuffer();
          const markerDecoded = await audioCtx.decodeAudioData(markerBuf);
          audioBuffers.push(markerDecoded);
        }
      } catch (e) {
        console.error('Failed to load TTS marker:', e);
      }

      // 2. Add short silence (1 second)
      const silenceBuffer = audioCtx.createBuffer(
        1,
        audioCtx.sampleRate * 1.0,
        audioCtx.sampleRate
      );
      audioBuffers.push(silenceBuffer);

      // 3. Fetch and decode User's Speaking Answer
      try {
        const userRes = await fetch(rev.audioUrl);
        const userBuf = await userRes.arrayBuffer();
        const userDecoded = await audioCtx.decodeAudioData(userBuf);
        audioBuffers.push(userDecoded);
      } catch (e) {
        console.error('Failed to load user audio response:', e);
      }

      // 4. Add short silence (1.5 seconds) between answers
      if (i < speakingReviews.length - 1) {
        const transitionSilence = audioCtx.createBuffer(
          1,
          audioCtx.sampleRate * 1.5,
          audioCtx.sampleRate
        );
        audioBuffers.push(transitionSilence);
      }
    }

    onProgress(85);

    if (audioBuffers.length === 0) return null;

    // 5. Concatenate all AudioBuffers
    const totalLength = audioBuffers.reduce((acc, buf) => acc + buf.length, 0);
    const numberOfChannels = 1; // Convert to Mono for smaller file size
    const sampleRate = audioCtx.sampleRate;
    const mergedBuffer = audioCtx.createBuffer(numberOfChannels, totalLength, sampleRate);
    
    let currentOffset = 0;
    const channelData = mergedBuffer.getChannelData(0);

    for (const buf of audioBuffers) {
      const srcData = buf.getChannelData(0);
      channelData.set(srcData, currentOffset);
      currentOffset += buf.length;
    }

    onProgress(95);

    // 6. Encode to WAV
    const wavBlob = bufferToWav(mergedBuffer);
    onProgress(100);
    return wavBlob;

  } catch (error) {
    console.error('Audio merging failed:', error);
    return null;
  } finally {
    audioCtx.close();
  }
};
