import { Chess } from 'chess.js';
import { v4 as uuidv4 } from 'uuid';

// 匯入 Durable Objects 類別
import { GameRoom } from './durable-objects/GameRoom.js';
import { Lobby } from './durable-objects/Lobby.js';

// 匯出 Durable Objects 類別
export { GameRoom, Lobby };

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    // 暫時禁用 WebSocket 升級請求
    // if (request.headers.get('upgrade') === 'websocket') {
    //   return handleWebSocketUpgrade(request, env);
    // }

    // CORS 設定
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      });
    }

    try {
      // API 路由
      switch (path) {
        case '/api/auth/login':
          return handleLogin(request, env);
        case '/api/auth/register':
          return handleRegister(request, env);
        case '/api/lobby/rooms':
          return handleGetRooms(request, env);
        case '/api/lobby/create-room':
          return handleCreateRoom(request, env);
        case '/api/game/join':
          return handleJoinGame(request, env);
        case '/api/game/move':
          return handleMakeMove(request, env);
        case '/api/game/ai-suggest':
          return handleAISuggest(request, env);
        case '/api/game/ai-opponent':
          return handleAIOpponent(request, env);
        case '/api/game/add-ai-opponent':
          return handleAddAIOpponent(request, env);
        case '/api/game/start':
          return handleStartGame(request, env);
        case '/api/game/leave':
          return handleLeaveGame(request, env);
        case '/api/game/status':
          return handleGameStatus(request, env);
        case '/api/game/heartbeat':
          return handleHeartbeat(request, env);
        case '/api/game/resign':
          return handleResign(request, env);
        case '/api/game/offer-draw':
          return handleOfferDraw(request, env);
        case '/api/game/accept-draw':
          return handleAcceptDraw(request, env);
        case '/api/game/rematch':
          return handleRematch(request, env);
        case '/api/game/accept-rematch':
          return handleAcceptRematch(request, env);
        case '/api/game/chat':
          return handleChat(request, env);
        case '/api/game/report':
          return handleGameReport(request, env);
        case '/api/admin/rooms':
          return handleAdminRooms(request, env);
        case '/api/admin/force-close-room':
          return handleForceCloseRoom(request, env);
        default:
          // 處理靜態檔案
          if (path.startsWith('/static/')) {
            return serveStaticFile(path, env);
          }
          // 回傳前端 HTML
          return await serveFrontend(env);
      }
    } catch (error) {
      console.error('Error:', error);
      return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  },

};

