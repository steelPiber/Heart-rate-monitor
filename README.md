# Heart-rate-monitor_v2(Rust)

## 프로젝트 트리 구조 및 실행 방법

### 프로젝트 트리 구조

```
.
├── Cargo.lock
├── Cargo.toml
├── Dockerfile
├── README.md
├── src
│   ├── client.rs
│   ├── main.rs #설명추가
│   ├── routes
│   │   ├── data.rs
│   │   ├── min_hrt.rs
│   │   ├── real_hrt.rs
│   │   ├── recent.rs
│   │   └── time.rs
│   ├── schema.rs
│   └── tests
│   │   └── test.rs
└── docker-compose.yml
```

### 파일 설명

- `Cargo.lock` 및 `Cargo.toml`: Rust 프로젝트의 의존성 관리 파일임
- `Dockerfile`: Docker 이미지를 빌드하기 위한 설정 파일임
- `README.md`: 프로젝트 설명서임
- `src/main.rs`: 애플리케이션의 진입점임
- `src/client.rs`: 데이터베이스 클라이언트 초기화 관련 코드를 포함함
- `src/routes`: 라우팅 관련 코드를 포함함
  - `data.rs`: 데이터 관련 라우트를 정의함
  - `min_hrt.rs`: 최소 심박수 관련 라우트를 정의함
  - `real_hrt.rs`: 실시간 심박수 관련 라우트를 정의함
  - `recent.rs`: 최근 심박수 데이터 관련 라우트를 정의함
  - `time.rs`: 현재 시간 관련 라우트를 정의함
- `src/schema.rs`: 데이터베이스 스키마를 정의함
- `docker-compose.yml`: Docker 컴포즈 파일로 여러 컨테이너를 정의하고 관리함

### 실행 방법

#### 1. 환경 설정
먼저, 프로젝트를 클론하고 디렉토리로 이동함

```sh
git clone <repository_url>
cd <repository_directory>
```

#### 2. Docker를 사용하여 애플리케이션 실행
내부 프로젝트에서 Docker를 사용하여 실행할 수 있음

```sh
docker-compose up --build
```

위 명령어를 통해 Docker 이미지를 빌드하고 컨테이너를 시작함

#### 3. 애플리케이션 접근
애플리케이션이 성공적으로 시작되면, 다음과 같이 서버에 접근할 수 있음

- 데이터 관련 라우트: `http://<server_ip>:13389/data`
- 최근 데이터 라우트: `http://<server_ip>:13389/recent`
- 현재 시간 라우트: `http://<server_ip>:13389/current-time`
- 실시간 데이터 라우트: `http://<server_ip>:13389/realtime`
- 최소 심박수 라우트: `http://<server_ip>:13389/min-bpm`
- 또한 로그상에서 데이터 수신 상태 확인 가능
### 주의사항

- 프로젝트를 실행하기 전에 Docker와 Docker Compose가 시스템에 설치되어 있어야 함
- `.env` 파일에 올바른 환경 변수를 설정했는지 확인해야 함
- 데이터베이스 URL이 올바르게 설정되었는지 확인해야 함. 기본값은 `postgres://piber:wjsansrk@postgres/dbsafebpm`임

### 문제 해결

- **데이터베이스 연결 실패**: 데이터베이스 서버가 실행 중인지 확인하고, 환경 변수 설정이 올바른지 확인해야 함
- **서버 실행 실패**: 포트 충돌이 있는지 확인해야 함. 기본 포트는 `13389`임
- **기타 문제**: Docker 로그와 애플리케이션 로그를 확인하여 추가 정보를 얻을 수 있음

이 문서는 프로젝트의 구조와 실행 방법에 대한 안내를 제공하며, 개발 및 배포 과정에서 참고할 수 있음.
