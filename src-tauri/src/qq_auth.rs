use std::collections::BTreeMap;
use std::sync::Arc;

use tauri::async_runtime;
use tauri::webview::{PageLoadEvent, WebviewWindowBuilder};
use tauri::{AppHandle, Manager, State, WebviewUrl};
use tokio::sync::{oneshot, Mutex as AsyncMutex};
use url::Url;

const QQ_AUTH_WINDOW_LABEL: &str = "qq-auth";
const QQ_AUTH_WINDOW_TITLE: &str = "QQ 音乐登录";
const QQ_AUTH_SUCCESS_HOST: &str = "y.qq.com";
const QQ_AUTH_SUCCESS_PATH: &str = "/portal/profile.html";
const QQ_AUTH_LOGIN_URL: &str = "https://xui.ptlogin2.qq.com/cgi-bin/xlogin?appid=716027609&s_url=https%3A%2F%2Fy.qq.com%2Fportal%2Fprofile.html&style=40&force_qr=1";

type Waiter = oneshot::Sender<QqAuthOutcome>;

#[derive(Debug, Clone)]
enum QqAuthOutcome {
    Success,
    Cancelled,
    Failed(String),
}

#[derive(Default)]
pub struct QqAuthState {
    cookie_header: Option<String>,
    auth_in_progress: bool,
    waiters: Vec<Waiter>,
}

pub type SharedQqAuthState = Arc<AsyncMutex<QqAuthState>>;

pub async fn get_cookie_header(state: &SharedQqAuthState) -> Option<String> {
    state.lock().await.cookie_header.clone()
}

pub async fn clear_cookie_header(state: &SharedQqAuthState) {
    state.lock().await.cookie_header = None;
}

#[tauri::command]
pub async fn ensure_qq_auth_session(
    app: AppHandle,
    state: State<'_, SharedQqAuthState>,
) -> Result<bool, String> {
    let receiver = {
        let mut guard = state.lock().await;
        if guard.cookie_header.is_some() {
            return Ok(true);
        }

        let (sender, receiver) = oneshot::channel();
        guard.waiters.push(sender);

        if !guard.auth_in_progress {
            guard.auth_in_progress = true;
            drop(guard);

            if let Err(error) = open_auth_window(&app, state.inner().clone()) {
                finish_auth(
                    state.inner().clone(),
                    QqAuthOutcome::Failed(error.to_string()),
                )
                .await;
            }
        }

        receiver
    };

    match receiver.await {
        Ok(QqAuthOutcome::Success) => Ok(true),
        Ok(QqAuthOutcome::Cancelled) => Ok(false),
        Ok(QqAuthOutcome::Failed(message)) => Err(message),
        Err(_) => Err("腾讯登录流程异常中断".to_string()),
    }
}

fn open_auth_window(app: &AppHandle, state: SharedQqAuthState) -> tauri::Result<()> {
    if let Some(existing) = app.get_webview_window(QQ_AUTH_WINDOW_LABEL) {
        existing.show()?;
        existing.set_focus()?;
        return Ok(());
    }

    let auth_url = Url::parse(QQ_AUTH_LOGIN_URL)
        .map(WebviewUrl::External)
        .map_err(|error| tauri::Error::InvalidUrl(error))?;

    let app_for_load = app.clone();
    let state_for_load = state.clone();

    let window = WebviewWindowBuilder::new(app, QQ_AUTH_WINDOW_LABEL, auth_url)
        .title(QQ_AUTH_WINDOW_TITLE)
        .inner_size(420.0, 640.0)
        .min_inner_size(360.0, 520.0)
        .center()
        .resizable(true)
        .maximizable(false)
        .minimizable(true)
        .focused(true)
        .always_on_top(true)
        .incognito(true)
        .on_navigation(|url| matches!(url.scheme(), "http" | "https"))
        .on_page_load(move |_window, payload| {
            if payload.event() != PageLoadEvent::Finished {
                return;
            }

            let url = payload.url().clone();
            if !is_login_success_url(&url) {
                return;
            }

            let app_handle = app_for_load.clone();
            let state = state_for_load.clone();
            async_runtime::spawn(async move {
                if let Err(error) = finalize_auth_success(app_handle.clone(), state.clone()).await {
                    finish_auth(state, QqAuthOutcome::Failed(error)).await;
                }
            });
        })
        .build()?;

    let state_for_close = state;
    window.on_window_event(move |event| {
        if matches!(
            event,
            tauri::WindowEvent::CloseRequested { .. } | tauri::WindowEvent::Destroyed
        ) {
            let state = state_for_close.clone();
            async_runtime::spawn(async move {
                finish_auth(state, QqAuthOutcome::Cancelled).await;
            });
        }
    });

    Ok(())
}

async fn finalize_auth_success(app: AppHandle, state: SharedQqAuthState) -> Result<(), String> {
    let Some(window) = app.get_webview_window(QQ_AUTH_WINDOW_LABEL) else {
        return Err("腾讯登录窗口已关闭".to_string());
    };

    let cookie_header = extract_cookie_header(&window)
        .await
        .ok_or_else(|| "腾讯登录已完成，但未读取到有效会话".to_string())?;

    {
        let mut guard = state.lock().await;
        guard.cookie_header = Some(cookie_header);
    }

    finish_auth(state, QqAuthOutcome::Success).await;
    let _ = window.close();
    Ok(())
}

async fn extract_cookie_header<R: tauri::Runtime>(
    window: &tauri::WebviewWindow<R>,
) -> Option<String> {
    let target_urls = [
        "https://y.qq.com/",
        "https://c.y.qq.com/",
        "https://u.y.qq.com/",
    ];
    let mut cookie_map = BTreeMap::<String, String>::new();

    for raw_url in target_urls {
        let Ok(url) = Url::parse(raw_url) else {
            continue;
        };
        let Ok(cookies) = window.cookies_for_url(url) else {
            continue;
        };

        for cookie in cookies {
            let name = cookie.name().trim();
            let value = cookie.value().trim();
            if name.is_empty() || value.is_empty() {
                continue;
            }
            cookie_map.insert(name.to_string(), value.to_string());
        }
    }

    if cookie_map.is_empty() {
        return None;
    }

    Some(
        cookie_map
            .into_iter()
            .map(|(name, value)| format!("{name}={value}"))
            .collect::<Vec<_>>()
            .join("; "),
    )
}

async fn finish_auth(state: SharedQqAuthState, outcome: QqAuthOutcome) {
    let waiters = {
        let mut guard = state.lock().await;
        if !guard.auth_in_progress {
            return;
        }

        guard.auth_in_progress = false;
        if !matches!(outcome, QqAuthOutcome::Success) {
            guard.cookie_header = None;
        }
        std::mem::take(&mut guard.waiters)
    };

    for waiter in waiters {
        let _ = waiter.send(outcome.clone());
    }
}

fn is_login_success_url(url: &Url) -> bool {
    url.host_str() == Some(QQ_AUTH_SUCCESS_HOST) && url.path().starts_with(QQ_AUTH_SUCCESS_PATH)
}
