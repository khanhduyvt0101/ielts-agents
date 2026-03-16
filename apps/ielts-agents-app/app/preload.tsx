import { shallowEqual } from "@mantine/hooks";
import { memo } from "react";

export const Preload = memo(
	() => (
		<script
			dangerouslySetInnerHTML={{
				__html: `
(function() {
  let colorScheme = 'light';
  const theme = localStorage.getItem('ielts-agents-theme');
  if (theme === 'light' || theme === 'dark')
    colorScheme = theme;
  else if (matchMedia('(prefers-color-scheme: dark)').matches)
    colorScheme = 'dark';
  document.documentElement.classList.remove('light', 'dark');
  document.documentElement.classList.add(colorScheme);
  document.documentElement.style.colorScheme = colorScheme;
})();
`.trim(),
			}}
		/>
	),
	shallowEqual,
);
