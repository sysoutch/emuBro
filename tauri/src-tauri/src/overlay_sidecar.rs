#[cfg(not(windows))]
pub fn maybe_run_from_args() -> bool {
    false
}

#[cfg(windows)]
mod windows_overlay {
    use std::os::windows::ffi::OsStrExt;
    use std::net::UdpSocket;
    use std::path::PathBuf;
    use std::sync::{Mutex, OnceLock};
    use windows::core::{w, PCWSTR};
    use windows::Win32::Foundation::{
        CloseHandle, COLORREF, HINSTANCE, HWND, LPARAM, LRESULT, POINT, RECT, STILL_ACTIVE,
        WPARAM,
    };
    use windows::Win32::Graphics::Gdi::{
        BeginPaint, CreateSolidBrush, DeleteObject, DrawTextW, Ellipse, EndPaint, FillRect,
        SetBkMode, SetTextColor, HBRUSH, PAINTSTRUCT, DT_CENTER, DT_SINGLELINE, DT_VCENTER,
        TRANSPARENT,
    };
    use windows::Win32::System::LibraryLoader::GetModuleHandleW;
    use windows::Win32::System::Threading::{
        GetExitCodeProcess, OpenProcess, PROCESS_QUERY_LIMITED_INFORMATION,
    };
    use windows::Win32::UI::WindowsAndMessaging::{
        AppendMenuW, CreatePopupMenu, CreateWindowExW, DefWindowProcW, DestroyMenu, DestroyWindow,
        DI_NORMAL, DispatchMessageW, DrawIconEx, FindWindowW, GetCursorPos, GetMessageW,
        GetSystemMetrics, IsIconic, LoadCursorW, LoadImageW, PostQuitMessage, RegisterClassW,
        SetForegroundWindow, SetLayeredWindowAttributes, SetTimer, ShowWindow, TrackPopupMenu,
        TranslateMessage, CS_DBLCLKS, CS_HREDRAW, CS_VREDRAW, CW_USEDEFAULT, HTCAPTION, IDC_ARROW,
        IMAGE_ICON, LR_LOADFROMFILE, LWA_COLORKEY, MF_SEPARATOR, MF_STRING, MSG, SW_RESTORE,
        SW_SHOW, TPM_LEFTALIGN, TPM_RETURNCMD, TPM_TOPALIGN, TRACK_POPUP_MENU_FLAGS, WM_DESTROY,
        WM_LBUTTONUP, WM_NCHITTEST, WM_NCRBUTTONUP, WM_PAINT, WM_RBUTTONUP, WM_TIMER, WNDCLASSW,
        WS_EX_LAYERED, WS_EX_TOOLWINDOW, WS_EX_TOPMOST, WS_POPUP, WS_VISIBLE, SM_CXSCREEN,
    };

    const WINDOW_SIZE: i32 = 84;
    const WINDOW_MARGIN: i32 = 16;
    const CLICK_RADIUS: i32 = 24;
    const PARENT_CHECK_TIMER_ID: usize = 1;
    const PARENT_CHECK_INTERVAL_MS: u32 = 2000;
    const TRANSPARENT_COLORKEY: COLORREF = COLORREF(0x00FF00FF);
    const MENU_ID_SHOW: usize = 1001;
    const MENU_ID_HIDE: usize = 1002;
    const MENU_ID_QUIT_GAME: usize = 1003;
    const MENU_ID_ALT_ENTER: usize = 1004;
    const MENU_ID_SCREENSHOT: usize = 1005;
    static OVERLAY_ICON_PTR: OnceLock<Option<isize>> = OnceLock::new();

    const IPC_SHOW_LAUNCHER: &str = "show-launcher";
    const IPC_HIDE_OVERLAY: &str = "hide-overlay";
    const IPC_QUIT_GAME: &str = "quit-game";
    const IPC_ALT_ENTER: &str = "send-hotkey:alt-enter";
    const IPC_SCREENSHOT: &str = "capture-screenshot";

    #[derive(Default)]
    struct OverlayState {
        parent_pid: Option<u32>,
        ipc_addr: Option<String>,
    }

    static OVERLAY_STATE: OnceLock<Mutex<OverlayState>> = OnceLock::new();

