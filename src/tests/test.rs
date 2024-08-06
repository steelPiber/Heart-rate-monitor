use oracle::{Connection, Error};
use std::io::{self, Write};

fn main() {
    loop {
        let username = read_input("사용자 이름: ");
        let password = read_input("비밀번호: ");
        let connect_string = read_input("서버 주소 (예: 202.31.246.30:1521/ORA21APEX): ");

        match connect_to_db(&username, &password, &connect_string) {
            Ok(conn) => {
                println!("Successfully connected to Oracle DB");
                match get_user_tables(&conn) {
                    Ok(tables) => {
                        println!("Current user tables:");
                        for table in tables {
                            println!("{}", table);
                        }
                    },
                    Err(err) => println!("Error getting user tables: {}", err),
                }
                break;
            },
            Err(err) => {
                println!("Error connecting to Oracle DB: {}", err);
                let choice = read_input("Try again? (y/n): ");
                if choice.to_lowercase() != "y" {
                    println!("Exiting.");
                    break;
                }
            }
        }
    }
}

fn read_input(prompt: &str) -> String {
    let mut input = String::new();
    print!("{}", prompt);
    io::stdout().flush().unwrap();
    io::stdin().read_line(&mut input).unwrap();
    input.trim().to_string()
}

fn connect_to_db(username: &str, password: &str, connect_string: &str) -> Result<Connection, Error> {
    Connection::connect(username, password, connect_string)
}

fn get_user_tables(conn: &Connection) -> Result<Vec<String>, Error> {
    let query = "SELECT table_name FROM user_tables";
    let rows = conn.query(query, &[])?;

    let mut tables = Vec::new();
    for row in rows {
        let table_name: String = row?.get("TABLE_NAME")?;
        tables.push(table_name);
    }
    Ok(tables)
}

