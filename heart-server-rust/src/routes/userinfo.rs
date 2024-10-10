use axum::{
    extract::{Json, Path},
    http::StatusCode,
    response::IntoResponse,
    routing::{get, post},
    Router,
};
use serde::{Deserialize, Serialize}; // Import both Deserialize and Serialize
use std::sync::Arc;
use tokio_postgres::Client as PgClient;

// UserInfo struct for storing user information
#[derive(Deserialize, Serialize)] // Derive both Deserialize and Serialize
struct UserInfo {
    email: String,
    name: Option<String>,
    gender: Option<String>,
    age: Option<i32>,
    height: Option<f64>,
    weight: Option<f64>,
}

// Function to create routes for userinfo
pub fn create_routes(client: Arc<PgClient>) -> Router {
    let client_clone_for_get_exists = client.clone();
    let client_clone_for_get_info = client.clone();
    let client_clone_for_post = client.clone();

    Router::new()
        .route(
            "/:email/exists", // New endpoint to check if user exists
            get(move |Path(email): Path<String>| {
                check_user_exists(email, client_clone_for_get_exists.clone())
            }),
        )
        .route(
            "/:email", // Endpoint to get user info
            get(move |Path(email): Path<String>| {
                get_user_info_handler(email, client_clone_for_get_info.clone())
            }),
        )
        .route(
            "/", // Endpoint to insert or update user info
            post(move |Json(payload): Json<UserInfo>| {
                insert_user_info(payload, client_clone_for_post.clone())
            }),
        )
}

// Function to check if a user exists
async fn check_user_exists(email: String, client: Arc<PgClient>) -> impl IntoResponse {
    match get_user_info(&email, &client).await {
        Ok(Some(_)) => {
            // User exists, return true
            Json(true).into_response()
        }
        Ok(None) => {
            // User does not exist, return false
            Json(false).into_response()
        }
        Err(_) => {
            // Database error occurred
            (StatusCode::INTERNAL_SERVER_ERROR, "Database error").into_response()
        }
    }
}

// Function to handle getting user info
async fn get_user_info_handler(email: String, client: Arc<PgClient>) -> impl IntoResponse {
    match get_user_info(&email, &client).await {
        Ok(Some(user_info)) => {
            // Return the user info as JSON
            Json(user_info).into_response()
        }
        Ok(None) => {
            // User not found
            (StatusCode::NOT_FOUND, "User not found").into_response()
        }
        Err(_) => {
            // Database error occurred
            (StatusCode::INTERNAL_SERVER_ERROR, "Database error").into_response()
        }
    }
}

// Helper function to get user info from the database
async fn get_user_info(
    email: &str,
    client: &PgClient,
) -> Result<Option<UserInfo>, Box<dyn std::error::Error + Send + Sync>> {
    let query = "SELECT email, name, gender, age, height, weight FROM userinfo WHERE email = $1";
    if let Some(row) = client.query_opt(query, &[&email]).await? {
        let user_info = UserInfo {
            email: row.get(0),
            name: row.get(1),
            gender: row.get(2),
            age: row.get(3),
            height: row.get(4),
            weight: row.get(5),
        };
        Ok(Some(user_info))
    } else {
        Ok(None)
    }
}

// Function to insert or update user info
async fn insert_user_info(payload: UserInfo, client: Arc<PgClient>) -> impl IntoResponse {
    match save_user_info(&payload, &client).await {
        Ok(_) => (StatusCode::OK, "User info saved").into_response(),
        Err(err) => {
            eprintln!("Error inserting data into database: {:?}", err);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                "Failed to save user info",
            )
                .into_response()
        }
    }
}

// Helper function to save user info to the database
async fn save_user_info(
    user_info: &UserInfo,
    client: &PgClient,
) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    let query = "INSERT INTO userinfo (email, name, gender, age, height, weight)
                 VALUES ($1, $2, $3, $4, $5, $6)
                 ON CONFLICT (email) DO UPDATE SET
                 name = EXCLUDED.name,
                 gender = EXCLUDED.gender,
                 age = EXCLUDED.age,
                 height = EXCLUDED.height,
                 weight = EXCLUDED.weight";
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
