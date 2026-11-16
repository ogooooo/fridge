# 🧊 우주아라네 냉장고

우주(5살)·아라(만 2세)와 엄마·아빠, 네 가족의 냉장실 · 냉동실 · 실온 재료와 오늘 식단을 한 화면에서 보는 모바일 웹앱입니다.

- 주소: <https://ogooooo.github.io/fridge/>
- 정적 페이지입니다. 빌드 없이 `index.html` + `styles.css` + `app.js` + `data.json` 만으로 동작해요.

## 재료를 바꾸고 싶을 때

`data.json`만 수정해서 커밋하면 사이트에 바로 반영됩니다.

```json
{
  "id": "milk",
  "name": "우유",
  "emoji": "🥛",
  "zone": "냉장",
  "category": "유제품·빵",
  "qty": "1팩 900ml",
  "kids": true,
  "priority": null,
  "expiry": "2026-11-19",
  "note": "아라 아침에"
}
```

| 필드 | 설명 |
| --- | --- |
| `zone` | `냉장` / `냉동` / `실온` — 탭과 카운터가 이 값으로 나뉩니다 |
| `category` | `밀키트` `생선·고기` `유제품·빵` `채소·과일` `곡물·면` `반찬·소스` 중 하나 |
| `kids` | `true`면 “아이 맞춤” 필터와 뱃지가 붙습니다 |
| `priority` | `"소진"`이면 “🔥 우선 소진”으로 잡힙니다 |
| `expiry` | `YYYY-MM-DD`. 3일 안이면 “⏰ 임박”으로 자동 표시(없으면 `null`) |

`updatedAt`을 고치면 상단 “마지막 업데이트”가 바뀝니다. 재료를 다 써서 목록에서 빼려면 항목을 지우거나 앱에서 “다 씀”을 누르면 됩니다(그 기기에서만 숨김).

## data.json 안의 다른 목록

- `todayMenu` — “오늘 뭐 먹지?” 카드(아이 맞춤 / 네 가족)
- `weekPlan` — 주간 식단 탭
- `simpleRecipes` — 간단 식단 탭
- `shopping` — 장보기 목록

## 파일

| 파일 | 역할 |
| --- | --- |
| `index.html` | 화면 뼈대 |
| `styles.css` | 모바일 우선 스타일 |
| `app.js` | `data.json`을 읽어 렌더링, 검색·필터·체크 상태 처리 |
| `data.json` | 재료·식단·장보기 데이터 |
| `.nojekyll` | GitHub Pages에서 Jekyll 처리를 건너뛰기 |
