use axum::{
    extract::Query,         //GET 요청을 처리하는 라우팅 모듈
    response::IntoResponse, //응답 생성 모듈
    routing::get,           //URL 쿼리 파라미터 호출
    Json,                   //JSON 응답 모듈
    Router,                 //라우터 생성 모듈
};

use serde::Deserialize; //역직렬화 모듈
use std::sync::Arc; //참조 카운터 모듈
use tokio_postgres::Client; //PostgreSQL 클라이언트 모듈

//URL 쿼리 파라미터 역직렬화를 위한 구조체
#[derive(Deserialize)]
struct RealtimeQuery {
    email: String,
}

//응답 JSON을 위한 구조체
#[derive(serde::Serialize)]
struct BpmResult {
    bpm: i32,
}
//실시간 BPM 데이터를 가져오는 핸들러 함수
async fn get_realtime_bpm(
    Query(params): Query<RealtimeQuery>,
    client: Arc<Client>,
) -> impl IntoResponse {
    let select_sql = "SECECT ROUND(bpm) as bpm FROM bpmdata WHERE email = $1 ORDER BY time DESC FETCH FIRST 1 ROW ONLY";
    match client.query_one(select_sql, &[&params.email]).await {
        Ok(row) => {
            let bpm: i32 = row.get("bpm"); //쿼리 결과에서 bpm 값을 가져옴
            Json(BpmResult { bpm }).into_response() //JSON 응답 생성
        }
        Err(err) => {
            eprintln!("Error querying realtime BPM data: {:?}", err); //오류 로크 출력
            (
                axum::http::StatusCode::INTERNAL_SERVER_ERROR,
                "Error querying data",
            )
                .into_response() //오류 응답 생성
        }
    }
}

//라우터 생성 함수
pub fn create_routes(client: Arc<Client>) -> Router {
    Router::new().route(
        "/realtime",
        get(move |query| get_realtime_bpm(query, client.clone())),
    )
}
