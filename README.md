# 타닥타닥 우리반 (TADAK TADAK CLASS)

중학교 1학년이 수업 전 5~10분 동안 한글 → 영타 → 기호 → 코드 타자를 연습하고,
**속도가 아니라 성장**으로 반이 함께 보상받는 레트로 픽셀 타자 게임입니다.

- 결정 사항 모음: [CLAUDE.md](CLAUDE.md)
- 기획서: [docs/PRD.md](docs/PRD.md)
- 디자인 규칙: [DESIGN.md](DESIGN.md)

## 내 컴퓨터에서 실행하기

처음 한 번만 필요한 것: [Node.js](https://nodejs.org) (LTS 버전)

VS Code에서 터미널(`` Ctrl + ` ``)을 열고 아래를 차례로 입력합니다.

```bash
npm install     # 처음 한 번, 또는 package.json이 바뀌었을 때
npm run dev     # 개발 서버 켜기
```

브라우저에서 <http://localhost:3000> 을 열면 화면이 보입니다.
코드를 저장하면 화면이 자동으로 바뀝니다. 서버를 끌 때는 터미널에서 `Ctrl + C`.

## 확인용 명령어

| 명령어 | 하는 일 |
| --- | --- |
| `npm run lint` | 코드 규칙 검사 |
| `npm run build` | 배포용으로 빌드해 보기 (오류가 없으면 Vercel에도 올라감) |

## 기술 스택

Next.js 16 (App Router, TypeScript) · Tailwind CSS v4 · Supabase · Vercel

## 폰트

네 폰트 모두 SIL Open Font License 1.1이며, 라이선스 전문은 `public/fonts/LICENSE-*.txt`에 있습니다.
Neo둥근모 · 갈무리11 · D2Coding · Pretendard
