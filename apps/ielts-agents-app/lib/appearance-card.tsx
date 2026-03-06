import { SettingsCard } from "@daveyplate/better-auth-ui";

import { Label } from "~/components/ui/label";
import { RadioGroup, RadioGroupItem } from "~/components/ui/radio-group";

import { appearanceOptions } from "#./lib/appearance-options.ts";
import { isTheme } from "#./lib/is-theme.ts";
import { SettingsTitle } from "#./lib/settings-title.tsx";
import { useTheme } from "#./lib/use-theme.ts";

export function AppearanceCard() {
  const { theme, setTheme } = useTheme();
  return (
    <SettingsCard
      description="Choose how the app looks to you."
      title={<SettingsTitle>Appearance</SettingsTitle>}
    >
      <RadioGroup
        className="px-6"
        value={theme}
        onValueChange={(value) => {
          if (isTheme(value)) setTheme(value);
        }}
      >
        {appearanceOptions.map((option) => (
          <div key={option.value} className="flex items-center gap-3">
            <RadioGroupItem
              aria-labelledby={`${option.value}-appearance-label`}
              id={`${option.value}-appearance-item`}
              value={option.value}
            />
            <Label
              className="flex items-center gap-1.5"
              htmlFor={`${option.value}-appearance-item`}
              id={`${option.value}-appearance-label`}
            >
              <option.icon className="size-4" />
              {option.label}
            </Label>
          </div>
        ))}
      </RadioGroup>
    </SettingsCard>
  );
}
