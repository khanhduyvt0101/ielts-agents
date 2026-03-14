# Reinstall shadcn Components

Reinstall all shadcn/ui and AI Elements components to get the latest styles.

## Instructions

### For chatacademia-app:

1. **Delete existing component folders:**

   ```bash
   rm -rf apps/chatacademia-app/components/ui
   rm -rf apps/chatacademia-app/components/ai-elements
   ```

2. **Reinstall AI Elements:**

   ```bash
   pnpm -F chatacademia-app exec shadcn add @ai-elements/all --overwrite
   ```

3. **Reinstall shadcn/ui components:**

   > Note: The component list below may differ depending on what UI components exist at the time of reinstall. List the existing components before deleting and reinstall those.

   ```bash
   pnpm -F chatacademia-app exec shadcn add alert alert-dialog avatar badge breadcrumb button card carousel checkbox collapsible command dialog dropdown-menu empty hover-card input label popover progress radio-group resizable scroll-area select separator sheet sidebar skeleton slider sonner spinner switch table tabs textarea toggle toggle-group tooltip --overwrite
   ```

4. **Reinstall @8starlabs-ui components:**

   ```bash
   pnpm -F chatacademia-app exec shadcn add @8starlabs-ui/scroll-fade --overwrite
   ```

5. **Restore custom components from git:**
   - `streaming-indicator.tsx` - custom AI streaming indicator (not in any registry)

   ```bash
   git checkout HEAD -- apps/chatacademia-app/components/ai-elements/streaming-indicator.tsx
   ```

6. **Remove "use client" directives from all components:**

   ```bash
   for file in apps/chatacademia-app/components/ui/*.tsx apps/chatacademia-app/components/ai-elements/*.tsx; do
     if [ -f "$file" ]; then
       if head -1 "$file" | grep -q '"use client"'; then
         tail -n +2 "$file" > "$file.tmp" && mv "$file.tmp" "$file"
       fi
     fi
   done
   # Remove leading empty lines
   for file in apps/chatacademia-app/components/ui/*.tsx apps/chatacademia-app/components/ai-elements/*.tsx; do
     if [ -f "$file" ]; then
       awk 'NF{found=1} found' "$file" > "$file.tmp" && mv "$file.tmp" "$file"
     fi
   done
   ```

7. **Fix imports and usage:**
   - **sonner.tsx**: Replace next-themes with the custom useTheme hook:
     - Change `import { useTheme } from "next-themes"` to `import { useTheme } from "~/lib/use-theme"`
     - Change `const { theme = "system" } = useTheme()` to `const { colorScheme } = useTheme()`
     - Change `theme={theme as ToasterProps["theme"]}` to `theme={colorScheme}`
   - **chain-of-thought.tsx, reasoning.tsx**: Replace `import { useControllableState } from "@radix-ui/react-use-controllable-state"` with `import { useControllableState } from "radix-ui/internal"`

8. **Fix resizable.tsx for react-resizable-panels v4:**
   - Change imports from `PanelGroup`, `Panel`, `PanelResizeHandle` to `Group`, `Panel`, `Separator`

9. **Remove unused @ts-expect-error directives** in confirmation.tsx and tool.tsx (AI SDK v6 now has approval-requested state)

10. **Remove unused packages:**
    ```bash
    pnpm -F chatacademia-app remove next-themes @radix-ui/react-use-controllable-state
    ```

### For chatacademia-website:

1. **Delete and reinstall UI components:**

   > Note: The component list below may differ depending on what UI components exist at the time of reinstall. List the existing components before deleting and reinstall those.

   ```bash
   rm -rf apps/chatacademia-website/components/ui
   pnpm -F chatacademia-website exec shadcn add sonner --overwrite
   ```

   Note: Keep `"use client"` and `next-themes` for Next.js

### Verification:

```bash
pnpm exec nx run-many -t typecheck,lint
```

## Notes

- The `faceted.tsx` component is not used and should not be reinstalled
- `streaming-indicator.tsx` is a custom component not in any registry and must be restored from git
- chatacademia-app uses a custom `useTheme` hook from `~/lib/use-theme` that returns `{ theme, setTheme, colorScheme }` instead of next-themes
- chatacademia-website is a Next.js app and uses `next-themes` normally
