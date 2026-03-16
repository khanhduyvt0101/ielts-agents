import { useCallback, useEffect, useRef, useState } from "react";

interface TranscriptEntry {
  role: string;
  text: string;
  timestamp: number;
}

type SpeakingStatus = "idle" | "connecting" | "active" | "ending" | "ended";

interface UseSpeakingRealtimeOptions {
  chatId: number;
  onSessionEnd?: (transcript: TranscriptEntry[], duration: number) => void;
}

interface UseSpeakingRealtimeReturn {
  status: SpeakingStatus;
  connect: () => Promise<void>;
  disconnect: () => void;
  transcript: TranscriptEntry[];
  duration: number;
  isAgentSpeaking: boolean;
}

export function useSpeakingRealtime({
  chatId,
  onSessionEnd,
}: UseSpeakingRealtimeOptions): UseSpeakingRealtimeReturn {
  const [status, setStatus] = useState<SpeakingStatus>("idle");
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [duration, setDuration] = useState(0);
  const [isAgentSpeaking, setIsAgentSpeaking] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const startTimeRef = useRef<number>(0);
  const durationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null,
  );

  const cleanup = useCallback(() => {
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }
    if (mediaStreamRef.current) {
      for (const track of mediaStreamRef.current.getTracks()) track.stop();
      mediaStreamRef.current = null;
    }
    if (audioContextRef.current) {
      void audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  const connect = useCallback(async () => {
    if (status !== "idle" && status !== "ended") return;

    setStatus("connecting");
    setTranscript([]);
    setDuration(0);
    setIsAgentSpeaking(false);

    try {
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      // Build WebSocket URL
      const protocol = location.protocol === "https:" ? "wss:" : "ws:";
      const apiUrl = import.meta.env.VITE_API_URL as string | undefined;
      const apiHost = apiUrl?.replace(/^https?:\/\//, "") ?? "localhost:42310";
      const wsUrl = `${protocol}//${apiHost}/v1/ai/speaking/${chatId}/ws`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.addEventListener("open", () => {
        setStatus("active");
        startTimeRef.current = Date.now();

        // Start duration timer
        durationIntervalRef.current = setInterval(() => {
          setDuration(Math.floor((Date.now() - startTimeRef.current) / 1000));
        }, 1000);

        // Set up audio capture
        const audioContext = new AudioContext({ sampleRate: 24_000 });
        audioContextRef.current = audioContext;
        const source = audioContext.createMediaStreamSource(stream);

        // Use AudioWorkletNode if available, fall back to ScriptProcessor
        // eslint-disable-next-line @typescript-eslint/no-deprecated
        const processor = audioContext.createScriptProcessor(4096, 1, 1);
        // eslint-disable-next-line @typescript-eslint/no-deprecated
        processor.onaudioprocess = (event: AudioProcessingEvent) => {
          if (ws.readyState !== WebSocket.OPEN) return;
          // eslint-disable-next-line @typescript-eslint/no-deprecated
          const inputData = event.inputBuffer.getChannelData(0);
          // Convert float32 to PCM16
          const pcm16 = new Int16Array(inputData.length);
          for (const [i, sample] of inputData.entries()) {
            const s = Math.max(-1, Math.min(1, sample));
            pcm16[i] = s < 0 ? s * 0x80_00 : s * 0x7F_FF;
          }
          // Send as base64-encoded audio append event
          const base64 = btoa(
            String.fromCodePoint(...new Uint8Array(pcm16.buffer)),
          );
          ws.send(
            JSON.stringify({
              type: "input_audio_buffer.append",
              audio: base64,
            }),
          );
        };
        source.connect(processor);
        processor.connect(audioContext.destination);
      });

      ws.addEventListener("message", (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data as string) as {
            type: string;
            transcript?: string;
          };

          switch (data.type) {
            case "conversation.item.input_audio_transcription.completed": {
              if (data.transcript) {
                setTranscript((prev) => [
                  ...prev,
                  {
                    role: "candidate",
                    text: data.transcript ?? "",
                    timestamp: Date.now() - startTimeRef.current,
                  },
                ]);
              }
              break;
            }
            case "response.audio_transcript.done": {
              if (data.transcript) {
                setTranscript((prev) => [
                  ...prev,
                  {
                    role: "examiner",
                    text: data.transcript ?? "",
                    timestamp: Date.now() - startTimeRef.current,
                  },
                ]);
              }
              setIsAgentSpeaking(false);
              break;
            }
            case "response.audio.delta": {
              setIsAgentSpeaking(true);
              break;
            }
            case "response.done": {
              setIsAgentSpeaking(false);
              break;
            }
            case "error": {
              console.error("Speaking relay error:", data);
              break;
            }
          }
        } catch {
          // Non-JSON message
        }
      });

      ws.addEventListener("close", () => {
        const finalDuration = Math.floor(
          (Date.now() - startTimeRef.current) / 1000,
        );
        setStatus("ended");
        setIsAgentSpeaking(false);
        cleanup();
        setTranscript((currentTranscript) => {
          onSessionEnd?.(currentTranscript, finalDuration);
          return currentTranscript;
        });
      });

      ws.addEventListener("error", () => {
        setStatus("ended");
        cleanup();
      });
    } catch {
      setStatus("idle");
      cleanup();
    }
  }, [chatId, status, cleanup, onSessionEnd]);

  const disconnect = useCallback(() => {
    if (status !== "active") return;
    setStatus("ending");
    cleanup();
    setStatus("ended");
  }, [status, cleanup]);

  // Cleanup on unmount
  useEffect(() => cleanup, [cleanup]);

  return {
    status,
    connect,
    disconnect,
    transcript,
    duration,
    isAgentSpeaking,
  };
}
