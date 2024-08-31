use axum::{extract::Query, response::IntoResponse, routing::get, Json, Router};
use serde::Deserialize; // 역직렬화 모듈
use std::sync::Arc; // 참조 카운터 모듈
use tokio_postgres::Client; // PostgreSQL 클라이언트 모듈

// URL 쿼리 파라미터 역직렬화 struct (input)
#[derive(Deserialize)]
struct BpmQuery {
    email: String,
}

// 응답 JSON_struct (output)
#[derive(serde::Serialize)]
struct BpmValue {
    bpm: i32,
}

// 특정 ID의 실시간 BPM 데이터를 가져오는 핸들러 함수
async fn get_bpm_by_id(Query(params): Query<BpmQuery>, client: Arc<Client>) -> impl IntoResponse {
    let query_sql = "SELECT BPM FROM bpmdata WHERE email = $1 ORDER BY time DESC LIMIT 1";

    match client.query_one(query_sql, &[&params.email]).await {
        Ok(row) => {
            let bpm: i32 = row.get("bpm"); // 컬럼 이름을 소문자로 변경
            println!("Query successful, bpm: {}", bpm); // 쿼리가 성공했는지 확인하는 로그
            Json(BpmValue { bpm }).into_response()
        }
        Err(err) => {
            eprintln!("Error querying BPM data: {:?}", err); // 쿼리 오류 로그 출력
            (
                axum::http::StatusCode::INTERNAL_SERVER_ERROR,
                "Error querying data",
            )
                .into_response()
        }
    }
}

// 라우터 생성 함수
pub fn create_routes(client: Arc<Client>) -> Router {
    Router::new().route("/", get(move |query| get_bpm_by_id(query, client.clone())))
}
