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

//URL 쿼리 파라미터 역질력화 struct
#[derive(Deserialize)]
struct WeekQuery {
    email: String,
}

//응답 JSON struct
#[derive(serde::Serialize)]
struct BpmValue {
    bpm: i32,
}

//1분 BPM 데이터를 가져오는 핸들러 함수
async fn get_week_bpm(Query(params): Query<WeekQuery>, client: Arc<Client>) -> impl IntoResponse {
    let min_sql = "SELECT ROUND(AVG(bpm)) AS avg_bpm FROM bpmdata WHERE email = :Email AND time > (SELECT MAX(time) - INTERVAL '7' DAY FROM bpmdata WHERE email = :Email)";
    match client.query_one(min_sql, &[&params.email]).await {
        Ok(row) => {
            let bpm: i32 = row.get("bpm"); //쿼리 결과에서 bpm 값을 가져옴
            Json(BpmValue { bpm }).into_response() //JSON 응답 생성
        }
        Err(err) => {
            eprintln!("Error querying min BPM data: {:?}", err); //오류 로그 출력
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
    Router::new().route("/", get(move |query| get_week_bpm(query, client.clone())))
}
