import { useCallback, useEffect, useRef } from "react";

interface UseRealtimeAudioPlayerReturn {
	init: () => void;
	playChunk: (base64: string) => void;
	stop: () => void;
}

export function useRealtimeAudioPlayer(): UseRealtimeAudioPlayerReturn {
	const audioContextRef = useRef<AudioContext | null>(null);
	const nextPlayTimeRef = useRef(0);

	const init = useCallback(() => {
		if (
			!audioContextRef.current ||
			audioContextRef.current.state === "closed"
		) {
			audioContextRef.current = new AudioContext({ sampleRate: 24_000 });
			nextPlayTimeRef.current = 0;
		}
	}, []);

	const getAudioContext = useCallback(() => {
		if (
			!audioContextRef.current ||
			audioContextRef.current.state === "closed"
		) {
			audioContextRef.current = new AudioContext({ sampleRate: 24_000 });
			nextPlayTimeRef.current = 0;
		}
		// AudioContext may be suspended if created outside a user gesture
		if (audioContextRef.current.state === "suspended") {
			void audioContextRef.current.resume();
		}
		return audioContextRef.current;
	}, []);

	const playChunk = useCallback(
		(base64: string) => {
			const ctx = getAudioContext();

			// Decode base64 to PCM16
			const binary = atob(base64);
			const bytes = new Uint8Array(binary.length);
			for (let i = 0; i < binary.length; i++) {
				bytes[i] = binary.charCodeAt(i);
			}
			const pcm16 = new Int16Array(bytes.buffer);

			// Convert PCM16 to Float32
			const float32 = new Float32Array(pcm16.length);
			for (let i = 0; i < pcm16.length; i++) {
				float32[i] = pcm16[i] / 0x80_00;
			}

			// Create AudioBuffer and schedule playback
			const buffer = ctx.createBuffer(1, float32.length, 24_000);
			buffer.getChannelData(0).set(float32);

			const source = ctx.createBufferSource();
			source.buffer = buffer;
			source.connect(ctx.destination);

			const now = ctx.currentTime;
			const startTime =
				nextPlayTimeRef.current > now ? nextPlayTimeRef.current : now;
			source.start(startTime);
			nextPlayTimeRef.current = startTime + buffer.duration;
		},
		[getAudioContext],
	);

	const stop = useCallback(() => {
		if (audioContextRef.current) {
			void audioContextRef.current.close();
			audioContextRef.current = null;
			nextPlayTimeRef.current = 0;
		}
	}, []);

	useEffect(() => stop, [stop]);

	return { init, playChunk, stop };
}
