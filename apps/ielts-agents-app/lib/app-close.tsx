import { CircleSlashIcon, HouseIcon } from "lucide-react";

import { Button } from "~/components/ui/button";
import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "~/components/ui/empty";

export function AppClose() {
	return (
		<Empty>
			<EmptyHeader>
				<EmptyMedia variant="icon">
					<CircleSlashIcon />
				</EmptyMedia>
				<EmptyTitle>No Further Action</EmptyTitle>
				<EmptyDescription>You can safely close this tab.</EmptyDescription>
			</EmptyHeader>
			<EmptyContent>
				<Button asChild variant="ghost">
					<a href="/">
						<HouseIcon />
						Home Page
					</a>
				</Button>
			</EmptyContent>
		</Empty>
	);
}
