mod db;
mod routes;

use axum::{Router};
use dotenv::dotenv;
use std::env;
use std::net::SocketAddr;
use tracing_subscriber;
use db::client::init_db;
use db::schema::create_table_if_not_exists;
use std::sync::Arc;

#[tokio::main]
async fn main() {
    println!("Starting Rust application...");

    dotenv().ok();
    tracing_subscriber::fmt::init();

    let database_url = env::var("DATABASE_URL").unwrap_or("postgres://piber:wjsansrk@postgres/dbsafebpm".to_string());
    let client = Arc::new(init_db(&database_url).await);

    // 테이블이 없으면 생성합니다.
    create_table_if_not_exists(&client).await.expect("Failed to create table");

    let app = Router::new()
        .nest("/data", routes::data::create_routes(client.clone()))
        .nest("/recent", routes::recent::create_routes(client.clone()))
        .nest("/current-time", routes::time::create_routes());

    let addr = SocketAddr::from(([0, 0, 0, 0], 13389));
    println!("Listening on {}", addr);
    if let Err(err) = axum::Server::bind(&addr).serve(app.into_make_service()).await {
        eprintln!("Server error: {}", err);
    }
}

