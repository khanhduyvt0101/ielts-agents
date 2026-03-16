import type {
	InferUITools,
	Output,
	ToolLoopAgentSettings,
	ToolSet,
	UIMessage,
	UIMessageStreamWriter,
} from "ai";
import { ToolLoopAgent } from "ai";
import type { Except } from "type-fest";
import type { z } from "zod";
import type { CreditsUsage } from "#./lib/credits-usage.ts";

type ToolLoopAgentPrepareCallMethod<
	CALL_OPTIONS = never,
	TOOLS extends ToolSet = {},
	OUTPUT extends Output.Output = never,
> = NonNullable<
	ToolLoopAgentSettings<CALL_OPTIONS, TOOLS, OUTPUT>["prepareCall"]
>;

type ToolLoopAgentPrepareCallInput<
	CALL_OPTIONS = never,
	TOOLS extends ToolSet = {},
	OUTPUT extends Output.Output = never,
> = Parameters<ToolLoopAgentPrepareCallMethod<CALL_OPTIONS, TOOLS, OUTPUT>>[0];

type ToolLoopAgentPrepareCallOutput<
	CALL_OPTIONS = never,
	TOOLS extends ToolSet = {},
	OUTPUT extends Output.Output = never,
> = ReturnType<ToolLoopAgentPrepareCallMethod<CALL_OPTIONS, TOOLS, OUTPUT>>;

interface CustomAgentContext<
	TOOLS extends ToolSet = {},
	METADATA extends z.ZodType = z.ZodUndefined,
	DATA_SCHEMAS extends Record<string, z.ZodType> = {},
> {
	id: number;
	creditsUsage: CreditsUsage;
	writer: UIMessageStreamWriter<
		UIMessage<
			z.infer<METADATA>,
			z.infer<z.ZodObject<DATA_SCHEMAS>>,
			InferUITools<TOOLS>
		>
	>;
}

type CustomAgentPrepareCallInput<
	CALL_OPTIONS = never,
	TOOLS extends ToolSet = {},
	OUTPUT extends Output.Output = never,
	METADATA extends z.ZodType = z.ZodUndefined,
	DATA_SCHEMAS extends Record<string, z.ZodType> = {},
> = Except<
	ToolLoopAgentPrepareCallInput<CALL_OPTIONS, TOOLS, OUTPUT>,
	"experimental_context"
> & {
	experimental_context: CustomAgentContext<TOOLS, METADATA, DATA_SCHEMAS>;
};

export type CustomAgentSettings<
	CALL_OPTIONS = never,
	TOOLS extends ToolSet = {},
	OUTPUT extends Output.Output = never,
	METADATA extends z.ZodType = z.ZodUndefined,
	DATA_SCHEMAS extends Record<string, z.ZodType> = {},
> = Except<
	ToolLoopAgentSettings<CALL_OPTIONS, TOOLS, OUTPUT>,
	"prepareCall"
> & {
	metadataSchema: METADATA;
	dataSchemas: DATA_SCHEMAS;
	prepareCall: (
		options: CustomAgentPrepareCallInput<
			CALL_OPTIONS,
			TOOLS,
			OUTPUT,
			METADATA,
			DATA_SCHEMAS
		>,
	) => ToolLoopAgentPrepareCallOutput<CALL_OPTIONS, TOOLS, OUTPUT>;
};

export class CustomAgent<
	CALL_OPTIONS = never,
	TOOLS extends ToolSet = {},
	OUTPUT extends Output.Output = never,
	METADATA extends z.ZodType = z.ZodUndefined,
	DATA_SCHEMAS extends Record<string, z.ZodType> = {},
> extends ToolLoopAgent<CALL_OPTIONS, TOOLS, OUTPUT> {
	declare context: CustomAgentContext<TOOLS, METADATA, DATA_SCHEMAS>;
	declare message: UIMessage<
		z.infer<METADATA>,
		z.infer<z.ZodObject<DATA_SCHEMAS>>,
		InferUITools<TOOLS>
	>;
	readonly metadataSchema: METADATA;
	readonly dataSchemas: DATA_SCHEMAS;
	constructor({
		metadataSchema,
		dataSchemas,
		...settings
	}: CustomAgentSettings<CALL_OPTIONS, TOOLS, OUTPUT, METADATA, DATA_SCHEMAS>) {
		// @ts-expect-error The custom prepareCall is compatible with the ToolLoopAgent default prepareCall
		super(settings);
		this.metadataSchema = metadataSchema;
		this.dataSchemas = dataSchemas;
	}
}
