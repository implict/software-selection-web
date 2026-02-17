# PRD: 학습지원 소프트웨어 선정 웹 서비스

## 1. 개요

### 1.1 목적
양동중학교 교사들이 교과 수업에 사용할 학습지원 소프트웨어를 **온라인으로 신청**하고, 관리자가 **신청 현황을 조회 및 체크리스트를 다운로드**할 수 있는 웹 서비스.

### 1.2 배경
기존에는 Express.js + Python 로컬 서버로 운영되어 외부 접근이 불가능했음.
이를 **Vercel에 무료 배포 가능한 정적 웹앱**으로 전환하여 어디서든 접근 가능하게 함.

### 1.3 사용자
- **교사** (선생님): 소프트웨어를 검색·선택하여 신청
- **관리자** (과학정보부): 신청 현황 조회 및 체크리스트 Excel 다운로드

---

## 2. 기능 요구사항

### 2.1 신청 접수 (Selection View)

| 항목 | 설명 |
|------|------|
| **교사 정보 입력** | 성함(필수), 담당 교과(필수, 드롭다운) |
| **소프트웨어 목록** | 871종 카드 형태로 표시 (이름, 공급자) |
| **카테고리 필터** | 공공(시도포함), AI·디지털 교육자료, 민간(국산/외산) 등 탭 필터 |
| **검색** | 소프트웨어명 또는 공급자명으로 실시간 검색 |
| **선택** | 카드 클릭으로 토글 선택, 선택 수 실시간 표시 |
| **확인 사이드바** | FAB 버튼 클릭 → 선택 목록 슬라이드 패널 확인 → 제출 |
| **중복 제출** | 같은 교사명으로 재제출 시 기존 투표 덮어쓰기 |

### 2.2 현황 조회 (Results View)

| 항목 | 설명 |
|------|------|
| **신청 현황 테이블** | 신청된 소프트웨어를 신청 수 내림차순 정렬 |
| **표시 정보** | 순번, 소프트웨어명, 공급자, 유형, 신청 교과 |
| **참여 인원** | 총 참여 교사 수 표시 |
| **체크리스트 다운로드** | 신청된 소프트웨어만 필터링된 Excel 파일 생성·다운로드 |

### 2.3 체크리스트 다운로드 상세

- 원본 템플릿: `학습지원 소프트웨어 선정기준 체크리스트(에듀집).xlsx`
- **체크리스트에 있는 소프트웨어**: 원본 데이터(기준 충족 여부 등) 그대로 유지
- **체크리스트에 없는 소프트웨어**: 연번, 소프트웨어명, 공급자, 유형만 기입
- 연번 재정렬 포함

---

## 3. 비기능 요구사항

| 항목 | 요구사항 |
|------|---------|
| **호스팅** | Vercel 무료 티어 (정적 사이트) |
| **DB** | Supabase 무료 티어 (PostgreSQL) |
| **응답 속도** | 콜드스타트 없이 즉시 로딩 |
| **접근성** | PC + 모바일 반응형 지원 |
| **인증** | 없음 (학교 내부 공유 링크) |

---

## 4. 기술 스택

| 레이어 | 기술 |
|--------|------|
| **프론트엔드** | React 19 + Vite 7 |
| **스타일링** | Tailwind CSS 4 |
| **데이터베이스** | Supabase (PostgreSQL) |
| **Excel 처리** | ExcelJS (브라우저) |
| **배포** | Vercel |
| **소프트웨어 목록** | 정적 JSON (빌드 시 번들) |

---

## 5. 데이터 모델

### 5.1 소프트웨어 목록 (정적 JSON, 871개)

```json
{
  "id": 1,
  "category": "공공(시도포함)",
  "provider": "한국교육방송공사(EBS)",
  "name": "EBS eBook (APP 서비스)"
}
```

### 5.2 투표 (Supabase `votes` 테이블)

```sql
CREATE TABLE votes (
  id SERIAL PRIMARY KEY,
  teacher_name TEXT NOT NULL,
  subject TEXT NOT NULL,
  selected_ids INTEGER[] NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 6. Supabase 설정

- **Project ID**: `mnkwccongpoybllscqfp`
- **URL**: `https://mnkwccongpoybllscqfp.supabase.co`
- **Anon Key**: `sb_publishable_XROBGpAeQ5OMnTpkExGAtg_Qr3CIX2n`

> [!WARNING]
> 위 키가 Supabase의 표준 anon key 형식(`eyJ...`)과 다릅니다.
> Supabase 대시보드 → Settings → API → **Project API keys** 섹션에서 `anon` `public` 키를 확인해주세요.

---

## 7. 프로젝트 구조

```
software-selection-web/
├── public/
│   └── checklist_template.xlsx     # 체크리스트 원본 템플릿
├── src/
│   ├── data/
│   │   └── software_list.json      # 871개 소프트웨어 목록
│   ├── lib/
│   │   ├── supabase.js             # Supabase 클라이언트
│   │   └── checklist.js            # ExcelJS 체크리스트 생성
│   ├── App.jsx                     # 메인 컴포넌트
│   ├── App.css                     # 컴포넌트 스타일
│   ├── index.css                   # Tailwind import
│   └── main.jsx                    # 엔트리포인트
├── .env.local                      # 환경변수 (Supabase 키)
├── vite.config.js
├── package.json
└── PRD.md
```

---

## 8. 배포 플로우

```mermaid
graph LR
  A[코드 작성 완료] --> B[GitHub Push]
  B --> C[Vercel 연동]
  C --> D[환경변수 설정]
  D --> E["배포 완료 (*.vercel.app)"]
```

---

## 9. 마일스톤

| 단계 | 작업 | 상태 |
|------|------|------|
| 1 | PRD 작성 & 리뷰 | 🔄 진행중 |
| 2 | 프로젝트 초기화 (Vite + 패키지) | ⬜ |
| 3 | 데이터 모듈 & Supabase 연동 | ⬜ |
| 4 | App.jsx 마이그레이션 | ⬜ |
| 5 | 체크리스트 다운로드 (ExcelJS) | ⬜ |
| 6 | 로컬 테스트 | ⬜ |
| 7 | GitHub + Vercel 배포 | ⬜ |
