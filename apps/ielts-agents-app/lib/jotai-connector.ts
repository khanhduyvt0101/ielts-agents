import { useSetAtom } from "jotai";
import { useHydrateAtoms } from "jotai/utils";
import { queryClientAtom } from "jotai-tanstack-query";
import { useLayoutEffect } from "react";
import {
  useLocation,
  useNavigate,
  useNavigation,
  useRevalidator,
} from "react-router";

import { hydrationAtom } from "#./lib/hydration-atom.ts";
import { locationAtom } from "#./lib/location-atom.ts";
import { navigationAtom } from "#./lib/navigation-atom.ts";
import { navigationCountAtom } from "#./lib/navigation-count-atom.ts";
import { navigatorAtom } from "#./lib/navigator-atom.ts";
import { queryClient } from "#./lib/query-client.ts";
import { revalidatorAtom } from "#./lib/revalidator-atom.ts";

export function JotaiConnector() {
  const location = useLocation();
  const navigation = useNavigation();
  const revalidator = useRevalidator();
  const navigate = useNavigate();
  useHydrateAtoms([
    [queryClientAtom, queryClient],
    [locationAtom, location],
    [navigationAtom, navigation],
    [revalidatorAtom, revalidator],
    [navigatorAtom, { navigate }],
    [hydrationAtom],
  ]);
  const setQueryClient = useSetAtom(queryClientAtom);
  useLayoutEffect(() => {
    setQueryClient(queryClient);
  }, [setQueryClient]);
  const setLocation = useSetAtom(locationAtom);
  useLayoutEffect(() => {
    setLocation(location);
  }, [location, setLocation]);
  const setNavigation = useSetAtom(navigationAtom);
  const setNavigationCount = useSetAtom(navigationCountAtom);
  useLayoutEffect(() => {
    setNavigation(navigation);
    setNavigationCount((navigationCount) => navigationCount + 1);
  }, [navigation, setNavigation, setNavigationCount]);
  const setRevalidator = useSetAtom(revalidatorAtom);
  useLayoutEffect(() => {
    setRevalidator(revalidator);
  }, [revalidator, setRevalidator]);
  const setNavigator = useSetAtom(navigatorAtom);
  useLayoutEffect(() => {
    setNavigator({ navigate });
  }, [navigate, setNavigator]);
  const setHydration = useSetAtom(hydrationAtom);
  useLayoutEffect(() => {
    setHydration();
  }, [setHydration]);
  return null;
}
