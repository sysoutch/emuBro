use super::*;
use serde_json::json;
use std::net::UdpSocket;
use std::process::{Child, Command, Stdio};
use std::sync::{Mutex, OnceLock};
use std::time::Duration;
use tauri::{Manager, PhysicalPosition, Position, WebviewUrl};
use url::Url;

#[cfg(windows)]
use std::os::windows::process::CommandExt;

#[cfg(windows)]
const CREATE_NO_WINDOW: u32 = 0x08000000;

const SESSION_OVERLAY_LABEL: &str = "game-session-overlay";
const SESSION_OVERLAY_WIDTH: f64 = 84.0;
const SESSION_OVERLAY_HEIGHT: f64 = 84.0;
const SESSION_OVERLAY_MARGIN: i32 = 16;
static SESSION_OVERLAY_SIDECAR: OnceLock<Mutex<Option<Child>>> = OnceLock::new();
static SESSION_OVERLAY_IPC: OnceLock<OverlayIpcRuntime> = OnceLock::new();
static SESSION_PROCESS_MONITOR_STARTED: OnceLock<()> = OnceLock::new();

const OVERLAY_IPC_SHOW_LAUNCHER: &str = "show-launcher";
const OVERLAY_IPC_HIDE_OVERLAY: &str = "hide-overlay";
const OVERLAY_IPC_QUIT_GAME: &str = "quit-game";
const OVERLAY_IPC_ALT_ENTER: &str = "send-hotkey:alt-enter";
const OVERLAY_IPC_CAPTURE_SCREENSHOT: &str = "capture-screenshot";

struct OverlayIpcRuntime {
    addr: String,
}

fn apply_windows_hidden_process_flags(command: &mut Command) {
    #[cfg(windows)]
    {
        command.creation_flags(CREATE_NO_WINDOW);
    }
}

fn overlay_sidecar_handle() -> &'static Mutex<Option<Child>> {
    SESSION_OVERLAY_SIDECAR.get_or_init(|| Mutex::new(None))
}

fn close_webview_overlay_if_present(app_handle: &tauri::AppHandle) {
    if let Some(existing) = app_handle.get_webview_window(SESSION_OVERLAY_LABEL) {
        let _ = existing.close();
    }
}

fn hide_overlay_when_no_active_sessions(app_handle: &tauri::AppHandle) {
    if has_active_game_session() {
        return;
    }
    let _ = stop_overlay_sidecar_process();
    close_webview_overlay_if_present(app_handle);
}

fn is_process_running(process_id: u32) -> bool {
    if process_id == 0 {
        return false;
    }

    #[cfg(windows)]
    {
        let mut command = Command::new("tasklist");
        command
            .arg("/FI")
            .arg(format!("PID eq {}", process_id))
            .arg("/FO")
            .arg("CSV")
            .arg("/NH");
        apply_windows_hidden_process_flags(&mut command);
        let output = command.output();
        let Ok(output) = output else {
            return true;
        };
        let stdout = String::from_utf8_lossy(&output.stdout).to_lowercase();
        if stdout.contains("no tasks are running") {
            return false;
        }
        return output.status.success();
    }

    #[cfg(not(windows))]
    {
        let status = Command::new("kill")
            .arg("-0")
            .arg(process_id.to_string())
            .status();
        status.map(|value| value.success()).unwrap_or(false)
    }
}

fn ensure_session_process_monitor(app_handle: &tauri::AppHandle) {
    if SESSION_PROCESS_MONITOR_STARTED.set(()).is_err() {
        return;
    }

    let app_handle_clone = app_handle.clone();
    std::thread::spawn(move || loop {
        std::thread::sleep(Duration::from_millis(2000));
        let process_ids = game_session_process_ids();
        if process_ids.is_empty() {
            continue;
        }

        let mut changed = false;
        for process_id in process_ids {
            if is_process_running(process_id) {
                continue;
            }
            if clear_game_session_process(process_id) {
                changed = true;
            }
        }

        if changed {
            hide_overlay_when_no_active_sessions(&app_handle_clone);
        }
    });
}

#[cfg(windows)]
fn spawn_overlay_sidecar_process(ipc_addr: Option<&str>) -> Result<Child, String> {
    let current_exe = std::env::current_exe()
        .map_err(|error| format!("Failed to resolve current executable: {}", error))?;
    let mut command = Command::new(current_exe);
    command
        .arg("--overlay-sidecar")
        .arg(format!("--parent-pid={}", std::process::id()))
        .stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::null());
    apply_windows_hidden_process_flags(&mut command);
    if let Some(addr) = ipc_addr {
        command.arg(format!("--overlay-ipc={}", addr.trim()));
    }
    command
        .spawn()
        .map_err(|error| format!("Failed to spawn overlay sidecar process: {}", error))
}

