use axum::{
    routing::get,
    Router,
    response::IntoResponse,
};

async fn get_current_time() -> impl IntoResponse {
    let now = chrono::Utc::now().with_timezone(&chrono::FixedOffset::east_opt(9 * 3600).unwrap());
    now.to_rfc3339()
}

pub fn create_routes() -> Router {
    Router::new().route("/", get(|| async { get_current_time().await }))
}

