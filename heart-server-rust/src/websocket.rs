// Code: 웹소켓 서버와 클라이언트를 구현하는 데 사용되는 모듈
use async_trait::async_trait;
use ezsockets::{Server, Session, Socket};
use std::{
	collections::HashMap,
	fmt::Display,
	net::{IpAddr, SocketAddr},
};
use tokio::net::ToSocketAddrs;

use libarp::{client::ArpClient, interfaces::MacAddr};
use std::net::Ipv4Addr;

// 세션 ID와 값 타입을 위한 타입 별칭
pub type SessionID = u32;

/// 값에 사용할 타입
pub type Value = u8;

/// Key used for storing/retrieving the tracker value
/// 추적기 값을 저장/검색하는 데 사용되는 키
pub const KEY_TRACKER: &str = "tracker";
/// Key used for storing/retrieving the BPM value
/// BPM 값을 저장/검색하는 데 사용되는 키
pub const KEY_BPM: &str = "bpm";
/// Key used for storing/retrieving the battery value
/// 배터리 값을 저장/검색하는 데 사용되는 키
pub const KEY_BATTERY: &str = "battery";

//piber: MAC 주소를 저장/검색하는 데 사용되는 키
pub const KEY_MAC: &str = "MAC";

//Ping, GetVal, SetVal의 세 가지 메시지 유형을 정의합니다. 이는 서버와 클라이언트 간의 통신에서 사용됩니다.
// 서버와 클라이언트 간의 통신에 사용되는 세 가지 메시지 유형
#[derive(Clone, Debug)]
pub enum Message {
	Ping { id: SessionID },                            //Ping : 세션 ID를 포함하는 메시지
	GetVal { id: SessionID, key: String },             //GetVal : 세션 ID와 키를 포함하는 메시지
	SetVal { id: SessionID, key: String, val: Value }, //SetVal : 세션 ID, 키, 값을 포함하는 메시지
}

/*웹소켓 서버의 주요 상태와 데이터를 관리합니다.
sessions: 현재 연결된 세션들을 저장합니다.
handle: 서버 간 통신을 위한 핸들입니다.
latest_id: 가장 최근에 사용된 세션 ID를 추적합니다.
tracker_id: 추적기 세션의 ID입니다.
values: 추적 중인 값들을 저장합니다. */
// 웹소켓 서버의 상태와 데이터를 관리하는 구조체 정의
pub struct HeartsockServer {
	// 현재 연결된 세션들
	sessions: HashMap<SessionID, Session<SessionID, Message>>,
	/// 서버 간 통신을 위한 핸들
	handle: Server<Self>,
	// 최근에 사용된 세션 ID
	latest_id: SessionID,
	/// 트래커 세션의 ID
	tracker_id: SessionID,
	/// 추적 중인 값들
	values: HashMap<String, Value>,
}

// 웹소켓 세션의 상태와 데이터를 관리합니다.
#[async_trait]
// 웹소켓 서버의 상태와 데이터를 관리하는 구조체에 대한 ServerExt 트레이트 구현
impl ezsockets::ServerExt for HeartsockServer {
	//// 세션 ID와 값 타입을 위한 타입 별칭
	type Call = Message;
	//세션타입
	type Session = HeartsockSession;
	//클라이언트가 서버에 연결할 때 호출
	async fn on_connect(
		&mut self,                                             // 서버 상태(핸들)
		socket: Socket,                                        // 클라이언트 소켓
		address: SocketAddr,                                   //클라이언트 주소
		_args: <Self::Session as ezsockets::SessionExt>::Args, //클라이언트 세션인수
	) -> Result<Session<SessionID, Self::Call>, ezsockets::Error> {
		// 새로운 세션 ID 생성  : 세션 ID 구별을 위해 사용
		self.latest_id += 1;
		//세션 ID를 추출합니다.
		let id = self.latest_id;

		// 새로운 세션을 생성하고 맵에 추가하여 이를 서버의 `sessions` 맵에ID와 함께 추가
		// Session::create -> 새로운 객체 생성
		let session = Session::create(
			//handle : 서버 간 통신을 위한 핸들
			|handle| HeartsockSession {
				id,                          //id : 세션 ID
				handle,                      //handle : 서버 간 통신을 위한 핸들
				server: self.handle.clone(), //server : 서버 상태(핸들)
			},
			id,     //id : 세션 ID
			socket, //socket : 클라이언트 소켓
		);
		//새로운 세션을 맵에 추가합니다.
		self.sessions.insert(id, session.clone());

		//세션 생성 로그를 기록합니다.
		tracing::info!("Session {} 클라이언트 연결을 위해 생성됨 {}", &id, &address);

		//새로운 세션을 반환
		let ip_addr: IpAddr = address.ip();

		// IpAddr가 IPv4인 경우에만 Ipv4Addr로 변환합니다.
		if let IpAddr::V4(ipv4_addr) = ip_addr {
			// 만약 IpAddr가 IPv4인 경우에만 Ipv4Addr로 변환합니다.
			tracing::info!("디바이스(client) IPv4 주소: {}", ipv4_addr);
			// ARP 클라이언트를 생성합니다.
			let mut client = ArpClient::new().unwrap();
			// IPv4 주소를 MAC 주소로 변환합니다.
			let result = client.ip_to_mac(ipv4_addr, None);
			// MAC 주소를 기록합니다.
			tracing::info!("MAC 주소 : {}", result.unwrap());
		} else {
			tracing::info!("IPv4 주소를 찾을 수 없습니다.");
		}

		// Send the current values
		// 현재 값들을 전송합니다.
		for (key, val) in &self.values {
			session.text(format!("websocket: 현재값 : {}: {}", key, val));
		}
		//새로운 세션을 반환합니다.
		Ok(session)
	}