#[cfg(not(windows))]
fn spawn_overlay_sidecar_process(_ipc_addr: Option<&str>) -> Result<Child, String> {
    Err("Native overlay sidecar is currently implemented for Windows only.".into())
}

fn ensure_overlay_sidecar_process(app_handle: &tauri::AppHandle) -> Result<bool, String> {
    if !cfg!(windows) {
        return Ok(false);
    }

    ensure_session_process_monitor(app_handle);

    let lock = overlay_sidecar_handle();
    let mut guard = lock
        .lock()
        .map_err(|_| "Overlay sidecar process lock is poisoned".to_string())?;

    if let Some(child) = guard.as_mut() {
        match child.try_wait() {
            Ok(None) => return Ok(true),
            Ok(Some(_)) => {
                *guard = None;
            }
            Err(error) => {
                eprintln!("[overlay] sidecar try_wait failed: {}", error);
                *guard = None;
            }
        }
    }

    let ipc_addr = ensure_overlay_ipc_listener(app_handle)?;
    let child = spawn_overlay_sidecar_process(Some(&ipc_addr))?;
    *guard = Some(child);
    Ok(true)
}

fn ensure_overlay_ipc_listener(app_handle: &tauri::AppHandle) -> Result<String, String> {
    if let Some(runtime) = SESSION_OVERLAY_IPC.get() {
        return Ok(runtime.addr.clone());
    }

    let socket = UdpSocket::bind("127.0.0.1:0")
        .map_err(|error| format!("Failed to bind overlay IPC socket: {}", error))?;
    let addr = socket
        .local_addr()
        .map_err(|error| format!("Failed to resolve overlay IPC address: {}", error))?
        .to_string();

    let app_handle_clone = app_handle.clone();
    std::thread::spawn(move || overlay_ipc_listener_loop(socket, app_handle_clone));

    let runtime = OverlayIpcRuntime { addr: addr.clone() };
    let _ = SESSION_OVERLAY_IPC.set(runtime);
    Ok(
        SESSION_OVERLAY_IPC
            .get()
            .map(|value| value.addr.clone())
            .unwrap_or(addr),
    )
}

fn overlay_ipc_listener_loop(socket: UdpSocket, app_handle: tauri::AppHandle) {
    let mut buffer = [0u8; 512];
    loop {
        match socket.recv_from(&mut buffer) {
            Ok((size, _source)) => {
                if size == 0 {
                    continue;
                }
                let command = String::from_utf8_lossy(&buffer[..size]).trim().to_string();
                handle_overlay_ipc_command(&app_handle, command.as_str());
            }
            Err(error) => {
                eprintln!("[overlay] IPC listener stopped: {}", error);
                break;
            }
        }
    }
}

fn handle_overlay_ipc_command(app_handle: &tauri::AppHandle, command: &str) {
    match command {
        OVERLAY_IPC_SHOW_LAUNCHER => {
            let _ = show_launcher_app_handle(app_handle);
        }
        OVERLAY_IPC_HIDE_OVERLAY => {
            let _ = stop_overlay_sidecar_process();
        }
        OVERLAY_IPC_QUIT_GAME => {
            let result = quit_game_session();
            if !result
                .get("success")
                .and_then(|value| value.as_bool())
                .unwrap_or(false)
            {
                eprintln!(
                    "[overlay] quit requested but failed: {}",
                    result
                        .get("message")
                        .and_then(|value| value.as_str())
                        .unwrap_or("unknown error")
                );
            }
            hide_overlay_when_no_active_sessions(app_handle);
        }
        OVERLAY_IPC_ALT_ENTER => {
            std::thread::spawn(|| {
                if let Err(error) = send_alt_enter_hotkey() {
                    eprintln!("[overlay] alt-enter failed: {}", error);
                }
            });
        }
        OVERLAY_IPC_CAPTURE_SCREENSHOT => {
            std::thread::spawn(|| {
                if let Err(error) = capture_screenshot("overlay-sidecar") {
                    eprintln!("[overlay] screenshot failed: {}", error);
                }
            });
        }
        _ => {
            eprintln!("[overlay] unknown IPC command: {}", command);
        }
    }
}

fn stop_overlay_sidecar_process() -> bool {
    let lock = overlay_sidecar_handle();
    let Ok(mut guard) = lock.lock() else {
        return false;
    };
    let Some(mut child) = guard.take() else {
        return false;
    };

    let running = match child.try_wait() {
        Ok(None) => true,
        Ok(Some(_)) => false,
        Err(_) => true,
    };

    if running {
        let _ = child.kill();
    }
    let _ = child.wait();
    true
}

