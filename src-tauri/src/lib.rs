use std::fs;
use std::path::PathBuf;

fn get_config_file_path() -> PathBuf {
    let app_dir = directories::ProjectDirs::from("com", "sarha", "client")
        .expect("Failed to get app directory");
    let data_dir = app_dir.data_dir();
    fs::create_dir_all(data_dir).expect("Failed to create data directory");
    data_dir.join("config.enc")
}

#[tauri::command]
fn save_encrypted_config(encrypted_data: String) -> Result<String, String> {
    let file_path = get_config_file_path();
    fs::write(file_path, encrypted_data).map_err(|e| e.to_string())?;
    Ok("Configuration saved successfully".to_string())
}

#[tauri::command]
fn get_encrypted_config() -> Result<String, String> {
    let file_path = get_config_file_path();
    
    if !file_path.exists() {
        return Err("No configuration file found".to_string());
    }
    
    fs::read_to_string(file_path).map_err(|e| e.to_string())
}

#[tauri::command]
fn has_config() -> Result<bool, String> {
    let file_path = get_config_file_path();
    Ok(file_path.exists())
}

#[tauri::command]
fn get_downloads_path() -> Result<String, String> {
    let downloads_dir = directories::UserDirs::new()
        .and_then(|dirs| dirs.download_dir().map(|p| p.to_path_buf()))
        .ok_or_else(|| "Could not find downloads directory".to_string())?;
    
    Ok(downloads_dir.to_string_lossy().to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            save_encrypted_config,
            get_encrypted_config,
            has_config,
            get_downloads_path
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