// 處理登入
async function handleLogin(request, env) {
  // 只允許 POST 方法
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  
  try {
    const { username, password } = await request.json();
    
    console.log('Login request:', { username, password: password ? '***' : 'undefined' });
    
    if (!username || !password) {
      return new Response(JSON.stringify({ error: '請輸入使用者名稱和密碼' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    // 檢查用戶是否存在
    const users = await env.USERS.list();
    console.log('All user keys:', users.keys.map(k => k.name));
    
    let existingUser = null;
    
    for (const key of users.keys) {
      console.log('Checking key:', key.name);
      const userData = await env.USERS.get(key.name);
      if (userData) {
        const user = JSON.parse(userData);
        console.log('Found user:', { id: user.id, username: user.username });
        if (user.username === username) {
          existingUser = user;
          console.log('Matched user:', existingUser);
          break;
        }
      } else {
        console.log('No data for key:', key.name);
      }
    }
    
    if (!existingUser) {
      console.log('User not found:', username);
      return new Response(JSON.stringify({ error: '使用者不存在，請先註冊' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    // 簡化的密碼驗證（實際應用中應該使用加密）
    if (existingUser.password !== password) {
      console.log('Password mismatch for user:', username);
      return new Response(JSON.stringify({ error: '密碼錯誤' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    console.log('Password verified for user:', username);
    
    // 生成新的 token
    const token = uuidv4();
    
    // 更新用戶的 token
    existingUser.lastLogin = new Date().toISOString();
    existingUser.token = token;
    
    // 更新用戶資料
    await env.USERS.put(existingUser.id, JSON.stringify(existingUser));
    console.log('Updated user data for:', username);
    
    return new Response(JSON.stringify({ 
      success: true, 
      user: {
        id: existingUser.id,
        username: existingUser.username,
        createdAt: existingUser.createdAt,
        lastLogin: existingUser.lastLogin
      },
      token: token
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
    
  } catch (error) {
    console.error('Login error:', error);
    return new Response(JSON.stringify({ error: '登入處理失敗' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// 處理註冊
async function handleRegister(request, env) {
  // 只允許 POST 方法
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  
  try {
    const { username, password, confirmPassword } = await request.json();
    
    console.log('Register request:', { username, password: password ? '***' : 'undefined', confirmPassword: confirmPassword ? '***' : 'undefined' });
    
    if (!username || !password || !confirmPassword) {
      return new Response(JSON.stringify({ error: '請填寫所有欄位' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    if (password !== confirmPassword) {
      return new Response(JSON.stringify({ error: '密碼確認不匹配' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    if (username.length < 3) {
      return new Response(JSON.stringify({ error: '使用者名稱至少需要3個字元' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    if (password.length < 6) {
      return new Response(JSON.stringify({ error: '密碼至少需要6個字元' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    // 檢查用戶名是否已存在
    const users = await env.USERS.list();
    console.log('Existing users:', users.keys.map(k => k.name));
    
    for (const key of users.keys) {
      const userData = await env.USERS.get(key.name);
      if (userData) {
        const user = JSON.parse(userData);
        console.log('Checking user:', user.username, 'against:', username);
        if (user.username === username) {
          return new Response(JSON.stringify({ error: '使用者名稱已存在' }), {
            status: 409,
            headers: { 'Content-Type': 'application/json' },
          });
        }
      }
    }
    
    // 創建新用戶
    const userId = uuidv4();
    const user = {
      id: userId,
      username,
      password, // 實際應用中應該加密
      createdAt: new Date().toISOString(),
      lastLogin: null,
      token: null
    };
    
    console.log('Creating new user:', { id: userId, username, createdAt: user.createdAt });
    
    // 儲存到 KV
    await env.USERS.put(userId, JSON.stringify(user));
    
    // 驗證儲存是否成功
    const savedUser = await env.USERS.get(userId);
    console.log('Saved user verification:', savedUser ? 'SUCCESS' : 'FAILED');
    
    return new Response(JSON.stringify({ 
      success: true, 
      message: '註冊成功！請登入',
      user: {
        id: user.id,
        username: user.username,
        createdAt: user.createdAt
      }
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
    
  } catch (error) {
    console.error('Register error:', error);
    return new Response(JSON.stringify({ error: '註冊處理失敗' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// 處理獲取房間列表
async function handleGetRooms(request, env) {
  // 只允許 GET 方法
  if (request.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  
  try {
    // 從 KV 儲存中獲取所有房間
    const games = await env.GAMES.list();
    const rooms = [];
    
    for (const key of games.keys) {
      const roomData = await env.GAMES.get(key.name);
      if (roomData) {
        const room = JSON.parse(roomData);
        // 只返回公開的房間資訊
        rooms.push({
          id: room.id,
          name: room.name,
          hostUsername: room.hostUsername || 'Unknown',
          rules: room.rules || 'Standard',
          allowSpectators: room.allowSpectators || false,
          allowAI: room.allowAI || false,
                     playerCount: room.players ? room.players.filter(p => p.isActive !== false).length : 0,
          status: room.status || 'waiting',
          createdAt: room.createdAt
        });
      }
    }
    
    // 按創建時間排序，最新的在前面
    rooms.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    return new Response(JSON.stringify({ 
      success: true,
      rooms: rooms 
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
    
  } catch (error) {
    console.error('Get rooms error:', error);
    return new Response(JSON.stringify({ error: '獲取房間列表失敗' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// 處理建立房間
async function handleCreateRoom(request, env) {
  // 只允許 POST 方法
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  
  try {
    const { name, rules, allowSpectators, allowAI, hostUserId, hostUsername } = await request.json();
    
    if (!name || !hostUserId || !hostUsername) {
      return new Response(JSON.stringify({ error: '缺少必要資訊' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    if (name.length < 2) {
      return new Response(JSON.stringify({ error: '房間名稱至少需要2個字元' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    // 檢查房間名稱是否已存在
    const games = await env.GAMES.list();
    for (const key of games.keys) {
      const roomData = await env.GAMES.get(key.name);
      if (roomData) {
        const room = JSON.parse(roomData);
        if (room.name === name) {
          return new Response(JSON.stringify({ error: '房間名稱已存在' }), {
            status: 409,
            headers: { 'Content-Type': 'application/json' },
          });
        }
      }
    }
    
    const roomId = uuidv4();
    const room = {
      id: roomId,
      name,
      host: hostUserId,
      hostUsername,
      rules: rules || 'Standard',
      allowSpectators: allowSpectators || false,
      allowAI: allowAI || false,
      createdAt: new Date().toISOString(),
      players: [{
        id: hostUserId,
        username: hostUsername,
        role: 'host',
        color: 'white',
        isActive: true,
        lastSeen: new Date().toISOString()
      }],
      spectators: [],
      status: 'waiting',
      maxPlayers: 2,
      fen: null,
      moves: []
    };
    
    await env.GAMES.put(roomId, JSON.stringify(room));
    
    return new Response(JSON.stringify({ 
      success: true, 
      room: room
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
    
  } catch (error) {
    console.error('Create room error:', error);
    return new Response(JSON.stringify({ error: '建立房間失敗' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// 處理加入遊戲
async function handleJoinGame(request, env) {
  // 只允許 POST 方法
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  
  try {
    const { roomId, userId, username, role } = await request.json();
    
    if (!roomId || !userId || !username || !role) {
      return new Response(JSON.stringify({ error: '缺少必要資訊' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    // 驗證用戶是否存在
    const userData = await env.USERS.get(userId);
    if (!userData) {
      return new Response(JSON.stringify({ error: '用戶不存在' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    const roomData = await env.GAMES.get(roomId);
    if (!roomData) {
      return new Response(JSON.stringify({ error: '房間不存在' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    const room = JSON.parse(roomData);
    
    // 檢查房間狀態
    if (room.status === 'playing') {
      return new Response(JSON.stringify({ error: '遊戲已開始，無法加入' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    // 檢查用戶是否已在房間中，但允許重新加入（可能是中斷連線後重新連接）
    const existingPlayer = room.players.find(p => p.id === userId);
    const existingSpectator = room.spectators.find(s => s.id === userId);
    
    if (existingPlayer) {
      // 如果用戶是玩家，檢查是否為活躍狀態
      if (existingPlayer.isActive !== false) {
        // 更新用戶的連線狀態為活躍
        existingPlayer.isActive = true;
        existingPlayer.lastSeen = new Date().toISOString();
        await env.GAMES.put(roomId, JSON.stringify(room));
        
        return new Response(JSON.stringify({ 
          success: true, 
          room: room,
          message: '重新連接到房間'
        }), {
          headers: { 'Content-Type': 'application/json' },
        });
      }
    } else if (existingSpectator) {
      // 如果用戶是觀戰者，檢查是否為活躍狀態
      if (existingSpectator.isActive !== false) {
        // 更新用戶的連線狀態為活躍
        existingSpectator.isActive = true;
        existingSpectator.lastSeen = new Date().toISOString();
        await env.GAMES.put(roomId, JSON.stringify(room));
        
        return new Response(JSON.stringify({ 
          success: true, 
          room: room,
          message: '重新連接到觀戰'
        }), {
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }
    
    if (role === 'player') {
      // 只計算人類玩家，不包括 AI 對手
      const humanPlayers = room.players.filter(p => p.role !== 'ai');
      if (humanPlayers.length >= room.maxPlayers) {
        return new Response(JSON.stringify({ error: '房間已滿' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      
      // 分配顏色（只考慮人類玩家）
      const playerColor = humanPlayers.length === 0 ? 'white' : 'black';
             room.players.push({ 
         id: userId, 
         username, 
         role: 'player', 
         color: playerColor,
         joinedAt: new Date().toISOString(),
         isActive: true,
         lastSeen: new Date().toISOString()
       });
      
      // 房間狀態保持為 waiting，直到手動開始遊戲
      // 不自動更改狀態，讓用戶手動開始遊戲
      
    } else if (role === 'spectator') {
      if (!room.allowSpectators) {
        return new Response(JSON.stringify({ error: '此房間不允許觀戰' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      
             room.spectators.push({
         id: userId,
         username,
         joinedAt: new Date().toISOString(),
         isActive: true,
         lastSeen: new Date().toISOString()
       });
    }
    
    // 更新房間資訊
    await env.GAMES.put(roomId, JSON.stringify(room));
    
    return new Response(JSON.stringify({ 
      success: true, 
      room: room
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
    
  } catch (error) {
    console.error('Join game error:', error);
    return new Response(JSON.stringify({ error: '加入遊戲失敗' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// 處理走子
async function handleMakeMove(request, env) {
  // 只允許 POST 方法
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  
  try {
    const { roomId, userId, move } = await request.json();
    
    if (!roomId || !userId || !move) {
      return new Response(JSON.stringify({ error: '缺少必要資訊' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    const roomData = await env.GAMES.get(roomId);
    if (!roomData) {
      return new Response(JSON.stringify({ error: '房間不存在' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    const room = JSON.parse(roomData);
    
    // 檢查遊戲是否已開始
    if (room.status !== 'playing') {
      return new Response(JSON.stringify({ error: '遊戲尚未開始' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    // 檢查用戶是否為玩家
    const player = room.players.find(p => p.id === userId);
    if (!player) {
      return new Response(JSON.stringify({ error: '您不是此房間的玩家' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    // 檢查是否為該玩家的回合
    if (!room.fen) {
      // 遊戲剛開始，初始化棋局
      room.fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
      room.moves = [];
    }
    
    const chess = new Chess(room.fen);
    
    // 檢查是否為該玩家的回合
    const currentTurn = chess.turn() === 'w' ? 'white' : 'black';
    if (player.color !== currentTurn) {
      return new Response(JSON.stringify({ error: '不是您的回合' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    try {
      let result;
      
      // 檢查移動格式並處理
      if (typeof move === 'string') {
        // SAN 格式移動 (如 "Nxe5", "e4")
        result = chess.move(move);
      } else if (move.from && move.to) {
        // 坐標格式移動 (如 {from: "g8", to: "e5"})
        result = chess.move(move);
      } else {
        throw new Error('無效的移動格式');
      }
      
      if (result) {
        // 更新棋鐘時間
        if (room.clock && room.clock.isRunning) {
          const now = new Date();
          const lastUpdate = new Date(room.clock.lastUpdate);
          const timeElapsed = Math.floor((now - lastUpdate) / 1000);
          
          // 從當前玩家的時間中減去經過的時間
          if (room.clock.activePlayer === player.color) {
            room.clock[player.color] = Math.max(0, room.clock[player.color] - timeElapsed);
          }
          
          // 切換到對方玩家
          room.clock.activePlayer = player.color === 'white' ? 'black' : 'white';
          room.clock.lastUpdate = now.toISOString();
          
          // 檢查是否有玩家時間用完
          if (room.clock[player.color] <= 0) {
            room.status = 'finished';
            room.winner = player.color === 'white' ? 'black' : 'white';
            room.endReason = 'timeout';
            room.clock.isRunning = false;
          }
        }
        
        // 更新房間狀態
        room.fen = chess.fen();
        room.moves.push({
          move: result.san,
          fen: chess.fen(),
          timestamp: new Date().toISOString(),
          player: userId,
          playerColor: player.color
        });
        
        // 檢查遊戲狀態
        if (chess.isCheckmate()) {
          room.status = 'finished';
          room.winner = player.color;
          room.endReason = 'checkmate';
          room.finishedAt = new Date().toISOString();
          if (room.clock) room.clock.isRunning = false;
        } else if (chess.isDraw()) {
          room.status = 'finished';
          room.winner = null;
          room.endReason = 'draw';
          room.finishedAt = new Date().toISOString();
          if (room.clock) room.clock.isRunning = false;
        } else if (chess.isCheck()) {
          room.endReason = 'check';
        }
        
        await env.GAMES.put(roomId, JSON.stringify(room));
        
        // 如果遊戲結束，設置延遲關閉房間
        if (room.status === 'finished') {
          await scheduleRoomClosure(roomId, env);
        }
        
        return new Response(JSON.stringify({ 
          success: true, 
          move: result,
          fen: chess.fen(),
          isCheck: chess.isCheck(),
          isCheckmate: chess.isCheckmate(),
          isDraw: chess.isDraw(),
          gameStatus: room.status,
          clock: room.clock
        }), {
          headers: { 'Content-Type': 'application/json' },
        });
      } else {
        return new Response(JSON.stringify({ error: '無效的移動' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    } catch (error) {
      return new Response(JSON.stringify({ error: '無效的移動格式' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
  } catch (error) {
    console.error('Make move error:', error);
    return new Response(JSON.stringify({ error: '移動處理失敗' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// 處理 AI 建議
async function handleAISuggest(request, env) {
  // 只允許 POST 方法
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  
  try {
    const { fen, level = 2 } = await request.json();
    
    if (!fen) {
      return new Response(JSON.stringify({ error: '缺少棋局資訊' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    const response = await env.AI.run('@cf/openai/gpt-oss-120b', {
      input: `你是一個專業的西洋棋 AI 助手。請分析以下棋局並提供建議。

當前棋局 FEN: ${fen}
分析等級: ${level}

請根據等級提供建議：
- 等級 1：快速回應，提供最佳著法
- 等級 2：2-3個候選著法，簡要說明
- 等級 3：最佳著法 + 戰術提示 + 位置分析

重要：你必須嚴格按照以下 JSON 格式回應，不要包含任何其他文字或格式：

{
  "bestMove": "最佳著法 (使用坐標格式，如 e2-e4, b8-c6, f1xc4)",
  "alternativeMoves": ["替代著法1", "替代著法2"],
  "hint": "戰術提示或建議",
  "positionSummary": "位置評估總結"
}

移動格式規則 (坐標格式 - Coordinate Notation)：
1. 基本移動：e2-e4, d7-d5, h2-h3
2. 吃子移動：e4xd5 (e4兵吃d5), d7xe6 (d7兵吃e6)
3. 棋子移動：b8-c6 (馬從b8到c6), f1-c4 (象從f1到c4)
4. 棋子吃子：f6xe4 (馬從f6吃e4), f1xc5 (象從f1吃c5)
5. 王車易位：e1-g1 (短易位), e8-c8 (長易位)
6. 升變：d7-d8=Q (兵從d7升變為后), f7-f8=N (兵從f7升變為馬)
7. 將軍：f3-h4+ (馬將軍), h5-h8# (后將死)

坐標格式優勢：
- 完全避免歧義，每個移動都有明確的起始和目標位置
- 格式統一：起始位置-目標位置 或 起始位置x目標位置
- 吃子使用 'x' 符號，非吃子使用 '-' 符號
- 升變在目標位置後加上 =棋子類型

重要規則：
- 王不能移動到被攻擊的格子（會被將軍）
- 王不能吃掉被保護的棋子
- 移動後不能讓自己的王被將軍
- 所有移動必須符合西洋棋規則
- 優先考慮防守和安全的移動

注意：
1. 移動格式必須使用標準代數記法 (SAN)
2. 當存在歧義時，必須使用文件或行提示來區分
3. 所有移動必須是合法的西洋棋移動
4. 回應必須是有效的 JSON 格式
5. 不要包含任何 markdown 格式或額外文字
6. 確保所有字符串都用雙引號包圍`,
      reasoning: {
        effort: level === 1 ? 'low' : level === 2 ? 'medium' : 'high',
        summary: 'concise'
      }
    });
    
    // 解析 AI 回應
    let aiResponse;
    try {
      console.log('AI response structure:', JSON.stringify(response, null, 2));
      
      // 檢查回應結構並提取 JSON 內容
      let jsonText;
      if (response && response.output && response.output.length > 1) {
        // 從 output[1].content[0].text 中提取 JSON
        jsonText = response.output[1].content[0].text;
      } else if (typeof response === 'string') {
        jsonText = response;
      } else {
        jsonText = JSON.stringify(response);
      }
      
      console.log('Extracted JSON text:', jsonText);
      
      // 清理 JSON 文本，移除可能的 markdown 格式
      jsonText = jsonText.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
      
      // 嘗試解析 JSON
      aiResponse = JSON.parse(jsonText);
      
      // 驗證必要字段
      if (!aiResponse.bestMove) {
        throw new Error('Missing bestMove field');
      }
      
      // 確保數組字段存在
      if (!Array.isArray(aiResponse.alternativeMoves)) {
        aiResponse.alternativeMoves = [];
      }
      
      console.log('Successfully parsed AI response:', aiResponse);
      
    } catch (parseError) {
      console.error('AI response parse error:', parseError);
      console.error('Raw response:', response);
      console.error('Extracted text:', jsonText);
      
      // 如果解析失敗，創建基本回應
      aiResponse = {
        bestMove: "無法解析 AI 回應",
        alternativeMoves: [],
        hint: "請嘗試重新請求",
        positionSummary: "AI 回應格式錯誤"
      };
    }
    
    return new Response(JSON.stringify({ 
      success: true, 
      suggestion: aiResponse 
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('AI suggest error:', error);
    return new Response(JSON.stringify({ error: 'AI 建議服務暫時無法使用' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// 處理添加 AI 對手
async function handleAddAIOpponent(request, env) {
  // 只允許 POST 方法
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  
  try {
    const { roomId, aiLevel = 2 } = await request.json();
    
    if (!roomId) {
      return new Response(JSON.stringify({ error: '缺少房間資訊' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    const roomData = await env.GAMES.get(roomId);
    if (!roomData) {
      return new Response(JSON.stringify({ error: '房間不存在' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    const room = JSON.parse(roomData);
    
    // 檢查房間狀態
    if (room.status !== 'waiting') {
      return new Response(JSON.stringify({ error: '房間不在等待狀態' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    // 檢查是否已經有兩個玩家（只計算人類玩家）
    const activeHumanPlayers = room.players.filter(p => p.isActive !== false && p.role !== 'ai');
    if (activeHumanPlayers.length >= 2) {
      return new Response(JSON.stringify({ error: '房間已滿' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    // 檢查是否已經有 AI 對手
    const hasAI = room.players.some(p => p.role === 'ai');
    if (hasAI) {
      return new Response(JSON.stringify({ error: '房間已有 AI 對手' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    // 添加 AI 對手
    // 確定 AI 的顏色：如果沒有人類玩家，AI 是黑方；如果有人類玩家，AI 是與人類玩家不同的顏色
    let aiColor = 'black';
    if (activeHumanPlayers.length > 0) {
      // 如果有人類玩家，AI 使用與人類玩家不同的顏色
      const humanPlayer = activeHumanPlayers[0];
      aiColor = humanPlayer.color === 'white' ? 'black' : 'white';
    }
    
    const aiPlayer = {
      id: 'ai-opponent',
      username: `AI 等級 ${aiLevel}`,
      role: 'ai',
      color: aiColor,
      isActive: true,
      lastSeen: new Date().toISOString(),
      aiLevel: aiLevel
    };
    
    room.players.push(aiPlayer);
    room.allowAI = true;
    room.aiLevel = aiLevel;
    
    await env.GAMES.put(roomId, JSON.stringify(room));
    
    return new Response(JSON.stringify({ 
      success: true, 
      room: room,
      message: 'AI 對手已添加'
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Add AI opponent error:', error);
    return new Response(JSON.stringify({ error: '添加 AI 對手失敗' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// 處理開始遊戲
async function handleStartGame(request, env) {
  // 只允許 POST 方法
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  
  try {
    const { roomId } = await request.json();
    
    if (!roomId) {
      return new Response(JSON.stringify({ error: '缺少房間資訊' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    const roomData = await env.GAMES.get(roomId);
    if (!roomData) {
      return new Response(JSON.stringify({ error: '房間不存在' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    const room = JSON.parse(roomData);
    
    // 檢查房間狀態
    if (room.status !== 'waiting') {
      return new Response(JSON.stringify({ error: '房間不在等待狀態' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    // 檢查是否有足夠的玩家（至少一個人類玩家，總共兩個玩家）
    const activePlayers = room.players.filter(p => p.isActive !== false);
    const activeHumanPlayers = activePlayers.filter(p => p.role !== 'ai');
    
    if (activePlayers.length < 2 || activeHumanPlayers.length < 1) {
      return new Response(JSON.stringify({ error: '需要至少一個人類玩家和一個對手才能開始遊戲' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    // 開始遊戲
    room.status = 'playing';
    room.startedAt = new Date().toISOString();
    
    // 初始化棋鐘（每方 10 分鐘）
    room.clock = {
      white: 10 * 60, // 10 分鐘，以秒為單位
      black: 10 * 60, // 10 分鐘，以秒為單位
      activePlayer: 'white', // 白方先走
      lastUpdate: new Date().toISOString(),
      isRunning: true
    };
    
    await env.GAMES.put(roomId, JSON.stringify(room));
    
    return new Response(JSON.stringify({ 
      success: true, 
      room: room,
      message: '遊戲已開始'
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Start game error:', error);
    return new Response(JSON.stringify({ error: '開始遊戲失敗' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// 處理 AI 對手
async function handleAIOpponent(request, env) {
  // 只允許 POST 方法
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  
  try {
    const { fen, level = 2, playerColor = 'white' } = await request.json();
    
    if (!fen) {
      return new Response(JSON.stringify({ error: '缺少棋局資訊' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    const aiColor = playerColor === 'white' ? 'black' : 'white';
    
    const response = await env.AI.run('@cf/openai/gpt-oss-120b', {
      input: `你是一個專業的西洋棋 AI 對手，等級 ${level}。

當前棋局 FEN: ${fen}
你的顏色: ${aiColor === 'white' ? '白方' : '黑方'}
對手顏色: ${playerColor === 'white' ? '白方' : '黑方'}

請分析棋局並選擇最佳著法。根據等級提供不同深度的分析：
- 等級 1：快速選擇最佳著法
- 等級 2：分析 2-3 個候選著法
- 等級 3：深度分析 + 戰術評估

重要：你必須嚴格按照以下 JSON 格式回應，不要包含任何其他文字或格式：

{
  "bestMove": "最佳著法 (使用坐標格式，如 e2-e4, b8-c6, f1xc4)",
  "alternativeMoves": ["替代著法1", "替代著法2"],
  "hint": "選擇理由",
  "evaluation": "位置評估"
}

移動格式說明 (坐標格式 - Coordinate Notation)：
- 基本移動：e2-e4, d7-d5, h2-h3 等
- 吃子移動：e4xd5 (e4兵吃d5), d7xe6 (d7兵吃e6) 等
- 棋子移動：b8-c6 (馬從b8到c6), f1-c4 (象從f1到c4) 等
- 棋子吃子：f6xe4 (馬從f6吃e4), f1xc5 (象從f1吃c5) 等
- 王車易位：e1-g1 (短易位), e8-c8 (長易位)
- 升變：d7-d8=Q (兵從d7升變為后), f7-f8=N (兵從f7升變為馬) 等
- 將軍：f3-h4+ (馬將軍), h5-h8# (后將死)

坐標格式優勢：
- 完全避免歧義，每個移動都有明確的起始和目標位置
- 格式統一：起始位置-目標位置 或 起始位置x目標位置
- 吃子使用 'x' 符號，非吃子使用 '-' 符號
- 升變在目標位置後加上 =棋子類型

SAN 格式示例：
- 兵移動：e4, d5, h3
- 兵吃子：exd5, dxe4, hxg4
- 馬移動：Nf6, Nc3, Nbd5
- 馬吃子：Nxe4, Nxc5, Nbxg4
- 象移動：Bc4, Bf4, Bg5
- 象吃子：Bxc5, Bxf7, Bxg4
- 車移動：Rd1, Rf1, Rae1
- 車吃子：Rxe4, Rxf7, Raxc5
- 后移動：Qd1, Qf3, Qh5
- 后吃子：Qxe4, Qxf7, Qxh5
- 王移動：Ke2, Kf1, Kg1
- 王吃子：Kxe4, Kxf7 (很少見)

重要規則：
- 王不能移動到被攻擊的格子（會被將軍）
- 王不能吃掉被保護的棋子
- 移動後不能讓自己的王被將軍
- 所有移動必須符合西洋棋規則
- 優先考慮防守和安全的移動
- 吃子移動必須使用 'x' 符號
- 兵吃子必須包含起始文件

注意：
1. 回應必須是有效的 JSON 格式
2. 當存在歧義時，必須使用文件或行提示來區分
3. 移動格式必須使用標準代數記法 (SAN)
4. 所有移動必須是合法的西洋棋移動
5. 吃子移動必須正確使用 'x' 符號
6. 不要包含任何 markdown 格式或額外文字
7. 確保所有字符串都用雙引號包圍`,
      reasoning: {
        effort: level === 1 ? 'low' : level === 2 ? 'medium' : 'high',
        summary: 'concise'
      }
    });
    
    // 解析 AI 回應
    let aiResponse;
    try {
      console.log('AI opponent response structure:', JSON.stringify(response, null, 2));
      
      // 檢查回應結構並提取 JSON 內容
      let jsonText;
      if (response && response.output && response.output.length > 1) {
        // 從 output[1].content[0].text 中提取 JSON
        jsonText = response.output[1].content[0].text;
      } else if (typeof response === 'string') {
        jsonText = response;
      } else {
        jsonText = JSON.stringify(response);
      }
      
      console.log('Extracted AI opponent JSON text:', jsonText);
      
      // 清理 JSON 文本，移除可能的 markdown 格式
      jsonText = jsonText.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
      
      // 嘗試解析 JSON
      aiResponse = JSON.parse(jsonText);
      
      // 驗證必要字段
      if (!aiResponse.bestMove) {
        throw new Error('Missing bestMove field');
      }
      
      // 確保數組字段存在
      if (!Array.isArray(aiResponse.alternativeMoves)) {
        aiResponse.alternativeMoves = [];
      }
      
      console.log('Successfully parsed AI opponent response:', aiResponse);
      
    } catch (parseError) {
      console.error('AI opponent response parse error:', parseError);
      console.error('Raw AI opponent response:', response);
      console.error('Extracted text:', jsonText);
      
      // 如果解析失敗，創建基本回應
      aiResponse = {
        bestMove: "e4",
        alternativeMoves: ["Nf3", "d4"],
        hint: "AI 回應解析失敗，使用預設著法",
        evaluation: "無法評估"
      };
    }
    
    return new Response(JSON.stringify({ 
      success: true, 
      aiMove: aiResponse 
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('AI opponent error:', error);
    return new Response(JSON.stringify({ error: 'AI 對手服務暫時無法使用' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// 處理用戶心跳檢測
async function handleHeartbeat(request, env) {
  try {
    const { roomId, userId } = await request.json();
    
    if (!roomId || !userId) {
      return new Response(JSON.stringify({ error: '缺少必要資訊' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    const roomData = await env.GAMES.get(roomId);
    if (!roomData) {
      return new Response(JSON.stringify({ error: '房間不存在' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    const room = JSON.parse(roomData);
    
    // 更新用戶的最後活躍時間
    const player = room.players.find(p => p.id === userId);
    if (player) {
      player.lastSeen = new Date().toISOString();
      player.isActive = true;
    }
    
    const spectator = room.spectators.find(s => s.id === userId);
    if (spectator) {
      spectator.lastSeen = new Date().toISOString();
      spectator.isActive = true;
    }
    
    // 保存更新後的房間
    await env.GAMES.put(roomId, JSON.stringify(room));
    
    return new Response(JSON.stringify({ 
      success: true, 
      message: '心跳更新成功'
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
    
  } catch (error) {
    console.error('Heartbeat error:', error);
    return new Response(JSON.stringify({ error: '心跳更新失敗' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// 處理認輸
async function handleResign(request, env) {
  try {
    const { roomId, userId } = await request.json();
    
    if (!roomId || !userId) {
      return new Response(JSON.stringify({ error: '缺少必要資訊' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    const roomData = await env.GAMES.get(roomId);
    if (!roomData) {
      return new Response(JSON.stringify({ error: '房間不存在' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    const room = JSON.parse(roomData);
    
    // 檢查用戶是否為玩家
    const player = room.players.find(p => p.id === userId);
    if (!player) {
      return new Response(JSON.stringify({ error: '您不是此房間的玩家' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    // 更新遊戲狀態
    room.status = 'finished';
    room.winner = player.color === 'white' ? 'black' : 'white';
    room.endReason = 'resignation';
    room.resignedBy = userId;
    room.finishedAt = new Date().toISOString();
    
    // 保存更新後的房間
    await env.GAMES.put(roomId, JSON.stringify(room));
    
    // 設置延遲關閉房間
    await scheduleRoomClosure(roomId, env);
    
    console.log('Player ' + userId + ' resigned in room ' + roomId);
    
    return new Response(JSON.stringify({ 
      success: true, 
      message: '認輸成功',
      gameStatus: room.status,
      winner: room.winner
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
    
  } catch (error) {
    console.error('Resign error:', error);
    return new Response(JSON.stringify({ error: '認輸處理失敗' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// 處理提議和棋
async function handleOfferDraw(request, env) {
  try {
    const { roomId, userId, message } = await request.json();
    
    if (!roomId || !userId) {
      return new Response(JSON.stringify({ error: '缺少必要資訊' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    const roomData = await env.GAMES.get(roomId);
    if (!roomData) {
      return new Response(JSON.stringify({ error: '房間不存在' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    const room = JSON.parse(roomData);
    
    // 檢查用戶是否為玩家
    const player = room.players.find(p => p.id === userId);
    if (!player) {
      return new Response(JSON.stringify({ error: '您不是此房間的玩家' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    // 創建和棋提議
    const drawOffer = {
      id: uuidv4(),
      from: userId,
      fromUsername: player.username,
      message: message || '提議和棋',
      timestamp: new Date().toISOString(),
      status: 'pending'
    };
    
    if (!room.drawOffers) {
      room.drawOffers = [];
    }
    
    room.drawOffers.push(drawOffer);
    
    // 保存更新後的房間
    await env.GAMES.put(roomId, JSON.stringify(room));
    
    console.log('Player ' + userId + ' offered draw in room ' + roomId);
    
    return new Response(JSON.stringify({ 
      success: true, 
      message: '和棋提議已發送',
      drawOffer: drawOffer
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
    
  } catch (error) {
    console.error('Offer draw error:', error);
    return new Response(JSON.stringify({ error: '和棋提議失敗' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// 處理接受和棋
async function handleAcceptDraw(request, env) {
  try {
    const { roomId, userId, drawOfferId } = await request.json();
    
    if (!roomId || !userId || !drawOfferId) {
      return new Response(JSON.stringify({ error: '缺少必要資訊' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    const roomData = await env.GAMES.get(roomId);
    if (!roomData) {
      return new Response(JSON.stringify({ error: '房間不存在' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    const room = JSON.parse(roomData);
    
    // 檢查用戶是否為玩家
    const player = room.players.find(p => p.id === userId);
    if (!player) {
      return new Response(JSON.stringify({ error: '您不是此房間的玩家' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    // 找到對應的和棋提議
    const drawOffer = room.drawOffers?.find(offer => offer.id === drawOfferId);
    if (!drawOffer) {
      return new Response(JSON.stringify({ error: '和棋提議不存在' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    // 檢查是否為對手提議的和棋
    if (drawOffer.from === userId) {
      return new Response(JSON.stringify({ error: '不能接受自己的和棋提議' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    // 結束遊戲為和棋
    room.status = 'finished';
    room.winner = null;
    room.endReason = 'draw';
    room.finishedAt = new Date().toISOString();
    if (room.clock) room.clock.isRunning = false;
    
    // 更新和棋提議狀態
    drawOffer.status = 'accepted';
    drawOffer.acceptedBy = userId;
    drawOffer.acceptedAt = new Date().toISOString();
    
    // 保存更新後的房間
    await env.GAMES.put(roomId, JSON.stringify(room));
    
    // 設置延遲關閉房間
    await scheduleRoomClosure(roomId, env);
    
    console.log('Player ' + userId + ' accepted draw in room ' + roomId);
    
    return new Response(JSON.stringify({ 
      success: true, 
      message: '和棋提議已接受',
      room: room
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
    
  } catch (error) {
    console.error('Accept draw error:', error);
    return new Response(JSON.stringify({ error: '接受和棋失敗' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// 處理重賽請求
async function handleRematch(request, env) {
  try {
    const { roomId, userId } = await request.json();
    
    if (!roomId || !userId) {
      return new Response(JSON.stringify({ error: '缺少必要資訊' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    const roomData = await env.GAMES.get(roomId);
    if (!roomData) {
      return new Response(JSON.stringify({ error: '房間不存在' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    const room = JSON.parse(roomData);
    
    // 檢查用戶是否為玩家
    const player = room.players.find(p => p.id === userId);
    if (!player) {
      return new Response(JSON.stringify({ error: '您不是此房間的玩家' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    // 創建重賽請求
    const rematchRequest = {
      id: uuidv4(),
      from: userId,
      fromUsername: player.username,
      timestamp: new Date().toISOString(),
      status: 'pending'
    };
    
    if (!room.rematchRequests) {
      room.rematchRequests = [];
    }
    
    room.rematchRequests.push(rematchRequest);
    
    // 保存更新後的房間
    await env.GAMES.put(roomId, JSON.stringify(room));
    
    console.log('Player ' + userId + ' requested rematch in room ' + roomId);
    
    return new Response(JSON.stringify({ 
      success: true, 
      message: '重賽請求已發送',
      rematchRequest: rematchRequest
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
    
  } catch (error) {
    console.error('Rematch error:', error);
    return new Response(JSON.stringify({ error: '重賽請求失敗' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// 處理接受重賽
async function handleAcceptRematch(request, env) {
  try {
    const { roomId, userId, rematchRequestId } = await request.json();
    
    if (!roomId || !userId || !rematchRequestId) {
      return new Response(JSON.stringify({ error: '缺少必要資訊' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    const roomData = await env.GAMES.get(roomId);
    if (!roomData) {
      return new Response(JSON.stringify({ error: '房間不存在' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    const room = JSON.parse(roomData);
    
    // 檢查用戶是否為玩家
    const player = room.players.find(p => p.id === userId);
    if (!player) {
      return new Response(JSON.stringify({ error: '您不是此房間的玩家' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    // 找到對應的重賽請求
    const rematchRequest = room.rematchRequests?.find(req => req.id === rematchRequestId);
    if (!rematchRequest) {
      return new Response(JSON.stringify({ error: '重賽請求不存在' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    // 檢查是否為對手請求的重賽
    if (rematchRequest.from === userId) {
      return new Response(JSON.stringify({ error: '不能接受自己的重賽請求' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    // 重置遊戲狀態
    room.status = 'waiting';
    room.fen = null;
    room.moves = [];
    room.winner = null;
    room.endReason = null;
    room.finishedAt = null;
    room.startedAt = null;
    
    // 重置棋鐘
    if (room.clock) {
      room.clock.white = 10 * 60;
      room.clock.black = 10 * 60;
      room.clock.activePlayer = 'white';
      room.clock.isRunning = false;
      room.clock.lastUpdate = new Date().toISOString();
    }
    
    // 清除遊戲動作
    room.drawOffers = [];
    room.rematchRequests = [];
    
    // 更新重賽請求狀態
    rematchRequest.status = 'accepted';
    rematchRequest.acceptedBy = userId;
    rematchRequest.acceptedAt = new Date().toISOString();
    
    // 保存更新後的房間
    await env.GAMES.put(roomId, JSON.stringify(room));
    
    console.log('Player ' + userId + ' accepted rematch in room ' + roomId);
    
    return new Response(JSON.stringify({ 
      success: true, 
      message: '重賽請求已接受',
      room: room
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
    
  } catch (error) {
    console.error('Accept rematch error:', error);
    return new Response(JSON.stringify({ error: '接受重賽失敗' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// 處理聊天訊息
async function handleChat(request, env) {
  // 只允許 POST 方法
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  
  try {
    const { roomId, userId, message, type = 'chat' } = await request.json();
    
    if (!roomId || !userId || !message) {
      return new Response(JSON.stringify({ error: '缺少必要資訊' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    const roomData = await env.GAMES.get(roomId);
    if (!roomData) {
      return new Response(JSON.stringify({ error: '房間不存在' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    const room = JSON.parse(roomData);
    
    // 檢查用戶是否在房間中
    const player = room.players.find(p => p.id === userId);
    const spectator = room.spectators.find(s => s.id === userId);
    
    if (!player && !spectator) {
      return new Response(JSON.stringify({ error: '您不在此房間中' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    // 創建聊天訊息
    const chatMessage = {
      id: uuidv4(),
      from: userId,
      fromUsername: player ? player.username : spectator.username,
      message: message,
      type: type, // chat, system, game
      timestamp: new Date().toISOString()
    };
    
    if (!room.chat) {
      room.chat = [];
    }
    
    room.chat.push(chatMessage);
    
    // 限制聊天記錄數量
    if (room.chat.length > 100) {
      room.chat = room.chat.slice(-100);
    }
    
    // 保存更新後的房間
    await env.GAMES.put(roomId, JSON.stringify(room));
    
    console.log('Chat message from ' + userId + ' in room ' + roomId + ': ' + message);
    
    return new Response(JSON.stringify({ 
      success: true, 
      message: '訊息發送成功',
      chatMessage: chatMessage
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
    
  } catch (error) {
    console.error('Chat error:', error);
    return new Response(JSON.stringify({ error: '聊天訊息發送失敗' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// 處理遊戲狀態查詢
async function handleGameStatus(request, env) {
  // 只允許 POST 方法
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  
  try {
    const { roomId, userId } = await request.json();
    
    if (!roomId || !userId) {
      return new Response(JSON.stringify({ error: '缺少必要資訊' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    const roomData = await env.GAMES.get(roomId);
    if (!roomData) {
      return new Response(JSON.stringify({ error: '房間不存在' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    const room = JSON.parse(roomData);
    
    // 如果遊戲正在進行但沒有棋鐘，初始化棋鐘
    if (room.status === 'playing' && !room.clock) {
      room.clock = {
        white: 10 * 60, // 10 分鐘，以秒為單位
        black: 10 * 60, // 10 分鐘，以秒為單位
        activePlayer: room.fen && room.fen.includes(' w ') ? 'white' : 'black', // 根據 FEN 判斷當前回合
        lastUpdate: new Date().toISOString(),
        isRunning: true
      };
      
      // 保存更新後的房間狀態
      await env.GAMES.put(roomId, JSON.stringify(room));
    }
    
    return new Response(JSON.stringify({ 
      success: true, 
      room: room
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
    
  } catch (error) {
    console.error('Game status error:', error);
    return new Response(JSON.stringify({ error: '獲取遊戲狀態失敗' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// 處理用戶離開遊戲
async function handleLeaveGame(request, env) {
  // 只允許 POST 方法
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  
  try {
    const { roomId, userId } = await request.json();
    
    if (!roomId || !userId) {
      return new Response(JSON.stringify({ error: '缺少必要資訊' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    const roomData = await env.GAMES.get(roomId);
    if (!roomData) {
      return new Response(JSON.stringify({ error: '房間不存在' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    const room = JSON.parse(roomData);
    
    // 將用戶標記為非活躍而不是直接移除
    const playerIndex = room.players.findIndex(p => p.id === userId);
    if (playerIndex !== -1) {
      room.players[playerIndex].isActive = false;
      room.players[playerIndex].lastSeen = new Date().toISOString();
      console.log('Player ' + userId + ' marked as inactive in room ' + roomId);
    }
    
    const spectatorIndex = room.spectators.findIndex(s => s.id === userId);
    if (spectatorIndex !== -1) {
      room.spectators[spectatorIndex].isActive = false;
      room.spectators[spectatorIndex].lastSeen = new Date().toISOString();
      console.log('Spectator ' + userId + ' marked as inactive in room ' + roomId);
    }
    
    // 檢查是否有活躍的人類玩家（排除 AI 對手）
    const activeHumanPlayers = room.players.filter(p => p.isActive !== false && p.role !== 'ai');
    const activeAIPlayers = room.players.filter(p => p.isActive !== false && p.role === 'ai');
    
    if (activeHumanPlayers.length === 0) {
      // 如果沒有活躍的人類玩家，移除所有 AI 對手並刪除房間
      if (activeAIPlayers.length > 0) {
        console.log('Removing AI opponents as no human players remain');
      }
      await env.GAMES.delete(roomId);
      console.log('Room ' + roomId + ' deleted as no active human players remain');
      return new Response(JSON.stringify({ 
        success: true, 
        message: '房間已關閉',
        roomClosed: true
      }), {
        headers: { 'Content-Type': 'application/json' },
      });
    } else {
      // 更新房間狀態
      const totalActivePlayers = room.players.filter(p => p.isActive !== false);
      if (totalActivePlayers.length < room.maxPlayers) {
        room.status = 'waiting';
      }
      
      // 如果房主離開，選擇新的活躍房主（優先選擇人類玩家）
      if (room.host === userId && activeHumanPlayers.length > 0) {
        const newHost = activeHumanPlayers[0];
        room.host = newHost.id;
        room.hostUsername = newHost.username;
        console.log('Room ' + roomId + ' host changed to ' + newHost.username);
      }
      
      // 如果房主離開且沒有其他人類玩家，關閉房間
      if (room.host === userId && activeHumanPlayers.length === 0) {
        await env.GAMES.delete(roomId);
        console.log('Room ' + roomId + ' closed as host left with no other human players');
        return new Response(JSON.stringify({ 
          success: true, 
          message: '房間已關閉',
          roomClosed: true
        }), {
          headers: { 'Content-Type': 'application/json' },
        });
      }
      
      // 保存更新後的房間
      await env.GAMES.put(roomId, JSON.stringify(room));
      console.log('User ' + userId + ' left room ' + roomId);
    }
    
    return new Response(JSON.stringify({ 
      success: true, 
      message: '已離開房間'
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
    
  } catch (error) {
    console.error('Leave game error:', error);
    return new Response(JSON.stringify({ error: '離開遊戲失敗' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// 處理對局報告
async function handleGameReport(request, env) {
  const { roomId } = await request.json();
  
  const roomData = await env.GAMES.get(roomId);
  if (!roomData) {
    return new Response(JSON.stringify({ error: '房間不存在' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  
  const room = JSON.parse(roomData);
  
  try {
    const response = await env.AI.run('@cf/openai/gpt-oss-120b', {
      input: '你是西洋棋分析師。請分析這個對局並生成詳細報告。\n\n對局記錄：' + JSON.stringify(room.moves) + '\n遊戲結果：' + (room.endReason || '進行中') + '\n獲勝者：' + (room.winner || '未定') + '\n\n請分析對局並提供：\n1. 3-5 個關鍵時刻\n2. 戰術亮點\n3. 失誤分析\n4. 整體評價\n\n重要：你必須嚴格按照以下 JSON 格式回應，不要包含任何其他文字或格式：\n\n{\n  "keyMoments": [\n    {"move": "著法", "description": "關鍵時刻描述"}\n  ],\n  "tacticalHighlights": ["戰術亮點1", "戰術亮點2"],\n  "mistakes": ["失誤分析1", "失誤分析2"],\n  "overallAssessment": "整體評價",\n  "summary": "一句總結"\n}\n\n注意：\n1. 回應必須是有效的 JSON 格式\n2. 不要包含任何 markdown 格式或額外文字\n3. 確保所有字符串都用雙引號包圍\n4. 數組和對象格式必須正確',
      reasoning: {
        effort: 'high',
        summary: 'detailed'
      }
    });
    
    // 解析 AI 回應
    let reportData;
    try {
      console.log('Game report response structure:', JSON.stringify(response, null, 2));
      
      // 檢查回應結構並提取 JSON 內容
      let jsonText;
      if (response && response.output && response.output.length > 1) {
        // 從 output[1].content[0].text 中提取 JSON
        jsonText = response.output[1].content[0].text;
      } else if (typeof response === 'string') {
        jsonText = response;
      } else {
        jsonText = JSON.stringify(response);
      }
      
      console.log('Extracted game report JSON text:', jsonText);
      
      // 清理 JSON 文本，移除可能的 markdown 格式
      jsonText = jsonText.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
      
      // 嘗試解析 JSON
      reportData = JSON.parse(jsonText);
      
      // 驗證必要字段
      if (!reportData.keyMoments || !Array.isArray(reportData.keyMoments)) {
        reportData.keyMoments = [];
      }
      if (!reportData.tacticalHighlights || !Array.isArray(reportData.tacticalHighlights)) {
        reportData.tacticalHighlights = [];
      }
      if (!reportData.mistakes || !Array.isArray(reportData.mistakes)) {
        reportData.mistakes = [];
      }
      if (!reportData.overallAssessment) {
        reportData.overallAssessment = "無法評估對局";
      }
      if (!reportData.summary) {
        reportData.summary = "對局報告生成失敗";
      }
      
      console.log('Successfully parsed game report response:', reportData);
      
    } catch (parseError) {
      console.error('Game report response parse error:', parseError);
      console.error('Raw game report response:', response);
      console.error('Extracted text:', jsonText);
      
      // 如果解析失敗，創建基本回應
      reportData = {
        keyMoments: [{"move": "N/A", "description": "無法解析對局報告"}],
        tacticalHighlights: ["AI 回應解析失敗"],
        mistakes: ["無法分析失誤"],
        overallAssessment: "無法評估對局",
        summary: "對局報告生成失敗"
      };
    }
    
    return new Response(JSON.stringify({ 
      success: true, 
      report: reportData 
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Game report error:', error);
    return new Response(JSON.stringify({ error: '對局報告生成失敗' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// WebSocket 處理函數
async function handleWebSocketJoinRoom(ws, data, env) {
  try {
    const { userId, username, roomId, role } = data;
    
    if (!userId || !username || !roomId) {
      ws.send(JSON.stringify({
        type: 'error',
        message: '缺少必要資訊'
      }));
      return;
    }
    
    // 獲取房間資訊
    const roomData = await env.GAMES.get(roomId);
    if (!roomData) {
      ws.send(JSON.stringify({
        type: 'error',
        message: '房間不存在'
      }));
      return;
    }
    
    const room = JSON.parse(roomData);
    
    // 檢查用戶是否已在房間中
    const existingPlayer = room.players.find(p => p.id === userId);
    if (existingPlayer) {
      // 用戶已在房間中，更新最後活動時間
      existingPlayer.lastSeen = new Date().toISOString();
      existingPlayer.isActive = true;
    } else {
      // 新用戶加入房間
      const newPlayer = {
        id: userId,
        username: username,
        role: role || 'player',
        color: room.players.length === 0 ? 'white' : 'black',
        isActive: true,
        lastSeen: new Date().toISOString()
      };
      room.players.push(newPlayer);
    }
    
    // 更新房間狀態
    await env.GAMES.put(roomId, JSON.stringify(room));
    
    // 發送成功回應
    ws.send(JSON.stringify({
      type: 'room_joined',
      room: room,
      message: '成功加入房間'
    }));
    
    // 通知房間內其他玩家
    // 這裡可以實現廣播邏輯
    
  } catch (error) {
    console.error('WebSocket join room error:', error);
    ws.send(JSON.stringify({
      type: 'error',
      message: '加入房間失敗'
    }));
  }
}

async function handleWebSocketLeaveRoom(ws, data, env) {
  try {
    const { userId, roomId } = data;
    
    if (!userId || !roomId) {
      ws.send(JSON.stringify({
        type: 'error',
        message: '缺少必要資訊'
      }));
      return;
    }
    
    // 獲取房間資訊
    const roomData = await env.GAMES.get(roomId);
    if (!roomData) {
      ws.send(JSON.stringify({
        type: 'room_left',
        message: '房間不存在'
      }));
      return;
    }
    
    const room = JSON.parse(roomData);
    
    // 將用戶標記為非活躍
    const playerIndex = room.players.findIndex(p => p.id === userId);
    if (playerIndex !== -1) {
      room.players[playerIndex].isActive = false;
      room.players[playerIndex].lastSeen = new Date().toISOString();
    }
    
    // 檢查活躍玩家
    const activePlayers = room.players.filter(p => p.isActive !== false);
    
    if (activePlayers.length === 0) {
      // 沒有活躍玩家，刪除房間
      await env.GAMES.delete(roomId);
      ws.send(JSON.stringify({
        type: 'room_closed',
        message: '房間已關閉'
      }));
    } else {
      // 如果房主離開，選擇新房主
      if (room.host === userId && activePlayers.length > 0) {
        const newHost = activePlayers[0];
        room.host = newHost.id;
        room.hostUsername = newHost.username;
        
        // 通知所有玩家房主變更
        ws.send(JSON.stringify({
          type: 'host_changed',
          newHost: newHost.username,
          message: `${newHost.username} 成為新房主`
        }));
      }
      
      // 更新房間狀態
      room.status = activePlayers.length < room.maxPlayers ? 'waiting' : room.status;
      await env.GAMES.put(roomId, JSON.stringify(room));
      
      // 發送成功回應
      ws.send(JSON.stringify({
        type: 'room_left',
        message: '已離開房間'
      }));
    }
    
    } catch (error) {
    console.error('WebSocket leave room error:', error);
    ws.send(JSON.stringify({
      type: 'error',
      message: '離開房間失敗'
    }));
  }
}

async function handleWebSocketChat(ws, data, env) {
  try {
    const { userId, username, roomId, message } = data;
    
    if (!userId || !username || !roomId || !message) {
      ws.send(JSON.stringify({
        type: 'error',
        message: '缺少必要資訊'
      }));
      return;
    }

    // 發送聊天訊息
    ws.send(JSON.stringify({
      type: 'chat_message',
      userId: userId,
      username: username,
      message: message,
      timestamp: new Date().toISOString()
    }));
    
    } catch (error) {
    console.error('WebSocket chat error:', error);
    ws.send(JSON.stringify({
      type: 'error',
      message: '發送訊息失敗'
    }));
  }
}

async function handleWebSocketGameAction(ws, data, env) {
  try {
    const { userId, roomId, action, move } = data;
    
    if (!userId || !roomId || !action) {
      ws.send(JSON.stringify({
        type: 'error',
        message: '缺少必要資訊'
      }));
      return;
    }
    
    // 處理遊戲動作
    switch (action) {
      case 'move':
        // 處理走子
        ws.send(JSON.stringify({
          type: 'move_made',
          userId: userId,
          move: move,
          timestamp: new Date().toISOString()
        }));
        break;
      case 'resign':
        // 處理認輸
        ws.send(JSON.stringify({
          type: 'game_ended',
          reason: 'resignation',
          winner: 'opponent'
        }));
        break;
      default:
        ws.send(JSON.stringify({
          type: 'error',
          message: '未知的遊戲動作'
        }));
    }
    
  } catch (error) {
    console.error('WebSocket game action error:', error);
    ws.send(JSON.stringify({
      type: 'error',
      message: '遊戲動作失敗'
    }));
  }
}

// WebSocket 升級處理
async function handleWebSocketUpgrade(request, env) {
  try {
    // 創建 WebSocket 連接
    const webSocketPair = new WebSocketPair();
    const [client, server] = Object.values(webSocketPair);

    // 處理 WebSocket 消息
    server.accept();
    
    server.addEventListener('message', async (event) => {
      try {
        const data = JSON.parse(event.data);
        
        switch (data.type) {
          case 'join_room':
            await handleWebSocketJoinRoom(server, data, env);
            break;
          case 'leave_room':
            await handleWebSocketLeaveRoom(server, data, env);
            break;
          case 'chat_message':
            await handleWebSocketChat(server, data, env);
            break;
          case 'game_action':
            await handleWebSocketGameAction(server, data, env);
            break;
          default:
            server.send(JSON.stringify({ error: 'Unknown message type' }));
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
        server.send(JSON.stringify({ error: 'Invalid message format' }));
      }
    });

    server.addEventListener('close', (event) => {
      console.log('WebSocket closed:', event.code, event.reason);
    });

    server.addEventListener('error', (error) => {
      console.error('WebSocket error:', error);
    });

    return new Response(null, {
      status: 101,
      webSocket: client,
    });
    } catch (error) {
    console.error('WebSocket upgrade error:', error);
    return new Response('WebSocket upgrade failed', { status: 500 });
  }
}

// 靜態檔案現在由 Cloudflare Workers Assets 自動處理

// 靜態檔案現在獨立存在，不再需要內嵌內容

// 靜態檔案現在獨立存在，不再需要內嵌內容

// 靜態檔案服務
async function serveStaticFile(path, env) {
  try {
    if (env.ASSETS) {
      // 移除 /static/ 前綴，因為 ASSETS 綁定直接指向 static 目錄
      const assetPath = path.replace('/static/', '');
      const assetRequest = new Request(`https://example.com/${assetPath}`);
      const response = await env.ASSETS.fetch(assetRequest);
      
      if (response.status === 200) {
        // 根據檔案類型設定正確的 Content-Type
        const contentType = getContentType(assetPath);
        const headers = new Headers(response.headers);
        headers.set('Content-Type', contentType);
        
        return new Response(response.body, {
          status: 200,
          headers: headers
        });
      }
    }
    
    return new Response('File not found', { status: 404 });
          } catch (error) {
    console.error('Error serving static file:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}

// 根據檔案副檔名返回 Content-Type
function getContentType(filePath) {
  const ext = filePath.split('.').pop().toLowerCase();
  const contentTypes = {
    'html': 'text/html; charset=utf-8',
    'css': 'text/css',
    'js': 'application/javascript',
    'json': 'application/json',
    'png': 'image/png',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'gif': 'image/gif',
    'svg': 'image/svg+xml',
    'ico': 'image/x-icon'
  };
  return contentTypes[ext] || 'text/plain';
}

// 前端 HTML 服務
async function serveFrontend(env) {
  // 嘗試從靜態檔案中獲取 index.html
  if (env.ASSETS) {
    try {
      const response = await env.ASSETS.fetch(new Request('https://example.com/index.html'));
      if (response.status === 200) {
        return response;
        }
      } catch (error) {
      console.error('Error fetching index.html from assets:', error);
    }
  }
  
  // 如果沒有 ASSETS 綁定，返回基本的 HTML 結構
  const html = `<!DOCTYPE html>
<html lang="zh-TW">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AI 西洋棋遊戲</title>
    <link rel="stylesheet" href="/static/css/style.css">
    <script src="/static/js/chess-wrapper.js"></script>
</head>
<body>
    <div id="app">
        <!-- 載入視圖 -->
        <div id="loadingView" class="view">
            <div id="loading">
                <div class="loading-spinner"></div>
                載入中...
            </div>
        </div>

        <!-- 登入視圖 -->
        <div id="loginView" class="view">
            <div class="auth-container">
                <div class="card">
                    <div class="card-header">
                        <h1>♔ 西洋棋遊戲</h1>
                        <p>登入您的帳號開始遊戲</p>
                    </div>
                    <form id="loginForm">
                        <div class="form-group">
                            <label for="loginUsername">使用者名稱</label>
                            <input type="text" id="loginUsername" name="username" class="form-control" required>
                        </div>
                        <div class="form-group">
                            <label for="loginPassword">密碼</label>
                            <input type="password" id="loginPassword" name="password" class="form-control" required>
                        </div>
                        <button type="submit" class="btn btn-primary" style="width: 100%;">登入</button>
                    </form>
                                         <div class="auth-switch">
                         <p>還沒有帳號？ <a href="#" class="switch-view-link" data-view="register">立即註冊</a></p>
                     </div>
                </div>
            </div>
        </div>

        <!-- 註冊視圖 -->
        <div id="registerView" class="view">
            <div class="auth-container">
                <div class="card">
                    <div class="card-header">
                        <h1>♔ 西洋棋遊戲</h1>
                        <p>建立新帳號</p>
                    </div>
                    <form id="registerForm">
                        <div class="form-group">
                            <label for="registerUsername">使用者名稱</label>
                            <input type="text" id="registerUsername" name="username" class="form-control" required>
                        </div>
                        <div class="form-group">
                            <label for="registerPassword">密碼</label>
                            <input type="password" id="registerPassword" name="password" class="form-control" required>
                        </div>
                        <div class="form-group">
                            <label for="confirmPassword">確認密碼</label>
                            <input type="password" id="confirmPassword" name="confirmPassword" class="form-control" required>
                        </div>
                        <button type="submit" class="btn btn-primary" style="width: 100%;">註冊</button>
                    </form>
                                         <div class="auth-switch">
                         <p>已有帳號？ <a href="#" class="switch-view-link" data-view="login">立即登入</a></p>
                     </div>
                </div>
            </div>
        </div>

        <!-- 大廳視圖 -->
        <div id="lobbyView" class="view">
            <div class="lobby-header">
                <h1>♔ 西洋棋大廳</h1>
                <p>歡迎來到 AI 西洋棋遊戲世界</p>
            </div>

            <div class="lobby-actions">
                <button class="btn btn-primary create-room-btn">建立房間</button>
                <button class="btn btn-secondary refresh-lobby-btn">重新整理</button>
                <button class="btn btn-outline logout-btn">登出</button>
            </div>

            <!-- 建立房間表單 -->
            <div id="createRoomForm" class="create-room-form" style="display: none;">
                <h3>建立新房間</h3>
                <div class="form-row">
                    <div class="form-group">
                        <label for="roomName">房間名稱</label>
                        <input type="text" id="roomName" class="form-control" placeholder="輸入房間名稱" required>
                    </div>
                    <div class="form-group">
                        <label for="roomRules">遊戲規則</label>
                        <select id="roomRules" class="form-control">
                            <option value="Standard">標準規則</option>
                            <option value="Blitz">快棋</option>
                            <option value="Rapid">中速棋</option>
                            <option value="Classical">古典棋</option>
                        </select>
                    </div>
                </div>
                <div class="form-row">
                    <div class="checkbox-group">
                        <input type="checkbox" id="allowSpectators">
                        <label for="allowSpectators">允許觀戰</label>
                    </div>
                    <div class="checkbox-group">
                        <input type="checkbox" id="allowAI">
                        <label for="allowAI">允許 AI 對手</label>
                    </div>
                </div>
                <div style="text-align: center;">
                    <button class="btn btn-primary create-room-submit-btn">建立房間</button>
                    <button class="btn btn-secondary hide-create-room-btn">取消</button>
                </div>
            </div>

            <!-- 房間列表 -->
            <div id="roomList" class="room-list">
                <!-- 房間項目將由 JavaScript 動態生成 -->
            </div>
        </div>

        <!-- 遊戲視圖 -->
        <div id="gameView" class="view">
            <div class="game-container">
                <!-- 遊戲棋盤 -->
                <div class="game-board">
                    <h2 style="text-align: center; margin-bottom: 20px;">西洋棋遊戲</h2>
                    <div id="chessBoard"></div>
                    <div id="gameControls"></div>
                </div>

                <!-- 遊戲資訊側邊欄 -->
                <div class="game-info">
                    <h3>遊戲資訊</h3>
                    
                    <!-- 棋鐘 -->
                    <div class="chess-clock">
                        <div class="clock-label">白方時間</div>
                        <div class="clock-display" id="whiteClock">10:00</div>
                    </div>
                    
                    <div class="chess-clock">
                        <div class="clock-label">黑方時間</div>
                        <div class="clock-display" id="blackClock">10:00</div>
                    </div>

                    <!-- 玩家資訊 -->
                    <div style="margin-bottom: 20px;">
                        <h4>玩家</h4>
                        <div id="playerInfo">
                            <p><strong>白方：</strong><span id="whitePlayer">等待加入...</span></p>
                            <p><strong>黑方：</strong><span id="blackPlayer">等待加入...</span></p>
                        </div>
                    </div>

                    <!-- 遊戲狀態 -->
                    <div style="margin-bottom: 20px;">
                        <h4>遊戲狀態</h4>
                        <div id="gameStatus">
                            <p><strong>狀態：</strong><span id="statusText">等待玩家...</span></p>
                            <p><strong>回合：</strong><span id="turnText">白方</span></p>
                        </div>
                    </div>

                    <!-- 聊天區域 -->
                    <div class="chat-section">
                        <h4>聊天</h4>
                        <div id="chatContainer"></div>
                                                 <div class="chat-input">
                             <input type="text" id="chatInput" placeholder="輸入訊息..." maxlength="100">
                             <button class="btn btn-primary send-chat-btn">發送</button>
                         </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- 訊息容器 -->
    <div id="messageContainer"></div>

    <!-- JavaScript -->
    <script src="/static/js/app.js"></script>
</body>
</html>`;
  
  return new Response(html, {
    headers: { 'Content-Type': 'text/html' },
  });
}

// 處理管理後台房間列表
async function handleAdminRooms(request, env) {
  // 只允許 GET 方法
  if (request.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  
  try {
    const games = await env.GAMES.list();
    const rooms = [];
    let stats = {
      totalRooms: 0,
      activePlayers: 0,
      aiGames: 0,
      playingGames: 0
    };
    
    for (const key of games.keys) {
      const roomData = await env.GAMES.get(key.name);
      if (roomData) {
        const room = JSON.parse(roomData);
        
        // 計算統計數據
        stats.totalRooms++;
        const activePlayers = room.players.filter(p => p.isActive !== false);
        stats.activePlayers += activePlayers.length;
        
        if (room.players.some(p => p.role === 'ai')) {
          stats.aiGames++;
        }
        
        if (room.status === 'playing') {
          stats.playingGames++;
        }
        
        // 添加房間到列表
        rooms.push({
          id: room.id,
          name: room.name,
          host: room.host,
          hostUsername: room.hostUsername,
          status: room.status,
          players: room.players,
          allowAI: room.allowAI,
          allowSpectators: room.allowSpectators,
          createdAt: room.createdAt,
          startedAt: room.startedAt,
          fen: room.fen,
          moves: room.moves
        });
      }
    }
    
    return new Response(JSON.stringify({ 
      success: true, 
      rooms: rooms,
      stats: stats
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Admin rooms error:', error);
    return new Response(JSON.stringify({ error: '獲取房間列表失敗' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// 處理強制關閉房間
async function handleForceCloseRoom(request, env) {
  // 只允許 POST 方法
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  
  try {
    const { roomId } = await request.json();
    
    if (!roomId) {
      return new Response(JSON.stringify({ error: '缺少房間資訊' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    const roomData = await env.GAMES.get(roomId);
    if (!roomData) {
      return new Response(JSON.stringify({ error: '房間不存在' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    // 強制刪除房間
    await env.GAMES.delete(roomId);
    console.log('Room ' + roomId + ' force closed by admin');
    
    return new Response(JSON.stringify({ 
      success: true, 
      message: '房間已強制關閉'
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Force close room error:', error);
    return new Response(JSON.stringify({ error: '強制關閉房間失敗' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// 延遲關閉已結束的遊戲房間
async function scheduleRoomClosure(roomId, env) {
  // 設置 30 秒後關閉房間
  setTimeout(async () => {
    try {
      const roomData = await env.GAMES.get(roomId);
      if (roomData) {
        const room = JSON.parse(roomData);
        // 只有當房間狀態仍然是 finished 時才關閉
        if (room.status === 'finished') {
          await env.GAMES.delete(roomId);
          console.log('Room ' + roomId + ' auto-closed after game finished');
        }
      }
    } catch (error) {
      console.error('Error auto-closing room:', error);
    }
  }, 30 * 1000); // 30 秒
}
