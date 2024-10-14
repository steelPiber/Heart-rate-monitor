// server_status.rs
use axum::{
    http::StatusCode,
    response::IntoResponse,
    routing::get,
    Json, Router,
};
use serde::Serialize;
use std::sync::Arc;
use tokio_postgres::Client as PgClient;
use tracing::info;

// 서버 상태를 저장하기 위한 구조체
#[derive(Serialize)]
struct ServerStatus {
    server: String,
    db: String,
}

// 서버 상태를 확인하는 엔드포인트 라우트를 생성하는 함수
pub fn create_routes(client: Arc<PgClient>) -> Router {
    let client_clone = client.clone();

    Router::new().route(
        "/",
        get(move || {
            let client = client_clone.clone();
            async move {
                let server_status = match check_database_connection(&client).await {
                    Ok(_) => {
                        info!("Server is running and database connection is healthy");
                        ServerStatus {
                            server: "on".to_string(),
                            db: "on".to_string(),
                        }
                    }
                    Err(err) => {
                        info!("Database connection failed: {:?}", err);
                        ServerStatus {
                            server: "on".to_string(),
                            db: "off".to_string(),
                        }
                    }
                };
                (StatusCode::OK, Json(server_status)).into_response()
            }
        }),
    )
}

// 데이터베이스 연결 상태를 확인하는 비동기 함수
async fn check_database_connection(
    client: &PgClient,
) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    let query = "SELECT 1";
    client.query_one(query, &[]).await?;
    Ok(())
}