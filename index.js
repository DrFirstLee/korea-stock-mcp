#!/usr/bin/env node

/**
 * 한국 주식 데이터 MCP 서버 (완전 Node.js)
 * KRX, 네이버 금융 API 사용
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import axios from 'axios';
import * as cheerio from 'cheerio';

/**
 * 네이버 금융에서 종목 정보 조회
 */
async function getStockFromNaver(code) {
  try {
    const url = `https://finance.naver.com/item/main.naver?code=${code}`;
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      timeout: 10000,
    });

    const $ = cheerio.load(response.data);
    
    // 종목명
    const stockName = $('.wrap_company h2 a').text().trim();
    
    // 현재가
    const price = $('.no_today .blind').first().text().trim().replace(/,/g, '');
    
    // 전일대비
    const change = $('.no_exday .blind').first().text().trim().replace(/,/g, '');
    const changeRate = $('.no_exday .blind').eq(1).text().trim();
    
    // 시가/고가/저가
    const todayData = $('.rate_info .blind');
    const open = todayData.eq(0)?.text().trim().replace(/,/g, '') || '0';
    const high = todayData.eq(1)?.text().trim().replace(/,/g, '') || '0';
    const low = todayData.eq(2)?.text().trim().replace(/,/g, '') || '0';
    
    // 거래량
    const volume = $('.rate_info .blind').eq(3)?.text().trim().replace(/,/g, '') || '0';
    
    return {
      code,
      name: stockName,
      price: parseInt(price) || 0,
      change: parseInt(change) || 0,
      changeRate: changeRate || '0%',
      open: parseInt(open) || 0,
      high: parseInt(high) || 0,
      low: parseInt(low) || 0,
      volume: parseInt(volume) || 0,
    };
  } catch (error) {
    throw new Error(`네이버 금융 API 오류: ${error.message}`);
  }
}

/**
 * 네이버 금융에서 종목 검색
 */
async function searchStock(keyword) {
  try {
    const url = `https://finance.naver.com/search/searchList.naver?query=${encodeURIComponent(keyword)}`;
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      timeout: 10000,
    });

    const $ = cheerio.load(response.data);
    const results = [];

    // 검색 결과 파싱
    $('.tltle').each((i, elem) => {
      if (i >= 10) return false; // 최대 10개
      
      const link = $(elem).attr('href');
      if (link && link.includes('code=')) {
        const code = link.match(/code=(\d+)/)?.[1];
        const name = $(elem).text().trim();
        if (code && name) {
          results.push({ code, name });
        }
      }
    });

    return results;
  } catch (error) {
    throw new Error(`종목 검색 오류: ${error.message}`);
  }
}

/**
 * 네이버 금융에서 시가총액 순위 조회
 */
async function getMarketCapRanking(market = 'kospi', limit = 10) {
  try {
    // sosok: 0=코스피, 1=코스닥
    const sosok = market.toLowerCase() === 'kospi' ? '0' : '1';
    const url = `https://finance.naver.com/sise/sise_market_sum.naver?sosok=${sosok}&page=1`;
    
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      timeout: 10000,
    });

    const $ = cheerio.load(response.data);
    const results = [];

    $('table.type_2 tr').each((i, elem) => {
      if (results.length >= limit) return false;
      
      const tds = $(elem).find('td');
      if (tds.length < 2) return;
      
      const rank = $(tds[0]).text().trim();
      const nameElem = $(tds[1]).find('a');
      const name = nameElem.text().trim();
      const href = nameElem.attr('href');
      const code = href?.match(/code=(\d+)/)?.[1];
      
      const price = $(tds[2]).text().trim().replace(/,/g, '');
      const marketCap = $(tds[6]).text().trim();
      
      if (code && name && rank) {
        results.push({
          rank: parseInt(rank),
          code,
          name,
          price: parseInt(price) || 0,
          marketCap,
        });
      }
    });

    return results;
  } catch (error) {
    throw new Error(`시가총액 순위 조회 오류: ${error.message}`);
  }
}

/**
 * 네이버 금융에서 거래량 순위 조회
 */
