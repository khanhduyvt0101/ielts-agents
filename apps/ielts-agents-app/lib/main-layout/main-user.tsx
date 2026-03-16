import { UserButton } from "@daveyplate/better-auth-ui";
import { ExternalLinkIcon, MessageCircleIcon } from "lucide-react";

import { useSidebar } from "~/components/ui/sidebar";

const additionalLinks = [
	<a key="crisp" href="/crisp" rel="noopener noreferrer" target="_blank">
		<MessageCircleIcon />
		Support
		<ExternalLinkIcon className="ml-auto size-4 text-muted-foreground" />
	</a>,
];

export function MainUser() {
	const { state } = useSidebar();
	switch (state) {
		case "expanded": {
			return (
				<UserButton
					additionalLinks={additionalLinks}
					className="justify-start overflow-x-hidden"
					size="default"
					variant="ghost"
				/>
			);
		}
		case "collapsed": {
			return (
				<UserButton
					additionalLinks={additionalLinks}
					align="end"
					side="right"
					size="icon"
				/>
			);
		}
	}
}