fn resolve_overlay_url() -> WebviewUrl {
    if cfg!(debug_assertions) {
        if let Ok(base) = std::env::var("TAURI_DEV_URL") {
            let trimmed = base.trim().trim_end_matches('/');
            if !trimmed.is_empty() {
                let candidate = format!("{trimmed}/game-session-overlay.html");
                if let Ok(url) = Url::parse(&candidate) {
                    return WebviewUrl::External(url);
                }
            }
        }
        if let Ok(url) = Url::parse("http://localhost:1420/game-session-overlay.html") {
            return WebviewUrl::External(url);
        }
    }

    WebviewUrl::App("game-session-overlay.html".into())
}

fn resolve_overlay_position(window: &Window) -> Option<PhysicalPosition<i32>> {
    let monitor = window
        .current_monitor()
        .ok()
        .flatten()
        .or_else(|| window.primary_monitor().ok().flatten())?;
    let size = monitor.size();
    let origin = monitor.position();
    let x = origin.x + size.width as i32 - SESSION_OVERLAY_WIDTH as i32 - SESSION_OVERLAY_MARGIN;
    let y = origin.y + SESSION_OVERLAY_MARGIN;
    Some(PhysicalPosition::new(x, y))
}

pub(crate) fn ensure_overlay_window(window: &Window) -> Result<Value, String> {
    let app_handle = window.app_handle().clone();
    match ensure_overlay_sidecar_process(&app_handle) {
        Ok(true) => {
            close_webview_overlay_if_present(&app_handle);
            return Ok(json!({
                "success": true,
                "label": "game-session-overlay-sidecar",
                "sidecar": true
            }));
        }
        Ok(false) => {}
        Err(error) => {
            eprintln!("[overlay] sidecar spawn failed: {}", error);
        }
    }

    if let Some(existing) = app_handle.get_webview_window(SESSION_OVERLAY_LABEL) {
        if let Some(position) = resolve_overlay_position(window) {
            let _ = existing.set_position(Position::Physical(position));
        }
        let _ = existing.set_always_on_top(true);
        let _ = existing.show();
        eprintln!("[overlay] reused existing {}", SESSION_OVERLAY_LABEL);
        return Ok(json!({
            "success": true,
            "label": SESSION_OVERLAY_LABEL,
            "reused": true
        }));
    }

    let overlay_url = resolve_overlay_url();
    eprintln!("[overlay] creating {} with url {}", SESSION_OVERLAY_LABEL, overlay_url);
    let builder = tauri::WebviewWindowBuilder::new(
        &app_handle,
        SESSION_OVERLAY_LABEL,
        overlay_url,
    )
    .title("emuBro Overlay")
    .inner_size(SESSION_OVERLAY_WIDTH, SESSION_OVERLAY_HEIGHT)
    .resizable(false)
    .decorations(false)
    .transparent(true)
    .background_color(tauri::utils::config::Color(0, 0, 0, 0))
    .always_on_top(true)
    .skip_taskbar(true)
    .visible(true)
    .on_page_load(|overlay_window, payload| {
        eprintln!(
            "[overlay] page {:?} {}",
            payload.event(),
            payload.url().as_str()
        );
        if matches!(payload.event(), tauri::webview::PageLoadEvent::Finished) {
            let _ = overlay_window.show();
        }
    });

    match builder.build() {
        Ok(overlay_window) => {
            if let Some(position) = resolve_overlay_position(window) {
                let _ = overlay_window.set_position(Position::Physical(position));
            }
            eprintln!("[overlay] created {}", SESSION_OVERLAY_LABEL);
            Ok(json!({
                "success": true,
                "label": SESSION_OVERLAY_LABEL
            }))
        }
        Err(error) => Ok(json!({
            "success": false,
            "message": format!("Failed to create game session overlay: {}", error)
        })),
    }
}

pub(crate) fn hide_overlay_window(window: &Window) -> Result<Value, String> {
    if stop_overlay_sidecar_process() {
        return Ok(json!({ "success": true, "closed": true, "sidecar": true }));
    }

    let app_handle = window.app_handle().clone();
    if let Some(existing) = app_handle.get_webview_window(SESSION_OVERLAY_LABEL) {
        let _ = existing.close();
        return Ok(json!({ "success": true, "closed": true }));
    }
    Ok(json!({ "success": true, "closed": false }))
}

