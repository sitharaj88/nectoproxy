//! NectoProxy Desktop — a thin native shell around the `nectoproxy` CLI.
//!
//! Architecture (the "sidecar" pattern):
//!
//! 1. On startup the Rust side spawns the `nectoproxy` CLI as a child process:
//!    `nectoproxy start --no-open`.
//! 2. The CLI boots the proxy + web UI and prints its address to stdout, e.g.
//!    `Web UI: http://localhost:8889/?token=<hex>`.
//! 3. We stream the child's stdout, extract that URL (it is the only line that
//!    carries a `?token=` query string), and navigate the main window to it.
//! 4. When the app exits (window closed / quit) we kill the child so no orphaned
//!    proxy process is left listening on the port.
//!
//! The window starts on a local `index.html` splash screen and is redirected to
//! the live UI once the URL has been discovered.

use std::sync::Mutex;

use regex::Regex;
use tauri::{Manager, RunEvent, WindowEvent};
use tauri_plugin_shell::process::{CommandChild, CommandEvent};
use tauri_plugin_shell::ShellExt;

/// Holds the handle to the spawned `nectoproxy` child process so it can be
/// terminated on shutdown. `None` once it has been taken/killed.
struct SidecarState(Mutex<Option<CommandChild>>);

/// Label of the main window as declared in `tauri.conf.json`.
const MAIN_WINDOW_LABEL: &str = "main";

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .manage(SidecarState(Mutex::new(None)))
        .setup(|app| {
            let handle = app.handle().clone();
            if let Err(err) = spawn_sidecar(handle.clone()) {
                // Don't abort startup — surface the failure in the splash window
                // so the user knows what went wrong (e.g. `nectoproxy` missing).
                eprintln!("[nectoproxy-desktop] failed to start sidecar: {err}");
                report_error(&handle, &format!("Failed to start NectoProxy: {err}"));
            }
            Ok(())
        })
        // Kill the sidecar as soon as the window is closed by the user.
        .on_window_event(|window, event| {
            if let WindowEvent::CloseRequested { .. } = event {
                kill_sidecar(window.app_handle());
            }
        })
        .build(tauri::generate_context!())
        .expect("error while building the NectoProxy desktop application")
        // Also catch the process-level exit (e.g. Cmd+Q / last window closed) so
        // the child is always reaped.
        .run(|app_handle, event| {
            if let RunEvent::ExitRequested { .. } = event {
                kill_sidecar(app_handle);
            }
        });
}

/// Spawn `nectoproxy start --no-open` and stream its stdout to discover the UI
/// URL. The binary path defaults to `nectoproxy` (resolved on `PATH`) and can be
/// overridden with the `NECTOPROXY_BIN` environment variable.
fn spawn_sidecar(app: tauri::AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    let program = std::env::var("NECTOPROXY_BIN").unwrap_or_else(|_| "nectoproxy".to_string());

    // `command()` comes from the shell plugin. Spawning from Rust does not go
    // through the capability scope check (that only gates the JS `execute`/`spawn`
    // IPC commands), so this works regardless of the shell scope — but the
    // capability entry is kept for completeness / future JS use.
    let (mut rx, child) = app
        .shell()
        .command(program)
        .args(["start", "--no-open"])
        .spawn()?;

    // Remember the child so we can kill it on shutdown.
    app.state::<SidecarState>()
        .0
        .lock()
        .expect("sidecar mutex poisoned")
        .replace(child);

    // The web UI line is the only one containing a `?token=` query string.
    // Strip any ANSI colour codes first (the CLI uses `chalk`, which normally
    // disables colour when stdout is not a TTY, but we are defensive).
    let ansi = Regex::new(r"\x1b\[[0-9;]*m").expect("valid ANSI regex");
    let url_re =
        Regex::new(r"https?://[A-Za-z0-9.\-]+:\d+/\?token=[A-Za-z0-9]+").expect("valid URL regex");

    tauri::async_runtime::spawn(async move {
        let mut navigated = false;
        while let Some(event) = rx.recv().await {
            match event {
                CommandEvent::Stdout(bytes) => {
                    let raw = String::from_utf8_lossy(&bytes);
                    let clean = ansi.replace_all(&raw, "");
                    if !navigated {
                        if let Some(m) = url_re.find(&clean) {
                            navigate_main(&app, m.as_str());
                            navigated = true;
                        }
                    }
                }
                CommandEvent::Stderr(bytes) => {
                    let line = String::from_utf8_lossy(&bytes);
                    eprintln!("[nectoproxy] {}", line.trim_end());
                }
                CommandEvent::Error(err) => {
                    eprintln!("[nectoproxy] process error: {err}");
                    report_error(&app, &format!("NectoProxy process error: {err}"));
                }
                CommandEvent::Terminated(payload) => {
                    eprintln!("[nectoproxy] process terminated: {:?}", payload);
                    if !navigated {
                        report_error(
                            &app,
                            "NectoProxy exited before the UI became available. \
                             Check that the `nectoproxy` CLI is installed and runnable.",
                        );
                    }
                }
                _ => {}
            }
        }
    });

    Ok(())
}

/// Point the main window at the discovered UI URL.
fn navigate_main(app: &tauri::AppHandle, url: &str) {
    let Some(window) = app.get_webview_window(MAIN_WINDOW_LABEL) else {
        eprintln!("[nectoproxy-desktop] main window not found; cannot navigate");
        return;
    };
    match url.parse::<tauri::Url>() {
        Ok(parsed) => {
            if let Err(err) = window.navigate(parsed) {
                eprintln!("[nectoproxy-desktop] navigate failed: {err}");
            }
        }
        Err(err) => eprintln!("[nectoproxy-desktop] could not parse URL '{url}': {err}"),
    }
}

/// Show an error message inside the splash window via a tiny JS injection.
fn report_error(app: &tauri::AppHandle, message: &str) {
    if let Some(window) = app.get_webview_window(MAIN_WINDOW_LABEL) {
        // JSON-encode the message so it is safe to embed inside the script.
        let encoded = serde_json::to_string(message).unwrap_or_else(|_| "\"error\"".to_string());
        let script = format!(
            "if (window.nectoReportError) {{ window.nectoReportError({encoded}); }}"
        );
        let _ = window.eval(&script);
    }
}

/// Terminate the sidecar child if it is still running. Idempotent.
fn kill_sidecar(app: &tauri::AppHandle) {
    if let Some(child) = app
        .state::<SidecarState>()
        .0
        .lock()
        .expect("sidecar mutex poisoned")
        .take()
    {
        if let Err(err) = child.kill() {
            eprintln!("[nectoproxy-desktop] failed to kill sidecar: {err}");
        }
    }
}
