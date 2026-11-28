import axios from "axios"

/**
 * 리프레시 토큰으로 액세스 토큰을 새로 받는다. 이미 받는 중이면 그 요청을 같이 기다린다.
 *
 * 서버는 리프레시 토큰을 한 번 쓰면 새 것으로 바꾸고 옛 것을 지운다. 그래서 같은 쿠키로 두 요청이 겹치면 늦게 닿은 쪽이
 * 401을 받는다. 소셜 로그인에서 돌아온 화면은 앱 전체의 로그인 확인(AuthProvider)과 콜백 화면이 동시에 재발급을
 * 부르기 때문에, 겹친 쪽이 로그아웃으로 처리돼 로그인이 풀린 화면이 보였다. 모든 재발급을 이 함수 하나로 모아 한 번만
 * 보낸다.
 */
let inFlight: Promise<string> | null = null

export function requestReissue(baseURL: string): Promise<string> {
  if (!inFlight) {
    inFlight = axios
      .post<{ data?: { accessToken?: string }; accessToken?: string }>(
        `${baseURL}/api/v1/auth/reissue`,
        {},
        { withCredentials: true },
      )
      .then((response) => {
        const accessToken = response.data.data?.accessToken ?? response.data.accessToken
        if (!accessToken) throw new Error("Access Token이 응답에 포함되지 않았습니다.")
        return accessToken
      })
      .finally(() => {
        inFlight = null
      })
  }
  return inFlight
}
