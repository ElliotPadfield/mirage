use serde::Serialize;
use std::io::Write;
use std::process::Command;
use std::sync::Mutex;
use std::time::Duration;
use tauri::Manager;
use tauri_plugin_shell::ShellExt;

fn log_to_file(msg: &str) {
    if let Ok(mut f) = std::fs::OpenOptions::new()
        .create(true)
        .append(true)
        .open("/tmp/mirage-app.log")
    {
        let _ = writeln!(f, "{}", msg);
    }
    println!("{}", msg);
}

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

/// Resolve the sidecar binary path.
/// Tauri v2 bundles external binaries into Contents/MacOS/ with the triple suffix.
fn resolve_sidecar_path(app: &tauri::AppHandle) -> Option<std::path::PathBuf> {
    let triple = if cfg!(target_arch = "aarch64") {
        "aarch64-apple-darwin"
    } else {
        "x86_64-apple-darwin"
    };

    let binary_name_with_triple = format!("mirage-backend-{}", triple);

    // Production: Tauri bundles sidecars in Contents/MacOS/ WITH the triple suffix
    if let Ok(resource_dir) = app.path().resource_dir() {
        if let Some(contents_dir) = resource_dir.parent() {
            let macos_dir = contents_dir.join("MacOS");
            // Try with triple suffix first (Tauri v2 default)
            let path_with_triple = macos_dir.join(&binary_name_with_triple);
            if path_with_triple.exists() {
                println!("Found sidecar at: {:?}", path_with_triple);
                return Some(path_with_triple);
            }
            // Try without triple suffix as fallback
            let path_without_triple = macos_dir.join("mirage-backend");
            if path_without_triple.exists() {
                println!("Found sidecar at: {:?}", path_without_triple);
                return Some(path_without_triple);
            }
            eprintln!("Sidecar not found in MacOS dir. Checked: {:?} and {:?}", path_with_triple, path_without_triple);
            // List what's actually in the MacOS dir for debugging
            if let Ok(entries) = std::fs::read_dir(&macos_dir) {
                eprintln!("Contents of {:?}:", macos_dir);
                for entry in entries.flatten() {
                    eprintln!("  {:?}", entry.file_name());
                }
            }
        }
    }

    // Dev path (relative to src-tauri)
    let dev_path = std::path::PathBuf::from("binaries").join(&binary_name_with_triple);
    if dev_path.exists() {
        println!("Found sidecar at dev path: {:?}", dev_path);
        return Some(dev_path);
    }

    None
}

