use std::fs;

use crate::types::Config;

fn get_config_path() -> std::path::PathBuf {
    let config_dir = dirs::config_dir().unwrap_or_else(|| std::path::PathBuf::from("."));
    config_dir.join("metatron").join("config.json")
}

pub fn load_config() -> Config {
    let config_path = get_config_path();

    if let Ok(content) = fs::read_to_string(&config_path) {
        serde_json::from_str(&content).unwrap_or_default()
    } else {
        Config::default()
    }
}

pub fn save_config(config: Config) -> bool {
    let config_path = get_config_path();

    if let Some(parent) = config_path.parent() {
        let _ = fs::create_dir_all(parent);
    }

    match serde_json::to_string_pretty(&config) {
        Ok(content) => fs::write(&config_path, content).is_ok(),
        Err(_) => false,
    }
}
