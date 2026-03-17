use sqlx::{postgres::PgPool, FromRow};
use serde::{Serialize, Deserialize};
use tauri::{State, async_runtime, menu::{Menu, MenuItem}, tray::TrayIconBuilder, Manager};
use dotenvy::dotenv;
use std::env;
use argon2::{
    password_hash::{rand_core::OsRng, PasswordHash, PasswordHasher, PasswordVerifier, SaltString},
    Argon2
};

use tokio::sync::RwLock;

struct DbState {
    pool: RwLock<Option<PgPool>>,
}

#[derive(Serialize, Deserialize, Debug, FromRow)]
pub struct User {
    id: String,
    email: String,
    name: Option<String>,
}

#[derive(FromRow)]
struct UserAuth {
    id: String,
    email: String,
    password: String,
    name: Option<String>,
}

#[derive(Serialize, Deserialize, Debug, FromRow)]
pub struct Project {
    id: String,
    name: String,
    description: Option<String>,
    status: String,
    #[sqlx(rename = "totalHours")]
    totalHours: f64,
}

#[derive(Serialize, Deserialize, Debug, FromRow)]
pub struct Task {
    id: String,
    title: String,
    #[sqlx(rename = "isCompleted")]
    isCompleted: bool,
    priority: String,
    #[sqlx(rename = "projectId")]
    projectId: String,
    #[sqlx(rename = "totalHours")]
    totalHours: f64,
}

#[derive(Serialize, Deserialize, Debug, FromRow)]
pub struct TimeSession {
    id: String,
    #[sqlx(rename = "startTime")]
    startTime: chrono::NaiveDateTime,
    #[sqlx(rename = "endTime")]
    endTime: chrono::NaiveDateTime,
    description: String,
    #[sqlx(rename = "taskId")]
    taskId: Option<String>,
    #[sqlx(rename = "projectId")]
    projectId: String,
}

#[derive(Serialize, Deserialize, Debug, FromRow)]
pub struct TimeSessionWithDetails {
    id: String,
    #[sqlx(rename = "startTime")]
    startTime: chrono::NaiveDateTime,
    #[sqlx(rename = "endTime")]
    endTime: chrono::NaiveDateTime,
    description: String,
    #[sqlx(rename = "projectName")]
    projectName: String,
    #[sqlx(rename = "taskTitle")]
    taskTitle: Option<String>,
}

#[tauri::command]
async fn get_db_status(state: State<'_, DbState>) -> Result<bool, String> {
    let pool = state.pool.read().await;
    Ok(pool.is_some())
}

