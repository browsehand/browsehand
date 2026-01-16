use anyhow::{anyhow, Result};
use serde_json::Value;
use std::fs::{self, OpenOptions};
use std::io::Write;
use std::path::PathBuf;

fn get_desktop_path() -> PathBuf {
    dirs::desktop_dir().unwrap_or_else(|| PathBuf::from("."))
}

fn resolve_filepath(filename: &str) -> PathBuf {
    if filename.contains('/') || filename.contains('\\') {
        PathBuf::from(filename)
    } else {
        get_desktop_path().join(filename)
    }
}

pub fn save_csv(filename: &str, data: &Value, append: bool) -> Result<String> {
    let filepath = resolve_filepath(filename);
    
    let arr = data.as_array().ok_or_else(|| anyhow!("data must be an array"))?;
    
    if arr.is_empty() {
        return Err(anyhow!("data array is empty"));
    }
    
    let headers: Vec<String> = arr[0]
        .as_object()
        .ok_or_else(|| anyhow!("each item must be an object"))?
        .keys()
        .cloned()
        .collect();
    
    let file_exists = filepath.exists();
    
    let mut file = OpenOptions::new()
        .write(true)
        .create(true)
        .append(append)
        .truncate(!append)
        .open(&filepath)?;
    
    if !append || !file_exists {
        writeln!(file, "{}", headers.join(","))?;
    }
    
    for row in arr {
        let values: Vec<String> = headers
            .iter()
            .map(|h| {
                let val = row.get(h).map(|v| match v {
                    Value::String(s) => s.clone(),
                    Value::Null => String::new(),
                    other => other.to_string(),
                }).unwrap_or_default();
                format!("\"{}\"", val.replace('"', "\"\""))
            })
            .collect();
        writeln!(file, "{}", values.join(","))?;
    }
    
    Ok(filepath.to_string_lossy().to_string())
}

pub fn save_json(filename: &str, data: &Value) -> Result<String> {
    let filepath = resolve_filepath(filename);
    let content = serde_json::to_string_pretty(data)?;
    fs::write(&filepath, content)?;
    Ok(filepath.to_string_lossy().to_string())
}
