---
title: Keyboard Shortcuts
description: Complete keyboard shortcut reference for NectoProxy.
---

# Keyboard Shortcuts

NectoProxy is designed to be efficient with keyboard-driven workflows. Keyboard shortcuts let you navigate the UI, control traffic capture, toggle panels, search, and access features without reaching for the mouse.

## Viewing Shortcuts in the UI

NectoProxy includes a built-in **keyboard shortcuts help panel** that displays all available shortcuts:

- Press **`?`** (question mark) to open the keyboard shortcuts help panel
- The panel shows all shortcuts organized by category
- Press **`?`** again or **`Escape`** to close the panel

::: tip
The keyboard shortcuts help panel always shows the most current shortcuts, including any that may have been added or changed in updates. If you forget a shortcut, press `?` for a quick reference.
:::

## Shortcut Reference

### Navigation

| Shortcut | Action |
|---|---|
| `↑` / `↓` | Navigate up/down in the traffic list |
| `Enter` | Open the detail panel for the selected entry |
| `Escape` | Close the current panel or dialog |
| `Home` | Jump to the first entry in the traffic list |
| `End` | Jump to the last entry in the traffic list |
| `Tab` | Cycle through detail panel tabs (Headers, Body, Timing, etc.) |
| `Shift+Tab` | Cycle through detail panel tabs in reverse |

### Traffic Control

| Shortcut | Action |
|---|---|
| `Ctrl+R` / `Cmd+R` | Toggle recording (start/stop capturing traffic) |
| `Ctrl+X` / `Cmd+X` | Clear all traffic in the active session |
| `Ctrl+P` / `Cmd+P` | Pause/resume the traffic list auto-scroll |
| `Space` | Toggle recording (alternative) |

::: warning
`Ctrl+X` clears all traffic in the active session without confirmation. The data is permanently removed. Make sure you export important traffic before clearing.
:::

### Panel Toggles

| Shortcut | Action |
|---|---|
| `Ctrl+1` / `Cmd+1` | Toggle the Rules panel |
| `Ctrl+2` / `Cmd+2` | Toggle the Breakpoints panel |
| `Ctrl+3` / `Cmd+3` | Toggle the Sessions panel |
| `Ctrl+,` / `Cmd+,` | Open Settings |
| `Ctrl+D` / `Cmd+D` | Toggle the Dashboard panel |

### Search & Command Palette

| Shortcut | Action |
|---|---|
| `Ctrl+F` / `Cmd+F` | Focus the filter bar |
| `Ctrl+Shift+F` / `Cmd+Shift+F` | Open global search (across all sessions) |
| `Ctrl+K` / `Cmd+K` | Open the command palette |
| `Escape` | Close search or command palette |

### Selection & Actions

| Shortcut | Action |
|---|---|
| `Ctrl+A` / `Cmd+A` | Select all entries in the traffic list |
| `Ctrl+Click` / `Cmd+Click` | Add entry to selection (multi-select) |
| `Shift+Click` | Select a range of entries |
| `Ctrl+C` / `Cmd+C` | Copy selected request URL to clipboard |
| `Ctrl+Shift+C` / `Cmd+Shift+C` | Copy selected request as cURL |
| `Ctrl+E` / `Cmd+E` | Export selected entries as HAR |
| `Delete` | Delete selected entries from the traffic list |

### Request Actions

| Shortcut | Action |
|---|---|
| `Ctrl+Enter` / `Cmd+Enter` | Replay the selected request |
| `Ctrl+G` / `Cmd+G` | Open code generation for the selected request |
| `Ctrl+Shift+D` / `Cmd+Shift+D` | Compare two selected entries (when exactly 2 are selected) |

### Breakpoint Actions

When a breakpoint has intercepted a request or response:

| Shortcut | Action |
|---|---|
| `F5` | Resume the intercepted request/response |
| `F8` | Resume the intercepted request/response (alternative) |
| `Shift+F5` | Drop the intercepted request/response |
| `Ctrl+Enter` / `Cmd+Enter` | Resume with modifications |

### Sessions

| Shortcut | Action |
|---|---|
| `Ctrl+N` / `Cmd+N` | Create a new session |
| `Ctrl+W` / `Cmd+W` | Close (delete) the current session |
| `Ctrl+Shift+]` / `Cmd+Shift+]` | Switch to the next session |
| `Ctrl+Shift+[` / `Cmd+Shift+[` | Switch to the previous session |

### Help

| Shortcut | Action |
|---|---|
| `?` | Toggle keyboard shortcuts help panel |
| `F1` | Open documentation |

## Platform Differences

NectoProxy detects your operating system and displays the appropriate modifier keys:

| Windows / Linux | macOS |
|---|---|
| `Ctrl` | `Cmd` |
| `Alt` | `Option` |
| `Shift` | `Shift` |
| `Delete` | `Delete` or `Fn+Backspace` |

::: tip
All shortcuts in this documentation show both the Windows/Linux and macOS versions separated by `/`. The NectoProxy UI automatically displays the correct key for your platform.
:::

## Quick Reference Card

Here are the most frequently used shortcuts for everyday debugging:

| Shortcut | Action |
|---|---|
| `Ctrl+K` / `Cmd+K` | Command palette -- access any feature quickly |
| `Ctrl+F` / `Cmd+F` | Focus filter bar |
| `Ctrl+Shift+F` / `Cmd+Shift+F` | Global search across all sessions |
| `Ctrl+R` / `Cmd+R` | Toggle traffic recording |
| `Ctrl+X` / `Cmd+X` | Clear traffic |
| `↑` / `↓` | Navigate traffic list |
| `Enter` | Open request details |
| `Escape` | Close panel/dialog |
| `Ctrl+Shift+C` / `Cmd+Shift+C` | Copy as cURL |
| `Ctrl+Enter` / `Cmd+Enter` | Replay request |
| `?` | Show all shortcuts |

::: details Customizing Shortcuts
Currently, NectoProxy uses a fixed set of keyboard shortcuts. Custom key bindings are planned for a future release. If a shortcut conflicts with your operating system or another application, you can use the command palette (`Ctrl+K`) as an alternative way to access any feature.
:::

---

::: info
Keyboard shortcuts are active when focus is on the NectoProxy Web UI. If focus is on an input field (such as the filter bar or a rule editor), some shortcuts may be suppressed to avoid interference with text input. Press `Escape` to return focus to the main UI and restore shortcut functionality.
:::
