/**
 * 실제 브라우저로 목업의 화면 흐름을 따라가며 화면을 찍는다.
 *
 *     pnpm dev                       # 다른 터미널에서, NEXT_PUBLIC_API_URL을 백엔드로 맞춘 뒤
 *     pnpm walkthrough               # 또는 node scripts/walkthrough.mjs --out <폴더> --base http://localhost:3000
 *
 * 모바일(390x844)과 PC(1440x900)에서 각각: 오늘 밤 추천 → 다른 후보 고르기 → 밤 띠 훑기 → 카드의 탭 →
 * 지도의 세 레이어와 표식 → 설정 바꾸기 → 추천 기준과 출처 → 별 사진 찍기.
 * 추천 API는 앱이 쓰는 그대로(/api rewrite) 실제 백엔드를 부른다. 로그인 관련 호출은 브라우저 안에서 401로 답해서
 * 백엔드의 인증 API에는 아무것도 보내지 않는다. 그 401이 콘솔에 한 줄 남는 것은 정상이다.
 *
 * 설정을 바꾼 뒤 요청 쿼리가 실제로 바뀌었는지, 지도 표식과 목록의 선택이 맞는지도 확인하고, 어긋나면 실패로 끝난다.
 */
import { mkdirSync } from "node:fs"
import { chromium } from "playwright"

const args = process.argv.slice(2)
const option = (name, fallback) => {
  const index = args.indexOf(`--${name}`)
  return index >= 0 ? args[index + 1] : fallback
}
const BASE = option("base", "http://localhost:3000")
const OUT = option("out", "walkthrough-shots")
const ONLY = option("only", null)
// 이동 시간을 보려면 출발지가 필요하다. 목업과 같은 서울 마포의 한 점을 쓴다
const ORIGIN = { latitude: 37.55, longitude: 126.91 }
const VIEWPORTS = {
  mobile: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  desktop: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, isMobile: false, hasTouch: false },
}
const KNOWN_CONSOLE_NOISE = [/status of 401/, /GPU stall due to ReadPixels/]
// 등급을 화면에 적는 문구. lib/tonight/wording.ts와 같다
const LEVEL_TEXT = { STRONG: "별 보기 아주 좋아요", GOOD: "별 보기 좋아요", MAYBE: "별 보기 아쉬워요", NO: "별 보기 어려워요" }

mkdirSync(OUT, { recursive: true })
const failures = []
const check = (condition, message) => {
  if (!condition) failures.push(message)
  console.log(`  ${condition ? "ok  " : "FAIL"} ${message}`)
}
const flat = (text) => text.replace(/\s*\n\s*/g, " | ")