	// 세션이 연결을 해제할 때 호출
	async fn on_disconnect(
		&mut self,
		id: <Self::Session as ezsockets::SessionExt>::ID,
	) -> Result<(), ezsockets::Error> {
		// 세션을 맵에서 제거합니다.
		assert!(
			self.sessions.remove(&id).is_some(),
			"websocket:on_disconnect:세션 맵에서 연결 해제 세션을 찾을 수 없다."
		);
		tracing::info!("클라이언트 연결 해제를 위해 세션 {}이(가) 제거됨", &id);

		// 연결이 끊어진 세션에 대한 경우 트래커 ID 재설정
		if id == self.tracker_id {
			tracing::info!(
				"websocket:on_disconnect:추적기(tracket) 분실 (연결이 끊어진 세션 {}이(가) 추적기(tracker))",
				&id
			);
			self.tracker_id = 0;
			self.set_val(KEY_TRACKER.to_owned(), 0);
		}
		Ok(())
	}

	// 연결된 세션에 메시지를 보냅니다
	async fn on_call(&mut self, call: Self::Call) -> Result<(), ezsockets::Error> {
		match call {
			// ping -> pong
			Message::Ping { id } => self.get_session(&id)?.text("pong".to_owned()),

			Message::GetVal { id, key } => {
				self.get_session(&id)?
					.text(format!("websocket:on_call: key{}: val{}", key, self.get_val(&key)))
			}
			//
			Message::SetVal { id, key, val } => {
				self.get_session(&id)?;

				//세션이 없으면 해당 세션을 추적기(tracker)로 지정
				if self.tracker_id == 0 {
					self.tracker_id = id;
					tracing::info!("websocket:on_call:SetVal {} 세션이 추적기(tracker)로 활성화됨", id);
					self.set_val(KEY_TRACKER.to_owned(), 1);
				}

				// 추적기(tracker)가 이미 있는 경우 이 세션인지 확인
				if self.tracker_id == id {
					// 값 업데이트 및 응답(respond)
					self.set_val(key, val);
					self.get_session(&id)?.text("ok".to_owned());
				} else {
					self.get_session(&id)?
						.text("오류: 추적기가 이미 연결되어 있음".to_owned());
				}
			}
		};

		Ok(())
	}
}

impl HeartsockServer {
	//주어진 키에 해당하는 값 해시 맵으로 조회
	fn get_val(&self, key: &String) -> &Value {
		self.values.get(key).expect("키 값 알수 없음")
	}

	/// 값을 설정하고 모든 non-tracker 세션에 알립니다
	fn set_val(&mut self, key: String, val: Value) -> Value {
		//값을 설정하고 이전 값을 저장
		let prev = self
			.values
			.insert(key.clone(), val)
			.unwrap_or_else(|| panic!("키 {}에 대한 이전 값이 없음", key));

		// 새 값이 실제로 다를 경우 다른 모든 세션에 변경 사항을 알림
		if prev != val {
			tracing::debug!("값 \"{}\"이 \"{}\"로 변경됨 - 다른 세션 알림", key, val);
			self.notify_sessions(key, val);
		}
		//이전 값을 반환
		prev
	}