/// Launch the sidecar with root privileges using osascript.
/// Blocks until the user enters their password (or cancels).
fn spawn_sidecar_elevated(sidecar_path: &std::path::Path) -> Result<(), String> {
    let path_str = sidecar_path.to_string_lossy();

    // Use osascript to run the sidecar with admin privileges.
    // `do shell script` has no TTY, so nohup fails — just background with &.
    let script = format!(
        r#"do shell script "'{}' --electron --port 54323 > /tmp/mirage-sidecar.log 2>&1 &" with administrator privileges with prompt "Mirage needs your permission to connect to your iPhone and set its location.""#,
        path_str
    );

    log_to_file(&format!("Running osascript for elevated sidecar launch: {}", path_str));
    log_to_file(&format!("AppleScript: {}", script));
    let output = Command::new("osascript")
        .arg("-e")
        .arg(&script)
        .output();

    match output {
        Ok(o) => {
            let stdout = String::from_utf8_lossy(&o.stdout);
            let stderr = String::from_utf8_lossy(&o.stderr);
            log_to_file(&format!("osascript exit={}, stdout={}, stderr={}", o.status, stdout.trim(), stderr.trim()));
            if o.status.success() {
                log_to_file("Sidecar launched with elevated privileges via osascript");
                Ok(())
            } else {
                if stderr.contains("User canceled") || stderr.contains("user canceled") || stderr.contains("-128") {
                    Err(format!("User cancelled the password dialog"))
                } else {
                    Err(format!("osascript failed (exit {}): {}", o.status, stderr.trim()))
                }
            }
        }
        Err(e) => {
            log_to_file(&format!("Failed to run osascript: {}", e));
            Err(format!("Failed to run osascript: {}", e))
        }
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .manage(AppState {
            python_running: Mutex::new(false),
        })
        .setup(|app| {
            let app_handle = app.handle().clone();
            let skip_sidecar = std::env::var("MIRAGE_SKIP_SIDECAR").unwrap_or_default() == "1";

            tauri::async_runtime::spawn(async move {
                // 1. If a stale sidecar is running from a previous session, shut it down
                //    so we always start fresh with the current binary.
                log_to_file("=== Mirage app starting ===");
                if !skip_sidecar && health_check().await {
                    log_to_file("Found stale sidecar from previous session, shutting it down...");
                    // Use /shutdown endpoint (works even when sidecar is root-owned)
                    let client = reqwest::Client::builder()
                        .timeout(Duration::from_secs(3))
                        .build()
                        .unwrap_or_default();
                    let _ = client.post("http://127.0.0.1:54323/shutdown").send().await;
                    // Wait for it to die
                    for _ in 0..10 {
                        tokio::time::sleep(Duration::from_millis(500)).await;
                        if !health_check().await {
                            println!("Stale sidecar shut down successfully");
                            break;
                        }
                    }
                }

                if skip_sidecar {
                    // In dev mode, dev.sh manages the sidecar — just wait for it
                    println!("MIRAGE_SKIP_SIDECAR=1, waiting for external sidecar...");
                } else {
                    // 2. Try launching with elevated privileges (shows macOS password prompt)
                    //    This is needed for iOS 17+ tunnel creation.
                    //    spawn_sidecar_elevated uses .output() which blocks, so run on a
                    //    blocking thread to avoid stalling the async runtime.
                    let sidecar_path = resolve_sidecar_path(&app_handle);
                    let launch_result = if let Some(ref path) = sidecar_path {
                        log_to_file(&format!("Launching sidecar with admin privileges: {:?}", path));
                        let p = path.clone();
                        tokio::task::spawn_blocking(move || spawn_sidecar_elevated(&p))
                            .await
                            .unwrap_or_else(|e| Err(format!("spawn_blocking failed: {}", e)))
                    } else {
                        log_to_file("Could not find sidecar binary");
                        Err("Sidecar binary not found".to_string())
                    };

                    if let Err(e) = launch_result {
                        log_to_file(&format!("Elevated launch failed: {}", e));
                        // Fall back to non-elevated sidecar via Tauri shell
                        println!("Falling back to non-elevated sidecar...");
                        let shell = app_handle.shell();
                        match shell
                            .sidecar("binaries/mirage-backend")
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

                // 3. Poll health endpoint
                for i in 0..30 {
                    tokio::time::sleep(Duration::from_secs(1)).await;
                    if health_check().await {
                        log_to_file(&format!("Python backend is ready! (attempt {})", i + 1));
                        let state = app_handle.state::<AppState>();
                        *state.python_running.lock().unwrap() = true;
                        return;
                    }
                }
                log_to_file("Python backend failed to start within 30 seconds");
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
                println!("App exiting — graceful sidecar shutdown");
                graceful_sidecar_shutdown();
            }
        });
}

/// Graceful shutdown: SIGTERM → wait → SIGKILL → cleanup orphaned state.
///
/// The sidecar runs as root (launched via osascript with admin privileges),
/// so we need to use the /api/shutdown endpoint first (runs in-process),
/// then fall back to signal-based shutdown. Direct `kill` from a non-root
/// Tauri process cannot signal root-owned PIDs.
fn graceful_sidecar_shutdown() {
    // 1. Try graceful HTTP shutdown (sidecar handles this in-process, no root needed)
    let http_shutdown = Command::new("sh")
        .args(["-c", "curl -sf -X POST http://127.0.0.1:54323/shutdown --max-time 2 2>/dev/null"])
        .status()
        .map(|s| s.success())
        .unwrap_or(false);

    if http_shutdown {
        // Wait for process to exit after handling shutdown
        for _ in 0..10 {
            std::thread::sleep(std::time::Duration::from_millis(500));
            let check = Command::new("sh")
                .args(["-c", "lsof -ti:54323 2>/dev/null"])
                .output()
                .ok()
                .map(|o| String::from_utf8_lossy(&o.stdout).trim().to_string())
                .unwrap_or_default();
            if check.is_empty() {
                println!("Sidecar exited gracefully via /shutdown");
                cleanup_orphaned_state();
                return;
            }
        }
        println!("Sidecar did not exit after /shutdown, trying signals");
    }

    // 2. Fall back to signal-based shutdown (may fail if sidecar is root-owned)
    let pids = Command::new("sh")
        .args(["-c", "lsof -ti:54323 2>/dev/null"])
        .output()
        .ok()
        .and_then(|o| {
            let s = String::from_utf8_lossy(&o.stdout).trim().to_string();
            if s.is_empty() { None } else { Some(s) }
        });

    if let Some(pid_str) = &pids {
        println!("Sending SIGTERM to sidecar PIDs: {}", pid_str);
        let _ = Command::new("sh")
            .args(["-c", &format!("echo '{}' | xargs kill -TERM 2>/dev/null", pid_str)])
            .status();

        let mut exited = false;
        for _ in 0..10 {
            std::thread::sleep(std::time::Duration::from_millis(500));
            let check = Command::new("sh")
                .args(["-c", "lsof -ti:54323 2>/dev/null"])
                .output()
                .ok()
                .map(|o| String::from_utf8_lossy(&o.stdout).trim().to_string())
                .unwrap_or_default();
            if check.is_empty() {
                println!("Sidecar exited gracefully");
                exited = true;
                break;
            }
        }

        if !exited {
            println!("Sidecar did not exit in time, sending SIGKILL");
            let _ = Command::new("sh")
                .args(["-c", &format!("echo '{}' | xargs kill -9 2>/dev/null", pid_str)])
                .status();
            std::thread::sleep(std::time::Duration::from_millis(500));
        }
    }

    cleanup_orphaned_state();
}

/// Clean up orphaned utun interfaces (those with pymobiledevice3 tunnel addresses)
/// and ensure the remoted daemon is not left suspended.
fn cleanup_orphaned_state() {
    // Remove IPv6 addresses from orphaned utun interfaces that have
    // fd-prefix (ULA) addresses typical of pymobiledevice3 tunnels.
    // These are the addresses that cause DNS routing issues.
    let _ = Command::new("sh")
        .args(["-c", r#"
            for iface in $(ifconfig -l 2>/dev/null); do
                case "$iface" in utun*)
                    # Check if this utun has an fd-prefix IPv6 address (pymobiledevice3 tunnel)
                    if ifconfig "$iface" 2>/dev/null | grep -q 'inet6 fd'; then
                        echo "Cleaning orphaned tunnel interface: $iface"
                        ifconfig "$iface" down 2>/dev/null
                    fi
                ;; esac
            done
        "#])
        .status();

    // Resume remoted if suspended (requires root, but we may be running elevated)
    let _ = Command::new("sh")
        .args(["-c", r#"
            pid=$(pgrep -x remoted 2>/dev/null)
            if [ -n "$pid" ]; then
                state=$(ps -o stat= -p "$pid" 2>/dev/null)
                case "$state" in
                    *T*)
                        echo "Resuming suspended remoted (PID $pid)"
                        kill -CONT "$pid" 2>/dev/null
                        ;;
                esac
            fi
        "#])
        .status();
}