async function walk(browser, kind) {
  console.log(`\n== ${kind}`)
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
      body: JSON.stringify({ success: false, status: 401, message: "walkthrough" }),
    }),
  )
  const page = await context.newPage()
  const consoleErrors = []
  const requests = []
  page.on("console", (message) => {
    if (message.type() !== "error" && message.type() !== "warning") return
    if (KNOWN_CONSOLE_NOISE.some((pattern) => pattern.test(message.text()))) return
    consoleErrors.push(`[${message.type()}] ${message.text()}`)
  })
  page.on("pageerror", (error) => consoleErrors.push(`[pageerror] ${error}`))
  page.on("request", (request) => {
    const url = new URL(request.url())
    if (url.pathname.startsWith("/api/v1/recommendations")) requests.push(url.pathname + url.search)
  })
  let step = 0
  const shot = async (name, options = {}) => {
    step += 1
    const file = `${OUT}/${kind}-${String(step).padStart(2, "0")}-${name}.png`
    await page.screenshot({ path: file, ...options })
    console.log(`  shot ${file}`)
  }
  const heroName = () => page.locator(".bb .tonight .sky-text h1").first().innerText()
  const mapReady = async () => {
    await page.waitForSelector(".bb .mapcanvas canvas", { timeout: 60_000 })
    await page.waitForSelector(".bb .pin", { timeout: 60_000 })
    await page.waitForTimeout(4000)
  }

  // 1. 오늘 밤 추천
  await page.goto(BASE, { waitUntil: "domcontentloaded" })
  await page.waitForSelector(".bb .tonight .sky-text h1", { timeout: 90_000 })
  if (kind === "desktop") await mapReady()
  await page.waitForTimeout(800)
  const topName = await heroName()
  console.log(`  가장 좋은 곳: ${flat(await page.locator(".bb .tonight .sky-text").first().innerText())}`)
  console.log(`  예보 출처: ${await page.locator(".bb .credit-line").first().innerText()}`)
  check(requests[0]?.includes("lat=37.55&lon=126.91"), `첫 요청에 출발지가 들어 있다: ${requests[0]}`)
  // 밤 고르기: 칸마다 날짜가 있고, 밤마다의 등급이 도착하면 오늘 밤의 표시가 목록의 첫 장소와 같은 등급이다
  await page
    .waitForFunction(() => document.querySelectorAll('.bb .nights button:not([data-level="NONE"])').length > 1, null, { timeout: 30_000 })
    .catch(() => {})
  const nightButtons = await page.locator(".bb .nights button").evaluateAll((items) =>
    items.map((item) => ({ date: item.querySelector(".nt-date")?.textContent ?? "", level: item.getAttribute("data-level") })),
  )
  const firstRating = await page.locator(".bb .side .row .rating").first().getAttribute("title")
  check(
    nightButtons.length === 7 && nightButtons.every((night) => /^\d{1,2}\/\d{1,2}$/.test(night.date)),
    "밤 고르기의 일곱 칸에 날짜가 적혀 있다",
  )
  check(nightButtons.filter((night) => night.level !== "NONE").length > 1, `밤마다 등급이 그려진다: ${nightButtons.map((night) => night.level).join(" ")}`)
  check(LEVEL_TEXT[nightButtons[0]?.level] === firstRating, `오늘 밤의 표시가 목록의 첫 장소와 같다: ${nightButtons[0]?.level}, "${firstRating}"`)
  await shot("home")
  await shot("home-full", { fullPage: true })

  // 2. 다른 후보 고르기: 장소 화면이 열리고, 그 위의 날짜 줄은 이 장소의 일곱 밤이다
  const row = page.locator(".bb .row").nth(1)
  const rowName = (await row.locator(".row-name").innerText()).split("\n")[0].trim()
  await row.click()
  await page.waitForSelector(".bb .place-view")
  await page.waitForTimeout(1200)
  check((await heroName()) === rowName, `목록에서 고른 "${rowName}"의 장소 화면이 열린다`)
  if (kind === "desktop") check((await row.getAttribute("aria-current")) === "true", "고른 줄이 옆 칸의 목록에 표시된다")
  else check((await page.locator(".bb .side .row").count()) === 0, "좁은 화면에서는 장소 화면이 목록을 덮는다")
  // 다른 밤을 눌러도 장소는 그대로다
  const placeNights = page.locator(".bb .place-view .nights button")
  await page
    .waitForFunction(() => document.querySelectorAll('.bb .place-view .nights button:not([data-level="NONE"])').length > 2, null, { timeout: 30_000 })
    .catch(() => {})
  await placeNights.nth(2).click()
  await page.waitForTimeout(800)
  check((await heroName()) === rowName, `장소 화면에서 다른 밤을 눌러도 "${rowName}" 그대로다`)
  const cardTab = flat(await page.locator(".bb .place-view .card-tabs [role=tab]").first().innerText())
  check(cardTab !== "오늘 밤", `카드의 첫 탭이 고른 밤의 이름이다: ${cardTab}`)
  await shot("place-other-night")
  await placeNights.first().click()
  await page.waitForTimeout(600)
  if (kind === "desktop") {
    const selected = await page.locator(".bb .pin.sel").getAttribute("aria-label")
    check(selected?.startsWith(rowName), `목록에서 고른 장소가 지도에서도 선택된다: ${selected}`)
  }
  await shot("candidate")

  // 3. 밤 띠 훑기
  const band = page.locator(".bb .band").first()
  // 화면 아래의 탭 줄에 가리지 않게 가운데로 옮긴다
  await band.evaluate((element) => element.scrollIntoView({ block: "center" }))
  await page.waitForTimeout(300)
  const bandBox = await band.boundingBox()
  const bandX = bandBox.x + bandBox.width * 0.62
  const bandY = bandBox.y + bandBox.height * 0.45
  if (kind === "mobile") await page.touchscreen.tap(bandX, bandY)
  else await page.mouse.move(bandX, bandY)
  await page.waitForSelector(".bb .band-tip")
  await page.waitForTimeout(400)
  console.log(`  밤 띠: ${await page.locator(".bb .band-tip").innerText()}`)
  await shot("scrub")
  if (kind === "desktop") await page.mouse.move(10, 10)

  // 4. 카드의 탭: 오늘 밤(점수와 조건)은 처음부터 보이고, 장소와 이번 주는 탭으로 연다
  const facts = flat(await page.locator(".bb .tonight .quick").first().innerText())
  check(/\d+점/.test(facts), `점수와 조건이 처음부터 보인다: ${facts}`)
  await page.locator(".bb .tonight .quick").first().scrollIntoViewIfNeeded()
  await shot("detail")
  await shot("detail-full", { fullPage: true })
  const tabs = page.locator(".bb .tonight .card-tabs").first()
  if (await tabs.getByRole("tab", { name: "장소" }).count()) {
    await tabs.getByRole("tab", { name: "장소" }).click()
    await page.waitForTimeout(300)
    await shot("card-place")
  }
  await tabs.getByRole("tab").first().click()

  // 로그인하지 않고 저장을 누르면 페이지를 옮기지 않고 로그인 창이 뜬다
  const urlBefore = page.url()
  await page.locator(".bb .save-pill").first().click()
  await page.waitForSelector(".bb .login", { timeout: 5000 })
  check(page.url() === urlBefore, "저장을 누르면 보던 화면 위에 로그인 창이 뜬다")
  await shot("login")
  await page.keyboard.press("Escape")

  // 5. 지도와 세 레이어
  if (kind === "mobile") {
    await page.getByRole("tab", { name: "지도" }).click()
    await mapReady()
  } else {
    await page.evaluate(() => window.scrollTo({ top: 0 }))
  }
  console.log(`  표식 ${await page.locator(".bb .pin").count()}개, 출처 표기: ${flat(await page.locator(".bb .maplibregl-ctrl-attrib").innerText())}`)
  await shot("map-night")

  await page.getByRole("button", { name: "구름", exact: true }).click()
  await page.waitForSelector(".bb .timebar")
  const cloudLabels = () => page.locator(".bb .pin .cc").allInnerTexts()
  const before = await cloudLabels()
  const timeBefore = await page.locator(".bb .timebar .tl-label").innerText()
  await page.locator(".bb .timebar input").focus()
  for (let i = 0; i < 5; i++) await page.keyboard.press("ArrowRight")
  await page.waitForTimeout(600)
  const timeAfter = await page.locator(".bb .timebar .tl-label").innerText()
  const after = await cloudLabels()
  check(timeBefore !== timeAfter, `구름 레이어의 시각이 바뀐다: ${timeBefore} → ${timeAfter}`)
  check(before.length > 0 && after.length === before.length, `표식마다 그 시각의 구름량이 붙는다 (${after.length}개)`)
  await shot("map-cloud")

  await page.getByRole("button", { name: "일반 지도" }).click()
  await page.waitForTimeout(4500)
  await shot("map-base")

  await page.getByRole("button", { name: "광해 지도" }).click()
  await page.waitForTimeout(4000)
  // 다른 표식에 가려지지 않은 표식 하나를 누른다
  const target = await page.evaluate(() => {
    for (const pin of document.querySelectorAll(".bb .pin:not(.sel):not(.top)")) {
      const rect = pin.querySelector(".mk").getBoundingClientRect()
      const x = rect.x + rect.width / 2
      const y = rect.y + rect.height / 2
      if (pin.contains(document.elementFromPoint(x, y))) return { x, y, label: pin.getAttribute("aria-label") }
    }
    return null
  })
  check(target !== null, "누를 수 있는 표식이 있다")
  if (target) {
    const markerName = target.label.split(",")[0]
    if (kind === "mobile") await page.touchscreen.tap(target.x, target.y)
    else await page.mouse.click(target.x, target.y)
    await page.waitForTimeout(1200)
    const selected = await page.locator(".bb .pin.sel").getAttribute("aria-label")
    check(selected === target.label, `누른 표식이 선택된다: ${selected}`)
    if (kind === "mobile") {
      const peek = flat(await page.locator(".bb .peek").innerText())
      check(peek.startsWith(markerName), `표식을 누르면 미리보기가 뜬다: ${peek}`)
      await shot("map-marker")
      await page.locator(".bb .peek").getByRole("button", { name: "자세히" }).click()
      await page.waitForTimeout(1200)
      check((await heroName()) === markerName, `미리보기에서 "${markerName}"의 카드로 간다`)
      // 화면에는 돌아가는 버튼이 없고, 브라우저의 뒤로 가기가 고르기 전의 지도 탭으로 돌려보낸다
      await page.goBack()
      await page.waitForTimeout(600)
      check((await page.getByRole("tab", { name: "지도" }).getAttribute("aria-selected")) === "true", "뒤로 가면 지도 탭으로 돌아온다")
    } else {
      check((await heroName()) === markerName, `표식을 누르면 오른쪽 패널에 "${markerName}"이 열린다`)
      await shot("map-marker")
    }
  }

  // 6. 설정
  if (kind === "mobile") await page.getByRole("tab", { name: "목록" }).click()
  await page.waitForSelector(".bb .tonight .sky-text h1")
  const countBefore = requests.length
  await page.getByRole("button", { name: "설정", exact: true }).click()
  const sheet = page.locator(".bb .sheet")
  await sheet.waitFor()
  await sheet.locator("details.adv summary").click()
  await page.waitForTimeout(300)
  await shot("settings")
  await sheet.getByRole("button", { name: "자정", exact: true }).click()
  await page.waitForTimeout(1500)
  await sheet.getByRole("button", { name: "1시간", exact: true }).click()
  await page.waitForTimeout(2000)
  const changed = requests.slice(countBefore)
  console.log(`  설정을 바꾼 뒤의 요청:\n    ${changed.join("\n    ")}`)
  check(changed.some((url) => url.includes("preferBefore=00%3A00")), "몇 시까지를 자정으로 바꾸면 preferBefore=00:00으로 요청한다")
  check(changed.some((url) => url.includes("maxTravelMinutes=60")), "얼마나 멀리를 1시간으로 바꾸면 maxTravelMinutes=60으로 요청한다")
  const stored = await page.evaluate(() => localStorage.getItem("byeolbolil-settings"))
  check(stored?.includes('"preferBefore":"00:00"') && stored.includes('"maxTravelMinutes":60'), "설정이 localStorage에 남는다")

  // 7. 추천 기준과 출처
  await sheet.getByRole("button", { name: "추천 기준과 출처 보기" }).click()
  await page.waitForSelector(".bb .src")
  await page.waitForTimeout(300)
  console.log(`  기준과 출처 ${await page.locator(".bb .src li").count()}항목`)
  await shot("sources")
  await page.keyboard.press("Escape")
  await page.waitForFunction(() => document.querySelector(".bb main.view > .view")?.getAttribute("aria-busy") !== "true")
  await page.waitForTimeout(600)
  const newTop = flat(await page.locator(".bb .tonight .sky-text").first().innerText())
  const notes = flat(await page.locator(".bb .panel").innerText()).match(/[^|]*(뺐어요)[^|]*/)?.[0]?.trim()
  console.log(`  바꾸기 전 가장 좋은 곳: ${topName}`)
  console.log(`  바꾼 뒤: ${newTop}${notes ? ` / ${notes}` : ""}`)
  await shot("after-settings")

  // 8. 별 사진 찍기: 머리의 버튼으로 시트가 열리고, 기종을 바꾸면 그 기종의 설정이 나온다
  await page.getByRole("button", { name: "별 사진 찍기" }).click()
  await page.waitForSelector(".bb .guide")
  await page.locator(".bb .guide .seg").getByRole("button", { name: "아이폰" }).click()
  check((await page.locator(".bb .guide").innerText()).includes("야간 모드"), "촬영 안내가 앱 안의 시트로 열리고 기종을 고를 수 있다")
  await shot("guide")
  await page.keyboard.press("Escape")

  check(consoleErrors.length === 0, `콘솔 오류가 없다${consoleErrors.length ? `:\n    ${consoleErrors.join("\n    ")}` : ""}`)
  await context.close()
}

const browser = await chromium.launch({
  // 화면이 없는 환경에서도 WebGL 지도가 그려지게 한다
  args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
})
try {
  for (const kind of Object.keys(VIEWPORTS)) {
    if (!ONLY || ONLY === kind) await walk(browser, kind)
  }
} finally {
  await browser.close()
}
if (failures.length > 0) {
  console.error(`\n실패 ${failures.length}건`)
  process.exit(1)
}
console.log("\n모두 통과")
