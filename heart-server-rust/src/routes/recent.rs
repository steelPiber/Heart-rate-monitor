use axum::{response::IntoResponse, routing::get, Json, Router};
use std::sync::Arc;
use tokio_postgres::Client;

#[derive(serde::Serialize, Debug)] // Debug 어노테이션 추가
struct BpmData {
    idx: i32,
    bpm: i32,
    email: String,
    tag: String,
    time: String,
}

async fn get_recent_bpm_data(client: Arc<Client>) -> impl IntoResponse {
    let select_sql = "SELECT IDX, BPM, EMAIL, TAG, TIME FROM bpmdata ORDER BY TIME DESC LIMIT 5";

    // 쿼리 실행 및 오류 처리
    let rows = match client.query(select_sql, &[]).await {
        Ok(rows) => rows,
        Err(err) => {
            eprintln!("Error executing query: {:?}", err); // 오류 로그 출력
            return (
                axum::http::StatusCode::INTERNAL_SERVER_ERROR,
                "Error executing query",
            )
                .into_response();
        }
    };

    let bpm_data: Vec<BpmData> = rows
        .iter()
        .map(|row| BpmData {
            idx: row.get("IDX"),
            bpm: row.get("BPM"),
            email: row.get("EMAIL"),
            tag: row.get("TAG"),
            time: row.get::<_, chrono::NaiveDateTime>("TIME").to_string(),
        })
        .collect();

    println!("Fetched recent BPM data: {:?}", bpm_data); // 로그 추가

    Json(bpm_data).into_response() // `.into_response()` 추가
}

pub fn create_routes(client: Arc<Client>) -> Router {
    Router::new().route("/", get(move || get_recent_bpm_data(client.clone())))
}