async function getTradingVolumeRanking(market = 'kospi', limit = 10) {
  try {
    const sosok = market.toLowerCase() === 'kospi' ? '0' : '1';
    const url = `https://finance.naver.com/sise/sise_quant.naver?sosok=${sosok}`;
    
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      timeout: 10000,
    });

    const $ = cheerio.load(response.data);
    const results = [];

    $('table.type_2 tr').each((i, elem) => {
      if (results.length >= limit) return false;
      
      const tds = $(elem).find('td');
      if (tds.length < 2) return;
      
      const rank = $(tds[0]).text().trim();
      const nameElem = $(tds[1]).find('a');
      const name = nameElem.text().trim();
      const href = nameElem.attr('href');
      const code = href?.match(/code=(\d+)/)?.[1];
      
      const price = $(tds[2]).text().trim().replace(/,/g, '');
      const volume = $(tds[5]).text().trim();
      
      if (code && name && rank) {
        results.push({
          rank: parseInt(rank),
          code,
          name,
          price: parseInt(price) || 0,
          volume,
        });
      }
    });

    return results;
  } catch (error) {
    throw new Error(`거래량 순위 조회 오류: ${error.message}`);
  }
}

/**
 * 일봉 데이터 조회 (최근 데이터)
 */
async function getOHLCV(code, days = 30) {
  try {
    // 네이버 금융 차트 API (비공식)
    const url = `https://fchart.stock.naver.com/sise.nhn?symbol=${code}&timeframe=day&count=${days}&requestType=0`;
    
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Referer': 'https://finance.naver.com/',
      },
      timeout: 10000,
    });

    // XML 파싱
    const $ = cheerio.load(response.data, { xmlMode: true });
    const items = [];

    $('item').each((i, elem) => {
      const data = $(elem).attr('data');
      if (data) {
        const [date, open, high, low, close, volume] = data.split('|');
        items.push({
          date: date?.substring(0, 8),
          open: parseInt(open) || 0,
          high: parseInt(high) || 0,
          low: parseInt(low) || 0,
          close: parseInt(close) || 0,
          volume: parseInt(volume) || 0,
        });
      }
    });

    return items;
  } catch (error) {
    throw new Error(`차트 데이터 조회 오류: ${error.message}`);
  }
}

/**
 * MCP 서버 초기화 및 실행
 */
