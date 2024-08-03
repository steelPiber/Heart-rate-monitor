mod db;
mod routes;

use axum::Router;
use db::client::init_db;
use db::schema::create_table_if_not_exists;
use dotenv::dotenv;
use std::env;
use std::net::SocketAddr;
use std::sync::Arc;
use tokio::time::{sleep, Duration};
use tracing_subscriber;

#[tokio::main]
async fn main() {
    println!("Starting Rust application...");

    dotenv().ok();
    tracing_subscriber::fmt::init();

    let database_url = env::var("DATABASE_URL")
        .unwrap_or("postgres://piber:wjsansrk@postgres/dbsafebpm".to_string());
    println!("Database URL: {}", database_url);

    // PostgreSQL 시작 대기
    let client = loop {
        match init_db(&database_url).await {
            Ok(client) => break Arc::new(client),
            Err(err) => {
                println!("Failed to connect to database: {:?}", err);
                println!("Retrying in 5 seconds...");
                sleep(Duration::from_secs(5)).await;
            }
        }
    };

    println!("Database connected");

    create_table_if_not_exists(&client)
        .await
        .expect("Failed to create table");
    println!("Table checked/created");

    let app = Router::new()
        .nest("/data", routes::data::create_routes(client.clone()))
        .nest("/recent", routes::recent::create_routes(client.clone()))
        .nest("/current-time", routes::time::create_routes())
        .nest("/realtime", routes::real_hrt::create_routes(client.clone()))
        .nest("/min-bpm", routes::min_hrt::create_routes(client.clone()));

    let addr = SocketAddr::from(([0, 0, 0, 0], 13389));
    println!("Listening on {}", addr);
    if let Err(err) = axum::Server::bind(&addr)
        .serve(app.into_make_service())
        .await
    {
        eprintln!("Server error: {}", err);
    }
}
