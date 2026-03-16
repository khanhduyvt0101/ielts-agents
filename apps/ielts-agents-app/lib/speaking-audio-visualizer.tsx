import { useEffect, useRef } from "react";

interface SpeakingAudioVisualizerProps {
  isActive: boolean;
  className?: string;
}

export function SpeakingAudioVisualizer({
  isActive,
  className,
}: SpeakingAudioVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (!isActive) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = 0;
      }
      if (streamRef.current) {
        for (const track of streamRef.current.getTracks()) track.stop();
        streamRef.current = null;
      }
      // Draw idle state
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          const centerY = canvas.height / 2;
          ctx.strokeStyle = "hsl(var(--muted-foreground) / 0.3)";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(0, centerY);
          ctx.lineTo(canvas.width, centerY);
          ctx.stroke();
        }
      }
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    let audioContext: AudioContext | undefined;

    async function startVisualization() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });
        streamRef.current = stream;
        audioContext = new AudioContext();
        const source = audioContext.createMediaStreamSource(stream);
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);
        analyserRef.current = analyser;

        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        function draw() {
          if (!canvas || !analyserRef.current) return;
          animationRef.current = requestAnimationFrame(draw);

          analyserRef.current.getByteTimeDomainData(dataArray);

          const ctx = canvas.getContext("2d");
          if (!ctx) return;

          ctx.clearRect(0, 0, canvas.width, canvas.height);

          ctx.lineWidth = 2;
          ctx.strokeStyle = "hsl(var(--primary))";
          ctx.beginPath();

          const sliceWidth = canvas.width / bufferLength;
          let x = 0;

          for (const [i, value] of dataArray.entries()) {
            const v = value / 128;
            const y = (v * canvas.height) / 2;

            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);

            x += sliceWidth;
          }

          ctx.lineTo(canvas.width, canvas.height / 2);
          ctx.stroke();
        }

        draw();
      } catch {
        // Microphone access denied or unavailable
      }
    }

    void startVisualization();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = 0;
      }
      if (streamRef.current) {
        for (const track of streamRef.current.getTracks()) track.stop();
        streamRef.current = null;
      }
      if (audioContext) void audioContext.close();
    };
  }, [isActive]);

  return (
    <canvas ref={canvasRef} className={className} height={60} width={300} />
  );
}
