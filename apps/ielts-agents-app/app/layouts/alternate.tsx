import { Outlet } from "react-router";

import { AlternateLayout } from "#./lib/alternate-layout.tsx";

export default function Component() {
	return (
		<AlternateLayout>
			<Outlet />
		</AlternateLayout>
	);
}
