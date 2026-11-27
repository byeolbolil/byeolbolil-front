/**
 * walkthrough와 scenarios가 쓰는 백엔드 응답 녹화본. 추천, 구름, 장소, 검색 응답을 한 번 녹화해 두고 다시 튼다.
 *
 * 실제 예보로 돌리면 결과가 그날 날씨에 달린다. 가볼 만한 곳이 없는 밤에는 장소 화면이 뜨지 않아 그 위의 흐름을 하나도
 * 따라 할 수 없고, 장마철에는 몇 주씩 그렇다. 녹화본을 틀면 언제 돌려도 같은 밤을 보고, 브라우저 시계도 녹화한 시각에
 * 맞춘다. 화면이 새 API를 부르거나 응답 모양이 바뀌면 `--record`로 다시 녹화한다(가볼 만한 곳이 여럿인 밤에).
 *
 * 로그인과 회원 API는 녹화하지 않는다. 각 스크립트가 브라우저 안에서 따로 흉내 낸다.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { dirname } from "node:path"

const NOT_TAPED = /^\/api\/v1\/(auth|members|bookmarks)(\/|$)/

/** 로그인을 흉내 낸 창의 가짜 토큰은 실제 백엔드에 보내지 않는다. 녹화하는 응답은 모두 로그인 없이 받는 것이다 */
function withoutToken(headers) {
  const { authorization: _, ...rest } = headers
  return rest
}

/**
 * @param {string} file 녹화본 경로
 * @param {{ record: boolean, origin: string }} options origin은 개발 서버 주소(CORS 응답 머리에 쓴다)
 */
export function apiTape(file, { record, origin }) {
  if (!record && !existsSync(file)) {
    throw new Error(`녹화본 ${file}이 없다. 한 번 --record로 돌려 녹화한다.`)
  }
  const tape = record ? { recordedAt: Date.now(), responses: {} } : JSON.parse(readFileSync(file, "utf8"))
  const misses = new Set()
  const cors = { "access-control-allow-origin": origin, "access-control-allow-credentials": "true" }
  const keyOf = (request) => {
    const url = new URL(request.url())
    return `${request.method()} ${url.pathname}${url.search}`
  }

  /** 이 요청의 응답 본문(JSON). 녹화 중이면 백엔드에 묻고 녹화본에 남긴다 */
  const json = async (route) => {
    const key = keyOf(route.request())
    if (!record) {
      const saved = tape.responses[key]
      if (!saved) {
        misses.add(key)
        return null
      }
      return JSON.parse(saved.body)
    }
    const response = await route.fetch({ headers: withoutToken(route.request().headers()) })
    const body = await response.text()
    tape.responses[key] = { status: response.status(), contentType: response.headers()["content-type"], body }
    return JSON.parse(body)
  }

  return {
    recordedAt: new Date(tape.recordedAt),
    json,

    /** 새 창에 녹화본을 건다. 스크립트가 따로 거는 응답(로그인 흉내 등)은 이것보다 뒤에 걸어야 앞선다 */
    async attach(context) {
      if (!record) await context.clock.install({ time: tape.recordedAt })
      await context.route("**/api/v1/**", async (route) => {
        const request = route.request()
        if (NOT_TAPED.test(new URL(request.url()).pathname)) return route.fallback()
        if (record) {
          if (request.method() === "OPTIONS") return route.fallback()
          try {
            const response = await route.fetch({ headers: withoutToken(request.headers()) })
            const body = await response.text()
            tape.responses[keyOf(request)] = { status: response.status(), contentType: response.headers()["content-type"], body }
            await route.fulfill({ response, body })
          } catch {
            // 응답이 오기 전에 창을 닫았다. 녹화하지 않고 넘어간다
          }
          return
        }
        if (request.method() === "OPTIONS") return route.fulfill({ status: 204, headers: cors })
        const saved = tape.responses[keyOf(request)]
        if (!saved) {
          misses.add(keyOf(request))
          return route.fulfill({ status: 503, headers: cors, contentType: "application/json", body: '{"success":false,"status":503,"message":"녹화본에 없는 요청"}' })
        }
        return route.fulfill({ status: saved.status, headers: cors, contentType: saved.contentType, body: saved.body })
      })
    },

    /** 녹화본에 없어 503으로 답한 요청. 있으면 녹화본이 화면보다 낡은 것이다 */
    misses: () => [...misses],

    save() {
      if (!record) return
      mkdirSync(dirname(file), { recursive: true })
      writeFileSync(file, JSON.stringify(tape))
      console.log(`\n녹화본을 남겼다: ${file} (${Object.keys(tape.responses).length}개 응답, ${new Date(tape.recordedAt).toISOString()})`)
    },
  }
}