#[tauri::command]
async fn connect_db(state: State<'_, DbState>, app_handle: tauri::AppHandle, url: String) -> Result<(), String> {
    let pool = PgPool::connect(&url).await.map_err(|e| format!("Connection failed: {}", e))?;
    
    // Test connection
    sqlx::query("SELECT 1").execute(&pool).await.map_err(|e| format!("Query failed: {}", e))?;

    // Save to state
    let mut state_pool = state.pool.write().await;
    *state_pool = Some(pool);

    // Persist URL to app data
    let app_dir = app_handle.path().app_data_dir().map_err(|e| e.to_string())?;
    if !app_dir.exists() {
        std::fs::create_dir_all(&app_dir).map_err(|e| e.to_string())?;
    }
    let config_path = app_dir.join("config.json");
    let config = serde_json::json!({ "database_url": url });
    std::fs::write(config_path, serde_json::to_string(&config).unwrap()).map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
async fn get_projects(state: State<'_, DbState>, user_id: String) -> Result<Vec<Project>, String> {
    let pool_guard = state.pool.read().await;
    let pool = pool_guard.as_ref().ok_or("Database not connected")?;

    let projects = sqlx::query_as::<_, Project>(
        r#"SELECT id, name, description, status, "totalHours" FROM "Project" WHERE "userId" = $1 ORDER BY "createdAt" DESC"#
    )
    .bind(user_id)
    .fetch_all(pool)
    .await
    .map_err(|e| e.to_string())?;

    Ok(projects)
}

#[tauri::command]
async fn get_project(state: State<'_, DbState>, id: String) -> Result<Project, String> {
    let pool_guard = state.pool.read().await;
    let pool = pool_guard.as_ref().ok_or("Database not connected")?;

    let project = sqlx::query_as::<_, Project>(
        r#"SELECT id, name, description, status, "totalHours" FROM "Project" WHERE id = $1"#
    )
    .bind(id)
    .fetch_one(pool)
    .await
    .map_err(|e| e.to_string())?;

    Ok(project)
}

#[tauri::command]
async fn create_project(
    state: State<'_, DbState>,
    name: String,
    description: Option<String>,
    user_id: String,
) -> Result<Project, String> {
    let pool_guard = state.pool.read().await;
    let pool = pool_guard.as_ref().ok_or("Database not connected")?;

    let id = xid::new().to_string();
    
    let project = sqlx::query_as::<_, Project>(
        r#"INSERT INTO "Project" (id, name, description, status, "totalHours", "userId", "updatedAt", "createdAt") 
           VALUES ($1, $2, $3, 'active', 0, $4, NOW(), NOW()) 
           RETURNING id, name, description, status, "totalHours""#
    )
    .bind(id)
    .bind(name)
    .bind(description)
    .bind(user_id)
    .fetch_one(pool)
    .await
    .map_err(|e| e.to_string())?;

    Ok(project)
}

#[tauri::command]
async fn register_user(
    state: State<'_, DbState>,
    email: String,
    password: String,
    name: Option<String>,
) -> Result<User, String> {
    let pool_guard = state.pool.read().await;
    let pool = pool_guard.as_ref().ok_or("Database not connected")?;

    let id = xid::new().to_string();
    let salt = SaltString::generate(&mut OsRng);
    let argon2 = Argon2::default();
    let password_hash = argon2.hash_password(password.as_bytes(), &salt)
        .map_err(|e| e.to_string())?
        .to_string();

    let user = sqlx::query_as::<_, User>(
        r#"INSERT INTO "User" (id, email, password, name, "updatedAt", "createdAt")
           VALUES ($1, $2, $3, $4, NOW(), NOW())
           RETURNING id, email, name"#
    )
    .bind(id)
    .bind(email)
    .bind(password_hash)
    .bind(name)
    .fetch_one(pool)
    .await
    .map_err(|e| {
        let err_msg = e.to_string();
        if err_msg.contains("unique constraint") {
            "Email already exists".to_string()
        } else {
            err_msg
        }
    })?;

    Ok(user)
}

#[tauri::command]
async fn login_user(
    state: State<'_, DbState>,
    email: String,
    password: String,
) -> Result<User, String> {
    let pool_guard = state.pool.read().await;
    let pool = pool_guard.as_ref().ok_or("Database not connected")?;

    let row = sqlx::query_as::<_, UserAuth>(
        r#"SELECT id, email, password, name FROM "User" WHERE email = $1"#
    )
    .bind(email)
    .fetch_optional(pool)
    .await
    .map_err(|e| e.to_string())?;

    if let Some(record) = row {
        let parsed_hash = PasswordHash::new(&record.password).map_err(|e| e.to_string())?;
        if Argon2::default().verify_password(password.as_bytes(), &parsed_hash).is_ok() {
            return Ok(User {
                id: record.id,
                email: record.email,
                name: record.name,
            });
        }
    }

    Err("Invalid email or password".to_string())
}

#[tauri::command]
async fn get_tasks(state: State<'_, DbState>, project_id: String) -> Result<Vec<Task>, String> {
    let pool_guard = state.pool.read().await;
    let pool = pool_guard.as_ref().ok_or("Database not connected")?;

    let tasks = sqlx::query_as::<_, Task>(
        r#"SELECT id, title, "isCompleted", priority, "projectId", "totalHours" FROM "Task" WHERE "projectId" = $1 ORDER BY "createdAt" ASC"#
    )
    .bind(project_id)
    .fetch_all(pool)
    .await
    .map_err(|e| e.to_string())?;

    Ok(tasks)
}

#[tauri::command]
async fn create_task(
    state: State<'_, DbState>,
    project_id: String,
    title: String,
    priority: String,
) -> Result<Task, String> {
    let pool_guard = state.pool.read().await;
    let pool = pool_guard.as_ref().ok_or("Database not connected")?;

    let id = xid::new().to_string();
    
    let task = sqlx::query_as::<_, Task>(
        r#"INSERT INTO "Task" (id, title, "isCompleted", priority, "projectId", "totalHours", "updatedAt", "createdAt") 
           VALUES ($1, $2, false, $3, $4, 0.0, NOW(), NOW()) 
           RETURNING id, title, "isCompleted", priority, "projectId", "totalHours""#
    )
    .bind(id)
    .bind(title)
    .bind(priority)
    .bind(project_id)
    .fetch_one(pool)
    .await
    .map_err(|e| e.to_string())?;

    Ok(task)
}

#[tauri::command]
async fn add_project_time(
    state: State<'_, DbState>,
    project_id: String,
    hours: f64,
) -> Result<Project, String> {
    let pool_guard = state.pool.read().await;
    let pool = pool_guard.as_ref().ok_or("Database not connected")?;

    let project = sqlx::query_as::<_, Project>(
        r#"UPDATE "Project" SET "totalHours" = "totalHours" + $1, "updatedAt" = NOW() WHERE id = $2 RETURNING id, name, description, status, "totalHours""#
    )
    .bind(hours)
    .bind(project_id)
    .fetch_one(pool)
    .await
    .map_err(|e| e.to_string())?;

    Ok(project)
}

#[tauri::command]
async fn add_task_time(
    state: State<'_, DbState>,
    task_id: String,
    project_id: String,
    hours: f64,
) -> Result<Task, String> {
    let pool_guard = state.pool.read().await;
    let pool = pool_guard.as_ref().ok_or("Database not connected")?;

    // 1. Update task time
    let task = sqlx::query_as::<_, Task>(
        r#"UPDATE "Task" SET "totalHours" = "totalHours" + $1, "updatedAt" = NOW() WHERE id = $2 RETURNING id, title, "isCompleted", priority, "projectId", "totalHours""#
    )
    .bind(hours)
    .bind(&task_id)
    .fetch_one(pool)
    .await
    .map_err(|e| e.to_string())?;

    // 2. Update parent project time as well
    sqlx::query(
        r#"UPDATE "Project" SET "totalHours" = "totalHours" + $1, "updatedAt" = NOW() WHERE id = $2"#
    )
    .bind(hours)
    .bind(&project_id)
    .execute(pool)
    .await
    .map_err(|e| e.to_string())?;

    Ok(task)
}

#[tauri::command]
async fn update_task(
    state: State<'_, DbState>,
    task_id: String,
    title: String,
    priority: String,
    is_completed: bool,
) -> Result<Task, String> {
    let pool_guard = state.pool.read().await;
    let pool = pool_guard.as_ref().ok_or("Database not connected")?;

    let task = sqlx::query_as::<_, Task>(
        r#"UPDATE "Task" SET title = $1, priority = $2, "isCompleted" = $1, "updatedAt" = NOW() WHERE id = $4 RETURNING id, title, "isCompleted", priority, "projectId", "totalHours""#
    )
    .bind(title)
    .bind(priority)
    .bind(is_completed)
    .bind(task_id)
    .fetch_one(pool)
    .await
    .map_err(|e| e.to_string())?;

    Ok(task)
}

#[tauri::command]
async fn delete_task(
    state: State<'_, DbState>,
    task_id: String,
) -> Result<(), String> {
    let pool_guard = state.pool.read().await;
    let pool = pool_guard.as_ref().ok_or("Database not connected")?;

    sqlx::query(
        r#"DELETE FROM "Task" WHERE id = $1"#
    )
    .bind(task_id)
    .execute(pool)
    .await
    .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
async fn add_time_session(
    state: State<'_, DbState>,
    project_id: String,
    task_id: Option<String>,
    start_time: String, // Expecting ISO8601 string from JS
    end_time: String,
    description: String,
) -> Result<TimeSession, String> {
    let pool_guard = state.pool.read().await;
    let pool = pool_guard.as_ref().ok_or("Database not connected")?;

    let id = xid::new().to_string();
    
    // Parse strings to DateTime
    let st = chrono::DateTime::parse_from_rfc3339(&start_time)
        .map_err(|e| format!("Invalid start_time: {}", e))?
        .naive_utc();
        
    let et = chrono::DateTime::parse_from_rfc3339(&end_time)
        .map_err(|e| format!("Invalid end_time: {}", e))?
        .naive_utc();

    let session = sqlx::query_as::<_, TimeSession>(
        r#"INSERT INTO "TimeSession" (id, "projectId", "taskId", "startTime", "endTime", description, "updatedAt") 
           VALUES ($1, $2, $3, $4, $5, $6, NOW()) 
           RETURNING id, "startTime", "endTime", description, "taskId", "projectId""#
    )
    .bind(id)
    .bind(&project_id)
    .bind(&task_id)
    .bind(st)
    .bind(et)
    .bind(description)
    .fetch_one(pool)
    .await
    .map_err(|e| e.to_string())?;

    Ok(session)
}

#[tauri::command]
async fn get_time_sessions(
    state: State<'_, DbState>,
    project_id: String,
) -> Result<Vec<TimeSession>, String> {
    let pool_guard = state.pool.read().await;
    let pool = pool_guard.as_ref().ok_or("Database not connected")?;

    let sessions = sqlx::query_as::<_, TimeSession>(
        r#"SELECT id, "startTime", "endTime", description, "taskId", "projectId" 
           FROM "TimeSession" 
           WHERE "projectId" = $1 
           ORDER BY "startTime" DESC"#
    )
    .bind(project_id)
    .fetch_all(pool)
    .await
    .map_err(|e| e.to_string())?;

    Ok(sessions)
}

#[tauri::command]
async fn get_all_time_sessions(
    state: State<'_, DbState>,
    user_id: String,
) -> Result<Vec<TimeSessionWithDetails>, String> {
    let pool_guard = state.pool.read().await;
    let pool = pool_guard.as_ref().ok_or("Database not connected")?;

    let sessions = sqlx::query_as::<_, TimeSessionWithDetails>(
        r#"
        SELECT 
            ts.id, 
            ts."startTime", 
            ts."endTime", 
            ts.description,
            p.name as "projectName",
            t.title as "taskTitle"
        FROM "TimeSession" ts
        JOIN "Project" p ON ts."projectId" = p.id
        LEFT JOIN "Task" t ON ts."taskId" = t.id
        WHERE p."userId" = $1
        ORDER BY ts."startTime" DESC
        "#
    )
    .bind(user_id)
    .fetch_all(pool)
    .await
    .map_err(|e| e.to_string())?;

    Ok(sessions)
}

#[derive(Serialize)]
struct ExportData {
    projects: Vec<Project>,
    tasks: Vec<Task>,
    sessions: Vec<TimeSession>,
}

#[tauri::command]
async fn export_data(state: State<'_, DbState>, user_id: String) -> Result<String, String> {
    let pool_guard = state.pool.read().await;
    let pool = pool_guard.as_ref().ok_or("Database not connected")?;

    let projects = sqlx::query_as::<_, Project>(
        r#"SELECT id, name, description, status, "totalHours" FROM "Project" WHERE "userId" = $1"#
    )
    .bind(&user_id)
    .fetch_all(pool)
    .await
    .map_err(|e| e.to_string())?;

    let tasks = sqlx::query_as::<_, Task>(
        r#"SELECT t.id, t.title, t."isCompleted", t.priority, t."projectId", t."totalHours" 
           FROM "Task" t 
           JOIN "Project" p ON t."projectId" = p.id 
           WHERE p."userId" = $1"#
    )
    .bind(&user_id)
    .fetch_all(pool)
    .await
    .map_err(|e| e.to_string())?;

    let sessions = sqlx::query_as::<_, TimeSession>(
        r#"SELECT ts.id, ts."startTime", ts."endTime", ts.description, ts."taskId", ts."projectId" 
           FROM "TimeSession" ts 
           JOIN "Project" p ON ts."projectId" = p.id 
           WHERE p."userId" = $1"#
    )
    .bind(&user_id)
    .fetch_all(pool)
    .await
    .map_err(|e| e.to_string())?;

    let export = ExportData { projects, tasks, sessions };
    serde_json::to_string_pretty(&export).map_err(|e| e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(DbState { pool: RwLock::new(None) })
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_notification::init())
        .setup(|app| {
            // Attempt to load saved config
            let app_handle = app.handle().clone();
            async_runtime::spawn(async move {
                let app_dir = app_handle.path().app_data_dir().unwrap_or_default();
                let config_path = app_dir.join("config.json");
                
                if config_path.exists() {
                    if let Ok(config_str) = std::fs::read_to_string(config_path) {
                        if let Ok(config) = serde_json::from_str::<serde_json::Value>(&config_str) {
                            if let Some(url) = config["database_url"].as_str() {
                                if let Ok(pool) = PgPool::connect(url).await {
                                    let state = app_handle.state::<DbState>();
                                    let mut pool_lock = state.pool.write().await;
                                    *pool_lock = Some(pool);
                                }
                            }
                        }
                    }
                } else {
                    // Fallback to env for development
                    dotenv().ok();
                    if let Ok(url) = env::var("DATABASE_URL") {
                        if let Ok(pool) = PgPool::connect(&url).await {
                            let state = app_handle.state::<DbState>();
                            let mut pool_lock = state.pool.write().await;
                            *pool_lock = Some(pool);
                        }
                    }
                }
            });

            let quit_i = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
            let show_i = MenuItem::with_id(app, "show", "Show App", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show_i, &quit_i])?;

            let _tray = TrayIconBuilder::new()
                .icon(app.default_window_icon().unwrap().clone())
                .menu(&menu)
                .show_menu_on_left_click(false)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "quit" => {
                        app.exit(0);
                    }
                    "show" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                    _ => {}
                })
                .build(app)?;

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_db_status,
            connect_db,
            get_projects,
            get_project,
            create_project,
            get_tasks,
            create_task,
            register_user,
            login_user,
            add_project_time,
            add_task_time,
            update_task,
            delete_task,
            add_time_session,
            get_time_sessions,
            get_all_time_sessions,
            export_data
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
