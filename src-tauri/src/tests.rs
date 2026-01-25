#[cfg(test)]
mod tests {
    use std::fs;

    use tempfile::tempdir;

    use crate::filters::{matches_extension, parse_extensions};
    use crate::scan::{get_hierarchy, list_files};

    #[test]
    fn parse_extensions_splits_and_normalizes() {
        let result = parse_extensions(" .RS, .Txt  md ");
        assert_eq!(result, vec!["rs", "txt", "md"]);
    }

    #[test]
    fn matches_extension_allows_any_when_empty() {
        let extensions: Vec<String> = Vec::new();
        assert!(matches_extension("file.txt", &extensions));
    }

    #[test]
    fn matches_extension_respects_filters() {
        let extensions = vec!["txt".to_string(), "md".to_string()];
        assert!(matches_extension("notes.TXT", &extensions));
        assert!(matches_extension("readme.md", &extensions));
        assert!(!matches_extension("image.png", &extensions));
    }

    #[test]
    fn list_files_folders_only_omits_files() {
        let dir = tempdir().expect("tempdir");
        let root = dir.path();
        let folder_a = root.join("a");
        let folder_b = root.join("b");
        fs::create_dir_all(&folder_a).expect("create a");
        fs::create_dir_all(&folder_b).expect("create b");
        fs::write(root.join("root.txt"), "hello").expect("write root");
        fs::write(folder_a.join("nested.txt"), "hello").expect("write nested");

        let result = list_files(
            root.to_string_lossy().to_string(),
            "".to_string(),
            true,
            "".to_string(),
            Vec::new(),
        );
        assert!(result.success);
        assert!(!result.files.is_empty());
        assert!(result
            .files
            .iter()
            .all(|entry| std::path::Path::new(&entry.path).is_dir()));
    }

    #[test]
    fn list_files_respects_extension_filter() {
        let dir = tempdir().expect("tempdir");
        let root = dir.path();
        fs::write(root.join("a.txt"), "hello").expect("write a");
        fs::write(root.join("b.md"), "hello").expect("write b");
        fs::write(root.join("c.png"), "hello").expect("write c");

        let result = list_files(
            root.to_string_lossy().to_string(),
            ".md".to_string(),
            false,
            "".to_string(),
            Vec::new(),
        );
        assert!(result.success);
        assert_eq!(result.files.len(), 1);
        assert_eq!(result.files[0].name, "b.md");
    }

    #[test]
    fn list_files_ignores_extensions() {
        let dir = tempdir().expect("tempdir");
        let root = dir.path();
        fs::write(root.join("a.log"), "hello").expect("write a");
        fs::write(root.join("b.txt"), "hello").expect("write b");

        let result = list_files(
            root.to_string_lossy().to_string(),
            "".to_string(),
            false,
            ".log".to_string(),
            Vec::new(),
        );
        assert!(result.success);
        assert_eq!(result.files.len(), 1);
        assert_eq!(result.files[0].name, "b.txt");
    }

    #[test]
    fn hierarchy_folders_only_has_no_files() {
        let dir = tempdir().expect("tempdir");
        let root = dir.path();
        fs::create_dir_all(root.join("folder")).expect("create folder");
        fs::write(root.join("file.txt"), "hello").expect("write file");

        let result = get_hierarchy(
            root.to_string_lossy().to_string(),
            "".to_string(),
            true,
            "".to_string(),
            Vec::new(),
        );
        assert!(result.success);
        assert!(!result.hierarchy.contains("📄"));
    }

    #[test]
    fn hierarchy_skips_ignored_folder_by_name() {
        let dir = tempdir().expect("tempdir");
        let root = dir.path();
        fs::create_dir_all(root.join("skipme")).expect("create skip");
        fs::write(root.join("skipme").join("a.txt"), "hello").expect("write a");
        fs::create_dir_all(root.join("keep")).expect("create keep");
        fs::write(root.join("keep").join("b.txt"), "hello").expect("write b");

        let result = get_hierarchy(
            root.to_string_lossy().to_string(),
            "".to_string(),
            false,
            "".to_string(),
            vec!["skipme".to_string()],
        );
        assert!(result.success);
        assert!(!result.hierarchy.contains("skipme"));
        assert!(result.hierarchy.contains("keep"));
    }

    #[test]
    fn hierarchy_skips_ignored_folder_by_path() {
        let dir = tempdir().expect("tempdir");
        let root = dir.path();
        let skip = root.join("skipme");
        let keep = root.join("keep");
        fs::create_dir_all(skip.join("child")).expect("create skip child");
        fs::create_dir_all(&keep).expect("create keep");
        fs::write(skip.join("child").join("a.txt"), "hello").expect("write a");
        fs::write(keep.join("b.txt"), "hello").expect("write b");

        let result = get_hierarchy(
            root.to_string_lossy().to_string(),
            "".to_string(),
            false,
            "".to_string(),
            vec![skip.to_string_lossy().to_string()],
        );
        assert!(result.success);
        assert!(!result.hierarchy.contains("skipme"));
        assert!(result.hierarchy.contains("keep"));
    }
}