async function main() {
  const server = new Server(
    {
      name: 'korea-stock-server',
      version: '1.0.0',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // 도구 목록
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        {
          name: 'get_stock_price',
          description: '특정 종목의 현재가 정보를 조회합니다. 6자리 종목 코드를 입력하세요.',
          inputSchema: {
            type: 'object',
            properties: {
              code: {
                type: 'string',
                description: '종목 코드 (6자리, 예: 005930=삼성전자)',
              },
            },
            required: ['code'],
          },
        },
        {
          name: 'search_stock',
          description: '종목명으로 종목 코드를 검색합니다.',
          inputSchema: {
            type: 'object',
            properties: {
              keyword: {
                type: 'string',
                description: '검색할 종목명 (예: 삼성전자, 카카오)',
              },
            },
            required: ['keyword'],
          },
        },
        {
          name: 'get_stock_chart',
          description: '특정 종목의 일봉 차트 데이터를 조회합니다.',
          inputSchema: {
            type: 'object',
            properties: {
              code: {
                type: 'string',
                description: '종목 코드 (6자리)',
              },
              days: {
                type: 'integer',
                description: '조회할 일수 (기본값: 30일)',
                default: 30,
              },
            },
            required: ['code'],
          },
        },
        {
          name: 'get_market_cap',
          description: '시가총액 순위를 조회합니다.',
          inputSchema: {
            type: 'object',
            properties: {
              market: {
                type: 'string',
                description: '시장 (kospi 또는 kosdaq)',
                enum: ['kospi', 'kosdaq'],
                default: 'kospi',
              },
              limit: {
                type: 'integer',
                description: '조회할 종목 수 (기본값: 10)',
                default: 10,
              },
            },
          },
        },
        {
          name: 'get_trading_volume',
          description: '거래량 순위를 조회합니다.',
          inputSchema: {
            type: 'object',
            properties: {
              market: {
                type: 'string',
                description: '시장 (kospi 또는 kosdaq)',
                enum: ['kospi', 'kosdaq'],
                default: 'kospi',
              },
              limit: {
                type: 'integer',
                description: '조회할 종목 수 (기본값: 10)',
                default: 10,
              },
            },
          },
        },
      ],
    };
  });

  // 도구 실행
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      switch (name) {
        case 'get_stock_price': {
          const code = args?.code;
          if (!code || code.length !== 6) {
            throw new Error('6자리 종목 코드를 입력해주세요 (예: 005930)');
          }

          const stock = await getStockFromNaver(code);
          
          let text = `📊 ${stock.name} (${stock.code})\n\n`;
          text += `현재가: ${stock.price.toLocaleString()}원\n`;
          text += `전일대비: ${stock.change >= 0 ? '+' : ''}${stock.change.toLocaleString()}원 (${stock.changeRate})\n`;
          text += `시가: ${stock.open.toLocaleString()}원\n`;
          text += `고가: ${stock.high.toLocaleString()}원\n`;
          text += `저가: ${stock.low.toLocaleString()}원\n`;
          text += `거래량: ${stock.volume.toLocaleString()}주\n`;

          return {
            content: [{ type: 'text', text }],
          };
        }

        case 'search_stock': {
          const keyword = args?.keyword;
          if (!keyword) {
            throw new Error('검색할 종목명을 입력해주세요');
          }

          const results = await searchStock(keyword);
          
          if (results.length === 0) {
            return {
              content: [{ 
                type: 'text', 
                text: `❌ '${keyword}'와 일치하는 종목을 찾을 수 없습니다.` 
              }],
            };
          }

          let text = `🔍 '${keyword}' 검색 결과\n\n`;
          results.forEach(({ code, name }) => {
            text += `${code}: ${name}\n`;
          });

          return {
            content: [{ type: 'text', text }],
          };
        }

        case 'get_stock_chart': {
          const code = args?.code;
          const days = args?.days || 30;

          if (!code || code.length !== 6) {
            throw new Error('6자리 종목 코드를 입력해주세요');
          }

          const data = await getOHLCV(code, days);
          
          if (data.length === 0) {
            throw new Error('차트 데이터를 가져올 수 없습니다');
          }

          // 최근 5일만 표시
          const recent = data.slice(-5);
          
          let text = `📈 ${code} 일봉 차트 (최근 ${days}일 중 최근 5일)\n\n`;
          text += '날짜     | 시가   | 고가   | 저가   | 종가   | 거래량\n';
          text += '-'.repeat(60) + '\n';
          
          recent.forEach(({ date, open, high, low, close, volume }) => {
            const formattedDate = `${date.slice(0,4)}-${date.slice(4,6)}-${date.slice(6,8)}`;
            text += `${formattedDate} | ${open.toLocaleString().padStart(6)} | ${high.toLocaleString().padStart(6)} | ${low.toLocaleString().padStart(6)} | ${close.toLocaleString().padStart(6)} | ${volume.toLocaleString()}\n`;
          });

          return {
            content: [{ type: 'text', text }],
          };
        }

        case 'get_market_cap': {
          const market = args?.market || 'kospi';
          const limit = args?.limit || 10;

          const results = await getMarketCapRanking(market, limit);
          
          let text = `💰 ${market.toUpperCase()} 시가총액 순위 (상위 ${limit}개)\n\n`;
          text += '순위 | 종목코드 | 종목명              | 현재가      | 시가총액\n';
          text += '-'.repeat(70) + '\n';
          
          results.forEach(({ rank, code, name, price, marketCap }) => {
            text += `${rank.toString().padStart(3)} | ${code} | ${name.padEnd(18)} | ${price.toLocaleString().padStart(9)} | ${marketCap}\n`;
          });

          return {
            content: [{ type: 'text', text }],
          };
        }

        case 'get_trading_volume': {
          const market = args?.market || 'kospi';
          const limit = args?.limit || 10;

          const results = await getTradingVolumeRanking(market, limit);
          
          let text = `📊 ${market.toUpperCase()} 거래량 순위 (상위 ${limit}개)\n\n`;
          text += '순위 | 종목코드 | 종목명              | 현재가      | 거래량\n';
          text += '-'.repeat(70) + '\n';
          
          results.forEach(({ rank, code, name, price, volume }) => {
            text += `${rank.toString().padStart(3)} | ${code} | ${name.padEnd(18)} | ${price.toLocaleString().padStart(9)} | ${volume}\n`;
          });

          return {
            content: [{ type: 'text', text }],
          };
        }

        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `❌ 오류 발생: ${error.message}`,
          },
        ],
        isError: true,
      };
    }
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error('Korea Stock MCP Server running on stdio');
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});