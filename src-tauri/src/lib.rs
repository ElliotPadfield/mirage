use serde::Serialize;
use std::process::Command;
use std::sync::Mutex;
use std::time::Duration;
use tauri::Manager;
use tauri_plugin_shell::ShellExt;

#[derive(Debug, Clone, Serialize)]
struct PythonStatus {
    running: bool,
    port: u16,
    #[serde(rename = "baseUrl")]
    base_url: String,
}

#[derive(Debug, Clone, Serialize)]
struct DaemonStatus {
    installed: bool,
    running: bool,
    supported: bool,
}

struct AppState {
    python_running: Mutex<bool>,
}

#[tauri::command]
async fn get_python_status(state: tauri::State<'_, AppState>) -> Result<PythonStatus, String> {
    let running = *state.python_running.lock().unwrap();
    Ok(PythonStatus {
        running,
        port: 54323,
        base_url: "http://localhost:54323".to_string(),
    })
}

#[tauri::command]
async fn get_daemon_status() -> Result<DaemonStatus, String> {
    Ok(DaemonStatus {
        installed: false,
        running: false,
        supported: false,
    })
}

#[tauri::command]
async fn install_daemon() -> Result<bool, String> {
    Err("Daemon installation not needed with Tauri".to_string())
}

#[tauri::command]
async fn uninstall_daemon() -> Result<bool, String> {
    Err("Daemon uninstallation not needed with Tauri".to_string())
}

async fn health_check() -> bool {
    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(3))
        .build()
        .unwrap_or_default();

    match client.get("http://127.0.0.1:54323/health").send().await {
        Ok(resp) => resp.status().is_success(),
        Err(_) => false,
    }
}

/// Resolve the sidecar binary path from the Tauri resource directory.
/// In production: `AppName.app/Contents/Resources/binaries/mirage-backend-<triple>`
/// In dev: `src-tauri/binaries/mirage-backend-<triple>`
fn resolve_sidecar_path(app: &tauri::AppHandle) -> Option<std::path::PathBuf> {
    // Tauri's shell sidecar resolves the path automatically, but we need the
    // raw path for osascript elevation. Try the resource dir first (production),
    // then fall back to the dev-time location.
    let triple = if cfg!(target_arch = "aarch64") {
        "aarch64-apple-darwin"
    } else {
        "x86_64-apple-darwin"
    };

    let binary_name = format!("mirage-backend-{}", triple);

    // Production path
    if let Ok(resource_dir) = app.path().resource_dir() {
        let prod_path = resource_dir.join("binaries").join(&binary_name);
        if prod_path.exists() {
            return Some(prod_path);
        }
    }

    // Dev path (relative to src-tauri)
    let dev_path = std::path::PathBuf::from("binaries").join(&binary_name);
    if dev_path.exists() {
        return Some(dev_path);
    }

    None
}

/// Launch the sidecar with root privileges using macOS Authorization Services
/// via osascript. Shows the standard macOS password prompt.
fn spawn_sidecar_elevated(sidecar_path: &std::path::Path) -> Result<(), String> {
    let path_str = sidecar_path.to_string_lossy();

    // Use osascript to run the sidecar with admin privileges
    // Custom prompt explains why admin is needed
    let script = format!(
        r#"do shell script "{} --electron --port 54323 &" with administrator privileges with prompt "Mirage needs your permission to connect to your iPhone and set its location.""#,
        path_str
    );

    let result = Command::new("osascript")
        .arg("-e")
        .arg(&script)
        .spawn();

    match result {
        Ok(_) => {
            println!("Sidecar launched with elevated privileges via osascript");
            Ok(())
        }
        Err(e) => Err(format!("Failed to launch elevated sidecar: {}", e)),
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .manage(AppState {
            python_running: Mutex::new(false),
        })
        .setup(|app| {
            let app_handle = app.handle().clone();
            let skip_sidecar = std::env::var("MIRAGE_SKIP_SIDECAR").unwrap_or_default() == "1";

            tauri::async_runtime::spawn(async move {
                // 1. Check if a sidecar is already running (dev.sh started it, or previous instance)
                if health_check().await {
                    println!("Python backend already running");
                    let state = app_handle.state::<AppState>();
                    *state.python_running.lock().unwrap() = true;
                    return;
                }

                if skip_sidecar {
                    println!("MIRAGE_SKIP_SIDECAR=1, waiting for external sidecar...");
                } else {
                    // 2. Try launching with elevated privileges (shows macOS password prompt)
                    //    This is needed for iOS 17+ tunnel creation
                    if let Some(sidecar_path) = resolve_sidecar_path(&app_handle) {
                        println!("Launching sidecar with admin privileges: {:?}", sidecar_path);
                        match spawn_sidecar_elevated(&sidecar_path) {
                            Ok(_) => println!("Elevated sidecar launch initiated"),
                            Err(e) => {
                                eprintln!("Elevated launch failed: {}", e);
                                // Fall back to non-elevated sidecar (limited functionality)
                                println!("Falling back to non-elevated sidecar...");
                                let shell = app_handle.shell();
                                match shell
                                    .sidecar("mirage-backend")
                                    .expect("failed to create sidecar command")
                                    .args(["--electron", "--port", "54323"])
                                    .spawn()
                                {
                                    Ok((_rx, _child)) => {
                                        println!("Non-elevated sidecar spawned");
                                    }
                                    Err(e2) => {
                                        eprintln!("All sidecar launch methods failed: {}", e2);
                                    }
                                }
                            }
                        }
                    } else {
                        eprintln!("Could not find sidecar binary");
                        // Try Tauri's built-in sidecar resolution as last resort
                        let shell = app_handle.shell();
                        match shell
                            .sidecar("mirage-backend")
                            .expect("failed to create sidecar command")
                            .args(["--electron", "--port", "54323"])
                            .spawn()
                        {
                            Ok((_rx, _child)) => println!("Sidecar spawned via Tauri shell"),
                            Err(e) => eprintln!("Failed to spawn sidecar: {}", e),
                        }
                    }
                }

                // 3. Poll health endpoint
                for i in 0..30 {
                    tokio::time::sleep(Duration::from_secs(1)).await;
                    if health_check().await {
                        println!("Python backend is ready! (attempt {})", i + 1);
                        let state = app_handle.state::<AppState>();
                        *state.python_running.lock().unwrap() = true;
                        return;
                    }
                }
                eprintln!("Python backend failed to start within 30 seconds");
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_python_status,
            get_daemon_status,
            install_daemon,
            uninstall_daemon,
        ])
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|_app, event| {
            if let tauri::RunEvent::Exit = event {
                // Kill the sidecar on app exit (handles both elevated and non-elevated)
                println!("App exiting — killing sidecar on port 54323");
                let _ = Command::new("sh")
                    .args(["-c", "lsof -ti:54323 2>/dev/null | xargs kill 2>/dev/null"])
                    .status();
            }
        });
}