fn show_launcher_app_handle(app_handle: &tauri::AppHandle) -> Result<Value, String> {
    set_start_hidden_for_game_launch(false);

    let Some(main_window) = app_handle.get_webview_window("main") else {
        return Ok(json!({ "success": false, "message": "Main window not found" }));
    };

    if let Ok(true) = main_window.is_minimized() {
        let _ = main_window.unminimize();
    }
    let _ = main_window.show();
    let _ = main_window.set_focus();
    Ok(json!({ "success": true }))
}

fn show_launcher_window(window: &Window) -> Result<Value, String> {
    let app_handle = window.app_handle().clone();
    show_launcher_app_handle(&app_handle)
}

fn terminate_process_tree(process_id: u32) -> Result<(), String> {
    if process_id == 0 {
        return Err("Invalid process id".into());
    }

    #[cfg(windows)]
    {
        let mut command = Command::new("taskkill");
        command
            .arg("/PID")
            .arg(process_id.to_string())
            .arg("/T")
            .arg("/F");
        apply_windows_hidden_process_flags(&mut command);
        let output = command
            .output()
            .map_err(|error| format!("Failed to run taskkill: {}", error))?;
        let stdout = String::from_utf8_lossy(&output.stdout).to_lowercase();
        let stderr = String::from_utf8_lossy(&output.stderr).to_lowercase();
        let process_missing = stdout.contains("not found")
            || stderr.contains("not found")
            || stdout.contains("no running instance")
            || stderr.contains("no running instance")
            || stdout.contains("cannot find the process")
            || stderr.contains("cannot find the process");
        if output.status.success() || process_missing {
            return Ok(());
        }
        return Err(
            String::from_utf8_lossy(&output.stderr)
                .trim()
                .to_string()
                .if_empty_then(|| {
                    String::from_utf8_lossy(&output.stdout).trim().to_string()
                })
                .if_empty_then(|| format!("taskkill exited with code {:?}", output.status.code())),
        );
    }

    #[cfg(not(windows))]
    {
        let status = Command::new("kill")
            .arg("-TERM")
            .arg(process_id.to_string())
            .status()
            .map_err(|error| format!("Failed to run kill: {}", error))?;
        if status.success() {
            return Ok(());
        }
        Err(format!("kill exited with code {:?}", status.code()))
    }
}

fn quit_game_session() -> Value {
    let process_id = game_session_process_id();
    let Some(pid) = process_id else {
        if has_active_game_session() {
            clear_game_session();
            return json!({
                "success": true,
                "processId": Value::Null,
                "hasRemainingSessions": false,
                "message": "Cleared untracked game session."
            });
        }
        return json!({
            "success": false,
            "message": "No tracked process id for the active session."
        });
    };

    if let Err(error) = terminate_process_tree(pid) {
        return json!({
            "success": false,
            "processId": pid,
            "message": format!("Failed to terminate game process: {}", error)
        });
    }

    let _ = clear_game_session_process(pid);
    json!({
        "success": true,
        "processId": pid,
        "hasRemainingSessions": has_active_game_session(),
        "message": format!("Terminated game session process {}", pid)
    })
}

fn send_alt_enter_hotkey() -> Result<(), String> {
    #[cfg(windows)]
    {
        let script = r#"
$sig = '[DllImport("user32.dll")] public static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, UIntPtr dwExtraInfo);'
Add-Type -MemberDefinition $sig -Name EmuHotkeys -Namespace EmuBro -ErrorAction SilentlyContinue | Out-Null
[EmuBro.EmuHotkeys]::keybd_event(0x12, 0, 0, [UIntPtr]::Zero)
Start-Sleep -Milliseconds 25
[EmuBro.EmuHotkeys]::keybd_event(0x0D, 0, 0, [UIntPtr]::Zero)
Start-Sleep -Milliseconds 25
[EmuBro.EmuHotkeys]::keybd_event(0x0D, 0, 2, [UIntPtr]::Zero)
[EmuBro.EmuHotkeys]::keybd_event(0x12, 0, 2, [UIntPtr]::Zero)
"#;
        let mut command = Command::new("powershell");
        command
            .arg("-NoProfile")
            .arg("-NonInteractive")
            .arg("-Command")
            .arg(script);
        apply_windows_hidden_process_flags(&mut command);
        let status = command
            .status()
            .map_err(|error| format!("Failed to send Alt+Enter: {}", error))?;
        if status.success() {
            return Ok(());
        }
        return Err(format!(
            "PowerShell exited with code {:?} while sending Alt+Enter",
            status.code()
        ));
    }

    #[cfg(not(windows))]
    {
        Err("Alt+Enter hotkey automation is currently implemented for Windows only.".into())
    }
}

