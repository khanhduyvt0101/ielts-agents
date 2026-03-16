import type { Chat } from "@ai-sdk/react";
import type { IeltsAgentsMessage } from "ielts-agents-api/types";

import { createContext } from "react";

export const ChatContext = createContext<Chat<IeltsAgentsMessage> | undefined>(
	undefined,
);
