import { describe, expect, it } from "vitest"
import { linkHost, safeLinks, searchUrl } from "./links"

describe("safeLinks", () => {
  it("제목과 주소가 있는 링크를 받은 순서대로 돌려준다", () => {
    const links = safeLinks([
      { title: "울산바위 은하수 포인트 가는법 정리", url: "https://gall.dcinside.com/mgallery/board/view/?id=digitalpicture&no=74118" },
      { title: " 중미산천문대 홈페이지 ", url: "http://starwww.astrocafe.co.kr/" },
    ])

    expect(links).toEqual([
      { title: "울산바위 은하수 포인트 가는법 정리", url: "https://gall.dcinside.com/mgallery/board/view/?id=digitalpicture&no=74118" },
      { title: "중미산천문대 홈페이지", url: "http://starwww.astrocafe.co.kr/" },
    ])
  })

  it("미리보기 이미지는 https 주소일 때만 남긴다", () => {
    const links = safeLinks([
      { title: "하나", url: "https://example.com/a", imageUrl: "https://cdn.example.com/a.jpg" },
      { title: "둘", url: "https://example.com/b", imageUrl: "http://cdn.example.com/b.jpg" },
      { title: "셋", url: "https://example.com/c", imageUrl: "javascript:alert(1)" },
      { title: "넷", url: "https://example.com/d", imageUrl: 3 },
    ])

    expect(links.map((link) => link.imageUrl)).toEqual(["https://cdn.example.com/a.jpg", undefined, undefined, undefined])
  })

  it("http(s)가 아닌 주소와 제목이 없는 항목은 버린다", () => {
    const links = safeLinks([
      { title: "스크립트", url: "javascript:alert(1)" },
      { title: "", url: "https://example.com/" },
      { title: "주소 없음" },
      { title: "깨진 주소", url: "https://" },
      "https://example.com/",
      null,
    ])

    expect(links).toEqual([])
  })

  it("값이 없거나 배열이 아니면 빈 목록이다", () => {
    expect(safeLinks(undefined)).toEqual([])
    expect(safeLinks(null)).toEqual([])
    expect(safeLinks({ title: "하나", url: "https://example.com/" })).toEqual([])
  })
})

describe("linkHost", () => {
  it("앞의 www, m, korean을 떼고 사이트 이름만 적는다", () => {
    expect(linkHost("https://www.khan.co.kr/article/201805281526001")).toBe("khan.co.kr")
    expect(linkHost("https://m.cafe.daum.net/truepicture/Qt7/1305170")).toBe("cafe.daum.net")
    expect(linkHost("https://korean.visitkorea.or.kr/detail/ms_detail.do?cotid=1")).toBe("visitkorea.or.kr")
    expect(linkHost("https://v.daum.net/v/Q16NWPhVPS")).toBe("v.daum.net")
  })

  it("주소로 읽을 수 없으면 적지 않는다", () => {
    expect(linkHost("여기")).toBe("")
  })
})

describe("searchUrl", () => {
  it("관측지는 이름에 별 보기를 붙여 찾는다", () => {
    const url = new URL(searchUrl("고성 미시령 옛길"))

    expect(url.origin + url.pathname).toBe("https://www.google.com/search")
    expect(url.searchParams.get("q")).toBe("고성 미시령 옛길 별 보기")
  })

  it("시설은 이름만으로 찾는다", () => {
    expect(new URL(searchUrl("대전 시민천문대", true)).searchParams.get("q")).toBe("대전 시민천문대")
  })
})
