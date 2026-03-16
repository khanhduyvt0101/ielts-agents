import type { WSContext } from "hono/ws";

import type { BandScore } from "#./lib/band-score.ts";

import WebSocket from "ws";

import { buildExaminerInstructions } from "#./lib/speaking-examiner-instructions.ts";

interface TranscriptEntry {
  role: "examiner" | "candidate";
  text: string;
  timestamp: number;
}

interface SpeakingRelayOptions {
  bandScore: BandScore;
  testPart: "part-1" | "part-2" | "part-3" | "full-test";
  onTranscriptUpdate: (entries: TranscriptEntry[]) => void;
  onSessionEnd: (data: {
    transcript: TranscriptEntry[];
    duration: number;
  }) => void;
}

export class SpeakingWebSocketRelay {
  private openaiWs: WebSocket | null = null;
  private transcript: TranscriptEntry[] = [];
  private sessionStartTime: number = Date.now();
  private closed = false;

  constructor(private readonly options: SpeakingRelayOptions) {}

  connect(clientWs: WSContext): void {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      clientWs.send(
        JSON.stringify({
          type: "error",
          message: "OpenAI API key not configured",
        }),
      );
      clientWs.close(1011, "Server configuration error");
      return;
    }

    const model = "gpt-4o-realtime-preview";
    const url = `wss://api.openai.com/v1/realtime?model=${model}`;

    this.openaiWs = new WebSocket(url, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "OpenAI-Beta": "realtime=v1",
      },
    });

    this.sessionStartTime = Date.now();

    this.openaiWs.on("open", () => {
      this.configureSession();
    });

    this.openaiWs.on("message", (data: WebSocket.RawData) => {
      if (this.closed) return;
      const message = Buffer.isBuffer(data)
        ? data.toString("utf8")
        : Buffer.from(data as ArrayBuffer).toString("utf8");

      this.interceptOpenAIEvent(message);

      // Relay to client
      clientWs.send(message);
    });

    this.openaiWs.on("close", () => {
      if (this.closed) return;
      this.closed = true;
      this.endSession();
      clientWs.close(1000, "OpenAI session ended");
    });

    this.openaiWs.on("error", (error) => {
      console.error("OpenAI WebSocket error:", error);
      if (this.closed) return;
      this.closed = true;
      clientWs.send(
        JSON.stringify({
          type: "error",
          message: "Connection to AI service failed",
        }),
      );
      clientWs.close(1011, "OpenAI connection error");
    });
  }

  handleClientMessage(data: string): void {
    if (this.closed || !this.openaiWs) return;

    if (this.openaiWs.readyState === WebSocket.OPEN) this.openaiWs.send(data);
  }

  handleClientClose(): void {
    if (this.closed) return;
    this.closed = true;
    this.endSession();
    if (this.openaiWs?.readyState === WebSocket.OPEN) this.openaiWs.close();
  }

  private configureSession(): void {
    if (this.openaiWs?.readyState !== WebSocket.OPEN) return;

    const instructions = buildExaminerInstructions(
      this.options.bandScore,
      this.options.testPart,
    );

    const sessionConfig = {
      type: "session.update",
      session: {
        modalities: ["text", "audio"],
        instructions,
        voice: "alloy",
        input_audio_format: "pcm16",
        output_audio_format: "pcm16",
        input_audio_transcription: {
          model: "whisper-1",
        },
        turn_detection: {
          type: "server_vad",
          threshold: 0.5,
          prefix_padding_ms: 300,
          silence_duration_ms: 500,
        },
      },
    };

    this.openaiWs.send(JSON.stringify(sessionConfig));
  }

  private interceptOpenAIEvent(rawMessage: string): void {
    try {
      const event = JSON.parse(rawMessage) as {
        type: string;
        transcript?: string;
      };

      switch (event.type) {
        case "conversation.item.input_audio_transcription.completed": {
          if (!event.transcript) break;
          this.transcript.push({
            role: "candidate",
            text: event.transcript,
            timestamp: Date.now() - this.sessionStartTime,
          });
          this.options.onTranscriptUpdate([...this.transcript]);
          break;
        }
        case "response.audio_transcript.done": {
          if (!event.transcript) break;
          this.transcript.push({
            role: "examiner",
            text: event.transcript,
            timestamp: Date.now() - this.sessionStartTime,
          });
          this.options.onTranscriptUpdate([...this.transcript]);
          break;
        }
      }
    } catch {
      // Non-JSON message, ignore
    }
  }

  private endSession(): void {
    const duration = Math.floor((Date.now() - this.sessionStartTime) / 1000);
    this.options.onSessionEnd({
      transcript: this.transcript,
      duration,
    });
  }
}
