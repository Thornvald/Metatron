#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod config;
mod filters;
mod scan;
mod tests;
mod types;

use std::path::Path;

use types::{Config, SaveResult};

#[tauri::command]
fn list_files(
    folder_path: String,
    extension: String,
    folders_only: bool,
    ignored_extensions: String,
    ignored_folders: Vec<String>,
) -> types::ListFilesResult {
    scan::list_files(
        folder_path,
        extension,
        folders_only,
        ignored_extensions,
        ignored_folders,
    )
}

#[tauri::command]
fn get_hierarchy(
    folder_path: String,
    extension: String,
    folders_only: bool,
    ignored_extensions: String,
    ignored_folders: Vec<String>,
) -> types::HierarchyResult {
    scan::get_hierarchy(
        folder_path,
        extension,
        folders_only,
        ignored_extensions,
        ignored_folders,
    )
}

#[tauri::command]
fn save_to_file(content: String, output_dir: String, filename: String) -> SaveResult {
    let file_path = Path::new(&output_dir).join(&filename);

    match std::fs::write(&file_path, content) {
        Ok(_) => SaveResult {
            success: true,
            path: Some(file_path.to_string_lossy().to_string()),
            error: None,
        },
        Err(e) => SaveResult {
            success: false,
            path: None,
            error: Some(e.to_string()),
        },
    }
}

#[tauri::command]
fn load_config() -> Config {
    config::load_config()
}

#[tauri::command]
fn save_config(config: Config) -> bool {
    config::save_config(config)
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            list_files,
            get_hierarchy,
            save_to_file,
            load_config,
            save_config
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
