import { atom } from "jotai";

type SpeakingRealtimeStatus =
	| "idle"
	| "connecting"
	| "active"
	| "ending"
	| "ended";

export const speakingRealtimeStatusAtom = atom<SpeakingRealtimeStatus>("idle");
