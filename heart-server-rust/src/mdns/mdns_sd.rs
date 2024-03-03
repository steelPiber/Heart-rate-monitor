//서버 local_ip를 감지하여 mDNS 서비스를 공지하는 비동기 함수
use crate::mdns::{MdnsService, SERVICE};
use mdns_sd::{ServiceDaemon, ServiceInfo};
use std::net::{IpAddr, Ipv4Addr, Ipv6Addr};
use thiserror::Error;

//derive 매크로를 사용하여 Error 트레이트를 구현한 MdnsError 열거형을 정의
#[derive(Error, Debug)]
pub enum MdnsError {
	#[error("mDNS 서비스 에러: {0}")]
	MdnsDaemon(#[from] mdns_sd::Error),
	#[error("감지된 IP ({0}) IPv6 이다., mDNS 공고가 지원되지 않음.")]
	Ipv6Detected(Ipv6Addr),
	#[error("로컬 IP를 감지할 수 없음: {0}")]
	DetectionUnknown(#[from] local_ip_address::Error),
}

pub async fn advertise(port: u16, local_ip: Option<Ipv4Addr>) -> Result<(), MdnsError> {
	// Get the local IP if it wasn't provided
	let ip = match local_ip {
		Some(ip) => Ok(ip),
		None => get_local_ip(),
	}?;

	// Create a daemon
	tracing::info!("Creating mDNS service daemon");
	let mdns = ServiceDaemon::new()?;

	// Create service info
	let MdnsService {
		service_type,
		instance_name,
	} = SERVICE;
	let hostname = format!("{}.local.", ip);
	let service = ServiceInfo::new(service_type, instance_name, &hostname, ip, port, None)?;

	// Register the service
	tracing::info!(
		"Registering service with daemon: {}: address {:?} port {}",
		service.get_fullname(),
		service.get_addresses(),
		service.get_port()
	);
	mdns.register(service).map_err(|err| err.into())
}

fn get_local_ip() -> Result<Ipv4Addr, MdnsError> {
	match local_ip_address::local_ip() {
		Ok(ip) => {
			tracing::info!("Detected local IP: {}", ip);
			match ip {
				IpAddr::V4(ip4) => Ok(ip4),
				IpAddr::V6(ip6) => Err(MdnsError::Ipv6Detected(ip6)),
			}
		}
		Err(err) => Err(err.into()),
	}
}
