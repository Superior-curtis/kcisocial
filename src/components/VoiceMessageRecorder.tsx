import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Play, Pause, Trash2, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { voiceMessageService } from '@/services/voiceMessageService';

interface VoiceMessageRecorderProps {
  onSend: (blob: Blob, duration: number) => void;
  recipientId: string;
}

const VoiceMessageRecorder: React.FC<VoiceMessageRecorderProps> = ({
  onSend,
  recipientId,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [duration, setDuration] = useState(0);
  const [playingDuration, setPlayingDuration] = useState(0);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const playingAudioRef = useRef<HTMLAudioElement | null>(null);

  const handleStartRecording = async () => {
    try {
      await voiceMessageService.startRecording();
      setIsRecording(true);
      setDuration(0);

      durationIntervalRef.current = setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);
    } catch (error) {
      console.error('Error starting recording:', error);
    }
  };

  const handleStopRecording = async () => {
    try {
      const data = await voiceMessageService.stopRecording();
      setRecordedBlob(data.blob);
      setIsRecording(false);

      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
    } catch (error) {
      console.error('Error stopping recording:', error);
    }
  };

  const handleCancelRecording = () => {
    voiceMessageService.cancelRecording();
    setIsRecording(false);
    setRecordedBlob(null);
    setDuration(0);

    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
    }
  };

  const handlePlayback = () => {
    if (recordedBlob) {
      if (
        playingAudioRef.current &&
        !playingAudioRef.current.paused
      ) {
        voiceMessageService.pauseAudio(playingAudioRef.current);
      } else {
        playingAudioRef.current = voiceMessageService.playAudio(
          recordedBlob,
          () => {
            setPlayingDuration(0);
          }
        );
      }
    }
  };

  const handleSend = () => {
    if (recordedBlob) {
      onSend(recordedBlob, duration);
      setRecordedBlob(null);
      setDuration(0);
      setPlayingDuration(0);
    }
  };

  if (isRecording) {
    return (
      <div className="bg-slate-800 rounded-lg p-4 border border-red-500">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
              <span className="text-red-400 font-medium">Recording...</span>
            </div>
            <div className="text-2xl font-mono text-white mt-2">
              {voiceMessageService.formatDuration(duration)}
            </div>
          </div>
          <Button
            size="sm"
            variant="default"
            className="bg-green-600 hover:bg-green-700"
            onClick={handleStopRecording}
          >
            <Square className="w-4 h-4" />
            Stop
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={handleCancelRecording}
          >
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  if (recordedBlob) {
    return (
      <div className="bg-slate-800 rounded-lg p-4 border border-blue-500">
        <div className="flex items-center gap-4">
          <Button
            size="sm"
            variant="default"
            className="bg-blue-600 hover:bg-blue-700"
            onClick={handlePlayback}
          >
            {playingAudioRef.current && !playingAudioRef.current.paused ? (
              <>
                <Pause className="w-4 h-4 mr-2" />
                Pause
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-2" />
                Play
              </>
            )}
          </Button>

          <div className="flex-1">
            <div className="text-white text-sm">Voice Message Ready</div>
            <div className="text-slate-400">
              Duration: {voiceMessageService.formatDuration(duration)}
            </div>
          </div>

          <Button
            size="sm"
            variant="destructive"
            onClick={() => {
              setRecordedBlob(null);
              setDuration(0);
            }}
          >
            <Trash2 className="w-4 h-4" />
          </Button>

          <Button
            size="sm"
            className="bg-green-600 hover:bg-green-700"
            onClick={handleSend}
          >
            <Send className="w-4 h-4 mr-2" />
            Send
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Button
      variant="outline"
      className="border-slate-600 text-slate-300 hover:bg-slate-700 w-full justify-start"
      onClick={handleStartRecording}
    >
      <Mic className="w-4 h-4 mr-2" />
      Record Voice Message
    </Button>
  );
};

export default VoiceMessageRecorder;
