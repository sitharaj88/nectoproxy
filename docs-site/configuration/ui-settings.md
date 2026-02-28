# UI Settings

NectoProxy's Web UI is designed to be comfortable for extended debugging sessions. This page covers the appearance settings you can customize.

## Theme

NectoProxy supports three theme modes:

| Mode | Behavior |
|------|----------|
| **Dark** | A dark color scheme optimized for low-light environments and prolonged use. Uses dark gray backgrounds with light text. |
| **Light** | A light color scheme with white backgrounds and dark text, suitable for bright environments. |
| **System** | Automatically follows your operating system's appearance preference. If your OS switches between light and dark mode, NectoProxy switches with it. |

### Default Theme

The default theme is **dark**. On first launch, NectoProxy renders in dark mode unless you change the setting.

### Changing the Theme

There are two ways to change the theme:

#### 1. Header Toggle Button

The quickest way to switch themes is the **sun/moon toggle button** in the top-right area of the header toolbar:

- Click the **Sun icon** to switch to light mode.
- Click the **Moon icon** to switch to dark mode.

This button cycles between light and dark modes instantly.

#### 2. Settings Panel

For full control -- including the **System** option -- open the Settings panel (gear icon in the header) and scroll to the **Appearance** section:

1. Click the **gear icon** in the header toolbar.
2. Scroll down to **Appearance**.
3. Select your preferred theme from the dropdown: **Dark**, **Light**, or **System**.
4. Click **Save Changes**.

### Persistence

Theme preference is stored in the browser's `localStorage`, so it persists across page reloads and browser sessions. Each browser profile maintains its own independent theme preference.

::: tip
If you use NectoProxy on multiple machines or browsers, you will need to set your theme preference in each one individually. The theme setting is local to the browser, not stored in the NectoProxy database.
:::

### Settings API

You can also change the theme programmatically through the Settings API:

```bash
# Set theme to light
curl -X PUT http://localhost:8889/api/settings/theme \
  -H "Content-Type: application/json" \
  -d '{"value": "light"}'

# Set theme to system
curl -X PUT http://localhost:8889/api/settings/theme \
  -H "Content-Type: application/json" \
  -d '{"value": "system"}'
```

::: details How Does "System" Mode Work?
When set to `system`, NectoProxy uses the CSS `prefers-color-scheme` media query to detect your operating system's current theme. It registers a listener for changes, so if you switch your OS from light to dark mode (or vice versa) while NectoProxy is open, the UI updates in real time without a page refresh.
:::

## Summary

| Setting | Default | Options | Persisted In | Scope |
|---------|---------|---------|-------------|-------|
| Theme | `dark` | `dark`, `light`, `system` | Browser `localStorage` | Per-browser |
