import { z } from "zod";

export const bandScoreSchema = z.enum([
	"5.0",
	"5.5",
	"6.0",
	"6.5",
	"7.0",
	"7.5",
	"8.0",
	"8.5",
	"9.0",
]);
