"use client"

import { create } from "zustand"
import { persist } from "zustand/middleware"
import { DEFAULT_SETTINGS, parseSettings, type Settings } from "./settings"

interface SettingsState extends Settings {
  /** localStorage에서 읽어 오기 전에는 false다. 읽기 전에 추천을 요청하면 기본값으로 한 번 더 부르게 된다. */
  hydrated: boolean
  update: (patch: Partial<Settings>) => void
}

/**
 * 설정 저장소. 서버 렌더링 결과와 어긋나지 않도록 자동으로 읽지 않고, 화면이 뜬 뒤 `rehydrate()`로 읽는다.
 */
export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      ...DEFAULT_SETTINGS,
      hydrated: false,
      update: (patch) => set(patch),
    }),
    {
      name: "byeolbolil-settings",
      version: 1,
      skipHydration: true,
      partialize: ({ viewMode, preferBefore, maxTravelMinutes, minClearHours, redScreen, origin }): Settings => ({
        viewMode,
        preferBefore,
        maxTravelMinutes,
        minClearHours,
        redScreen,
        origin,
      }),
      merge: (persisted, current) => ({ ...current, ...parseSettings(persisted) }),
      onRehydrateStorage: () => () => {
        useSettings.setState({ hydrated: true })
      },
    },
  ),
)

/** 설정 값만 골라낸다. */
export function settingsOf(state: SettingsState): Settings {
  const { viewMode, preferBefore, maxTravelMinutes, minClearHours, redScreen, origin } = state
  return { viewMode, preferBefore, maxTravelMinutes, minClearHours, redScreen, origin }
}
