import { vercelPreset } from "@vercel/react-router/vite";

export default {
	presets: [vercelPreset()],
	future: { v8_middleware: true },
	ssr: false,
};
