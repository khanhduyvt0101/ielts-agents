import path from "node:path";

import { distPrefix } from "#./lib/dist-prefix.ts";
import { libPrefix } from "#./lib/lib-prefix.ts";

export function getDistExport(entryPoint: string) {
	if (entryPoint.startsWith(distPrefix)) return entryPoint;
	const withoutPrefix = entryPoint.slice(libPrefix.length);
	if (withoutPrefix.endsWith(".d.ts")) return `${distPrefix}${withoutPrefix}`;
	const extname = path.extname(withoutPrefix);
	if (extname === ".ts" || extname === ".tsx")
		return `${distPrefix}${withoutPrefix.slice(0, -extname.length)}.js`;
	throw new Error(`Failed to find ${distPrefix}* for ${entryPoint}`);
}
