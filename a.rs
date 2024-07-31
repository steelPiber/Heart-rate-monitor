use std::io;
use std::time::Duration;
use tokio::time::sleep;
use tokio_postgres::{Client, NoTls};

pub async fn init_db(database_url: &str) -> Result<Client, io::Error> {
    let mut retries = 5;

    while retries > 0 {
        match tokio_postgres::connect(database_url, NoTls).await {
            Ok((client, connection)) => {
                tokio::spawn(async move {
                    if let Err(e) = connection.await {
                        eprintln!("connection error: {}", e);
                    }
                });
                return Ok(client);
            }
            Err(e) => {
                eprintln!("Failed to connect to database: {}", e);
                retries -= 1;
                sleep(Duration::from_secs(5)).await;
            }
        }
    }

    Err(io::Error::new(
        io::ErrorKind::Other,
        "Failed to connect to database after multiple attempts",
    ))
}
