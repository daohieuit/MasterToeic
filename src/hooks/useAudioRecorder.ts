import { useState, useRef, useCallback } from 'react';
import toast from 'react-hot-toast';

export function useAudioRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const startRecording = useCallback(async () => {
    setAudioUrl(null);
    setAudioBlob(null);
    setStream(null);
    audioChunksRef.current = [];

    try {
      if (typeof window === 'undefined' || !navigator.mediaDevices) {
        throw new Error('Media devices are not supported in this environment');
      }

      const activeStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setStream(activeStream);
      const mediaRecorder = new MediaRecorder(activeStream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        setAudioBlob(blob);
        setAudioUrl(url);

        // Stop all tracks to release the mic
        activeStream.getTracks().forEach((track) => track.stop());
        setStream(null);
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error('Failed to start recording:', err);
      toast.error('Không thể truy cập Microphone. Vui lòng cấp quyền ghi âm cho trình duyệt của bạn.');
      setStream(null);
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  }, [isRecording]);

  return {
    isRecording,
    audioUrl,
    audioBlob,
    startRecording,
    stopRecording,
    stream,
  };
}