    fn overlay_state() -> &'static Mutex<OverlayState> {
        OVERLAY_STATE.get_or_init(|| Mutex::new(OverlayState::default()))
    }

    fn parse_parent_pid(args: &[String]) -> Option<u32> {
        args.iter().find_map(|arg| {
            let Some(raw) = arg.strip_prefix("--parent-pid=") else {
                return None;
            };
            raw.trim().parse::<u32>().ok().filter(|pid| *pid > 0)
        })
    }

    fn parse_overlay_ipc_addr(args: &[String]) -> Option<String> {
        args.iter().find_map(|arg| {
            let raw = arg.strip_prefix("--overlay-ipc=")?;
            let trimmed = raw.trim();
            if trimmed.is_empty() {
                return None;
            }
            Some(trimmed.to_string())
        })
    }

    fn lparam_x(lp: LPARAM) -> i32 {
        ((lp.0 & 0xFFFF) as u16 as i16) as i32
    }

    fn lparam_y(lp: LPARAM) -> i32 {
        (((lp.0 >> 16) & 0xFFFF) as u16 as i16) as i32
    }

    fn inside_radius(x: i32, y: i32, radius: i32) -> bool {
        let center = WINDOW_SIZE / 2;
        let dx = x - center;
        let dy = y - center;
        dx * dx + dy * dy <= radius * radius
    }

    fn overlay_ipc_addr() -> Option<String> {
        overlay_state().lock().ok()?.ipc_addr.clone()
    }

    fn send_overlay_ipc(command: &str) -> bool {
        let Some(addr) = overlay_ipc_addr() else {
            return false;
        };
        let Ok(socket) = UdpSocket::bind("127.0.0.1:0") else {
            return false;
        };
        socket.send_to(command.as_bytes(), addr).is_ok()
    }

    fn resolve_icon_file_path() -> Option<PathBuf> {
        let exe_path = std::env::current_exe().ok()?;
        for ancestor in exe_path.ancestors() {
            let candidate = ancestor.join("icons").join("icon.ico");
            if candidate.is_file() {
                return Some(candidate);
            }
        }
        let alongside = exe_path.with_file_name("icon.ico");
        if alongside.is_file() {
            return Some(alongside);
        }
        None
    }

    unsafe fn load_overlay_icon_ptr() -> Option<isize> {
        let icon_path = resolve_icon_file_path()?;
        let path_wide: Vec<u16> = icon_path
            .as_os_str()
            .encode_wide()
            .chain(std::iter::once(0))
            .collect();
        let handle = LoadImageW(
            None,
            PCWSTR(path_wide.as_ptr()),
            IMAGE_ICON,
            28,
            28,
            LR_LOADFROMFILE,
        )
        .ok()?;
        Some(handle.0 as isize)
    }

    unsafe fn overlay_icon_ptr() -> Option<isize> {
        *OVERLAY_ICON_PTR.get_or_init(|| load_overlay_icon_ptr())
    }

    unsafe fn bring_main_window_to_front() {
        let Ok(hwnd) = FindWindowW(None, w!("emuBro")) else {
            return;
        };

        if IsIconic(hwnd).as_bool() {
            let _ = ShowWindow(hwnd, SW_RESTORE);
        }
        let _ = ShowWindow(hwnd, SW_SHOW);
        let _ = SetForegroundWindow(hwnd);
    }

    unsafe fn is_parent_alive(pid: u32) -> bool {
        let Ok(process) = OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, false, pid) else {
            return false;
        };

        let mut exit_code = 0u32;
        let ok = GetExitCodeProcess(process, &mut exit_code).is_ok();
        let _ = CloseHandle(process);
        ok && exit_code == STILL_ACTIVE.0 as u32
    }

    unsafe fn paint_overlay(hwnd: HWND) {
        let mut ps = PAINTSTRUCT::default();
        let hdc = BeginPaint(hwnd, &mut ps);
        if hdc.0.is_null() {
            let _ = EndPaint(hwnd, &ps);
            return;
        }

        let background = RECT {
            left: 0,
            top: 0,
            right: WINDOW_SIZE,
            bottom: WINDOW_SIZE,
        };
        let bg_brush = CreateSolidBrush(TRANSPARENT_COLORKEY);
        let _ = FillRect(hdc, &background, bg_brush);
        let _ = DeleteObject(bg_brush.into());

        let button_radius = 30;
        let button_left = (WINDOW_SIZE / 2) - button_radius;
        let button_top = 10;
        let button_right = (WINDOW_SIZE / 2) + button_radius;
        let button_bottom = button_top + (button_radius * 2);

        let shadow_brush = CreateSolidBrush(COLORREF(0x0014141A));
        let old_brush_base = windows::Win32::Graphics::Gdi::SelectObject(hdc, shadow_brush.into());
        let _ = Ellipse(
            hdc,
            button_left + 1,
            button_top + 2,
            button_right + 1,
            button_bottom + 2,
        );
        let _ = DeleteObject(shadow_brush.into());
        let _ = windows::Win32::Graphics::Gdi::SelectObject(hdc, old_brush_base);

        let ring_brush = CreateSolidBrush(COLORREF(0x00203191));
        let old_brush_ring = windows::Win32::Graphics::Gdi::SelectObject(hdc, ring_brush.into());
        let _ = Ellipse(hdc, button_left, button_top, button_right, button_bottom);
        let _ = DeleteObject(ring_brush.into());

        let inner_brush = CreateSolidBrush(COLORREF(0x0013202B));
        let _ = windows::Win32::Graphics::Gdi::SelectObject(hdc, inner_brush.into());
        let _ = Ellipse(
            hdc,
            button_left + 3,
            button_top + 3,
            button_right - 3,
            button_bottom - 3,
        );
        let _ = DeleteObject(inner_brush.into());

        let highlight_brush = CreateSolidBrush(COLORREF(0x00586176));
        let _ = windows::Win32::Graphics::Gdi::SelectObject(hdc, highlight_brush.into());
        let _ = Ellipse(
            hdc,
            button_left + 9,
            button_top + 6,
            button_right - 9,
            button_top + 24,
        );
        let _ = DeleteObject(highlight_brush.into());
        let _ = windows::Win32::Graphics::Gdi::SelectObject(hdc, old_brush_ring);

        let _ = SetBkMode(hdc, TRANSPARENT);
        let _ = SetTextColor(hdc, COLORREF(0x00F7F2EF));
        let mut text_rect = RECT {
            left: 18,
            top: 20,
            right: WINDOW_SIZE - 18,
            bottom: 54,
        };
        if let Some(icon_ptr) = overlay_icon_ptr() {
            let hicon = windows::Win32::UI::WindowsAndMessaging::HICON(icon_ptr as *mut _);
            let _ = DrawIconEx(
                hdc,
                28,
                26,
                hicon,
                29,
                29,
                0,
                None,
                DI_NORMAL,
            );
        } else {
            let mut logo_text: Vec<u16> = "eB".encode_utf16().collect();
            let _ = DrawTextW(
                hdc,
                logo_text.as_mut_slice(),
                &mut text_rect,
                DT_CENTER | DT_VCENTER | DT_SINGLELINE,
            );
        }

        let _ = EndPaint(hwnd, &ps);
    }

    unsafe fn show_overlay_menu(hwnd: HWND) {
        let Ok(menu) = CreatePopupMenu() else {
            return;
        };

        let _ = AppendMenuW(menu, MF_STRING, MENU_ID_SHOW, w!("Show emuBro"));
        let _ = AppendMenuW(menu, MF_SEPARATOR, 0, w!(""));
        let _ = AppendMenuW(menu, MF_STRING, MENU_ID_ALT_ENTER, w!("Send Alt+Enter"));
        let _ = AppendMenuW(menu, MF_STRING, MENU_ID_SCREENSHOT, w!("Take Screenshot"));
        let _ = AppendMenuW(menu, MF_STRING, MENU_ID_QUIT_GAME, w!("Quit Game"));
        let _ = AppendMenuW(menu, MF_SEPARATOR, 0, w!(""));
        let _ = AppendMenuW(menu, MF_STRING, MENU_ID_HIDE, w!("Hide Overlay"));

        let mut point = POINT::default();
        let _ = GetCursorPos(&mut point);
        let flags: TRACK_POPUP_MENU_FLAGS = TPM_LEFTALIGN | TPM_TOPALIGN | TPM_RETURNCMD;
        let command = TrackPopupMenu(menu, flags, point.x, point.y, None, hwnd, None).0 as usize;

        match command {
            MENU_ID_SHOW => {
                if !send_overlay_ipc(IPC_SHOW_LAUNCHER) {
                    bring_main_window_to_front();
                }
            }
            MENU_ID_ALT_ENTER => {
                let _ = send_overlay_ipc(IPC_ALT_ENTER);
            }
            MENU_ID_SCREENSHOT => {
                let _ = send_overlay_ipc(IPC_SCREENSHOT);
            }
            MENU_ID_QUIT_GAME => {
                let _ = send_overlay_ipc(IPC_QUIT_GAME);
            }
            MENU_ID_HIDE => {
                let _ = send_overlay_ipc(IPC_HIDE_OVERLAY);
                let _ = DestroyWindow(hwnd);
            }
            _ => {}
        }

        let _ = DestroyMenu(menu);
    }

    unsafe extern "system" fn wndproc(
        hwnd: HWND,
        message: u32,
        wparam: WPARAM,
        lparam: LPARAM,
    ) -> LRESULT {
        match message {
            WM_NCHITTEST => {
                LRESULT(HTCAPTION as isize)
            }
            WM_LBUTTONUP => {
                let x = lparam_x(lparam);
                let y = lparam_y(lparam);
                if inside_radius(x, y, CLICK_RADIUS) {
                    show_overlay_menu(hwnd);
                }
                LRESULT(0)
            }
            WM_RBUTTONUP => {
                show_overlay_menu(hwnd);
                LRESULT(0)
            }
            WM_NCRBUTTONUP => {
                show_overlay_menu(hwnd);
                LRESULT(0)
            }
            WM_TIMER => {
                if wparam.0 == PARENT_CHECK_TIMER_ID {
                    if let Some(parent_pid) = overlay_state().lock().ok().and_then(|s| s.parent_pid)
                    {
                        if !is_parent_alive(parent_pid) {
                            let _ = DestroyWindow(hwnd);
                        }
                    }
                }
                LRESULT(0)
            }
            WM_PAINT => {
                paint_overlay(hwnd);
                LRESULT(0)
            }
            WM_DESTROY => {
                PostQuitMessage(0);
                LRESULT(0)
            }
            _ => DefWindowProcW(hwnd, message, wparam, lparam),
        }
    }

    unsafe fn run_sidecar(parent_pid: Option<u32>, ipc_addr: Option<String>) -> Result<(), String> {
        if let Ok(mut state) = overlay_state().lock() {
            state.parent_pid = parent_pid;
            state.ipc_addr = ipc_addr;
        }

        let hmodule = GetModuleHandleW(None)
            .map_err(|error| format!("GetModuleHandleW failed: {}", error))?;
        let hinstance: HINSTANCE = hmodule.into();

        let class = WNDCLASSW {
            hCursor: LoadCursorW(None, IDC_ARROW)
                .map_err(|error| format!("LoadCursorW failed: {}", error))?,
            hInstance: hinstance,
            lpszClassName: w!("emuBroOverlaySidecar"),
            lpfnWndProc: Some(wndproc),
            style: CS_HREDRAW | CS_VREDRAW | CS_DBLCLKS,
            hbrBackground: HBRUSH(std::ptr::null_mut()),
            ..Default::default()
        };

        if RegisterClassW(&class) == 0 {
            return Err("RegisterClassW failed".into());
        }

        let screen_width = GetSystemMetrics(SM_CXSCREEN);
        let x = if screen_width > WINDOW_SIZE + WINDOW_MARGIN {
            screen_width - WINDOW_SIZE - WINDOW_MARGIN
        } else {
            CW_USEDEFAULT
        };
        let y = WINDOW_MARGIN;

        let hwnd = CreateWindowExW(
            WS_EX_TOPMOST | WS_EX_TOOLWINDOW | WS_EX_LAYERED,
            w!("emuBroOverlaySidecar"),
            w!("emuBro Overlay"),
            WS_POPUP | WS_VISIBLE,
            x,
            y,
            WINDOW_SIZE,
            WINDOW_SIZE,
            None,
            None,
            Some(hinstance),
            None,
        )
        .map_err(|error| format!("CreateWindowExW failed: {}", error))?;

        let _ = SetLayeredWindowAttributes(hwnd, TRANSPARENT_COLORKEY, 0, LWA_COLORKEY);
        let _ = ShowWindow(hwnd, SW_SHOW);
        let _ = SetTimer(Some(hwnd), PARENT_CHECK_TIMER_ID, PARENT_CHECK_INTERVAL_MS, None);

        let mut msg = MSG::default();
        while GetMessageW(&mut msg, None, 0, 0).as_bool() {
            let _ = TranslateMessage(&msg);
            let _ = DispatchMessageW(&msg);
        }
        Ok(())
    }

    pub fn maybe_run_from_args() -> bool {
        let args: Vec<String> = std::env::args().collect();
        if !args.iter().any(|arg| arg == "--overlay-sidecar") {
            return false;
        }

        let parent_pid = parse_parent_pid(&args);
        let ipc_addr = parse_overlay_ipc_addr(&args);
        unsafe {
            if let Err(error) = run_sidecar(parent_pid, ipc_addr) {
                eprintln!("[overlay-sidecar] {}", error);
            }
        }
        true
    }
}

#[cfg(windows)]
pub use windows_overlay::maybe_run_from_args;
