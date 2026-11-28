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
   * 비밀번호 변경 (PATCH /api/v1/members/me/password, 백엔드 저장소 docs/API.md "비밀번호 변경").
   * 다른 기기의 로그인은 끊기고 이 기기는 새 액세스 토큰을 받는다(리프레시 토큰은 쿠키로 바뀐다).
   * 지금 비밀번호가 틀리면 400(AxiosError)으로 실패한다.
   */
  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    const response = await apiClient.patch('/api/v1/members/me/password', { currentPassword, newPassword });
    const body = response.data as { success?: boolean; status?: number; message?: string; data?: { accessToken?: string } };
    if (body?.success === false || !body?.data?.accessToken) {
      throw new AuthRejected(body?.status ?? response.status, body?.message ?? '');
    }
    authStore.getState().setAccessToken(body.data.accessToken);
  },

  /**
   * 이메일 회원의 탈퇴 (DELETE /api/v1/members/me, 백엔드 저장소 docs/API.md "탈퇴").
   * 서버가 리프레시 토큰 쿠키를 비우므로 여기서는 메모리의 로그인만 지운다.
   * 비밀번호가 틀리면 400(AxiosError)으로 실패한다.
   */
  async withdrawWithPassword(password: string): Promise<void> {
    const response = await apiClient.delete('/api/v1/members/me', { data: { password } });
    const body = response.data as { success?: boolean; status?: number; message?: string };
    if (body?.success === false) {
      throw new AuthRejected(body.status ?? response.status, body.message ?? '');
    }
    authStore.getState().logout();
  },

  /**
   * 소셜 회원의 탈퇴 주소 (POST /api/v1/members/me/withdrawal-ticket). 5분 동안 한 번 쓸 수 있다.
   * 브라우저를 이 주소로 보내면 가입한 제공자에 다시 로그인한 뒤 탈퇴하고 첫 화면의 ?withdrawn=1로 돌아온다.
   */
  async withdrawalUrl(): Promise<string> {
    const response = await apiClient.post('/api/v1/members/me/withdrawal-ticket');
    const body = response.data as { success?: boolean; status?: number; message?: string; data?: { authorizationUrl?: string } };
    if (body?.success === false || !body?.data?.authorizationUrl) {
      throw new AuthRejected(body?.status ?? response.status, body?.message ?? '');
    }
    return `${apiClient.defaults.baseURL ?? ''}${body.data.authorizationUrl}`;
  },

  /**
   * 닉네임을 쓸 수 있는지 (GET /api/v1/members/exists/nickname). 다른 회원이 쓰고 있으면 false.
   * 로그인한 채로 물으면 자기 닉네임은 true다. 규칙에 어긋나면 400으로 실패하므로 규칙은 먼저 걸러서 부른다.
   */
  async isNicknameAvailable(nickname: string): Promise<boolean> {
    const response = await api.get('/api/v1/members/exists/nickname' as keyof paths, { nickname }) as { validated?: boolean };
    return response.validated ?? false;
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
