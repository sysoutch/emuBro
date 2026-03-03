use serde::{Deserialize, Serialize};
use serde_json::json;
use std::io::{BufRead, BufReader, Write};
use std::net::{Shutdown, TcpListener, TcpStream};
use std::sync::OnceLock;
use std::time::Duration;
use tauri::{Manager, Window};

const SINGLE_INSTANCE_ADDR: &str = "127.0.0.1:47281";
static LISTENER_STARTED: OnceLock<()> = OnceLock::new();

#[derive(Debug, Serialize, Deserialize)]
struct InstanceMessage {
    command: String,
    #[serde(rename = "gameId", default)]
    game_id: Option<i64>,
}

fn build_message(startup_launch_game_id: Option<i64>) -> InstanceMessage {
    match startup_launch_game_id {
        Some(game_id) if game_id > 0 => InstanceMessage {
            command: "launch-game".to_string(),
            game_id: Some(game_id),
        },
        _ => InstanceMessage {
            command: "show-main".to_string(),
            game_id: None,
        },
    }
}

pub(crate) fn forward_to_existing_instance(startup_launch_game_id: Option<i64>) -> bool {
    let Ok(mut stream) = TcpStream::connect_timeout(
        &SINGLE_INSTANCE_ADDR
            .parse()
            .unwrap_or_else(|_| "127.0.0.1:47281".parse().expect("valid socket addr")),
        Duration::from_millis(250),
    ) else {
        return false;
    };

    let _ = stream.set_write_timeout(Some(Duration::from_millis(250)));
    let Ok(payload) = serde_json::to_vec(&build_message(startup_launch_game_id)) else {
        return false;
    };
    if stream.write_all(&payload).is_err() || stream.write_all(b"\n").is_err() {
        return false;
    }
    let _ = stream.flush();
    let _ = stream.shutdown(Shutdown::Both);
    true
}

fn handle_show_main(app_handle: &tauri::AppHandle) {
    crate::app_core::set_start_hidden_for_game_launch(false);

    if let Some(splashscreen) = app_handle.get_webview_window("splashscreen") {
        let _ = splashscreen.close();
    }

    if let Some(main_window) = app_handle.get_webview_window("main") {
        if let Ok(true) = main_window.is_minimized() {
            let _ = main_window.unminimize();
        }
        let _ = main_window.show();
        let _ = main_window.set_focus();
    }
}

fn handle_launch_game(app_handle: &tauri::AppHandle, game_id: i64) {
    if game_id <= 0 {
        return;
    }

    let Some(main_window) = app_handle.get_webview_window("main") else {
        return;
    };

    let window: Window = main_window.as_ref().window();
    let _ = crate::app_core::emubro_invoke_impl(
        "launch-game".to_string(),
        vec![json!({ "gameId": game_id })],
        window,
    );
}

fn handle_stream(stream: TcpStream, app_handle: &tauri::AppHandle) {
    let mut reader = BufReader::new(stream);
    let mut line = String::new();
    if reader.read_line(&mut line).is_err() {
        return;
    }

    let Ok(message) = serde_json::from_str::<InstanceMessage>(line.trim()) else {
        return;
    };

    match message.command.as_str() {
        "launch-game" => {
            if let Some(game_id) = message.game_id {
                handle_launch_game(app_handle, game_id);
            }
        }
        "show-main" => handle_show_main(app_handle),
        _ => {}
    }
}

pub(crate) fn spawn_listener(app_handle: tauri::AppHandle) -> Result<(), String> {
    if LISTENER_STARTED.get().is_some() {
        return Ok(());
    }

    let listener = TcpListener::bind(SINGLE_INSTANCE_ADDR)
        .map_err(|error| format!("Failed to bind single-instance listener: {}", error))?;
    let _ = listener.set_nonblocking(false);
    let _ = LISTENER_STARTED.set(());

    std::thread::spawn(move || {
        for stream in listener.incoming() {
            match stream {
                Ok(stream) => handle_stream(stream, &app_handle),
                Err(error) => {
                    eprintln!("[single-instance] listener error: {}", error);
                    std::thread::sleep(Duration::from_millis(100));
                }
            }
        }
    });

    Ok(())
}
