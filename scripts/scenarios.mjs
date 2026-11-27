/**
 * 쓰는 사람의 흐름을 실제 브라우저로 따라 하며, 화면끼리 어긋나지 않는지 확인한다. 어긋나면 실패로 끝난다.
 *
 *     pnpm dev                       # 다른 터미널에서, NEXT_PUBLIC_API_URL을 백엔드로 맞춘 뒤
 *     pnpm scenarios                 # 또는 node scripts/scenarios.mjs --base http://localhost:3000 [--only 이름]
 *
 * `pnpm walkthrough`가 화면을 하나씩 열어 보며 찍는 것이라면, 이것은 여러 화면을 오가는 흐름에서 생기는 어긋남을 잡는다.
 * 고친 버그마다 그 버그를 다시 밟는 흐름을 여기에 더한다. 시나리오는 그날의 실제 예보로 돌기 때문에, 값 자체가 아니라
 * 화면끼리 같은 것을 말하는지(장소 화면의 밤과 지도의 밤, 시간 막대의 날짜 순서)를 본다.
 *
 * 추천 API는 walkthrough와 같이 실제 백엔드를 부르고, 로그인 관련 호출은 브라우저 안에서 401로 답한다.
 */
import { chromium } from "playwright"

const args = process.argv.slice(2)
const option = (name, fallback) => {
  const index = args.indexOf(`--${name}`)
  return index >= 0 ? args[index + 1] : fallback
}
const BASE = option("base", "http://localhost:3000")
const ONLY = option("only", null)
const ORIGIN = { latitude: 37.55, longitude: 126.91 }
const VIEWPORTS = {
  mobile: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  desktop: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, isMobile: false, hasTouch: false },
}
const KNOWN_CONSOLE_NOISE = [/status of 401/, /GPU stall due to ReadPixels/]

const failures = []
const check = (condition, message) => {
  if (!condition) failures.push(message)
  console.log(`  ${condition ? "ok  " : "FAIL"} ${message}`)
}

/** 새 창에서 첫 화면을 연다. 뒤로 가기로 사이트를 떠나는지 알 수 있게 빈 페이지를 먼저 연다 */
async function open(browser, kind) {
  const context = await browser.newContext({
    ...VIEWPORTS[kind],
    locale: "ko-KR",
    timezoneId: "Asia/Seoul",
    permissions: ["geolocation"],
    geolocation: ORIGIN,
  })
  await context.route("**/api/v1/auth/**", (route) =>
    route.fulfill({
      status: 401,
      contentType: "application/json",
      headers: { "access-control-allow-origin": BASE, "access-control-allow-credentials": "true" },
      body: JSON.stringify({ success: false, status: 401, message: "scenarios" }),
    }),
  )
  const page = await context.newPage()
  const errors = []
  page.on("console", (message) => {
    if (message.type() !== "error") return
    if (KNOWN_CONSOLE_NOISE.some((pattern) => pattern.test(message.text()))) return
    errors.push(message.text())
  })
  page.on("pageerror", (error) => errors.push(String(error)))
  await page.goto("about:blank")
  await page.goto(BASE, { waitUntil: "domcontentloaded" })
  await page.waitForSelector(".bb .tonight .sky-text h1", { timeout: 90_000 })
  // 장소 화면의 일곱 밤 등급이 올 때까지 기다린다
  await page
    .waitForFunction(() => document.querySelectorAll('.bb .place-view .nights button:not([data-level="NONE"])').length > 2, null, { timeout: 30_000 })
    .catch(() => {})
  return { context, page, errors }
}

const heroName = (page) => page.locator(".bb .tonight .sky-text h1").first().innerText()
const sheetCount = (page) => page.locator(".bb .sheet").count()
const settle = (page, ms = 1200) => page.waitForTimeout(ms)

/** 날짜 칸의 이름 부분. 칸의 aria-label은 "월요일 밤 11월 30일, 별 보기 좋아요"이다 */
const nightNameOf = (label) => label?.match(/^(.*?) \d+월 \d+일/)?.[1] ?? null
async function pressedNight(page, selector) {
  const label = await page.locator(`${selector} button[aria-pressed="true"]`).first().getAttribute("aria-label").catch(() => null)
  return nightNameOf(label)
}
async function nightAt(page, selector, index) {
  return nightNameOf(await page.locator(`${selector} button`).nth(index).getAttribute("aria-label"))
}
/** 지도 아래 안내의 첫 문장이 말하는 밤. "월요일 밤의 구름이에요" */
async function mapNight(page) {
  const text = await page.locator(".bb .map-card.bl:visible, .bb .map-legend:visible").first().innerText().catch(() => "")
  return text.match(/^(.*?)의 구름이에요/)?.[1] ?? null
}
async function cloudLayer(page) {
  await page.getByRole("button", { name: "구름", exact: true }).click()
  await page.waitForSelector(".bb .timebar", { timeout: 30_000 })
  await settle(page, 1500)
}
const PLACE = ".bb .place-view .nights"
const LIST = ".bb .side .nights"

