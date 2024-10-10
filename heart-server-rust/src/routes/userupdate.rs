use axum::{
    extract::{Json},
    http::StatusCode,
    response::IntoResponse,
    routing::post,
    Router,
};
use serde::{Deserialize, Serialize}; // Deserialize와 Serialize를 불러옵니다.
use std::sync::Arc;
use tokio_postgres::Client as PgClient;

// UserInfo 구조체는 사용자 정보를 저장합니다.
#[derive(Deserialize, Serialize)] // Deserialize와 Serialize를 유도합니다.
struct UserInfo {
    email: String,
    name: Option<String>,
    gender: Option<String>,
    age: Option<i32>,
    height: Option<f64>,
    weight: Option<f64>,
}

// 라우트를 생성하는 함수입니다. 여기서 업데이트 경로를 정의합니다.
pub fn create_update_route(client: Arc<PgClient>) -> Router {
    let client_clone_for_update = client.clone();

    Router::new().route(
        "/", // 사용자 정보를 업데이트하는 POST 경로입니다.
        post(move |Json(payload): Json<UserInfo>| {
            update_user_info(payload, client_clone_for_update.clone())
        }),
    )
}

// 사용자 정보를 업데이트하는 함수입니다.
async fn update_user_info(payload: UserInfo, client: Arc<PgClient>) -> impl IntoResponse {
    match update_user_info_in_db(&payload, &client).await {
        Ok(_) => (
            StatusCode::OK,
            "사용자 정보가 성공적으로 업데이트되었습니다.",
        )
            .into_response(),
        Err(err) => {
            eprintln!(
                "데이터베이스에 사용자 정보를 업데이트하는 중 오류 발생: {:?}",
                err
            );
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                "사용자 정보를 업데이트하지 못했습니다.",
            )
                .into_response()
        }
    }
}

// 데이터베이스에 사용자 정보를 업데이트하는 헬퍼 함수입니다.
async fn update_user_info_in_db(
    user_info: &UserInfo,
    client: &PgClient,
) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    let query = "UPDATE userinfo SET
                 name = $2,
                 gender = $3,
                 age = $4,
                 height = $5,
                 weight = $6
                 WHERE email = $1";

    // 데이터베이스에 사용자 정보를 업데이트하는 쿼리입니다.
    client
        .execute(
            query,
            &[
                &user_info.email,
                &user_info.name,
                &user_info.gender,
                &user_info.age,
                &user_info.height,
                &user_info.weight,
            ],
        )
        .await?;
    Ok(())
}
