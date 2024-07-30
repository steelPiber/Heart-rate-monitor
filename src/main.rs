use axum::{
    extract::Json,
    http::StatusCode,
    response::IntoResponse,
    routing::{get, post},
    Router,
};
use serde::{Deserialize, Serialize};
use std::net::SocketAddr;
use std::sync::Arc;
use tokio_postgres::{NoTls, Client};
use tracing_subscriber;
use dotenv::dotenv;
use std::env;
use chrono::{DateTime, Utc, FixedOffset};

#[derive(Deserialize, Debug)]
struct Data {
    bpm: String,
    email: String,
    tag: String,
    timestamp: String,
}

#[derive(Serialize)]
struct BpmData {
    idx: i32,
    bpm: String,
    email: String,
    tag: String,
    time: String,
}

async fn handle_post(Json(payload): Json<Data>, client: Arc<Client>) -> impl IntoResponse {
    println!("Received request body: {:?}", payload);

    let email_without_domain = match payload.email.split('@').next() {
        Some(e) => e.to_string(),
        None => return (StatusCode::BAD_REQUEST, "Invalid email format").into_response(),
    };

    match insert_bpm_data(&client, &payload.bpm, &email_without_domain, &payload.tag).await {
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

async fn insert_bpm_data(client: &Client, bpm: &str, email: &str, tag: &str) -> Result<(), tokio_postgres::Error> {
    let insert_sql = "INSERT INTO bpmdata (BPM, EMAIL, TAG, TIME) VALUES ($1, $2, $3, $4)";
    let now: DateTime<Utc> = Utc::now();
    let seoul_offset = FixedOffset::east(9 * 3600);
    let seoul_time = now.with_timezone(&seoul_offset).naive_local();
    client.execute(insert_sql, &[&bpm, &email, &tag, &seoul_time]).await?;
    Ok(())
}

async fn create_table_if_not_exists(client: &Client) -> Result<(), tokio_postgres::Error> {
    let create_table_sql = "
        CREATE TABLE IF NOT EXISTS bpmdata (
            IDX SERIAL PRIMARY KEY,
            BPM VARCHAR(255),
            EMAIL VARCHAR(255),
            TAG VARCHAR(255),
            TIME TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    ";
    client.execute(create_table_sql, &[]).await?;
    Ok(())
}

async fn get_recent_bpm_data(client: Arc<Client>) -> impl IntoResponse {
    let select_sql = "SELECT IDX, BPM, EMAIL, TAG, TIME FROM bpmdata ORDER BY TIME DESC LIMIT 1";
    let row = client.query_one(select_sql, &[]).await.unwrap();

    let bpm_data = BpmData {
        idx: row.get("IDX"),
        bpm: row.get("BPM"),
        email: row.get("EMAIL"),
        tag: row.get("TAG"),
        time: row.get("TIME"),
    };

    Json(bpm_data)
}

async fn get_current_time() -> String {
    let now: DateTime<Utc> = Utc::now();
    let seoul_offset = FixedOffset::east(9 * 3600);
    now.with_timezone(&seoul_offset).to_rfc3339()
}

#[tokio::main]
async fn main() {
    println!("Starting Rust application...");

    dotenv().ok();
    tracing_subscriber::fmt::init();

    let database_url = env::var("DATABASE_URL").unwrap_or("postgres://piber:wjsansrk@postgres/dbsafebpm".to_string());
    let (client, connection) = tokio_postgres::connect(&database_url, NoTls).await.unwrap();
    let client = Arc::new(client);

    tokio::spawn(async move {
        if let Err(e) = connection.await {
            eprintln!("connection error: {}", e);
        }
    });

    create_table_if_not_exists(&client).await.expect("Failed to create table");

    let app = Router::new()
        .route("/data", post({
            let client = client.clone();
            move |json| handle_post(json, client.clone())
        }))
        .route("/recent", get({
            let client = client.clone();
            move || get_recent_bpm_data(client.clone())
        }))
        .route("/current-time", get(|| async { get_current_time().await }));

    let addr = SocketAddr::from(([0, 0, 0, 0], 13389));
    println!("Listening on {}", addr);
    if let Err(err) = axum::Server::bind(&addr).serve(app.into_make_service()).await {
        eprintln!("Server error: {}", err);
    }
}

