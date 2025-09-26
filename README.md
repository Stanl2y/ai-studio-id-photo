<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1ULcMgcI2S63xUckc0q_hthoedyhpoDUF

## 로컬 실행 방법

**사전 준비:** Node.js (v18 이상 권장)

### 1. 프로젝트 설정

```bash
npm install
```

### 2. 환경 변수 구성

`server/index.js`는 루트 디렉터리의 `.env` 파일을 읽어옵니다.

> 참고: `.env.example`을 복사해 필요 값으로 채우세요.

```
# .env
GEMINI_API_KEY=구글_Gemini_API_키
# 선택: 여러 주소를 허용할 땐 콤마로 구분
CLIENT_ORIGIN=http://localhost:5173
PORT=3000
```

프런트엔드(Vite)는 `.env.local`을 사용합니다.

> 참고: `.env.local.example`을 복사해 사용하면 편합니다.

```
# .env.local
VITE_API_BASE_URL=http://localhost:3000
```

### 3. 개발 서버 실행

백엔드와 프런트를 각각 실행합니다.

```bash
# 터미널 1: Gemini 백엔드 API
npm run server

# 터미널 2: 프런트엔드(Vite)
npm run dev
```

브라우저에서 `http://localhost:5173`을 열면 됩니다. 프런트는 `VITE_API_BASE_URL`을 통해 백엔드 `/api/generate` 엔드포인트를 호출합니다.
