use std::fs;
use std::path::PathBuf;

// Get the base data directory for the application
fn get_data_dir() -> PathBuf {
    let app_dir = directories::ProjectDirs::from("com", "sarha", "client")
        .expect("Failed to get app directory");
    let data_dir = app_dir.data_dir();
    fs::create_dir_all(data_dir).expect("Failed to create data directory");
    data_dir.to_path_buf()
}

// Get the files storage directory
fn get_files_dir() -> PathBuf {
    let files_dir = get_data_dir().join("files");
    fs::create_dir_all(&files_dir).expect("Failed to create files directory");
    files_dir
}

fn get_config_file_path() -> PathBuf {
    get_data_dir().join("config.enc")
}

fn get_history_file_path() -> PathBuf {
    get_data_dir().join("file_history.enc")
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

// ============================================================================
// File Storage Commands
// ============================================================================

#[tauri::command]
fn save_encrypted_file(file_name: String, encrypted_data: String, metadata: String) -> Result<String, String> {
    let files_dir = get_files_dir();
    
    // Save encrypted file data
    let file_path = files_dir.join(format!("{}.enc", file_name));
    fs::write(&file_path, encrypted_data).map_err(|e| e.to_string())?;
    
    // Save metadata
    let meta_path = files_dir.join(format!("{}.meta", file_name));
    fs::write(&meta_path, metadata).map_err(|e| e.to_string())?;
    
    // Set files to read-only on Windows
    #[cfg(target_os = "windows")]
    {
        let mut perms = fs::metadata(&file_path).map_err(|e| e.to_string())?.permissions();
        perms.set_readonly(true);
        fs::set_permissions(&file_path, perms).map_err(|e| e.to_string())?;
        
        let mut meta_perms = fs::metadata(&meta_path).map_err(|e| e.to_string())?.permissions();
        meta_perms.set_readonly(true);
        fs::set_permissions(&meta_path, meta_perms).map_err(|e| e.to_string())?;
    }
    
    // Set files to read-only on Unix systems
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        let mut perms = fs::Permissions::from_mode(0o444);
        fs::set_permissions(&file_path, perms).map_err(|e| e.to_string())?;
        fs::set_permissions(&meta_path, perms).map_err(|e| e.to_string())?;
    }
    
    Ok(format!("File {} saved successfully", file_name))
}

#[tauri::command]
fn get_encrypted_file(file_name: String) -> Result<String, String> {
    let files_dir = get_files_dir();
    let file_path = files_dir.join(format!("{}.enc", file_name));
    
    if !file_path.exists() {
        return Err(format!("File {} not found", file_name));
    }
    
    fs::read_to_string(file_path).map_err(|e| e.to_string())
}

#[tauri::command]
fn get_file_metadata(file_name: String) -> Result<String, String> {
    let files_dir = get_files_dir();
    let meta_path = files_dir.join(format!("{}.meta", file_name));
    
    if !meta_path.exists() {
        return Err(format!("Metadata for {} not found", file_name));
    }
    
    fs::read_to_string(meta_path).map_err(|e| e.to_string())
}

#[tauri::command]
fn list_saved_files() -> Result<Vec<String>, String> {
    let files_dir = get_files_dir();
    let mut files = Vec::new();
    
    let entries = fs::read_dir(files_dir).map_err(|e| e.to_string())?;
    
    for entry in entries {
        let entry = entry.map_err(|e| e.to_string())?;
        let path = entry.path();
        
        if let Some(extension) = path.extension() {
            if extension == "enc" {
                if let Some(file_stem) = path.file_stem() {
                    files.push(file_stem.to_string_lossy().to_string());
                }
            }
        }
    }
    
    Ok(files)
}

#[tauri::command]
fn has_saved_file(file_name: String) -> Result<bool, String> {
    let files_dir = get_files_dir();
    let file_path = files_dir.join(format!("{}.enc", file_name));
    Ok(file_path.exists())
}

#[tauri::command]
fn delete_saved_file(file_name: String) -> Result<String, String> {
    let files_dir = get_files_dir();
    
    // Delete encrypted file
    let file_path = files_dir.join(format!("{}.enc", file_name));
    if file_path.exists() {
        // Remove read-only permission before deletion
        #[cfg(target_os = "windows")]
        {
            let mut perms = fs::metadata(&file_path).map_err(|e| e.to_string())?.permissions();
            perms.set_readonly(false);
            fs::set_permissions(&file_path, perms).map_err(|e| e.to_string())?;
        }
        
        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            let mut perms = fs::Permissions::from_mode(0o644);
            fs::set_permissions(&file_path, perms).map_err(|e| e.to_string())?;
        }
        
        fs::remove_file(&file_path).map_err(|e| e.to_string())?;
    }
    
    // Delete metadata file
    let meta_path = files_dir.join(format!("{}.meta", file_name));
    if meta_path.exists() {
        // Remove read-only permission before deletion
        #[cfg(target_os = "windows")]
        {
            let mut perms = fs::metadata(&meta_path).map_err(|e| e.to_string())?.permissions();
            perms.set_readonly(false);
            fs::set_permissions(&meta_path, perms).map_err(|e| e.to_string())?;
        }
        
        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            let mut perms = fs::Permissions::from_mode(0o644);
            fs::set_permissions(&meta_path, perms).map_err(|e| e.to_string())?;
        }
        
        fs::remove_file(&meta_path).map_err(|e| e.to_string())?;
    }
    
    Ok(format!("File {} deleted successfully", file_name))
}

// ============================================================================
// User Location File Storage
// ============================================================================

#[tauri::command]
fn save_file_to_user_location(file_path: String, file_data: Vec<u8>) -> Result<String, String> {
    use std::path::Path;
    
    let path = Path::new(&file_path);
    
    // Create parent directory if it doesn't exist
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| format!("Failed to create directory: {}", e))?;
    }
    
    // Write file data (unencrypted, no special permissions)
    fs::write(&path, file_data).map_err(|e| format!("Failed to write file: {}", e))?;
    
    Ok(format!("File saved to {}", file_path))
}

// ============================================================================
// File History Commands
// ============================================================================

#[tauri::command]
fn save_file_history(encrypted_history: String) -> Result<String, String> {
    let history_path = get_history_file_path();
    fs::write(history_path, encrypted_history).map_err(|e| e.to_string())?;
    Ok("History saved successfully".to_string())
}

#[tauri::command]
fn get_file_history() -> Result<String, String> {
    let history_path = get_history_file_path();
    
    if !history_path.exists() {
        return Ok(String::new()); // Return empty string if no history exists yet
    }
    
    fs::read_to_string(history_path).map_err(|e| e.to_string())
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
            get_downloads_path,
            save_encrypted_file,
            get_encrypted_file,
            get_file_metadata,
            list_saved_files,
            has_saved_file,
            delete_saved_file,
            save_file_to_user_location,
            save_file_history,
            get_file_history
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