fn escape_powershell_single_quotes(input: &str) -> String {
    input.replace('\'', "''")
}

fn screenshot_output_dir() -> PathBuf {
    if let Some(home) = user_home_dir() {
        let pictures_dir = home.join("Pictures");
        if pictures_dir.exists() || fs::create_dir_all(&pictures_dir).is_ok() {
            return pictures_dir.join("emuBro").join("Screenshots");
        }
        return home.join("emuBro").join("Screenshots");
    }
    std::env::temp_dir().join("emuBro").join("Screenshots")
}

fn capture_screenshot(reason: &str) -> Result<Value, String> {
    #[cfg(windows)]
    {
        let reason_fragment = reason
            .trim()
            .to_lowercase()
            .replace(|ch: char| !ch.is_ascii_alphanumeric(), "-");
        let reason_segment = if reason_fragment.is_empty() {
            "manual".to_string()
        } else {
            reason_fragment
        };
        let base_dir = screenshot_output_dir();
        fs::create_dir_all(&base_dir)
            .map_err(|error| format!("Failed to create screenshots folder: {}", error))?;

        let file_name = format!("session-{}-{}.png", reason_segment, unix_timestamp_ms());
        let screenshot_path = base_dir.join(file_name);
        let escaped_path = escape_powershell_single_quotes(&screenshot_path.to_string_lossy());
        let script = format!(
            r#"
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
$bounds = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds
$bitmap = New-Object System.Drawing.Bitmap $bounds.Width, $bounds.Height
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
$graphics.CopyFromScreen($bounds.Location, [System.Drawing.Point]::Empty, $bounds.Size)
$bitmap.Save('{path}', [System.Drawing.Imaging.ImageFormat]::Png)
$graphics.Dispose()
$bitmap.Dispose()
"#,
            path = escaped_path
        );

        let mut command = Command::new("powershell");
        command
            .arg("-NoProfile")
            .arg("-NonInteractive")
            .arg("-Command")
            .arg(script);
        apply_windows_hidden_process_flags(&mut command);
        let output = command
            .output()
            .map_err(|error| format!("Failed to capture screenshot: {}", error))?;

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            return Err(format!(
                "Screenshot capture failed: {}",
                stderr.trim()
            ));
        }

        return Ok(json!({
            "success": true,
            "path": screenshot_path.to_string_lossy().to_string()
        }));
    }

    #[cfg(not(windows))]
    {
        let _ = reason;
        Err("Screenshot capture is currently implemented for Windows only.".into())
    }
}

trait StringFallback {
    fn if_empty_then<F>(self, fallback: F) -> String
    where
        F: FnOnce() -> String;
}

impl StringFallback for String {
    fn if_empty_then<F>(self, fallback: F) -> String
    where
        F: FnOnce() -> String,
    {
        if self.trim().is_empty() {
            return fallback();
        }
        self
    }
}

pub(super) fn handle(ch: &str, args: &[Value], window: &Window) -> Result<Value, String> {
    match ch {
        "game-session:get-status" => Ok(game_session_status_payload()),
        "game-session:show-launcher" | "game-session:show-overlay-menu" => show_launcher_window(window),
        "game-session:ensure-overlay-window" => ensure_overlay_window(window),
        "game-session:hide-overlay-window" => hide_overlay_window(window),
        "game-session:quit" => {
            let result = quit_game_session();
            if !has_active_game_session() {
                let _ = hide_overlay_window(window);
            }
            Ok(result)
        }
        "game-session:send-hotkey" => {
            let action = args
                .get(0)
                .and_then(|value| value.get("action"))
                .and_then(|value| value.as_str())
                .unwrap_or("")
                .trim()
                .to_ascii_lowercase();
            if action == "alt_enter" || action == "alt-enter" {
                match send_alt_enter_hotkey() {
                    Ok(_) => Ok(json!({ "success": true })),
                    Err(error) => Ok(json!({ "success": false, "message": error })),
                }
            } else {
                Ok(json!({
                    "success": false,
                    "message": format!("Unsupported hotkey action: {}", action)
                }))
            }
        }
        "game-session:capture-screenshot" => {
            let reason = args
                .get(0)
                .and_then(|value| value.get("reason"))
                .and_then(|value| value.as_str())
                .unwrap_or("manual");
            match capture_screenshot(reason) {
                Ok(result) => Ok(result),
                Err(error) => Ok(json!({ "success": false, "message": error })),
            }
        }
        _ => Ok(json!({ "success": false, "message": format!("Unsupported game-session channel: {}", ch) })),
    }
}
