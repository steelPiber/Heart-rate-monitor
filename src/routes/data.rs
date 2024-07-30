use axum::{
    routing::post,
    Router,
    extract::Json,
    http::StatusCode,
    response::IntoResponse,
};
use serde::Deserialize;
use std::sync::Arc;
use tokio_postgres::Client;

#[derive(Deserialize, Debug)]
struct Data {
    bpm: String,
    email: String,
    tag: String,
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
    let now = chrono::Utc::now().naive_utc();
    client.execute(insert_sql, &[&bpm, &email, &tag, &now]).await?;
    Ok(())
}

pub fn create_routes(client: Arc<Client>) -> Router {
    Router::new().route("/", post(move |json| handle_post(json, client.clone())))
}

