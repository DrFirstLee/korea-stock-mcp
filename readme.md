# Korea Stock MCP Server

한국 주식 시장 데이터를 조회하는 MCP 서버입니다. 네이버 금융 API를 사용하여 실시간 데이터를 제공합니다.

## 특징

✅ **완전 Node.js**: Python 의존성 없음  
✅ **실시간 데이터**: 네이버 금융에서 직접 크롤링  
✅ **간편한 설치**: npx 한 줄로 완료

## 기능

- 📊 **현재가 조회**: 실시간 주가 정보
- 🔍 **종목 검색**: 종목명으로 코드 찾기
- 📈 **차트 데이터**: 일봉 OHLCV 데이터
- 💰 **시가총액 순위**: KOSPI/KOSDAQ 시총 상위 종목
- 📊 **거래량 순위**: 거래 활발한 종목

## 설치

### Claude Desktop 설정

`claude_desktop_config.json`:
```json
{
  "mcpServers": {
    "korea-stock": {
      "command": "npx",
      "args": ["-y", "@drfirst/korea-stock-mcp"]
    }
  }
}
```

## 사용 예시

Claude에게 이렇게 물어보세요:
```
삼성전자 현재가 알려줘
```
```
카카오 종목 코드가 뭐야?
```
```
005930 최근 30일 차트 보여줘
```
```
코스피 시가총액 상위 10개 종목은?
```
```
코스닥 거래량 많은 종목 알려줘
```

## 주요 종목 코드

| 종목명 | 코드 |
|--------|------|
| 삼성전자 | 005930 |
| SK하이닉스 | 000660 |
| 네이버 | 035420 |
| 카카오 | 035720 |
| 삼성바이오로직스 | 207940 |
| LG에너지솔루션 | 373220 |
| 현대차 | 005380 |
| 기아 | 000270 |

## 개발

### 로컬 테스트
```bash
# 의존성 설치
npm install

# 서버 실행
npm start
```

### 배포
```bash
npm login
npm publish --access public
```

## 데이터 출처

네이버 금융 (https://finance.naver.com)

## 라이선스

MIT
```

## 프로젝트 구조
```
korea-stock-mcp/
├── package.json
├── index.js
└── README.md