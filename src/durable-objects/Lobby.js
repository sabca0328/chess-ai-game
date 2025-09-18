export class Lobby {
  constructor(state, env) {
    this.state = state;
    this.env = env;
    this.rooms = new Map();
    this.players = new Map();
    this.connections = new Map();
  }

  async fetch(request) {
    const url = new URL(request.url);
    const path = url.pathname;

    switch (path) {
      case '/rooms':
        return this.handleGetRooms(request);
      case '/create-room':
        return this.handleCreateRoom(request);
      case '/join-room':
        return this.handleJoinRoom(request);
      case '/leave-room':
        return this.handleLeaveRoom(request);
      case '/player-status':
        return this.handlePlayerStatus(request);
      default:
        return new Response('Not found', { status: 404 });
    }
  }

  async webSocketMessage(ws, message) {
    try {
      const data = JSON.parse(message);
      
      switch (data.type) {
        case 'join_lobby':
          await this.handleWebSocketJoinLobby(ws, data);
          break;
        case 'leave_lobby':
          await this.handleWebSocketLeaveLobby(ws, data);
          break;
        case 'create_room':
          await this.handleWebSocketCreateRoom(ws, data);
          break;
        case 'join_room':
          await this.handleWebSocketJoinRoom(ws, data);
          break;
        case 'leave_room':
          await this.handleWebSocketLeaveRoom(ws, data);
          break;
        case 'refresh_rooms':
          await this.handleWebSocketRefreshRooms(ws, data);
          break;
        default:
          ws.send(JSON.stringify({ error: 'Unknown message type' }));
      }
    } catch (error) {
      console.error('WebSocket error:', error);
      ws.send(JSON.stringify({ error: 'Invalid message format' }));
    }
  }

  async handleWebSocketJoinLobby(ws, data) {
    const { userId, username } = data;
    
    // 儲存玩家資訊
    this.players.set(userId, {
      ws,
      username,
      currentRoom: null,
      joinedAt: new Date().toISOString()
    });
    
    // 儲存 WebSocket 連接
    this.connections.set(userId, ws);
    
    // 發送確認訊息
    ws.send(JSON.stringify({
      type: 'lobby_joined',
      message: 'Welcome to the lobby!'
    }));
    
    // 發送當前房間列表
    await this.sendRoomList(ws);
    
    // 通知其他玩家有新玩家加入
    this.broadcastToLobby({
      type: 'player_joined_lobby',
      player: { id: userId, username }
    });
  }

  async handleWebSocketLeaveLobby(ws, data) {
    const { userId } = data;
    
    // 如果玩家在房間中，先離開房間
    const player = this.players.get(userId);
    if (player && player.currentRoom) {
      await this.removePlayerFromRoom(userId, player.currentRoom);
    }
    
    // 移除玩家
    this.players.delete(userId);
    this.connections.delete(userId);
    
    // 通知其他玩家
    this.broadcastToLobby({
      type: 'player_left_lobby',
      playerId: userId
    });
    
    ws.close();
  }

  async handleWebSocketCreateRoom(ws, data) {
    const { userId, roomName, rules, allowSpectators, allowAI } = data;
    const player = this.players.get(userId);
    
    if (!player) {
      ws.send(JSON.stringify({ error: 'Player not found' }));
      return;
    }
    
    const roomId = this.generateRoomId();
    const room = {
      id: roomId,
      name: roomName,
      host: userId,
      hostUsername: player.username,
      rules: rules || 'Standard',
      allowSpectators: allowSpectators || false,
      allowAI: allowAI || false,
      createdAt: new Date().toISOString(),
      players: [{
        id: userId,
        username: player.username,
        role: 'host',
        color: 'white'
      }],
      spectators: [],
      status: 'waiting',
      maxPlayers: 2
    };
    
    // 儲存房間
    this.rooms.set(roomId, room);
    
    // 更新玩家狀態
    player.currentRoom = roomId;
    
    // 發送確認訊息
    ws.send(JSON.stringify({
      type: 'room_created',
      room
    }));
    
    // 通知大廳其他玩家有新房間
    this.broadcastToLobby({
      type: 'room_created',
      room: {
        id: room.id,
        name: room.name,
        hostUsername: room.hostUsername,
        rules: room.rules,
        allowSpectators: room.allowSpectators,
        allowAI: room.allowAI,
        playerCount: room.players.length,
        status: room.status
      }
    });
  }

  async handleWebSocketJoinRoom(ws, data) {
    const { userId, roomId, role } = data;
    const player = this.players.get(userId);
    const room = this.rooms.get(roomId);
    
    if (!player) {
      ws.send(JSON.stringify({ error: 'Player not found' }));
      return;
    }
    
    if (!room) {
      ws.send(JSON.stringify({ error: 'Room not found' }));
      return;
    }
    
    if (room.status !== 'waiting') {
      ws.send(JSON.stringify({ error: 'Room is not accepting players' }));
      return;
    }
    
    if (role === 'player') {
      if (room.players.length >= room.maxPlayers) {
        ws.send(JSON.stringify({ error: 'Room is full' }));
        return;
      }
      
      const playerColor = room.players.length === 0 ? 'white' : 'black';
      room.players.push({
        id: userId,
        username: player.username,
        role: 'player',
        color: playerColor
      });
      
      // 如果房間滿了，更新狀態
      if (room.players.length >= room.maxPlayers) {
        room.status = 'ready';
      }
    } else if (role === 'spectator') {
      if (!room.allowSpectators) {
        ws.send(JSON.stringify({ error: 'Spectators not allowed' }));
        return;
      }
      
      room.spectators.push({
        id: userId,
        username: player.username
      });
    }
    
    // 更新玩家狀態
    player.currentRoom = roomId;
    
    // 發送確認訊息
    ws.send(JSON.stringify({
      type: 'room_joined',
      room
    }));
    
    // 通知房間內其他玩家
    this.broadcastToRoom(roomId, {
      type: 'player_joined_room',
      player: {
        id: userId,
        username: player.username,
        role,
        color: room.players.find(p => p.id === userId)?.color
      }
    });
    
    // 更新大廳房間列表
    this.broadcastToLobby({
      type: 'room_updated',
      room: {
        id: room.id,
        name: room.name,
        hostUsername: room.hostUsername,
        rules: room.rules,
        allowSpectators: room.allowSpectators,
        allowAI: room.allowAI,
        playerCount: room.players.length,
        status: room.status
      }
    });
  }

  async handleWebSocketLeaveRoom(ws, data) {
    const { userId } = data;
    const player = this.players.get(userId);
    
    if (!player || !player.currentRoom) {
      ws.send(JSON.stringify({ error: 'Not in a room' }));
      return;
    }
    
    await this.removePlayerFromRoom(userId, player.currentRoom);
    
    // 發送確認訊息
    ws.send(JSON.stringify({
      type: 'room_left',
      message: 'Left room successfully'
    }));
    
    // 發送更新後的房間列表
    await this.sendRoomList(ws);
  }

  async handleWebSocketRefreshRooms(ws, data) {
    await this.sendRoomList(ws);
  }

  async removePlayerFromRoom(userId, roomId) {
    const room = this.rooms.get(roomId);
    if (!room) return;
    
    // 從玩家列表中移除
    room.players = room.players.filter(p => p.id !== userId);
    
    // 從觀戰者列表中移除
    room.spectators = room.spectators.filter(s => s.id !== userId);
    
    // 如果房主離開，選擇新房主或關閉房間
    if (room.host === userId) {
      if (room.players.length > 0) {
        const newHost = room.players[0];
        room.host = newHost.id;
        room.hostUsername = newHost.username;
        newHost.role = 'host';
      } else {
        // 沒有玩家了，關閉房間
        this.rooms.delete(roomId);
        
        // 通知大廳房間已關閉
        this.broadcastToLobby({
          type: 'room_closed',
          roomId
        });
        
        return;
      }
    }
    
    // 更新房間狀態
    if (room.players.length < room.maxPlayers) {
      room.status = 'waiting';
    }
    
    // 通知房間內其他玩家
    this.broadcastToRoom(roomId, {
      type: 'player_left_room',
      playerId: userId
    });
    
    // 更新大廳房間列表
    this.broadcastToLobby({
      type: 'room_updated',
      room: {
        id: room.id,
        name: room.name,
        hostUsername: room.hostUsername,
        rules: room.rules,
        allowSpectators: room.allowSpectators,
        allowAI: room.allowAI,
        playerCount: room.players.length,
        status: room.status
      }
    });
  }

  async sendRoomList(ws) {
    const roomList = Array.from(this.rooms.values()).map(room => ({
      id: room.id,
      name: room.name,
      hostUsername: room.hostUsername,
      rules: room.rules,
      allowSpectators: room.allowSpectators,
      allowAI: room.allowAI,
      playerCount: room.players.length,
      status: room.status,
      createdAt: room.createdAt
    }));
    
    ws.send(JSON.stringify({
      type: 'room_list',
      rooms: roomList
    }));
  }

  broadcastToLobby(message) {
    this.connections.forEach(ws => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(message));
      }
    });
  }

  broadcastToRoom(roomId, message) {
    const room = this.rooms.get(roomId);
    if (!room) return;
    
    // 發送給房間內所有玩家
    room.players.forEach(player => {
      const ws = this.connections.get(player.id);
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(message));
      }
    });
    
    // 發送給房間內所有觀戰者
    room.spectators.forEach(spectator => {
      const ws = this.connections.get(spectator.id);
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(message));
      }
    });
  }

  generateRoomId() {
    return 'room_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  // HTTP 處理函數
  async handleGetRooms(request) {
    const roomList = Array.from(this.rooms.values()).map(room => ({
      id: room.id,
      name: room.name,
      hostUsername: room.hostUsername,
      rules: room.rules,
      allowSpectators: room.allowSpectators,
      allowAI: room.allowAI,
      playerCount: room.players.length,
      status: room.status,
      createdAt: room.createdAt
    }));
    
    return new Response(JSON.stringify({ rooms: roomList }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  async handleCreateRoom(request) {
    const { name, rules, allowSpectators, allowAI } = await request.json();
    
    const roomId = this.generateRoomId();
    const room = {
      id: roomId,
      name,
      rules: rules || 'Standard',
      allowSpectators: allowSpectators || false,
      allowAI: allowAI || false,
      createdAt: new Date().toISOString(),
      players: [],
      spectators: [],
      status: 'waiting',
      maxPlayers: 2
    };
    
    this.rooms.set(roomId, room);
    
    return new Response(JSON.stringify({ 
      success: true, 
      room 
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  async handleJoinRoom(request) {
    const { roomId, userId, role } = await request.json();
    
    const room = this.rooms.get(roomId);
    if (!room) {
      return new Response(JSON.stringify({ error: 'Room not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // 簡化的加入邏輯
    if (role === 'player' && room.players.length < room.maxPlayers) {
      room.players.push({ id: userId, role: 'player' });
    } else if (role === 'spectator' && room.allowSpectators) {
      room.spectators.push({ id: userId, role: 'spectator' });
    }
    
    return new Response(JSON.stringify({ 
      success: true, 
      room 
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  async handleLeaveRoom(request) {
    const { roomId, userId } = await request.json();
    
    await this.removePlayerFromRoom(userId, roomId);
    
    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Left room successfully' 
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  async handlePlayerStatus(request) {
    const { userId } = await request.json();
    
    const player = this.players.get(userId);
    if (!player) {
      return new Response(JSON.stringify({ error: 'Player not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    return new Response(JSON.stringify({ 
      player: {
        id: player.id,
        username: player.username,
        currentRoom: player.currentRoom,
        joinedAt: player.joinedAt
      }
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
