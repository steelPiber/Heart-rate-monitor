use axum::{extract::Json, http::StatusCode, response::IntoResponse, routing::post, Router};
use oracle::Connection as OracleConnection;
use serde::Deserialize;
use std::sync::Arc;
use tokio::sync::Mutex;
use tokio_postgres::Client as PgClient;

#[derive(Deserialize, Debug)]
struct Data {
    bpm: String,
    email: String,
    tag: String,
    timestamp: String,
}

async fn handle_post(
    Json(payload): Json<Data>,
    pg_client: Arc<PgClient>,
    oracle_conn: Arc<Mutex<OracleConnection>>,
) -> impl IntoResponse {
    println!("Received request body: {:?}", payload);

    let bpm = match payload.bpm.parse::<i32>() {
        Ok(bpm) => bpm,
        Err(_) => {
            println!("Invalid BPM value: {:?}", payload.bpm);
            return (StatusCode::BAD_REQUEST, "Invalid BPM value").into_response();
        }
    };

    let email_without_domain = match payload.email.split('@').next() {
        Some(e) => e.to_string(),
        None => {
            println!("Invalid email format: {:?}", payload.email);
            return (StatusCode::BAD_REQUEST, "Invalid email format").into_response();
        }
    };

    // 순차적으로 PostgreSQL과 Oracle에 데이터 삽입 작업을 수행합니다.
    if let Err(err) = insert_bpm_data_pg(
        &pg_client,
        bpm,
        &email_without_domain,
        &payload.tag,
        &payload.timestamp,
    )
    .await
    {
        println!("Error inserting BPM data into PostgreSQL: {:?}", err);
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            "Error inserting data into PostgreSQL",
        )
            .into_response();
    }

    if let Err(err) = {
        let mut oracle_conn_guard = oracle_conn.lock().await;
        insert_bpm_data_oracle(
            &mut *oracle_conn_guard,
            bpm,
            &email_without_domain,
            &payload.tag,
        )
        .await
    } {
        println!("Error inserting BPM data into Oracle: {:?}", err);
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            "Error inserting data into Oracle",
        )
            .into_response();
    }

    println!("Successfully inserted BPM data into both PostgreSQL and Oracle");
    (StatusCode::OK, "Request received").into_response()
}

async fn insert_bpm_data_pg(
    client: &PgClient,
    bpm: i32,
    email: &str,
    tag: &str,
    timestamp: &str,
) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    let insert_sql = "INSERT INTO bpmdata (BPM, EMAIL, TAG, TIME) VALUES ($1, $2, $3, $4)";
    let time = match chrono::NaiveDateTime::parse_from_str(timestamp, "%Y-%m-%dT%H:%M:%S") {
        Ok(t) => t,
        Err(_) => chrono::Utc::now().naive_utc(),
    };
    client
        .execute(insert_sql, &[&bpm, &email, &tag, &time])
        .await?;
    Ok(())
}

async fn insert_bpm_data_oracle(
    conn: &mut OracleConnection,
    bpm: i32,
    email: &str,
    tag: &str,
) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    let idx_query = "SELECT BPM_SEQ.NEXTVAL FROM DUAL";
    let idx: i32 = conn.query_row_as(idx_query, &[])?;

    let insert_query = "INSERT INTO BPMDATA (IDX, BPM, EMAIL, TAG) VALUES (:1, :2, :3, :4)";
    conn.execute(insert_query, &[&idx, &bpm, &email, &tag])?;
    conn.commit()?;
    Ok(())
}

pub fn create_routes(
    pg_client: Arc<PgClient>,
    oracle_conn: Arc<Mutex<OracleConnection>>,
) -> Router {
    Router::new().route(
        "/",
        post(move |json| handle_post(json, pg_client.clone(), oracle_conn.clone())),
    )
}

pub async fn oracle_connect_db(
    user: &str,
    pass: &str,
    connect_str: &str,
) -> Result<OracleConnection, oracle::Error> {
    OracleConnection::connect(user, pass, connect_str)
}
