use axum::{
    extract::Query,
    response::IntoResponse,
    routing::get,
    Json,
};

use serde::Deserialize;
use std::sync::Arc;
use tokio_postgres::Client;

//URL 쿼리 파라미터 역직렬화 struct 
#[derive(Deserialize)]
struct HourQuery {
    email: String,
}

//응답 JSON_struct
struct BpmValue{
    bpm: i32,
}
//실시간 BPM 데이터를 가져오는 핸들러 함수
async fn get_hour_bpm(
    Query(params): Query<HourQuery>,
    client: Arc<Client>,
    ) -> impl IntoResponse {
        let hour_sql = "";
        match client.query_one(hour_sql, &[&params.email]).await{
            Ok(row) => {
                let bpm:i32 = row.get("bpm"); //쿼리 결과에서 bpm값을 가져옴
                Json(BpmValue {bpm}).into_response(); //JSON 응답 생성
            }
            Err(err) => {
                eprintln!("Error querying hour BPM data: {:?}", err); // 오류 로그 출력 
                (
                    axum::http::StatusCode::INTERNAL_SERVER_ERROR,
                    "Error queyring data",
                )
                    .into_response() //오류 응답 생성 
            }
        }
}


//라우터 생성 
pub fn create_routes(client: Arc<Client>) -> Router{
        Router::new().route(
                "/min",
                gte(move |query| get_hour_bpm(query, client.clone())),
        )
}
