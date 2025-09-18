export class GameRoom {
  constructor(state, env) {
    this.state = state;
    this.env = env;
    this.connections = new Map();
    this.room = null;
    this.game = null;
    this.players = new Map();
    this.spectators = new Map();
    this.chat = [];
    this.gameHistory = [];
  }

  async fetch(request) {
    const url = new URL(request.url);
    const path = url.pathname;

    switch (path) {
      case '/join':
        return this.handleJoin(request);
      case '/leave':
        return this.handleLeave(request);
      case '/move':
        return this.handleMove(request);
      case '/chat':
        return this.handleChat(request);
      case '/ai-suggest':
        return this.handleAISuggest(request);
      case '/ai-opponent':
        return this.handleAIOpponent(request);
      case '/status':
        return this.handleStatus(request);
      default:
        return new Response('Not found', { status: 404 });
    }
  }

  async webSocketMessage(ws, message) {
    try {
      const data = JSON.parse(message);
      
      switch (data.type) {
        case 'join':
          await this.handleWebSocketJoin(ws, data);
          break;
        case 'leave':
          await this.handleWebSocketLeave(ws, data);
          break;
        case 'move':
          await this.handleWebSocketMove(ws, data);
          break;
        case 'chat':
          await this.handleWebSocketChat(ws, data);
          break;
        case 'ai_suggest':
          await this.handleWebSocketAISuggest(ws, data);
          break;
        case 'game_action':
          await this.handleWebSocketGameAction(ws, data);
          break;
        default:
          ws.send(JSON.stringify({ error: 'Unknown message type' }));
      }
    } catch (error) {
      console.error('WebSocket error:', error);
      ws.send(JSON.stringify({ error: 'Invalid message format' }));
    }
  }

  async handleWebSocketJoin(ws, data) {
    const { userId, username, role } = data;
    
    if (role === 'player' && this.players.size < 2) {
      const playerColor = this.players.size === 0 ? 'white' : 'black';
      this.players.set(userId, {
        ws,
        username,
        color: playerColor,
        role: 'player'
      });
      
      // 通知其他玩家
      this.broadcastToPlayers({
        type: 'player_joined',
        player: { id: userId, username, color: playerColor }
      });
      
      // 如果房間滿了，開始遊戲
      if (this.players.size === 2) {
        await this.startGame();
      }
    } else if (role === 'spectator') {
      this.spectators.set(userId, {
        ws,
        username,
        role: 'spectator'
      });
      
      // 發送當前遊戲狀態給觀戰者
      ws.send(JSON.stringify({
        type: 'game_state',
        game: this.game,
        players: Array.from(this.players.values()).map(p => ({
          id: p.id,
          username: p.username,
          color: p.color
        }))
      }));
    }
    
    // 儲存 WebSocket 連接
    this.connections.set(userId, ws);
    
    // 發送確認訊息
    ws.send(JSON.stringify({
      type: 'join_success',
      role,
      color: this.players.get(userId)?.color
    }));
  }

  async handleWebSocketLeave(ws, data) {
    const { userId } = data;
    
    if (this.players.has(userId)) {
      this.players.delete(userId);
      
      // 通知其他玩家
      this.broadcastToPlayers({
        type: 'player_left',
        playerId: userId
      });
      
      // 如果玩家不足，暫停遊戲
      if (this.players.size < 2) {
        this.pauseGame();
      }
    }
    
    if (this.spectators.has(userId)) {
      this.spectators.delete(userId);
    }
    
    this.connections.delete(userId);
    ws.close();
  }

  async handleWebSocketMove(ws, data) {
    const { userId, move } = data;
    const player = this.players.get(userId);
    
    if (!player || !this.game || this.game.gameOver()) {
      ws.send(JSON.stringify({ error: 'Invalid move request' }));
      return;
    }
    
    try {
      const result = this.game.move(move);
      if (result) {
        // 記錄移動
        this.gameHistory.push({
          move: result.san,
          fen: this.game.fen(),
          timestamp: new Date().toISOString(),
          player: userId
        });
        
        // 廣播移動結果
        this.broadcastToAll({
          type: 'move_made',
          move: result,
          fen: this.game.fen(),
          player: userId,
          isCheck: this.game.isCheck(),
          isCheckmate: this.game.isCheckmate(),
          isDraw: this.game.isDraw()
        });
        
        // 檢查遊戲是否結束
        if (this.game.gameOver()) {
          await this.endGame();
        }
      }
    } catch (error) {
      ws.send(JSON.stringify({ error: 'Invalid move' }));
    }
  }

  async handleWebSocketChat(ws, data) {
    const { userId, message } = data;
    const user = this.players.get(userId) || this.spectators.get(userId);
    
    if (user) {
      const chatMessage = {
        id: Date.now(),
        userId,
        username: user.username,
        message,
        timestamp: new Date().toISOString()
      };
      
      this.chat.push(chatMessage);
      
      // 廣播聊天訊息
      this.broadcastToAll({
        type: 'chat_message',
        message: chatMessage
      });
    }
  }

  async handleWebSocketAISuggest(ws, data) {
    const { userId, level } = data;
    
    try {
      const response = await this.env.AI.run('@cf/meta/llama-2-7b-chat-int8', {
        messages: [
          {
            role: 'system',
            content: `你是西洋棋 AI 助手。分析當前棋局並提供建議。
            等級 ${level}：${level === 1 ? '快速回應' : level === 2 ? '2-3個候選' : '戰術提示'}
            輸出：JSON 格式，包含最佳著法、替代著法和提示`
          },
          {
            role: 'user',
            content: `分析這個棋局：${this.game.fen()}`
          }
        ],
        stream: false
      });
      
      ws.send(JSON.stringify({
        type: 'ai_suggestion',
        suggestion: response
      }));
    } catch (error) {
      ws.send(JSON.stringify({ error: 'AI service error' }));
    }
  }

  async handleWebSocketGameAction(ws, data) {
    const { userId, action } = data;
    const player = this.players.get(userId);
    
    if (!player) {
      ws.send(JSON.stringify({ error: 'Unauthorized' }));
      return;
    }
    
    switch (action.type) {
      case 'resign':
        await this.handleResignation(userId);
        break;
      case 'draw_offer':
        await this.handleDrawOffer(userId);
        break;
      case 'rematch_request':
        await this.handleRematchRequest(userId);
        break;
      default:
        ws.send(JSON.stringify({ error: 'Unknown action' }));
    }
  }

  async startGame() {
    this.game = new Chess();
    
    this.broadcastToAll({
      type: 'game_started',
      fen: this.game.fen(),
      players: Array.from(this.players.values()).map(p => ({
        id: p.id,
        username: p.username,
        color: p.color
      }))
    });
  }

  pauseGame() {
    this.broadcastToAll({
      type: 'game_paused',
      reason: 'Waiting for players'
    });
  }

  async endGame() {
    const result = {
      winner: this.game.isCheckmate() ? 
        (this.game.turn() === 'w' ? 'black' : 'white') : null,
      isCheckmate: this.game.isCheckmate(),
      isDraw: this.game.isDraw(),
      reason: this.game.isCheckmate() ? 'Checkmate' : 
              this.game.isDraw() ? 'Draw' : 'Game Over'
    };
    
    this.broadcastToAll({
      type: 'game_ended',
      result,
      finalFen: this.game.fen()
    });
    
    // 生成對局報告
    await this.generateGameReport();
  }

  async generateGameReport() {
    try {
      const response = await this.env.AI.run('@cf/meta/llama-2-7b-chat-int8', {
        messages: [
          {
            role: 'system',
            content: `你是西洋棋分析師。分析對局並生成報告。
            輸出：JSON 格式，包含 3-5 個關鍵時刻和一句總結`
          },
          {
            role: 'user',
            content: `分析這個對局：${JSON.stringify(this.gameHistory)}`
          }
        ],
        stream: false
      });
      
      this.broadcastToAll({
        type: 'game_report',
        report: response
      });
    } catch (error) {
      console.error('Failed to generate game report:', error);
    }
  }

  async handleResignation(userId) {
    const player = this.players.get(userId);
    const winner = player.color === 'white' ? 'black' : 'white';
    
    this.broadcastToAll({
      type: 'game_ended',
      result: {
        winner,
        reason: 'Resignation'
      }
    });
  }

  async handleDrawOffer(userId) {
    // 通知其他玩家和棋提議
    this.broadcastToPlayers({
      type: 'draw_offered',
      playerId: userId
    });
  }

  async handleRematchRequest(userId) {
    // 通知其他玩家重賽提議
    this.broadcastToPlayers({
      type: 'rematch_requested',
      playerId: userId
    });
  }

  broadcastToPlayers(message) {
    this.players.forEach(player => {
      if (player.ws.readyState === WebSocket.OPEN) {
        player.ws.send(JSON.stringify(message));
      }
    });
  }

  broadcastToAll(message) {
    // 廣播給所有玩家
    this.broadcastToPlayers(message);
    
    // 廣播給所有觀戰者
    this.spectators.forEach(spectator => {
      if (spectator.ws.readyState === WebSocket.OPEN) {
        spectator.ws.send(JSON.stringify(message));
      }
    });
  }

  // HTTP 處理函數
  async handleJoin(request) {
    // 實現 HTTP 加入邏輯
    return new Response('Join endpoint', { status: 200 });
  }

  async handleLeave(request) {
    // 實現 HTTP 離開邏輯
    return new Response('Leave endpoint', { status: 200 });
  }

  async handleMove(request) {
    // 實現 HTTP 移動邏輯
    return new Response('Move endpoint', { status: 200 });
  }

  async handleChat(request) {
    // 實現 HTTP 聊天邏輯
    return new Response('Chat endpoint', { status: 200 });
  }

  async handleAISuggest(request) {
    // 實現 HTTP AI 建議邏輯
    return new Response('AI suggest endpoint', { status: 200 });
  }

  async handleAIOpponent(request) {
    // 實現 HTTP AI 對手邏輯
    return new Response('AI opponent endpoint', { status: 200 });
  }

  async handleStatus(request) {
    return new Response(JSON.stringify({
      room: this.room,
      game: this.game ? {
        fen: this.game.fen(),
        isCheck: this.game.isCheck(),
        isCheckmate: this.game.isCheckmate(),
        isDraw: this.game.isDraw(),
        turn: this.game.turn()
      } : null,
      players: Array.from(this.players.values()).map(p => ({
        id: p.id,
        username: p.username,
        color: p.color
      })),
      spectators: Array.from(this.spectators.values()).map(s => ({
        id: s.id,
        username: s.username
      }))
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