const scenarios = {
  /** 시트는 뒤로 가기로 닫히고, 닫은 뒤에는 뒤로 가기가 헛돌지 않는다 */
  async back(browser, kind) {
    const { context, page, errors } = await open(browser, kind)
    await page.getByRole("button", { name: "별 사진 찍는 법" }).first().click()
    await page.waitForSelector(".bb .sheet")
    await page.goBack()
    await settle(page, 600)
    check((await sheetCount(page)) === 0 && page.url().startsWith(BASE), "뒤로 가기는 시트만 닫고 사이트에 남는다")

    await page.locator(".bb .sec-link").click()
    await page.waitForSelector(".bb .sheet")
    await page.locator(".bb .sheet .x-btn").click()
    await settle(page, 600)
    await page.goBack()
    await settle(page, 600)
    check(page.url() === "about:blank", "X로 닫은 뒤의 뒤로 가기는 사이트를 떠난다(쌓아 둔 기록이 남지 않는다)")
    await page.goForward()
    await page.waitForSelector(".bb .tonight .sky-text h1", { timeout: 90_000 })
    await settle(page, 1500)

    const top = await heroName(page)
    const row = page.locator(".bb .side .row").nth(1)
    const rowName = (await row.locator(".row-name").innerText()).split("\n")[0].trim()
    await row.click()
    await settle(page)
    await page.locator(".bb .sec-link").click()
    await page.waitForSelector(".bb .sheet")
    await page.goBack()
    await settle(page, 600)
    check((await sheetCount(page)) === 0 && (await heroName(page)) === rowName, `장소 화면 위의 시트는 뒤로 가기 한 번에 시트만 닫힌다 (${rowName})`)
    await page.goBack()
    await settle(page)
    check((await heroName(page)) === top, `한 번 더 뒤로 가면 장소 화면이 닫히고 1위 "${top}"로 돌아온다`)

    // 장소 화면 위 달력에서 예보가 있는 밤으로 가면 시트와 장소 화면이 함께 닫히고 기록도 함께 되돌린다
    await page.locator(".bb .side .row").nth(1).click()
    await settle(page)
    await page.locator(".bb .sec-link").click()
    await page.waitForSelector(".bb .mc-grid")
    await page.locator(".bb .mc-grid button").nth(1).click()
    await page.getByRole("button", { name: "이 밤 예보 보기" }).click()
    await settle(page)
    check((await sheetCount(page)) === 0, "달력에서 밤을 고르면 시트가 닫힌다")
    await page.goBack()
    await settle(page, 600)
    check(page.url() === "about:blank", "그 뒤의 뒤로 가기는 사이트를 떠난다(시트와 장소 화면의 기록을 한 번에 되돌렸다)")
    check(errors.length === 0, `콘솔 오류가 없다 ${errors.join(" / ")}`)
    await context.close()
  },

  /** 넓은 화면: 장소 화면, 후보 목록, 지도가 같은 밤을 말한다 */
  async nights(browser, kind) {
    if (kind !== "desktop") return
    const { context, page, errors } = await open(browser, kind)
    await page.waitForSelector(".bb .pin", { timeout: 60_000 })
    await cloudLayer(page)
    check((await mapNight(page)) === (await pressedNight(page, LIST)), `처음에는 지도가 목록의 밤을 그린다: ${await mapNight(page)}`)

    await page.locator(`${PLACE} button`).nth(3).click()
    await settle(page, 2500)
    const fourth = await nightAt(page, PLACE, 3)
    check((await mapNight(page)) === fourth, `장소 화면에서 고른 "${fourth}"를 지도가 따라간다: ${await mapNight(page)}`)

    await page.locator(`${LIST} button`).nth(1).click()
    await settle(page, 2500)
    const second = await nightAt(page, LIST, 1)
    check((await pressedNight(page, PLACE)) === second, `목록에서 "${second}"를 고르면 장소 화면도 그 밤이다`)
    check((await mapNight(page)) === second, `목록에서 "${second}"를 고르면 지도도 그 밤이다: ${await mapNight(page)}`)

    // 버그: 장소 화면에서 고른 밤이, 목록의 밤을 바꿨다 되돌리면 지도에만 되살아났다
    await page.locator(`${PLACE} button`).nth(4).click()
    await settle(page, 2000)
    await page.locator(`${LIST} button`).nth(0).click()
    await settle(page, 2500)
    await page.locator(`${LIST} button`).nth(1).click()
    await settle(page, 2500)
    check(
      (await mapNight(page)) === second && (await pressedNight(page, PLACE)) === second,
      `목록의 밤을 바꿨다 되돌려도 지도와 장소 화면이 "${second}"로 같다: 지도 ${await mapNight(page)}, 장소 ${await pressedNight(page, PLACE)}`,
    )

    // 장소 화면에서 고른 밤이 있을 때 목록의 같은 밤을 다시 누르면 그 밤으로 맞춘다
    await page.locator(`${PLACE} button`).nth(3).click()
    await settle(page, 2000)
    await page.locator(`${LIST} button`).nth(1).click()
    await settle(page, 2500)
    check((await mapNight(page)) === second, `목록의 같은 밤을 다시 누르면 지도가 "${second}"로 돌아온다: ${await mapNight(page)}`)

    // 다른 장소를 고르면 장소 화면에서 고른 밤을 버린다
    await page.locator(`${PLACE} button`).nth(3).click()
    await settle(page, 2000)
    await page.locator(".bb .side .row").nth(2).click()
    await settle(page, 2500)
    check(
      (await mapNight(page)) === second && (await pressedNight(page, PLACE)) === second,
      `다른 장소를 고르면 목록의 밤 "${second}"로 돌아간다: 지도 ${await mapNight(page)}, 장소 ${await pressedNight(page, PLACE)}`,
    )
    check(errors.length === 0, `콘솔 오류가 없다 ${errors.join(" / ")}`)
    await context.close()
  },

  /** 좁은 화면: 지도 탭이 장소 화면에서 고른 밤을 따르고, 지도 탭에서 고른 밤이 목록에도 반영된다 */
  async mapTab(browser, kind) {
    if (kind !== "mobile") return
    const { context, page, errors } = await open(browser, kind)
    await page.locator(`${PLACE} button`).nth(3).click()
    await settle(page, 2000)
    const fourth = await nightAt(page, PLACE, 3)
    await page.getByRole("tab", { name: "지도" }).click()
    await page.waitForSelector(".bb .pin", { timeout: 60_000 })
    await cloudLayer(page)
    check((await pressedNight(page, ".bb main .nights")) === fourth, `지도 탭의 날짜 칸이 장소 화면에서 고른 "${fourth}"이다`)
    check((await mapNight(page)) === fourth, `지도 탭의 구름이 "${fourth}"이다: ${await mapNight(page)}`)

    await page.locator(".bb main .nights button").nth(2).click()
    await settle(page, 2500)
    const third = await nightAt(page, ".bb main .nights", 2)
    check((await mapNight(page)) === third, `지도 탭에서 "${third}"를 고르면 구름도 그 밤이다: ${await mapNight(page)}`)
    await page.getByRole("tab", { name: "목록" }).click()
    await settle(page, 2000)
    check((await pressedNight(page, LIST)) === third, `목록 탭의 후보도 "${third}"이다`)
    check((await pressedNight(page, PLACE)) === third, `장소 화면도 "${third}"이다`)
    check(errors.length === 0, `콘솔 오류가 없다 ${errors.join(" / ")}`)
    await context.close()
  },

  /** 좁은 화면: 지도를 한 번 누르면 아무것도 고르지 않고, 꾹 누르면 그 자리를 고른다 */
  async longPress(browser, kind) {
    if (kind !== "mobile") return
    const { context, page, errors } = await open(browser, kind)
    await page.getByRole("tab", { name: "지도" }).click()
    await page.waitForSelector(".bb .pin", { timeout: 60_000 })
    await settle(page, 2500)
    const cdp = await context.newCDPSession(page)
    const box = await page.locator(".bb .maplibregl-canvas").boundingBox()
    // 표식이 드문 바다 쪽을 누른다
    const point = { x: box.x + box.width * 0.85, y: box.y + box.height * 0.9 }
    const touch = (type, points) => cdp.send("Input.dispatchTouchEvent", { type, touchPoints: points })
    await touch("touchStart", [point])
    await page.waitForTimeout(80)
    await touch("touchEnd", [])
    await settle(page)
    check((await page.locator(".bb .pickcard").count()) === 0, "한 번 짧게 누르면 위치를 고르지 않는다")
    await touch("touchStart", [point])
    await page.waitForTimeout(700)
    await touch("touchEnd", [])
    await settle(page, 1500)
    check((await page.locator(".bb .pickcard").count()) === 1, "꾹 누르면 그 자리의 카드가 뜬다")
    check(errors.length === 0, `콘솔 오류가 없다 ${errors.join(" / ")}`)
    await context.close()
  },

  /** 구름 시간 막대의 날짜와 시각은 자정을 넘어서도 차례로 간다 */
  async cloudTimes(browser, kind) {
    const { context, page, errors } = await open(browser, kind)
    if (kind === "mobile") await page.getByRole("tab", { name: "지도" }).click()
    await page.waitForSelector(".bb .pin", { timeout: 60_000 })
    await cloudLayer(page)
    // 내일 밤은 늘 저녁부터 아침까지 다 있다
    const picker = kind === "mobile" ? ".bb main .nights" : LIST
    await page.locator(`${picker} button`).nth(1).click()
    await settle(page, 2500)
    const slider = page.locator(".bb .timebar input")
    const max = Number(await slider.getAttribute("max"))
    const order = []
    for (let i = 0; i <= max; i++) {
      await slider.fill(String(i))
      const [day, time] = (await page.locator(".bb .timebar .tl-label").innerText()).split("\n")
      const [month, date] = day.match(/(\d+)\/(\d+)/).slice(1).map(Number)
      const hourText = time.trim()
      // 자정은 그 전날에 붙이므로 그날의 24시로 본다
      const hour =
        hourText === "자정" ? 24 : Number(hourText.match(/(\d+)시/)[1]) + (/^(오후|저녁|밤)/.test(hourText) && !/^밤 12/.test(hourText) ? 12 : 0)
      order.push({ key: month * 100 + date, hour, text: `${day.trim()} ${hourText}` })
    }
    const backwards = order.findIndex((item, i) => i > 0 && (item.key < order[i - 1].key || (item.key === order[i - 1].key && item.hour <= order[i - 1].hour)))
    check(order.length > 6, `시간 막대에 칸이 여러 개 있다 (${order.length})`)
    check(backwards < 0, `날짜와 시각이 거꾸로 가지 않는다${backwards < 0 ? "" : `: ${order[backwards - 1].text} → ${order[backwards].text}`}`)
    check(errors.length === 0, `콘솔 오류가 없다 ${errors.join(" / ")}`)
    await context.close()
  },

  /** 달 없는 밤 달력은 장소 화면의 제목 옆과 카드의 달 칸에서 열린다 */
  async moon(browser, kind) {
    const { context, page, errors } = await open(browser, kind)
    await page.locator(".bb .sec-link").click()
    await page.waitForSelector(".bb .mc-grid")
    check((await page.locator(".bb .mc-grid .mc-strip").count()) >= 42, "제목 옆 버튼으로 6주 달력이 열리고 칸마다 띠가 있다")
    await page.keyboard.press("Escape")
    await settle(page, 400)
    const tile = page.locator(".bb .quick li.tap button")
    if (await tile.count()) {
      await tile.first().click()
      await page.waitForSelector(".bb .mc-grid")
      check(true, "카드의 달 칸으로도 달력이 열린다")
      await page.keyboard.press("Escape")
    }
    check(errors.length === 0, `콘솔 오류가 없다 ${errors.join(" / ")}`)
    await context.close()
  },
}

const browser = await chromium.launch({
  // 화면이 없는 환경에서도 WebGL 지도가 그려지게 한다
  args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
})
try {
  for (const [name, run] of Object.entries(scenarios)) {
    if (ONLY && ONLY !== name) continue
    for (const kind of Object.keys(VIEWPORTS)) {
      console.log(`\n== ${name} (${kind})`)
      try {
        await run(browser, kind)
      } catch (error) {
        check(false, `${name} (${kind}) 도중 멈췄다: ${error.message.split("\n")[0]}`)
      }
    }
  }
} finally {
  await browser.close()
}
if (failures.length > 0) {
  console.error(`\n실패 ${failures.length}건\n  ${failures.join("\n  ")}`)
  process.exit(1)
}
console.log("\n모두 통과")
