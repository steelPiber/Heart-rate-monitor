use clap::{App, Arg};
use serde::{Deserialize, Serialize}; // JSON 직렬화 및 역직렬화를 위한 모듈
use sha2::{Digest, Sha256}; // SHA256 해시 계산을 위한 모듈
use std::collections::HashMap; // 해시 맵 자료구조를 사용하기 위한 모듈
use std::path::Path; // 파일 경로 처리를 위한 모듈
use std::sync::Arc; // 비동기 공유 상태 관리를 위한 모듈
use tokio::fs; // 비동기 파일 시스템 작업을 위한 모듈
use tokio::io::AsyncReadExt; // 비동기 읽기 확장 메서드를 가져옵니다
use tokio::sync::Mutex; // 비동기 잠금 메커니즘을 위한 모듈 // 명령행 인자 파싱을 위한 모듈

// 파일 해시를 저장하기 위한 구조체를 정의합니다
#[derive(Serialize, Deserialize)]
struct FileHashes {
    files: HashMap<String, String>, // 파일 이름과 해시 값을 저장하는 해시 맵
}

// 파일의 SHA256 해시 값을 계산하는 비동기 함수
async fn calculate_hash<P: AsRef<Path>>(path: P) -> Option<String> {
    let mut file = fs::File::open(path).await.ok()?; // 파일을 엽니다
    let mut hasher = Sha256::new(); // SHA256 해시 객체를 생성합니다
    let mut buffer = vec![0; 1024]; // 버퍼를 생성합니다

    // 파일을 읽어 해시를 업데이트합니다
    loop {
        let n = file.read(&mut buffer).await.ok()?; // 파일에서 데이터를 읽습니다
        if n == 0 {
            break; // 파일 끝에 도달하면 종료합니다
        }
        hasher.update(&buffer[..n]); // 읽은 데이터를 해시 객체에 업데이트합니다
    }

    Some(format!("{:x}", hasher.finalize())) // 최종 해시 값을 반환합니다
}

// 디렉터리 내 모든 파일의 해시 값을 저장하는 함수
async fn save_hashes(dir: &Path) -> Result<(), Box<dyn std::error::Error>> {
    let mut file_hashes = FileHashes {
        files: HashMap::new(),
    };

    let mut entries = fs::read_dir(dir).await?; // 디렉터리의 모든 항목을 읽습니다
    let hashes = Arc::new(Mutex::new(&mut file_hashes)); // 해시 값을 공유 상태로 만듭니다

    while let Some(entry) = entries.next_entry().await? {
        let path = entry.path(); // 파일 경로를 가져옵니다
        if path.is_file() {
            // 파일인지 확인합니다
            if let Some(hash) = calculate_hash(&path).await {
                // 해시 값을 계산합니다
                let file_name = path.to_string_lossy().to_string(); // 파일 이름을 가져옵니다
                hashes.lock().await.files.insert(file_name, hash); // 해시 값을 저장합니다
            }
        }
    }

    let json = serde_json::to_string_pretty(&*hashes.lock().await)?; // 해시 값을 JSON 형식으로 변환합니다
    fs::write("file_hashes.json", json).await?; // JSON 데이터를 파일에 저장합니다

    Ok(())
}

// 디렉터리 내 모든 파일의 해시 값을 JSON 파일과 비교하는 함수
async fn compare_hashes(dir: &Path) -> Result<(), Box<dyn std::error::Error>> {
    let json = fs::read_to_string("file_hashes.json").await?; // JSON 파일을 읽습니다
    let stored_hashes: FileHashes = serde_json::from_str(&json)?; // JSON 데이터를 구조체로 변환합니다

    let mut entries = fs::read_dir(dir).await?; // 디렉터리의 모든 항목을 읽습니다
    let mismatches = Arc::new(Mutex::new(Vec::new())); // 불일치 항목을 저장할 공유 상태를 만듭니다

    while let Some(entry) = entries.next_entry().await? {
        let path = entry.path(); // 파일 경로를 가져옵니다
        if path.is_file() {
            // 파일인지 확인합니다
            if let Some(current_hash) = calculate_hash(&path).await {
                // 현재 해시 값을 계산합니다
                let file_name = path.to_string_lossy().to_string(); // 파일 이름을 가져옵니다
                if let Some(stored_hash) = stored_hashes.files.get(&file_name) {
                    // 저장된 해시 값을 가져옵니다
                    if stored_hash != &current_hash {
                        mismatches.lock().await.push(file_name); // 불일치 항목에 추가합니다
                    }
                } else {
                    mismatches.lock().await.push(file_name); // 불일치 항목에 추가합니다
                }
            }
        }
    }

    let mismatches = mismatches.lock().await; // 불일치 항목을 잠금 해제합니다
    if mismatches.is_empty() {
        println!("No mismatches found."); // 불일치 항목이 없으면 메시지를 출력합니다
    } else {
        println!("Mismatches found in the following files:"); // 불일치 항목이 있으면 메시지를 출력합니다
        for file in mismatches.iter() {
            println!("{}", file); // 불일치 파일 경로를 출력합니다
        }
    }

    Ok(())
}

// 프로그램의 진입점
#[tokio::main]
async fn main() {
    let matches = App::new("file_hash_checker")
        .version("1.0")
        .author("Your Name <your.email@example.com>")
        .about("A tool to check file integrity using hashes.")
        .arg(
            Arg::with_name("dir")
                .help("The directory to process")
                .required(true)
                .index(1),
        )
        .arg(
            Arg::with_name("compare")
                .short('c')
                .long("compare")
                .help("Compare the directory with the saved hash values"),
        )
        .get_matches();

    let dir = matches.value_of("dir").unwrap();
    let dir_path = Path::new(dir);

    if matches.is_present("compare") {
        if let Err(e) = compare_hashes(dir_path).await {
            eprintln!("Error comparing hashes: {}", e); // 해시 비교 중 에러가 발생하면 출력합니다
        }
    } else {
        if let Err(e) = save_hashes(dir_path).await {
            eprintln!("Error saving hashes: {}", e); // 해시 저장 중 에러가 발생하면 출력합니다
        }
    }
}
