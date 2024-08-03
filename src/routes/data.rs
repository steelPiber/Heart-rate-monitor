use axum::{
    routing::post,
    Router,
    extract::Json,
    http::StatusCode,
    response::IntoResponse,
};
use serde::Deserialize;
use std::sync::Arc;
use tokio_postgres::Client;

#[derive(Deserialize, Debug)]
struct Data {
    bpm: String,
    email: String,
    tag: String,
    timestamp: String,
}

async fn handle_post(Json(payload): Json<Data>, client: Arc<Client>) -> impl IntoResponse {
    println!("Received request body: {:?}", payload);

    // BPM 값이 숫자인지 확인하고 변환
    let bpm = match payload.bpm.parse::<i32>() {
        Ok(bpm) => bpm,
        Err(_) => return (StatusCode::BAD_REQUEST, "Invalid BPM value").into_response(),
    };

    // 이메일 형식 확인
    let email_without_domain = match payload.email.split('@').next() {
        Some(e) => e.to_string(),
        None => return (StatusCode::BAD_REQUEST, "Invalid email format").into_response(),
    };

    match insert_bpm_data(&client, bpm, &email_without_domain, &payload.tag, &payload.timestamp).await {
        Ok(_) => {
            println!("Successfully inserted BPM data into PostgreSQL");
            (StatusCode::OK, "Request received").into_response()
        }
        Err(err) => {
            println!("Error inserting BPM data into PostgreSQL: {:?}", err);
            (StatusCode::INTERNAL_SERVER_ERROR, "Error inserting data").into_response()
        }
    }
}

async fn insert_bpm_data(client: &Client, bpm: i32, email: &str, tag: &str, timestamp: &str) -> Result<(), tokio_postgres::Error> {
    let insert_sql = "INSERT INTO bpmdata (BPM, EMAIL, TAG, TIME) VALUES ($1, $2, $3, $4)";
    let time = match chrono::NaiveDateTime::parse_from_str(timestamp, "%Y-%m-%dT%H:%M:%S") {
        Ok(t) => t,
        Err(_) => chrono::Utc::now().naive_utc(), // 시간 변환 실패 시 현재 시간 사용
    };
    client.execute(insert_sql, &[&bpm, &email, &tag, &time]).await?;
    Ok(())
}

pub fn create_routes(client: Arc<Client>) -> Router {
    Router::new().route("/", post(move |json| handle_post(json, client.clone())))
}
