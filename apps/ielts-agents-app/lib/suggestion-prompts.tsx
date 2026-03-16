import { Button } from "~/components/ui/button";

interface SuggestionPromptsProps {
	suggestions: string[];
	onSelect: (suggestion: string) => void;
	disabled?: boolean;
}

export function SuggestionPrompts({
	suggestions,
	onSelect,
	disabled,
}: SuggestionPromptsProps) {
	return (
		<div className="mt-4 flex w-full max-w-xl flex-wrap justify-center gap-2 px-4 sm:px-0">
			{suggestions.map((suggestion) => (
				<Button
					key={suggestion}
					className="h-auto max-w-full rounded-full px-3 py-2 text-xs whitespace-normal sm:px-4"
					disabled={disabled}
					size="sm"
					variant="outline"
					onClick={() => {
						onSelect(suggestion);
					}}
				>
					{suggestion}
				</Button>
			))}
		</div>
	);
}
