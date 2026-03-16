import { useChat } from "@ai-sdk/react";
import { MicIcon, SendIcon, SquareIcon } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "~/components/ui/button";
import { ScrollArea } from "~/components/ui/scroll-area";

import { handleUnknownError } from "#./lib/handle-unknown-error.ts";
import { ScrollToBottomConversationEvent } from "#./lib/scroll-to-bottom-conversation-event.ts";
import { useChatContext } from "#./lib/use-chat-context.ts";

// Web Speech API types
interface SpeechRecognitionResult {
  readonly isFinal: boolean;
  readonly length: number;
  readonly 0: { readonly transcript: string; readonly confidence: number };
}

interface SpeechRecognitionResultList {
  readonly length: number;
  readonly [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResultEvent {
  readonly resultIndex: number;
  readonly results: SpeechRecognitionResultList;
}

interface SpeechRecognitionApi extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
}

type SpeechRecognitionCtor = new () => SpeechRecognitionApi;

function getRecognitionCtor(): SpeechRecognitionCtor | undefined {
  if (typeof document === "undefined") return undefined;
  // SpeechRecognition requires global scope access (browser-only API)
  /* eslint-disable no-restricted-globals */
  const g = window as unknown as Record<string, unknown>;
  const sr = g.SpeechRecognition as SpeechRecognitionCtor | undefined;
  const webkit = g.webkitSpeechRecognition as SpeechRecognitionCtor | undefined;
  /* eslint-enable no-restricted-globals */
  return sr ?? webkit;
}

type RecorderState = "idle" | "recording" | "preview" | "sending";

export function SpeakingRecorder() {
  const [state, setState] = useState<RecorderState>("idle");
  const [transcript, setTranscript] = useState("");
  const recognitionRef = useRef<SpeechRecognitionApi | null>(null);
  const fullTranscriptRef = useRef("");

  const chat = useChatContext();
  const { sendMessage, status } = useChat({ chat });

  const isSupported = !!getRecognitionCtor();
  const isChatBusy = status === "streaming" || status === "submitted";

  const startRecording = useCallback(() => {
    const Ctor = getRecognitionCtor();
    if (!Ctor) return;

    const recognition = new Ctor();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    fullTranscriptRef.current = "";
    setTranscript("");

    const handleResult = (event: Event) => {
      const e = event as unknown as SpeechRecognitionResultEvent;
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const result = e.results[i];
        if (result.isFinal) {
          const text = result[0].transcript.trim();
          if (text) {
            fullTranscriptRef.current +=
              (fullTranscriptRef.current ? " " : "") + text;
            setTranscript(fullTranscriptRef.current);
          }
        }
      }
    };
    recognition.addEventListener("result", handleResult);

    recognition.addEventListener("error", () => {
      setState("idle");
      recognitionRef.current = null;
    });

    recognition.addEventListener("end", () => {
      // Move to preview if we have text, otherwise back to idle
      setState(fullTranscriptRef.current.trim() ? "preview" : "idle");
      recognitionRef.current = null;
    });

    recognitionRef.current = recognition;
    setState("recording");
    recognition.start();
  }, []);

  const stopRecording = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    // State will be set by the "end" event handler
  }, []);

  const sendAnswer = useCallback(async () => {
    if (!transcript.trim()) return;

    setState("sending");
    try {
      const messageText = `Here is my spoken answer:\n\n${transcript.trim()}\n\nI have completed my answer. Please continue with the next question, or if the test is complete, please evaluate my speaking performance.`;
      await sendMessage({ text: messageText });
      dispatchEvent(new ScrollToBottomConversationEvent());
      setTranscript("");
      fullTranscriptRef.current = "";
      setState("idle");
    } catch (error) {
      handleUnknownError(error);
      setState("preview");
    }
  }, [transcript, sendMessage]);

  const discard = useCallback(() => {
    setTranscript("");
    fullTranscriptRef.current = "";
    setState("idle");
  }, []);

  useEffect(
    () => () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
        recognitionRef.current = null;
      }
    },
    [],
  );

  if (!isSupported) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 p-4">
        <MicIcon className="size-8 text-muted-foreground/50" />
        <p className="text-center text-xs text-muted-foreground">
          Speech recognition is not supported in this browser. Please use Chrome
          or Edge.
        </p>
      </div>
    );
  }

  if (state === "idle") {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-4">
        <Button
          className="size-16 rounded-full"
          disabled={isChatBusy}
          size="icon"
          title="Click to start speaking"
          onClick={startRecording}
        >
          <MicIcon className="size-6" />
        </Button>
        <p className="text-center text-xs text-muted-foreground">
          {isChatBusy
            ? "Wait for the examiner to finish..."
            : "Click to speak your answer"}
        </p>
      </div>
    );
  }

  if (state === "recording") {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-4">
        <Button
          className="size-16 animate-pulse rounded-full"
          size="icon"
          title="Click to stop recording"
          variant="destructive"
          onClick={stopRecording}
        >
          <SquareIcon className="size-6" />
        </Button>
        <p className="text-center text-xs text-muted-foreground">
          Listening... Click to stop
        </p>
        {transcript && (
          <p className="max-w-xs text-center text-sm text-muted-foreground italic">
            {transcript}
          </p>
        )}
      </div>
    );
  }

  // preview or sending
  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="shrink-0 border-b px-4 py-2">
        <span className="text-xs font-medium text-muted-foreground">
          Your answer
        </span>
      </div>
      <ScrollArea className="min-h-0 flex-1 p-4">
        <p className="text-sm">{transcript}</p>
      </ScrollArea>
      <div className="flex shrink-0 items-center justify-center gap-2 border-t px-4 py-3">
        <Button
          disabled={state === "sending"}
          size="sm"
          variant="ghost"
          onClick={discard}
        >
          Discard
        </Button>
        <Button
          className="gap-2"
          disabled={state === "sending"}
          size="sm"
          onClick={() => void sendAnswer()}
        >
          <SendIcon className="size-3.5" />
          {state === "sending" ? "Sending..." : "Send answer"}
        </Button>
      </div>
    </div>
  );
}
