// 배포 주소. 사이트맵, 검색용 메타데이터, 공유 주소에 쓴다
export const SITE_ORIGIN = "https://skyjooyeok.com";
export const SITE_BASE = "";
export const SITE_URL = `${SITE_ORIGIN}${SITE_BASE}/`;

// 앱 스토어 주소. 출시되면 채운다(비어 있으면 "출시 준비 중"으로 보인다)
export const STORE_PLAY = process.env.NEXT_PUBLIC_STORE_PLAY || "";
export const STORE_IOS = process.env.NEXT_PUBLIC_STORE_IOS || "";