	/// 특정 ID로 세션을 검색합니다
	fn get_session(&self, id: &u32) -> Result<&Session<u32, Message>, &'static str> {
		self.sessions.get(id).ok_or("websocket:get_session:알 수 없는 세션 ID")
	}

	/// 모든 비추적자 세션에 값 변경을 알립니다
	fn notify_sessions(&self, key: String, val: Value) {
		let sessions = self.sessions.iter().filter(|&(id, _)| *id != self.tracker_id);
		for (_, session) in sessions {
			session.text(format!("websocket:notify_sessions: {}: {}", key, val));
		}
	}
}

pub struct HeartsockSession {
	/// Unique ID of the session
	id: SessionID,
	/// Server this session is from
	server: Server<HeartsockServer>,
	/// Handle to use for communication with this session
	handle: Session<SessionID, Message>,
}

#[async_trait]
impl ezsockets::SessionExt for HeartsockSession {
	type ID = SessionID;
	type Args = ();
	type Call = Message;

	// 세션 ID를 가져오기
	fn id(&self) -> &Self::ID {
		&self.id
	}

	// 클라이언트로부터 받은 텍스트
	async fn on_text(&mut self, text: String) -> Result<(), ezsockets::Error> {
		//로그 : 받은 텍스트
		tracing::info!("{}", text);
		//소문자로 변환
		let cmd = text.to_lowercase();

		match cmd.as_str() {
			//핸들 설정 값
			cmd if cmd.starts_with("set") => {
				//공백으로 분리
				let parts: Vec<&str> = cmd.split_whitespace().collect();
				let key = parts[1];
				//key가 BPM 또는 BATTERY인 경우
				if matches!(key, KEY_BPM | KEY_BATTERY) {
					//값을 가져와서 변환
					let val = parts[2].parse::<Value>();
					match val {
						Ok(val) => self.server.call(Message::SetVal {
							id: self.id,
							key: key.to_owned(),
							val,
						}),
						Err(_) => self.handle.text(format!("error: unknown input for {} value", key)),
					}
				} else {
					self.handle.text("error: unknown value key".to_owned())
				}
			}

			// Handle getting values
			// 값 가져오기 처리
			cmd if cmd.starts_with("get") => {
				//공백으로 분리
				let parts: Vec<&str> = cmd.split_whitespace().collect();
				let key = parts[1];
				self.server.call(Message::GetVal {
					id: self.id,
					key: key.to_owned(),
				})
			}
			// 서버 ping 처리
			"ping" => self.server.call(Message::Ping { id: self.id }),
			_ => self.handle.text("error: unknown input".to_owned()),
		}

		Ok(())
	}

	// 클라이언트로부터 받은 이진 데이터
	async fn on_binary(&mut self, _bytes: Vec<u8>) -> Result<(), ezsockets::Error> {
		tracing::debug!("세션 {}에서 이진 데이터 수신(지원되지 않음)", self.id);
		self.handle.text("오류: 이진 데이터가 지원되지 않음".to_owned());
		Ok(())
	}

	// 쓰인적이 없는(Unused)
	async fn on_call(&mut self, _call: Self::Call) -> Result<(), ezsockets::Error> {
		Ok(())
	}
}

/// Heartsock 웹소켓 서버 생성 및 실행
pub async fn run<A>(address: A) -> Result<(), ezsockets::Error>
where
	A: ToSocketAddrs + Display,
{
	tracing::info!("{}에서 시작하는 WebSocket 서버 VER 0.1", address);
	let (server, _) = ezsockets::Server::create(|handle| HeartsockServer {
		sessions: HashMap::new(),
		handle,
		latest_id: 0,
		tracker_id: 0,
		values: HashMap::from([
			(KEY_TRACKER.to_owned(), 0),
			(KEY_BPM.to_owned(), 0),
			(KEY_BATTERY.to_owned(), 0),
		]),
	});
	ezsockets::tungstenite::run(server, address, |_socket| async move { Ok(()) }).await
}

async fn resolve_mac(ip_addr: Ipv4Addr) -> ArpClient {
	let client = ArpClient::new().unwrap();

	client
}
