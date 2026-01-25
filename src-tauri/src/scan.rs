use std::fs;
use std::path::Path;

use crate::filters::{is_ignored_file, is_ignored_folder, matches_extension, parse_extensions};
use crate::types::{FileInfo, HierarchyResult, ListFilesResult};

pub fn list_files(
    folder_path: String,
    extension: String,
    folders_only: bool,
    ignored_extensions: String,
    ignored_folders: Vec<String>,
) -> ListFilesResult {
    let extensions = parse_extensions(&extension);
    let ignored_extensions = parse_extensions(&ignored_extensions);
    let ignored_folders: Vec<String> = ignored_folders
        .into_iter()
        .filter(|s| !s.trim().is_empty())
        .collect();
    let mut files = Vec::new();

    fn scan_dir(
        dir: &Path,
        extensions: &[String],
        ignored_extensions: &[String],
        ignored_folders: &[String],
        files: &mut Vec<FileInfo>,
        folders_only: bool,
    ) {
        if is_ignored_folder(dir, ignored_folders) {
            return;
        }
        if let Ok(entries) = fs::read_dir(dir) {
            for entry in entries.flatten() {
                let path = entry.path();
                if path.is_file() {
                    if folders_only {
                        continue;
                    }

                    let name = path
                        .file_name()
                        .map(|n| n.to_string_lossy().to_string())
                        .unwrap_or_default();

                    if is_ignored_file(&name, ignored_extensions) {
                        continue;
                    }

                    if matches_extension(&name, extensions) {
                        let size = fs::metadata(&path).map(|m| m.len()).unwrap_or(0);
                        files.push(FileInfo {
                            name,
                            path: path.to_string_lossy().to_string(),
                            size,
                        });
                    }
                } else if path.is_dir() {
                    if is_ignored_folder(&path, ignored_folders) {
                        continue;
                    }
                    if folders_only {
                        let name = path
                            .file_name()
                            .map(|n| n.to_string_lossy().to_string())
                            .unwrap_or_default();
                        files.push(FileInfo {
                            name,
                            path: path.to_string_lossy().to_string(),
                            size: 0,
                        });
                    }
                    scan_dir(
                        &path,
                        extensions,
                        ignored_extensions,
                        ignored_folders,
                        files,
                        folders_only,
                    );
                }
            }
        }
    }

    scan_dir(
        Path::new(&folder_path),
        &extensions,
        &ignored_extensions,
        &ignored_folders,
        &mut files,
        folders_only,
    );

    ListFilesResult {
        success: true,
        files,
        error: None,
    }
}

pub fn get_hierarchy(
    folder_path: String,
    extension: String,
    folders_only: bool,
    ignored_extensions: String,
    ignored_folders: Vec<String>,
) -> HierarchyResult {
    let extensions = parse_extensions(&extension);
    let ignored_extensions = parse_extensions(&ignored_extensions);
    let ignored_folders: Vec<String> = ignored_folders
        .into_iter()
        .filter(|s| !s.trim().is_empty())
        .collect();

    fn build_tree(
        dir: &Path,
        extensions: &[String],
        ignored_extensions: &[String],
        ignored_folders: &[String],
        indent: &str,
        folders_only: bool,
    ) -> String {
        let mut output = String::new();

        let entries: Vec<_> = fs::read_dir(dir)
            .map(|rd| rd.flatten().collect())
            .unwrap_or_default();

        let mut folders: Vec<_> = entries
            .iter()
            .filter(|e| e.path().is_dir())
            .filter(|e| !is_ignored_folder(&e.path(), ignored_folders))
            .collect();
        folders.sort_by_key(|e| e.file_name());

        let mut files: Vec<_> = entries.iter().filter(|e| e.path().is_file()).collect();
        files.sort_by_key(|e| e.file_name());

        let filtered_files: Vec<_> = if folders_only {
            Vec::new()
        } else {
            files
                .iter()
                .filter(|e| {
                    let name = e.file_name().to_string_lossy().to_string();
                    if is_ignored_file(&name, ignored_extensions) {
                        return false;
                    }
                    matches_extension(&name, extensions)
                })
                .collect()
        };

        for (i, folder) in folders.iter().enumerate() {
            let is_last = i == folders.len() - 1 && filtered_files.is_empty();
            let prefix = if is_last { "└── " } else { "├── " };
            let child_indent = if is_last { "    " } else { "│   " };

            let sub_content = build_tree(
                &folder.path(),
                extensions,
                ignored_extensions,
                ignored_folders,
                &format!("{}{}", indent, child_indent),
                folders_only,
            );

            let show_folder = if folders_only {
                true
            } else {
                !sub_content.is_empty() || extensions.is_empty()
            };

            if show_folder {
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
    result.push_str(&build_tree(
        Path::new(&folder_path),
        &extensions,
        &ignored_extensions,
        &ignored_folders,
        "",
        folders_only,
    ));

    HierarchyResult {
        success: true,
        hierarchy: result,
        error: None,
    }
}
