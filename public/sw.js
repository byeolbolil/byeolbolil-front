/*
 * 별볼일 서비스 워커. 설치할 수 있게 하는 데 필요한 만큼만 한다.
 *
 * 예보는 시간이 지나면 틀린 정보가 된다. 그래서 /api 응답과 페이지 HTML은 캐시에 넣지 않는다.
 * 연결이 끊기면 지난 추천을 보여주지 않고 연결이 없다는 안내 화면을 보여준다.
 * 캐시하는 것은 내용이 바뀌면 주소도 바뀌는 빌드 산출물과, 사진, 지도 이미지, 아이콘 같은 정적 파일뿐이다.
 */
const VERSION = "v1"
const STATIC_CACHE = `byeolbolil-static-${VERSION}`
const OFFLINE_URL = "/offline.html"

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.add(OFFLINE_URL))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== STATIC_CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  )
})

/** 주소에 내용 해시가 들어 있어서 한 번 받으면 다시 확인할 필요가 없는 파일 */
function isImmutable(url) {
  return url.pathname.startsWith("/_next/static/")
}

/** 주소는 그대로인데 내용이 바뀔 수 있는 정적 파일. 캐시로 먼저 답하고 뒤에서 새로 받아 둔다 */
function isStaticAsset(url) {
  return url.pathname.startsWith("/sky/") || url.pathname.startsWith("/map/") || url.pathname.startsWith("/icons/")
}

async function cacheFirst(request) {
  const cache = await caches.open(STATIC_CACHE)
  const cached = await cache.match(request)
  if (cached) return cached
  const response = await fetch(request)
  if (response.ok) cache.put(request, response.clone())
  return response
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(STATIC_CACHE)
  const cached = await cache.match(request)
  const refresh = fetch(request)
    .then((response) => {
      if (response.ok) cache.put(request, response.clone())
      return response
    })
    .catch(() => cached)
  return cached || refresh
}

self.addEventListener("fetch", (event) => {
  const { request } = event
  if (request.method !== "GET") return
  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return
  // 예보와 계정 관련 응답은 항상 네트워크에서 받는다
  if (url.pathname.startsWith("/api/")) return

  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(() => caches.match(OFFLINE_URL)))
    return
  }
  if (isImmutable(url)) {
    event.respondWith(cacheFirst(request))
    return
  }
  if (isStaticAsset(url)) {
    event.respondWith(staleWhileRevalidate(request))
  }
})
