/**
 * 인증 관련 API
 * 
 * OpenAPI 스펙 기반 타입 안전한 인증 API 클라이언트
 */

import { api } from './client';
import { authStore } from '@/lib/store/authStore';
import type { components, paths } from '@/types/openapi';
import type { AxiosError } from 'axios';
import { requestReissue } from './reissue';

// 타입 별칭
type LoginRequest = components['schemas']['LoginRequest'];
// emailCode는 이메일 인증(백엔드 저장소 docs/API.md '가입 인증 코드 받기')과 함께 생겼다. 생성된 타입을 다시 만들기 전까지 여기서 더한다
type RegisterRequest = components['schemas']['RegisterRequest'] & { emailCode: string };
type AuthTokenResponse = components['schemas']['AuthTokenResponse'];

/**
 * 로그인이나 가입이 거절됐을 때 던진다. 공통 클라이언트(axios.ts)가 401을 정상 응답으로 넘기므로, 본문의
 * `success: false`를 보고 상태 코드를 붙여 여기서 오류로 바꾼다.
 */
export class AuthRejected extends Error {
  constructor(readonly status: number, message: string) {
    super(message)
    this.name = 'AuthRejected'
  }
}

function rejectedOf(response: unknown): AuthRejected | null {
  const body = response as { success?: boolean; status?: number; message?: string } | null
  if (body && body.success === false) return new AuthRejected(body.status ?? 0, body.message ?? '')
  return null
}

/**
 * 인증 API 클라이언트
 */
export const authApi = {
  /**
   * 로그인
   * @param credentials 로그인 정보 (이메일, 비밀번호)
   * @returns Access Token
   */
  async login(credentials: LoginRequest): Promise<string> {
    try {
      const response = await api.post(
        '/api/v1/auth/login',
        credentials
      ) as AuthTokenResponse;
      const rejected = rejectedOf(response);
      if (rejected) throw rejected;

      const accessToken = response.accessToken;
      if (!accessToken) {
        throw new Error('Access Token이 응답에 포함되지 않았습니다.');
      }

      // Access Token을 Store에 저장
      authStore.getState().setAccessToken(accessToken);

      return accessToken;
    } catch (error) {
      if (error instanceof Error) {
        console.error('[login] 에러:', error.message);
      } else if ((error as AxiosError).response) {
        const axiosError = error as AxiosError;
        console.error('[login] API 에러:', {
          status: axiosError.response?.status,
          data: axiosError.response?.data,
        });
      }
      throw error;
    }
  },

  /**
   * 회원가입
   * @param data 회원가입 정보 (이메일, 비밀번호, 닉네임)
   * @returns Access Token
   */
  /**
   * 가입할 이메일로 여섯 자리 인증 코드를 보낸다 (POST /api/v1/auth/email-code).
   * 이미 가입된 이메일이면 409, 너무 자주 받으면 429, 메일을 보내지 못하면 503으로 실패한다.
   */
  async sendEmailCode(email: string): Promise<void> {
    const response = await api.post('/api/v1/auth/email-code' as keyof paths, { email });
    const rejected = rejectedOf(response);
    if (rejected) throw rejected;
  },

  async register(data: RegisterRequest): Promise<string> {
    try {
      const response = await api.post(
        '/api/v1/auth/register',
        data
      ) as AuthTokenResponse;
      const rejected = rejectedOf(response);
      if (rejected) throw rejected;

      const accessToken = response.accessToken;
      if (!accessToken) {
        throw new Error('Access Token이 응답에 포함되지 않았습니다.');
      }

      // Access Token을 Store에 저장
      authStore.getState().setAccessToken(accessToken);

      return accessToken;
    } catch (error) {
      if (error instanceof Error) {
        console.error('[register] 에러:', error.message);
      } else if ((error as AxiosError).response) {
        const axiosError = error as AxiosError;
        console.error('[register] API 에러:', {
          status: axiosError.response?.status,
          data: axiosError.response?.data,
        });
      }
      throw error;
    }
  },

  /**
   * 토큰 재발급
   * Refresh Token은 HttpOnly Cookie에 있으므로 자동으로 전송됩니다.
   * @returns 새로운 Access Token
   */
  async reissue(): Promise<string> {
    try {
      // Refresh Token은 쿠키로 간다. 겹친 재발급은 한 번으로 모은다(reissue.ts)
      const baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
      const accessToken = await requestReissue(baseURL);

      // 새 Access Token을 Store에 저장
      authStore.getState().setAccessToken(accessToken);

      return accessToken;
    } catch (error) {
      const axiosError = error as AxiosError;
      const status = axiosError.response?.status;

      // 401은 로그인 안 된 상태에서 reissue 시도 시 정상 응답 → 에러 로그 생략
      if (status === 401) {
        authStore.getState().logout();
        throw error;
      }

      if (error instanceof Error) {
        console.error('[reissue] 에러:', error.message);
      } else if (axiosError.response) {
        console.error('[reissue] API 에러:', {
          status,
          data: axiosError.response?.data,
        });
      }
      throw error;
    }
  },

  /**
   * 로그아웃
   * Refresh Token을 무효화하고 로컬 상태를 초기화합니다.
   */
  async logout(): Promise<void> {
    try {
      await api.post('/api/v1/auth/logout');
    } catch (error) {
      console.error('[logout] API 호출 실패:', error);
    } finally {
      // API 호출 성공/실패와 관계없이 로컬 상태 초기화
      authStore.getState().logout();
    }
  },
};
