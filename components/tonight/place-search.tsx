"use client"

import { useId, useRef, useState, type KeyboardEvent } from "react"
import { cleanQuery, MAX_QUERY_LENGTH, providersOf, type FoundPlace } from "@/lib/tonight/geocode"
import { usePlaceSearch } from "@/lib/tonight/use-place-search"
import { CloseIcon, SearchIcon } from "./icons"

interface PlaceSearchProps {
  /** 입력창의 이름. 화면 낭독기가 읽는다 */
  label: string
  placeholder: string
  onSelect: (place: FoundPlace) => void
  /** 찾은 곳이 없을 때 덧붙이는 안내 */
  emptyHint?: string
  className?: string
}

/**
 * 지명 검색창. 입력이 멈추면 찾고, 결과를 눌러 고른다. 화살표와 Enter로도 고를 수 있다.
 */
export function PlaceSearch({ label, placeholder, onSelect, emptyHint, className }: PlaceSearchProps) {
  const [query, setQuery] = useState("")
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listId = useId()
  const search = usePlaceSearch(query)
  const { places } = search
  const typed = cleanQuery(query) !== null
  const showList = open && typed
  const activeIndex = Math.min(active, places.length - 1)
  const providers = providersOf(places)

  const choose = (place: FoundPlace) => {
    onSelect(place)
    setQuery("")
    setOpen(false)
    inputRef.current?.blur()
  }

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    // 한글을 조합하는 중의 Enter는 글자를 확정하는 것이지 고르는 것이 아니다
    if (event.nativeEvent.isComposing) return
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      if (places.length === 0) return
      event.preventDefault()
      setOpen(true)
      const step = event.key === "ArrowDown" ? 1 : -1
      setActive((activeIndex + step + places.length) % places.length)
    } else if (event.key === "Enter") {
      const place = places[activeIndex]
      if (showList && place) {
        event.preventDefault()
        choose(place)
      }
    } else if (event.key === "Escape" && (open || query)) {
      // 시트 안에서 쓸 때 Esc 한 번에 시트까지 닫히지 않게 한다
      event.stopPropagation()
      event.nativeEvent.stopImmediatePropagation()
      if (showList) setOpen(false)
      else setQuery("")
    }
  }

  let note: string | null = null
  if (search.status === "error") note = "지금은 검색할 수 없어요. 잠시 뒤에 다시 해 주세요."
  else if (search.status === "loading" && places.length === 0) note = "찾는 중이에요"
  else if (search.status === "done" && places.length === 0) note = `찾은 곳이 없어요.${emptyHint ? ` ${emptyHint}` : ""}`

  return (
    <div
      className={`psearch${className ? ` ${className}` : ""}`}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false)
      }}
    >
      <div className="psearch-box">
        <SearchIcon />
        <input
          ref={inputRef}
          type="search"
          role="combobox"
          aria-label={label}
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={showList && places[activeIndex] ? `${listId}-${activeIndex}` : undefined}
          value={query}
          maxLength={MAX_QUERY_LENGTH}
          placeholder={placeholder}
          autoComplete="off"
          enterKeyHint="search"
          onChange={(event) => {
            setQuery(event.target.value)
            setActive(0)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
        />
        {query ? (
          <button
            type="button"
            className="psearch-clear"
            aria-label="검색어 지우기"
            onClick={() => {
              setQuery("")
              inputRef.current?.focus()
            }}
          >
            <CloseIcon />
          </button>
        ) : null}
      </div>
      {showList ? (
        <div className="psearch-drop">
          <ul id={listId} role="listbox" aria-label={`${label} 결과`}>
            {places.map((place, index) => (
              <li
                key={`${place.name}/${place.lat}/${place.lon}`}
                id={`${listId}-${index}`}
                role="option"
                aria-selected={index === activeIndex}
                // 누르는 순간 입력창이 초점을 잃어 목록이 먼저 닫히지 않게 한다
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => choose(place)}
                onMouseEnter={() => setActive(index)}
              >
                <b>{place.name}</b>
                {place.address ? <span>{place.address}</span> : null}
              </li>
            ))}
          </ul>
          {note ? (
            <p className="psearch-note" role="status">
              {note}
            </p>
          ) : null}
          {/* 결과가 온 곳을 적는다. 아직 결과가 없을 때는 늘 묻는 OpenStreetMap을 적어 둔다 */}
          <p className="psearch-credit">
            {providers.includes("KAKAO") ? <span>장소 검색 카카오</span> : null}
            {providers.includes("OSM") || providers.length === 0 ? (
              <span>
                지명 ©{" "}
                <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">
                  OpenStreetMap
                </a>{" "}
                contributors
              </span>
            ) : null}
          </p>
        </div>
      ) : null}
    </div>
  )
}
