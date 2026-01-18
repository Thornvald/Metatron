#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;

#[derive(Serialize)]
struct FileInfo {
    name: String,
    path: String,
    size: u64,
}

#[derive(Serialize)]
struct ListFilesResult {
    success: bool,
    files: Vec<FileInfo>,
    error: Option<String>,
}

#[derive(Serialize)]
struct HierarchyResult {
    success: bool,
    hierarchy: String,
    error: Option<String>,
}

#[derive(Serialize)]
struct SaveResult {
    success: bool,
    path: Option<String>,
    error: Option<String>,
}

#[derive(Serialize, Deserialize, Default)]
struct Config {
    output_directory: String,
}

fn get_config_path() -> std::path::PathBuf {
    let config_dir = dirs::config_dir().unwrap_or_else(|| std::path::PathBuf::from("."));
    config_dir.join("metatron").join("config.json")
}

fn parse_extensions(extension: &str) -> Vec<String> {
    extension
        .split(|c| c == ',' || c == ' ')
        .map(|s| s.trim().to_lowercase().trim_start_matches('.').to_string())
        .filter(|s| !s.is_empty())
        .collect()
}

fn matches_extension(filename: &str, extensions: &[String]) -> bool {
    if extensions.is_empty() {
        return true;
    }
    let filename_lower = filename.to_lowercase();
    extensions.iter().any(|ext| filename_lower.ends_with(&format!(".{}", ext)))
}

#[tauri::command]
fn list_files(folder_path: String, extension: String) -> ListFilesResult {
    let extensions = parse_extensions(&extension);
    let mut files = Vec::new();

    fn scan_dir(dir: &Path, extensions: &[String], files: &mut Vec<FileInfo>) {
        if let Ok(entries) = fs::read_dir(dir) {
            for entry in entries.flatten() {
                let path = entry.path();
                if path.is_file() {
                    let name = path.file_name()
                        .map(|n| n.to_string_lossy().to_string())
                        .unwrap_or_default();

                    if matches_extension(&name, extensions) {
                        let size = fs::metadata(&path).map(|m| m.len()).unwrap_or(0);
                        files.push(FileInfo {
                            name,
                            path: path.to_string_lossy().to_string(),
                            size,
                        });
                    }
                } else if path.is_dir() {
                    scan_dir(&path, extensions, files);
                }
            }
        }
    }

    scan_dir(Path::new(&folder_path), &extensions, &mut files);

    ListFilesResult {
        success: true,
        files,
        error: None,
    }
}

#[tauri::command]
fn get_hierarchy(folder_path: String, extension: String) -> HierarchyResult {
    let extensions = parse_extensions(&extension);

    fn build_tree(dir: &Path, extensions: &[String], indent: &str) -> String {
        let mut output = String::new();

        let entries: Vec<_> = fs::read_dir(dir)
            .map(|rd| rd.flatten().collect())
            .unwrap_or_default();

        let mut folders: Vec<_> = entries.iter()
            .filter(|e| e.path().is_dir())
            .collect();
        folders.sort_by_key(|e| e.file_name());

        let mut files: Vec<_> = entries.iter()
            .filter(|e| e.path().is_file())
            .collect();
        files.sort_by_key(|e| e.file_name());

        let filtered_files: Vec<_> = files.iter()
            .filter(|e| {
                let name = e.file_name().to_string_lossy().to_string();
                matches_extension(&name, extensions)
            })
            .collect();

        for (i, folder) in folders.iter().enumerate() {
            let is_last = i == folders.len() - 1 && filtered_files.is_empty();
            let prefix = if is_last { "└── " } else { "├── " };
            let child_indent = if is_last { "    " } else { "│   " };

            let sub_content = build_tree(
                &folder.path(),
                extensions,
                &format!("{}{}", indent, child_indent)
            );

            if !sub_content.is_empty() || extensions.is_empty() {
                output.push_str(&format!(
                    "{}{}📁 {}\n",
                    indent,
                    prefix,
                    folder.file_name().to_string_lossy()
                ));
                output.push_str(&sub_content);
            }
        }

        for (i, file) in filtered_files.iter().enumerate() {
            let is_last = i == filtered_files.len() - 1;
            let prefix = if is_last { "└── " } else { "├── " };
            output.push_str(&format!(
                "{}{}📄 {}\n",
                indent,
                prefix,
                file.file_name().to_string_lossy()
            ));
        }

        output
    }

    let root_name = Path::new(&folder_path)
        .file_name()
        .map(|n| n.to_string_lossy().to_string())
        .unwrap_or_else(|| folder_path.clone());

    let mut result = format!("📁 {}\n", root_name);
    result.push_str(&build_tree(Path::new(&folder_path), &extensions, ""));

    HierarchyResult {
        success: true,
        hierarchy: result,
        error: None,
    }
}

#[tauri::command]
fn save_to_file(content: String, output_dir: String, filename: String) -> SaveResult {
    let file_path = Path::new(&output_dir).join(&filename);

    match fs::write(&file_path, content) {
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
    let config_path = get_config_path();

    if let Ok(content) = fs::read_to_string(&config_path) {
        serde_json::from_str(&content).unwrap_or_default()
    } else {
        Config::default()
    }
}

#[tauri::command]
fn save_config(config: Config) -> bool {
    let config_path = get_config_path();

    if let Some(parent) = config_path.parent() {
        let _ = fs::create_dir_all(parent);
    }

    match serde_json::to_string_pretty(&config) {
        Ok(content) => fs::write(&config_path, content).is_ok(),
        Err(_) => false,
    }
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
