/**
 * 회원 관련 API
 * 
 * OpenAPI 스펙 기반 타입 안전한 회원 API 클라이언트
 */

import { api } from './client';
import { apiClient } from './axios';
import { AuthRejected } from './auth';
import { authStore, type User } from '@/lib/store/authStore';
import type { paths } from '@/types/openapi';
import type { AxiosError } from 'axios';

/**
 * 회원 API 클라이언트
 */
export const membersApi = {
  /**
   * 내 정보 조회
   * JWT 토큰 인증이 필요합니다.
   * @returns 회원 정보
   */
  async getMe(): Promise<User> {
    try {
      const response = await api.get('/api/v1/members/me') as paths["/api/v1/members/me"]["get"]["responses"]["200"]["content"]["*/*"];

      const user: User = {
        memberId: response.memberId,
        nickname: response.nickname as string,
        ...response,
      };

      // 유저 정보를 Store에 저장
      authStore.getState().setUser(user);

      return user;
    } catch (error) {
      if (error instanceof Error) {
        console.error('[getMe] 에러:', error.message);
      } else if ((error as AxiosError).response) {
        const axiosError = error as AxiosError;
        console.error('[getMe] API 에러:', {
          status: axiosError.response?.status,
          data: axiosError.response?.data,
        });
      }
      throw error;
    }
  },

  /**
   * 닉네임 수정 (PATCH /api/v1/members/me, 백엔드 저장소 docs/API.md "닉네임 수정")
   * 성공하면 Store의 사용자 정보도 바꿔 머리의 이름이 바로 달라진다.
   * 규칙에 어긋나면 400(AxiosError), 로그인이 풀렸으면 401(AuthRejected)로 실패한다.
   * 공통 HTTP 클라이언트는 401을 정상 응답으로 넘기므로 본문의 success로 가린다.
   */
  async updateNickname(nickname: string): Promise<User> {
    const response = await apiClient.patch('/api/v1/members/me', { nickname });
    const body = response.data as { success?: boolean; status?: number; message?: string; data?: { memberId?: number; nickname?: string } };
    if (body?.success === false || !body?.data?.nickname) {
      throw new AuthRejected(body?.status ?? response.status, body?.message ?? '');
    }
    const current = authStore.getState().user;
    const user: User = { ...current, ...body.data, nickname: body.data.nickname };
    authStore.getState().setUser(user);
    return user;
  },

  /**
   * 이메일 중복 검증
   * 회원가입 전 이메일 중복 여부를 확인합니다.
   * @param email 검증할 이메일 주소
   * @returns 검증 결과 (true: 사용 가능, false: 중복됨)
   */
  async validateEmailDuplicated(email: string): Promise<boolean> {
    try {
      const response = await api.get(
        '/api/v1/members/exists/email',
        { email }
      ) as paths["/api/v1/members/exists/email"]["get"]["responses"]["200"]["content"]["*/*"];

      return response.validated ?? false;
    } catch (error) {
      if (error instanceof Error) {
        console.error('[validateEmailDuplicated] 에러:', error.message);
      } else if ((error as AxiosError).response) {
        const axiosError = error as AxiosError;
        console.error('[validateEmailDuplicated] API 에러:', {
          status: axiosError.response?.status,
          data: axiosError.response?.data,
        });
      }
      throw error;
    }
  },
};
