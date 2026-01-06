# 🎨 FRONTEND_STEP1: 프로젝트 세팅 및 레이아웃 구현

## 1. 초기 세팅
- `npx create-next-app@latest our-space` 실행 (TypeScript, Tailwind, App Router 사용)
- `npm install @supabase/auth-helpers-nextjs @supabase/supabase-js lucide-react date-fns` 설치
- `shadcn/ui` 초기화 및 Card, Button, Input 컴포넌트 추가

## 2. 주요 페이지 구성
- **(root)/layout.tsx**: 전역 상태 관리 및 사이드바 내비게이션 레이아웃
- **(auth)/login/page.tsx**: Supabase Auth 기반 이메일 로그인 화면
- **(dashboard)/page.tsx**: 메인 대시보드 뼈대 (출퇴근 상태 카드 포함)

## 3. 환경 변수 연결
`.env.local` 파일에 Supabase Project URL과 Anon Key를 연결합니다.