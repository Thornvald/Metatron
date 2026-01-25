use std::path::Path;

pub fn parse_extensions(extension: &str) -> Vec<String> {
    extension
        .split(|c| c == ',' || c == ' ')
        .map(|s| s.trim().to_lowercase().trim_start_matches('.').to_string())
        .filter(|s| !s.is_empty())
        .collect()
}

// Normalize for case-insensitive, separator-agnostic comparisons.
pub fn normalize_path_str(input: &str) -> String {
    input
        .trim()
        .replace('/', "\\")
        .trim_end_matches(['\\', '/'])
        .to_lowercase()
}

pub fn matches_extension(filename: &str, extensions: &[String]) -> bool {
    if extensions.is_empty() {
        return true;
    }
    let filename_lower = filename.to_lowercase();
    extensions
        .iter()
        .any(|ext| filename_lower.ends_with(&format!(".{}", ext)))
}

pub fn is_ignored_file(filename: &str, ignored_extensions: &[String]) -> bool {
    if ignored_extensions.is_empty() {
        return false;
    }
    let filename_lower = filename.to_lowercase();
    ignored_extensions
        .iter()
        .any(|ext| filename_lower.ends_with(&format!(".{}", ext)))
}

pub fn is_ignored_folder(path: &Path, ignored_folders: &[String]) -> bool {
    if ignored_folders.is_empty() {
        return false;
    }

    let folder_name = path
        .file_name()
        .map(|n| n.to_string_lossy().to_string().to_lowercase())
        .unwrap_or_default();

    let path_lower = normalize_path_str(&path.to_string_lossy());

    // Treat full paths as "ignore this folder and its descendants".
    ignored_folders.iter().any(|entry| {
        let normalized = normalize_path_str(entry);
        if normalized.contains('\\') || normalized.contains(':') {
            path_lower == normalized || path_lower.starts_with(&format!("{}\\", normalized))
        } else {
            folder_name == normalized
        }
    })
}
