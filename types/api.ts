/** 백엔드의 공통 응답 봉투. 모든 API 응답이 이 모양으로 감싸져 온다. */
export interface CommonResponse<T> {
  success: boolean
  status: number
  message: string
  data: T
}
