use axum::{
    routing::get,
    Router,
    response::IntoResponse,
    Json,
};
use std::sync::Arc;
use tokio_postgres::Client;

#[derive(serde::Serialize)]
struct BpmData {
    idx: i32,
    bpm: String,
    email: String,
    tag: String,
    time: String,
}

async fn get_recent_bpm_data(client: Arc<Client>) -> impl IntoResponse {
    let select_sql = "SELECT IDX, BPM, EMAIL, TAG, TIME FROM bpmdata ORDER BY TIME DESC LIMIT 5"; // 최근 5개의 데이터 가져오기
    let rows = client.query(select_sql, &[]).await.unwrap();

    let bpm_data: Vec<BpmData> = rows.iter().map(|row| BpmData {
        idx: row.get("IDX"),
        bpm: row.get("BPM"),
        email: row.get("EMAIL"),
        tag: row.get("TAG"),
        time: row.get("TIME"),
    }).collect();

    Json(bpm_data)
}

pub fn create_routes(client: Arc<Client>) -> Router {
    Router::new().route("/", get(move || get_recent_bpm_data(client.clone())))
}
