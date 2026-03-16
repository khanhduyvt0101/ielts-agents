import { AuthUIContext } from "@daveyplate/better-auth-ui";
import { useContext } from "react";

export function useSession() {
	const { hooks } = useContext(AuthUIContext);
	return hooks.useSession();
}
