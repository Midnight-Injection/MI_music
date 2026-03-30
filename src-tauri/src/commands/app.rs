use crate::api::helpers::set_runtime_proxy_config;

#[tauri::command]
pub fn exit_app(app: tauri::AppHandle) {
    app.exit(0);
}

#[tauri::command]
pub fn set_network_proxy(enabled: bool, host: Option<String>, port: Option<u16>) {
    set_runtime_proxy_config(enabled, host, port);
}
