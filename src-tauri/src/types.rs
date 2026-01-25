use serde::{Deserialize, Serialize};

#[derive(Serialize)]
pub struct FileInfo {
    pub name: String,
    pub path: String,
    pub size: u64,
}

#[derive(Serialize)]
pub struct ListFilesResult {
    pub success: bool,
    pub files: Vec<FileInfo>,
    pub error: Option<String>,
}

#[derive(Serialize)]
pub struct HierarchyResult {
    pub success: bool,
    pub hierarchy: String,
    pub error: Option<String>,
}

#[derive(Serialize)]
pub struct SaveResult {
    pub success: bool,
    pub path: Option<String>,
    pub error: Option<String>,
}

#[derive(Serialize, Deserialize, Default)]
pub struct Config {
    pub output_directory: String,
}
