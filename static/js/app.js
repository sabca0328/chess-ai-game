class ChessGameApp {
  constructor() {
    this.currentUser = null;
    this.currentRoom = null;
    this.game = null;
    this.chess = null;
    this.socket = null;
    this.currentView = 'login';
    this.gamePollingInterval = null;
    this.lobbyPollingInterval = null;
    this.clockInterval = null;
    this.clock = {
      white: 600, // 10 分鐘，以秒為單位
      black: 600, // 10 分鐘，以秒為單位
      activePlayer: 'white',
      isRunning: false
    };
    this.pendingPromotion = null; // 待處理的升變移動
    
    // 防止重複顯示通知的狀態追蹤
    this.displayedNotifications = {
      gameEnd: null,
      drawOffers: new Set(),
      rematchRequests: new Set()
    };
    
    this.init();
  }

  init() {
    this.setupEventListeners();
    this.checkAuthStatus();
  }

  setupEventListeners() {
    // 直接設定表單事件監聽器（因為 DOM 已經準備好）
      const loginForm = document.getElementById('loginForm');
      const registerForm = document.getElementById('registerForm');
      
      if (loginForm) {
        loginForm.addEventListener('submit', (e) => this.handleLogin(e));
      }
      
      if (registerForm) {
        registerForm.addEventListener('submit', (e) => this.handleRegister(e));
      }

    // 設定全域事件委派
    this.setupGlobalEventListeners();
  }

  // 設定全域事件委派
  setupGlobalEventListeners() {
    document.addEventListener('click', (e) => {
      // 處理視圖切換連結
      if (e.target.classList.contains('switch-view-link')) {
        e.preventDefault();
        const view = e.target.dataset.view;
        if (view) {
          this.showView(view);
        }
      }
      
      // 處理大廳按鈕
      if (e.target.classList.contains('create-room-btn')) {
        this.showCreateRoomForm();
      }
      
      if (e.target.classList.contains('hide-create-room-btn')) {
        this.hideCreateRoomForm();
      }
      
      if (e.target.classList.contains('logout-btn')) {
        this.logout();
      }
      
      if (e.target.classList.contains('refresh-lobby-btn')) {
        this.loadLobby();
      }
      
      if (e.target.classList.contains('create-room-submit-btn')) {
        this.createRoom();
      }
      
      if (e.target.classList.contains('use-ai-btn')) {
        this.showAILevelDialog();
      }
      
      if (e.target.classList.contains('start-resign-btn')) {
        if (this.currentRoom && this.currentRoom.status === 'playing') {
          this.resign();
        } else {
          this.startGame();
        }
      }
      
      if (e.target.classList.contains('admin-btn')) {
        this.showView('admin');
        this.loadAdminData();
      }
      
      if (e.target.classList.contains('refresh-rooms-btn')) {
        this.loadAdminData();
      }
      
      if (e.target.classList.contains('return-lobby-btn')) {
        this.showView('lobby');
      }
      
      if (e.target.classList.contains('force-close-room-btn')) {
        const roomId = e.target.dataset.roomId;
        this.forceCloseRoom(roomId);
      }
      
      // 處理房間加入按鈕
      if (e.target.classList.contains('join-btn')) {
        const roomId = e.target.dataset.roomId;
        const role = e.target.dataset.role;
        if (roomId && role) {
          this.joinRoom(roomId, role);
        }
      }
      
      // 處理遊戲控制按鈕
      if (e.target.classList.contains('game-btn')) {
        const action = e.target.dataset.action;
        switch (action) {
          case 'resign':
            this.resign();
            break;
          case 'draw':
            this.offerDraw();
            break;
          case 'rematch':
            this.requestRematch();
            break;
          case 'leave':
            this.leaveGame();
            break;
        }
      }
      
      // 處理升變選擇按鈕
      if (e.target.classList.contains('promotion-btn')) {
        const piece = e.target.dataset.piece;
        this.handlePromotionSelection(piece);
      }
      
      // 處理聊天發送按鈕
      if (e.target.classList.contains('send-chat-btn')) {
        this.sendChatMessage();
      }
    });

    // 處理 Enter 鍵發送聊天訊息
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && e.target.id === 'chatInput') {
        e.preventDefault();
        this.sendChatMessage();
      }
      
      // 處理模態框關閉按鈕
      if (e.target.classList.contains('modal-close-btn')) {
        e.target.closest('.modal').remove();
      }
      
      // 處理返回大廳按鈕
      if (e.target.classList.contains('return-lobby-btn')) {
        console.log('Return lobby button clicked');
        this.clearAllModals();
        this.showView('lobby');
      }
    });
  }

  async checkAuthStatus() {
    const token = localStorage.getItem('chess_token');
    if (token) {
      this.currentUser = JSON.parse(localStorage.getItem('chess_user'));
      this.showView('lobby');
    } else {
      this.showView('login');
    }
  }

  async handleLogin(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const username = formData.get('username');
    const password = formData.get('password');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await response.json();
      
      if (data.success) {
        this.currentUser = data.user;
        localStorage.setItem('chess_token', data.token);
        localStorage.setItem('chess_user', JSON.stringify(data.user));
        this.showView('lobby');
      } else {
        this.showError(data.error);
      }
    } catch (error) {
      this.showError('登入失敗，請稍後再試');
    }
  }

  async handleRegister(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const username = formData.get('username');
    const password = formData.get('password');
    const confirmPassword = formData.get('confirmPassword');

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, confirmPassword })
      });

      const data = await response.json();
      
      if (data.success) {
        this.showSuccess('註冊成功！請登入');
        this.showView('login');
      } else {
        this.showError(data.error);
      }
    } catch (error) {
      this.showError('註冊失敗，請稍後再試');
    }
  }

  async loadLobby() {
    try {
      console.log('Loading lobby...');
      const response = await fetch('/api/lobby/rooms');
      const data = await response.json();
      console.log('Lobby data:', data);
      this.renderRoomList(data.rooms);
    } catch (error) {
      console.error('Load lobby error:', error);
      this.showError('無法載入房間列表');
    }
  }

  renderRoomList(rooms) {
    const roomList = document.getElementById('roomList');
    if (!roomList) return;

    roomList.innerHTML = rooms.map(room => `
      <div class="room-item" data-room-id="${room.id}">
        <div class="room-header">
          <h3>${room.name}</h3>
          <span class="room-status ${room.status}">${room.status}</span>
        </div>
        <div class="room-info">
          <p><strong>房主：</strong>${room.hostUsername}</p>
          <p><strong>規則：</strong>${room.rules}</p>
          <p><strong>玩家：</strong>${room.playerCount}/2</p>
        </div>
        <div class="room-actions">
          ${room.playerCount < 2 ? 
            `<button class="btn btn-primary join-btn" data-room-id="${room.id}" data-role="player">加入遊戲</button>` : 
            '<span class="room-full">房間已滿</span>'
          }
        </div>
      </div>
    `).join('');
  }

  async createRoom() {
    const roomName = document.getElementById('roomName').value;
    const rules = document.getElementById('roomRules').value;

    if (!roomName.trim()) {
      this.showError('請輸入房間名稱');
      return;
    }

    if (!this.currentUser) {
      this.showError('請先登入');
      return;
    }

    try {
      console.log('Creating room:', { roomName, rules, currentUser: this.currentUser });
      
      const response = await fetch('/api/lobby/create-room', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: roomName,
          rules,
          allowSpectators: false,
          allowAI: false,
          hostUserId: this.currentUser.id,
          hostUsername: this.currentUser.username
        })
      });

      const data = await response.json();
      console.log('Create room response:', data);
      
      if (data.success) {
        this.currentRoom = data.room;
        this.showView('game');
        this.initializeGame();
      } else {
        this.showError(data.error || '建立房間失敗');
      }
    } catch (error) {
      console.error('Create room error:', error);
      this.showError('建立房間失敗，請稍後再試');
    }
  }

  async joinRoom(roomId, role) {
    try {
      console.log('Joining room:', { roomId, role, currentUser: this.currentUser });
      
      if (!this.currentUser) {
        this.showError('請先登入');
        return;
      }
      
      const response = await fetch('/api/game/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId,
          userId: this.currentUser.id,
          username: this.currentUser.username,
          role
        })
      });

      const data = await response.json();
      console.log('Join room response:', data);
      
      if (data.success) {
        this.currentRoom = data.room;
        
        // 清理通知狀態
        this.displayedNotifications = {
          gameEnd: null,
          drawOffers: new Set(),
          rematchRequests: new Set()
        };
        
        this.showView('game');
        this.initializeGame();
      } else {
        this.showError(data.error || '加入房間失敗');
      }
    } catch (error) {
      console.error('Join room error:', error);
      this.showError('加入房間失敗，請稍後再試');
    }
  }

  showAILevelDialog() {
    // 直接添加初階 AI 對手，不需要選擇等級
    this.addAIOpponent(1);
  }

  async addAIOpponent() {
    try {
      console.log('Adding AI opponent:', { roomId: this.currentRoom?.id, currentRoom: this.currentRoom });
      
      if (!this.currentRoom || !this.currentRoom.id) {
        this.showError('房間資訊不完整，請重新加入房間');
        return;
      }
      
      const response = await fetch('/api/game/add-ai-opponent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId: this.currentRoom.id
        })
      });

      const data = await response.json();
      console.log('Add AI opponent response:', data);
      
      if (data.success) {
        this.currentRoom = data.room;
        this.updatePlayerInfo();
        this.updateGameStatus();
        this.showMessage('已添加 AI 對手！');
      } else {
        this.showError(data.error || '無法添加 AI 對手');
      }
    } catch (error) {
      console.error('Add AI opponent error:', error);
      this.showError('無法添加 AI 對手，請稍後再試');
    }
  }

  async startGame() {
    try {
      const response = await fetch('/api/game/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId: this.currentRoom.id
        })
      });

      const data = await response.json();
      
      if (data.success) {
        this.currentRoom = data.room;
        this.updateGameStatus();
        this.initializeGame();
        this.showMessage('遊戲開始！');
      } else {
        this.showError(data.error || '無法開始遊戲');
      }
    } catch (error) {
      console.error('Start game error:', error);
      this.showError('無法開始遊戲，請稍後再試');
    }
  }

  initializeGame() {
    this.chess = new Chess();
    this.setupGameBoard();
    this.setupGameControls();
    this.connectToGame();
    this.updatePlayerInfo();
    this.updateGameStatus();
    this.clearPositionAnalysis();
  }

  setupGameBoard() {
    const board = document.getElementById('chessBoard');
    if (!board) return;

    // 建立棋盤容器
    board.innerHTML = '';
    
    // 創建棋盤網格容器
    const boardGrid = document.createElement('div');
    boardGrid.className = 'board-grid';
    
    // 添加左側數字標記（1-8）
    const leftNumbers = document.createElement('div');
    leftNumbers.className = 'board-coords left-numbers';
    for (let rank = 8; rank >= 1; rank--) {
      const numberDiv = document.createElement('div');
      numberDiv.className = 'coord-number';
      numberDiv.textContent = rank;
      leftNumbers.appendChild(numberDiv);
    }
    boardGrid.appendChild(leftNumbers);
    
    // 創建棋盤主體
    const boardSquares = document.createElement('div');
    boardSquares.className = 'board-squares';
    
    for (let rank = 8; rank >= 1; rank--) {
      for (let file = 0; file < 8; file++) {
        const square = document.createElement('div');
        const fileChar = String.fromCharCode(97 + file); // a-h
        const squareName = fileChar + rank;
        
        square.className = `square ${this.getSquareColor(rank, file)}`;
        square.dataset.square = squareName;
        square.addEventListener('click', (e) => this.handleSquareClick(e));
        
        // 添加棋子
        const piece = this.chess.get(squareName);
        if (piece) {
          square.innerHTML = this.getPieceSymbol(piece);
          square.dataset.piece = piece.type + piece.color;
        }
        
        boardSquares.appendChild(square);
      }
    }
    boardGrid.appendChild(boardSquares);
    
    // 添加頂部字母標記（A-H，大寫）
    const topLetters = document.createElement('div');
    topLetters.className = 'board-coords top-letters';
    for (let file = 0; file < 8; file++) {
      const letterDiv = document.createElement('div');
      letterDiv.className = 'coord-letter';
      letterDiv.textContent = String.fromCharCode(65 + file); // A-H
      topLetters.appendChild(letterDiv);
    }
    boardGrid.appendChild(topLetters);
    
    board.appendChild(boardGrid);
  }

  getSquareColor(rank, file) {
    return (rank + file) % 2 === 0 ? 'light' : 'dark';
  }

  getPieceSymbol(piece) {
    const symbols = {
      'w': { 'k': '♔', 'q': '♕', 'r': '♖', 'b': '♗', 'n': '♘', 'p': '♙' },
      'b': { 'k': '♚', 'q': '♛', 'r': '♜', 'b': '♝', 'n': '♞', 'p': '♟' }
    };
    return symbols[piece.color]?.[piece.type] || '';
  }

  setupGameControls() {
    // 設定遊戲控制按鈕
    const controls = document.getElementById('gameControls');
    if (!controls) return;

    controls.innerHTML = `
      <div class="game-controls-row">
      <button class="btn btn-warning game-btn" data-action="draw">提議和棋</button>
      <button class="btn btn-secondary game-btn" data-action="rematch">重賽</button>
      <button class="btn btn-outline game-btn" data-action="leave">離開遊戲</button>
      </div>
    `;
  }

  async handleSquareClick(e) {
    const square = e.target.closest('.square');
    if (!square) return;

    const squareName = square.dataset.square;
    const piece = this.chess.get(squareName);
    
    if (this.selectedSquare) {
      // 已經選擇了棋子，檢查點擊的目標
      if (squareName === this.selectedSquare) {
        // 點擊同一個棋子，取消選擇
        this.clearSelection();
        return;
      }
      
      // 檢查是否點擊了自己的其他棋子
      if (piece && piece.color === this.getCurrentPlayerColor()) {
        // 點擊了自己的其他棋子，重新選擇
        this.selectSquare(square);
        return;
      }
      
      // 檢查是否為小兵升變
      const fromPiece = this.chess.get(this.selectedSquare);
      const isPawnPromotion = fromPiece && fromPiece.type === 'p' && 
        ((fromPiece.color === 'w' && squareName[1] === '8') || 
         (fromPiece.color === 'b' && squareName[1] === '1'));

      if (isPawnPromotion) {
        // 小兵升變，顯示選擇界面
        this.showPromotionModal(this.selectedSquare, squareName);
      } else {
        // 普通移動
      const move = {
        from: this.selectedSquare,
        to: squareName,
          promotion: 'q' // 預設升變為皇后（雖然不會用到）
        };

        await this.executeMove(move);
      }
    } else {
      // 沒有選擇棋子，嘗試選擇
      if (piece && piece.color === this.getCurrentPlayerColor()) {
        this.selectSquare(square);
      }
    }
  }

  selectSquare(square) {
    this.clearSelection();
    this.selectedSquare = square.dataset.square;
    square.classList.add('selected');
    
    // 顯示可能的移動
    const moves = this.chess.moves({ square: this.selectedSquare, verbose: true });
    moves.forEach(move => {
      const targetSquare = document.querySelector(`[data-square="${move.to}"]`);
      if (targetSquare) {
        targetSquare.classList.add('possible-move');
      }
    });
  }

  clearSelection() {
    if (this.selectedSquare) {
      document.querySelectorAll('.square').forEach(square => {
        square.classList.remove('selected', 'possible-move');
      });
      this.selectedSquare = null;
    }
  }

  updateBoard() {
    // 更新棋盤顯示
    document.querySelectorAll('.square').forEach(square => {
      const squareName = square.dataset.square;
      const piece = this.chess.get(squareName);
      
      if (piece) {
        square.innerHTML = this.getPieceSymbol(piece);
        square.dataset.piece = piece.type + piece.color;
      } else {
        square.innerHTML = '';
        delete square.dataset.piece;
      }
    });
  }

  restoreBoardState() {
    // 恢復棋盤狀態到房間的 FEN 狀態
    if (this.currentRoom && this.currentRoom.fen) {
      this.chess.load(this.currentRoom.fen);
      this.updateBoard();
    }
  }

  checkGameStatus() {
    if (this.chess.isCheckmate()) {
      this.showGameResult('將軍！遊戲結束');
    } else if (this.chess.isDraw()) {
      this.showGameResult('和棋！遊戲結束');
    } else if (this.chess.isCheck()) {
      this.showMessage('將軍！');
    }
  }

  getCurrentPlayerColor() {
    // 根據房間設定判斷當前玩家顏色
    const player = this.currentRoom.players.find(p => p.id === this.currentUser.id);
    if (!player) return 'w';
    
    // 將 'white'/'black' 轉換為 'w'/'b'
    return player.color === 'white' ? 'w' : 'b';
  }

  isValidJSONResponse(text) {
    // 檢查文本是否為有效的 JSON 響應
    if (!text || typeof text !== 'string') {
      return false;
    }
    
    // 檢查是否以 { 開頭（JSON 對象）
    const trimmedText = text.trim();
    if (!trimmedText.startsWith('{')) {
      return false;
    }
    
    // 檢查是否包含必要的 JSON 字段
    if (!trimmedText.includes('"bestMove"')) {
      return false;
    }
    
    // 嘗試解析 JSON 來驗證格式
    try {
      // 提取 JSON 部分（移除 ```json 和 ```）
      const jsonMatch = trimmedText.match(/```json\s*([\s\S]*?)\s*```/);
      const jsonText = jsonMatch ? jsonMatch[1] : trimmedText;
      JSON.parse(jsonText);
      return true;
    } catch (error) {
      return false;
    }
  }

  parseSANMove(sanMove) {
    // 將 SAN 格式的移動轉換為 from/to 格式
    // 例如: "d5" -> {from: "d7", to: "d5"}
    // 例如: "Nf6" -> {from: "g8", to: "f6"}
    
    if (!sanMove || typeof sanMove !== 'string') {
      return null;
    }
    
    // 簡單的兵移動處理 (例如: "d5", "e4")
    if (sanMove.length === 2 && /^[a-h][1-8]$/.test(sanMove)) {
      const file = sanMove[0];
      const rank = sanMove[1];
      
      // 根據當前回合確定起始位置
      const currentTurn = this.chess.turn();
      if (currentTurn === 'b') {
        // 黑方移動，兵從第7行移動到目標位置
        return {
          from: `${file}7`,
          to: sanMove
        };
      } else {
        // 白方移動，兵從第2行移動到目標位置
        return {
          from: `${file}2`,
          to: sanMove
        };
      }
    }
    
    // 處理棋子移動 (例如: "Nf6", "Ne4", "Bxc5", "Qd1", "Qxh4+")
    if (sanMove.length >= 3 && /^[KQRBN][a-h]?[1-8]?[x]?[a-h][1-8][+#]?$/.test(sanMove)) {
      const currentTurn = this.chess.turn();
      const pieceType = sanMove[0]; // K, Q, R, B, N
      
      // 提取目標位置，去除結尾的 + 或 #
      let targetSquare = sanMove.slice(-2);
      if (targetSquare.endsWith('+') || targetSquare.endsWith('#')) {
        targetSquare = targetSquare.slice(0, -1);
      }
      
      // 如果還有 + 或 #，再次去除
      if (targetSquare.endsWith('+') || targetSquare.endsWith('#')) {
        targetSquare = targetSquare.slice(0, -1);
      }
      
      // 根據棋子類型和當前回合確定起始位置
      let fromSquare = null;
      
      if (currentTurn === 'b') {
        // 黑方移動
        switch (pieceType) {
          case 'N': // 馬
            // 根據當前棋盤狀態找到黑方馬的位置
            if (this.chess && typeof this.chess.fen === 'function') {
              const fen = this.chess.fen();
              // 檢查 FEN 中黑方馬的位置
              // 從 FEN "rnbqkbnr/ppppppp1/8/7p/7P/7R/PPPPPPP1/RNBQKBN1 b KQkq - 0 1" 可以看到
              // 第8行：rnbqkbnr (黑方馬在 b8 和 g8)
              
              // 簡單的邏輯：如果目標在左側，選擇左側馬；否則選擇右側馬
              if (targetSquare[0] <= 'd') {
                fromSquare = 'b8'; // 左側馬
              } else {
                fromSquare = 'g8'; // 右側馬
              }
            } else {
              // 備用邏輯
              if (targetSquare[0] <= 'd') {
                fromSquare = 'b8'; // 左側馬
              } else {
                fromSquare = 'g8'; // 右側馬
              }
            }
            break;
          case 'B': // 象
            // 黑方象的起始位置：c8, f8
            if (targetSquare[0] <= 'd') {
              fromSquare = 'c8'; // 左側象
            } else {
              fromSquare = 'f8'; // 右側象
            }
            break;
          case 'R': // 車
            // 黑方車的起始位置：a8, h8
            if (targetSquare[0] <= 'd') {
              fromSquare = 'a8'; // 左側車
            } else {
              fromSquare = 'h8'; // 右側車
            }
            break;
          case 'Q': // 后
            fromSquare = 'd8';
            break;
          case 'K': // 王
            fromSquare = 'e8';
            break;
        }
      } else {
        // 白方移動
        switch (pieceType) {
          case 'N': // 馬
            // 白方馬的起始位置：b1, g1
            if (targetSquare[0] <= 'd') {
              fromSquare = 'b1'; // 左側馬
            } else {
              fromSquare = 'g1'; // 右側馬
            }
            break;
          case 'B': // 象
            // 白方象的起始位置：c1, f1
            if (targetSquare[0] <= 'd') {
              fromSquare = 'c1'; // 左側象
            } else {
              fromSquare = 'f1'; // 右側象
            }
            break;
          case 'R': // 車
            // 白方車的起始位置：a1, h1
            if (targetSquare[0] <= 'd') {
              fromSquare = 'a1'; // 左側車
            } else {
              fromSquare = 'h1'; // 右側車
            }
            break;
          case 'Q': // 后
            fromSquare = 'd1';
            break;
          case 'K': // 王
            fromSquare = 'e1';
            break;
        }
      }
      
      if (fromSquare) {
        return {
          from: fromSquare,
          to: targetSquare
        };
      }
    }
    
    // 處理其他移動格式 (例如: "O-O", "O-O-O")
    console.warn('Unsupported SAN move format:', sanMove);
    return null;
  }

  async sendMoveToServer(move) {
    try {
      const response = await fetch('/api/game/move', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId: this.currentRoom.id,
          userId: this.currentUser.id,
          move: move
        })
      });

      const data = await response.json();
      
      if (data.success) {
        // 更新本地棋局狀態
        if (data.fen) {
          this.chess.load(data.fen);
        }
        
        // 更新房間狀態
        if (data.gameStatus) {
          this.currentRoom.status = data.gameStatus;
        }
        
        console.log('Move sent successfully:', data);
        return data; // 返回響應數據
      } else {
        console.error('Move failed:', data.error);
        return data; // 返回錯誤數據
      }
    } catch (error) {
      console.error('Send move error:', error);
      return { success: false, error: '發送移動失敗，請稍後再試' };
    }
  }

  async sendAIMoveToServer(move) {
    try {
      const response = await fetch('/api/game/move', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId: this.currentRoom.id,
          userId: 'ai-opponent', // 使用 AI 玩家 ID
          move: move
        })
      });

      const data = await response.json();
      
      if (data.success) {
        // 更新本地棋局狀態
        if (data.fen) {
          this.chess.load(data.fen);
        }
        
        // 更新房間狀態
        if (data.gameStatus) {
          this.currentRoom.status = data.gameStatus;
        }
        
        console.log('AI move sent successfully:', data);
        return data; // 返回響應數據
      } else {
        console.error('AI move failed:', data.error);
        return data; // 返回錯誤數據
      }
    } catch (error) {
      console.error('Send AI move error:', error);
      return { success: false, error: '發送 AI 移動失敗，請稍後再試' };
    }
  }

  updatePlayerInfo() {
    if (!this.currentRoom) return;
    
    const whitePlayer = document.getElementById('whitePlayer');
    const blackPlayer = document.getElementById('blackPlayer');
    
    if (whitePlayer && blackPlayer) {
      // 找到白方和黑方玩家
      const whitePlayerData = this.currentRoom.players.find(p => p.color === 'white');
      const blackPlayerData = this.currentRoom.players.find(p => p.color === 'black');
      
      whitePlayer.textContent = whitePlayerData ? whitePlayerData.username : '等待加入...';
      blackPlayer.textContent = blackPlayerData ? blackPlayerData.username : '等待加入...';
    }
  }

  updateGameStatus() {
    if (!this.currentRoom) return;
    
    const statusText = document.getElementById('statusText');
    const turnText = document.getElementById('turnText');
    const useAiBtn = document.querySelector('.use-ai-btn');
    const startResignBtn = document.querySelector('.start-resign-btn');
    
    if (statusText) {
      statusText.textContent = this.currentRoom.status || '等待玩家...';
    }
    
    if (turnText) {
      if (this.chess && typeof this.chess.turn === 'function') {
        // 顯示當前輪到誰下棋
        const currentTurn = this.chess.turn();
        turnText.textContent = currentTurn === 'w' ? '白方' : '黑方';
      } else {
        turnText.textContent = '白方';
      }
    }
    
    // 更新棋鐘
    this.updateClock();
    
    // 控制按鈕顯示
    if (useAiBtn && startResignBtn) {
      const hasTwoPlayers = this.currentRoom.players && this.currentRoom.players.length >= 2;
      const isWaiting = this.currentRoom.status === 'waiting';
      const isPlaying = this.currentRoom.status === 'playing';
      
      if (isWaiting && !hasTwoPlayers) {
        useAiBtn.style.display = 'block';
        startResignBtn.style.display = 'none';
      } else if (hasTwoPlayers || isPlaying) {
        useAiBtn.style.display = 'none';
        startResignBtn.style.display = 'block';
        
        // 更新按鈕文字和樣式
        if (isPlaying) {
          startResignBtn.textContent = '認輸';
          startResignBtn.className = 'btn btn-danger start-resign-btn';
        } else {
          startResignBtn.textContent = '開始遊戲';
          startResignBtn.className = 'btn btn-primary start-resign-btn';
        }
      } else {
        useAiBtn.style.display = 'none';
        startResignBtn.style.display = 'none';
      }
    }
  }

  updateClock() {
    if (!this.currentRoom || !this.currentRoom.clock) return;
    
    const serverClock = this.currentRoom.clock;
    
    // 檢查棋鐘狀態是否有變化（除了時間值）
    const clockStateChanged = !this.clock || 
      this.clock.activePlayer !== serverClock.activePlayer ||
      this.clock.isRunning !== serverClock.isRunning;
    
    // 如果活躍玩家改變，同步後端數據（包括時間）
    if (this.clock && this.clock.activePlayer !== serverClock.activePlayer) {
      this.clock = { ...serverClock };
    }
    // 如果棋鐘運行狀態改變，同步後端數據
    else if (clockStateChanged) {
      this.clock = { ...serverClock };
    }
    
    // 更新棋鐘顯示
    this.updateClockDisplay();
    
    // 如果遊戲正在進行且棋鐘正在運行，開始倒數
    if (this.currentRoom.status === 'playing' && this.clock.isRunning && !this.clockInterval) {
      this.startClock();
    } else if ((this.currentRoom.status !== 'playing' || !this.clock.isRunning) && this.clockInterval) {
      this.stopClock();
    }
  }

  updateClockDisplay() {
    const whiteClock = document.getElementById('whiteClock');
    const blackClock = document.getElementById('blackClock');
    
    if (whiteClock) {
      whiteClock.textContent = this.formatTime(this.clock.white);
      // 更新棋鐘樣式
      const whiteClockContainer = whiteClock.closest('.chess-clock');
      if (whiteClockContainer) {
        whiteClockContainer.className = 'chess-clock';
        if (this.clock.activePlayer === 'white' && this.clock.isRunning) {
          whiteClockContainer.classList.add('clock-active');
        }
        if (this.clock.white <= 60) {
          whiteClockContainer.classList.add('clock-warning');
        }
        if (this.clock.white <= 10) {
          whiteClockContainer.classList.add('clock-critical');
        }
      }
    }
    
    if (blackClock) {
      blackClock.textContent = this.formatTime(this.clock.black);
      // 更新棋鐘樣式
      const blackClockContainer = blackClock.closest('.chess-clock');
      if (blackClockContainer) {
        blackClockContainer.className = 'chess-clock';
        if (this.clock.activePlayer === 'black' && this.clock.isRunning) {
          blackClockContainer.classList.add('clock-active');
        }
        if (this.clock.black <= 60) {
          blackClockContainer.classList.add('clock-warning');
        }
        if (this.clock.black <= 10) {
          blackClockContainer.classList.add('clock-critical');
        }
      }
    }
  }

  formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  startClock() {
    if (this.clockInterval) return;
    
    this.clockInterval = setInterval(() => {
      if (this.clock.isRunning && this.currentRoom && this.currentRoom.status === 'playing') {
        // 減少當前活躍玩家的時間
        if (this.clock.activePlayer === 'white') {
          this.clock.white = Math.max(0, this.clock.white - 1);
        } else {
          this.clock.black = Math.max(0, this.clock.black - 1);
        }
        
        // 更新顯示
        this.updateClockDisplay();
        
        // 檢查是否有玩家時間用完
        if (this.clock.white <= 0 || this.clock.black <= 0) {
          this.stopClock();
          this.showMessage('時間到！遊戲結束');
        }
      }
    }, 1000);
  }

  stopClock() {
    if (this.clockInterval) {
      clearInterval(this.clockInterval);
      this.clockInterval = null;
    }
  }

  showPromotionModal(from, to) {
    this.pendingPromotion = { from, to };
    const modal = document.getElementById('promotionModal');
    if (modal) {
      modal.style.display = 'flex';
    }
  }

  hidePromotionModal() {
    const modal = document.getElementById('promotionModal');
    if (modal) {
      modal.style.display = 'none';
    }
    this.pendingPromotion = null;
  }

  async handlePromotionSelection(piece) {
    if (!this.pendingPromotion) return;

    const move = {
      from: this.pendingPromotion.from,
      to: this.pendingPromotion.to,
      promotion: piece
    };

    this.hidePromotionModal();
    await this.executeMove(move);
  }

  async executeMove(move) {
    try {
      const result = this.chess.move(move);
      if (result) {
        // 發送移動到後端
        const serverResponse = await this.sendMoveToServer(move);
        
        if (serverResponse && serverResponse.success) {
          // 後端接受移動，更新棋盤
          this.updateBoard();
          this.checkGameStatus();
          this.updateGameStatus();
          
          // 如果是 AI 對手且遊戲已開始，觸發 AI 移動
          if (this.currentRoom.status === 'playing' && this.chess && typeof this.chess.turn === 'function' && this.chess.turn() !== this.getCurrentPlayerColor()) {
            this.makeAIMove();
          }
          
          // 移動成功，清除選擇
          this.clearSelection();
        } else {
          // 後端拒絕移動，恢復棋盤狀態，但保持選擇
          this.restoreBoardState();
          this.showError('移動無效，請重新選擇');
          // 不調用 clearSelection()，保持當前選擇
        }
      } else {
        // 前端移動無效，顯示錯誤，但保持選擇
        this.showError('移動無效，請重新選擇');
        // 不調用 clearSelection()，保持當前選擇
      }
    } catch (error) {
      console.log('Invalid move:', error);
      this.showError('移動無效，請重新選擇');
      // 不調用 clearSelection()，保持當前選擇
    }
  }

  // AI 移動重試配置
  AI_MOVE_RETRY_CONFIG = {
    maxRetries: 2,
    baseDelay: 1000,
    maxDelay: 3000,
    backoffMultiplier: 2
  };

  // AI 移動重試函數
  async retryAIMoveWithBackoff(fn, config = this.AI_MOVE_RETRY_CONFIG) {
    let lastError;
    
    for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        
        if (attempt === config.maxRetries) {
          throw error;
        }
        
        // 計算延遲時間（指數退避）
        const delay = Math.min(
          config.baseDelay * Math.pow(config.backoffMultiplier, attempt),
          config.maxDelay
        );
        
        console.log(`AI 移動失敗，${delay}ms 後重試 (第 ${attempt + 1}/${config.maxRetries} 次)`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw lastError;
  }

  // 執行單次 AI 移動
  async executeAIMove(aiMoveData) {
    const aiMove = aiMoveData.bestMove;
    console.log('AI move to execute:', aiMove);
    console.log('Current FEN:', this.chess.fen());
    console.log('Current turn:', this.chess.turn());
    
    // 檢查遊戲是否已結束
    if (this.chess.isGameOver()) {
      throw new Error('遊戲已結束，無法執行移動');
    }
    
    // 嘗試執行移動
    const moveResult = this.chess.move(aiMove);
    console.log('Move result:', moveResult);
    
    if (!moveResult) {
      // 移動無效，獲取所有可用移動來調試
      const availableMoves = this.chess.moves();
      console.error('Invalid AI move:', aiMove);
      console.error('Available moves:', availableMoves);
      throw new Error(`AI 移動無效: ${aiMove}`);
    }
    
    // 發送移動到後端
    const serverResponse = await this.sendAIMoveToServer({
      from: moveResult.from,
      to: moveResult.to,
      promotion: moveResult.promotion
    });
    
    if (!serverResponse || !serverResponse.success) {
      // 後端拒絕移動，恢復棋盤狀態
      this.restoreBoardState();
      throw new Error('AI 移動被後端拒絕');
    }
    
    // 移動成功，更新棋盤和狀態
    this.updateBoard();
    this.checkGameStatus();
    this.updateGameStatus();
    this.showMessage(`AI 移動: ${aiMove}`);
    
    // 更新局勢分析框
    this.updatePositionAnalysis(aiMoveData);
    
    // 顯示 AI 的思考過程
    if (aiMoveData.hint) {
      setTimeout(() => {
        this.showMessage(`AI 提示: ${aiMoveData.hint}`);
      }, 1000);
    }
    
    return true;
  }

  async makeAIMove() {
    // 只有在遊戲進行中才執行 AI 移動
    if (this.currentRoom.status !== 'playing') {
      return;
    }
    
    // 檢查 chess 對象是否已初始化
    if (!this.chess || typeof this.chess.fen !== 'function') {
      console.error('Chess object not initialized');
      return;
    }
    
    try {
      this.showMessage('AI 正在思考...');
      
      // 優先使用房間中儲存的 AI 等級，否則使用選擇器中的等級
      const aiLevel = this.currentRoom?.aiLevel || document.getElementById('aiLevel')?.value || 2;
      
      const response = await fetch('/api/game/ai-opponent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fen: this.chess.fen(),
          level: parseInt(aiLevel),
          playerColor: this.getCurrentPlayerColor() === 'w' ? 'white' : 'black' // 人類玩家的顏色
        })
      });

      const data = await response.json();
      
      if (data.success && data.aiMove) {
        // 解析 AI 響應
        let aiMoveData;
        try {
          // 嘗試直接訪問 bestMove
          if (data.aiMove.bestMove) {
            aiMoveData = data.aiMove;
          } else if (data.aiMove.output && data.aiMove.output.length > 0) {
            // 解析嵌套的響應結構，尋找包含 JSON 的 output_text
            let responseText = null;
            
            // 遍歷所有 output 項目，尋找包含 JSON 的內容
            for (let i = 0; i < data.aiMove.output.length; i++) {
              const output = data.aiMove.output[i];
              if (output.content && output.content.length > 0) {
                for (let j = 0; j < output.content.length; j++) {
                  const content = output.content[j];
                  if (content.text && this.isValidJSONResponse(content.text)) {
                    responseText = content.text;
                    break;
                  }
                }
                if (responseText) break;
              }
            }
            
            if (responseText) {
              // 提取 JSON 部分（移除 ```json 和 ```）
              const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/);
              if (jsonMatch) {
                aiMoveData = JSON.parse(jsonMatch[1]);
              } else {
                // 嘗試直接解析整個文本
                aiMoveData = JSON.parse(responseText);
              }
            }
          }
        } catch (parseError) {
          console.error('Failed to parse AI response:', parseError);
          this.showError('AI 響應解析失敗');
          return;
        }
        
        if (aiMoveData && aiMoveData.bestMove) {
          // 使用重試機制執行 AI 移動
          try {
            await this.retryAIMoveWithBackoff(async () => {
              return await this.executeAIMove(aiMoveData);
            });
          } catch (error) {
            console.error('AI 移動最終失敗:', error);
            
            // 如果移動失敗，嘗試重新獲取 AI 建議
            console.log('嘗試重新獲取 AI 建議...');
            try {
              const retryResponse = await fetch('/api/game/ai-opponent', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  fen: this.chess.fen(),
                  playerColor: this.getCurrentPlayerColor()
                })
              });

              const retryData = await retryResponse.json();
              
              if (retryData.success && retryData.aiMove) {
                // 解析新的 AI 響應
                let newAiMoveData;
                try {
                  // 嘗試直接訪問 bestMove
                  if (retryData.aiMove.bestMove) {
                    newAiMoveData = retryData.aiMove;
                  } else if (retryData.aiMove.output && retryData.aiMove.output.length > 0) {
                    // 解析嵌套的響應結構，尋找包含 JSON 的 output_text
                    let responseText = null;
                    
                    // 遍歷所有 output 項目，尋找包含 JSON 的內容
                    for (let i = 0; i < retryData.aiMove.output.length; i++) {
                      const output = retryData.aiMove.output[i];
                      if (output.content && output.content.length > 0) {
                        for (let j = 0; j < output.content.length; j++) {
                          const content = output.content[j];
                          if (content.text && this.isValidJSONResponse(content.text)) {
                            responseText = content.text;
                            break;
                          }
                        }
                        if (responseText) break;
                      }
                    }
                    
                    if (responseText) {
                      // 提取 JSON 部分（移除 ```json 和 ```）
                      const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/);
                      if (jsonMatch) {
                        newAiMoveData = JSON.parse(jsonMatch[1]);
                      } else {
                        // 嘗試直接解析整個文本
                        newAiMoveData = JSON.parse(responseText);
                      }
                    }
                  }
                } catch (parseError) {
                  console.error('Failed to parse retry AI response:', parseError);
                  throw new Error('AI 響應解析失敗');
                }
                
                if (newAiMoveData && newAiMoveData.bestMove) {
                  // 嘗試使用新的 AI 建議
                  await this.executeAIMove(newAiMoveData);
                  console.log('使用新的 AI 建議成功');
                } else {
                  throw new Error('AI 響應格式錯誤');
                }
              } else {
                throw new Error('AI 服務返回錯誤');
              }
            } catch (retryError) {
              console.error('重新獲取 AI 建議失敗:', retryError);
              this.showError('AI 移動失敗，請重新開始遊戲');
            }
          }
        }
      } else {
        this.showError('AI 移動失敗');
      }
    } catch (error) {
      console.error('AI move failed:', error);
      this.showError('AI 服務暫時無法使用');
    }
  }

  // 更新局勢分析框
  updatePositionAnalysis(aiMoveData) {
    const currentHint = document.getElementById('currentHint');
    const positionEvaluation = document.getElementById('positionEvaluation');
    
    if (currentHint) {
      currentHint.textContent = aiMoveData.hint || '等待 AI 思考...';
    }
    
    if (positionEvaluation) {
      positionEvaluation.textContent = aiMoveData.evaluation || '-';
    }
  }

  // 清空局勢分析框
  clearPositionAnalysis() {
    const currentHint = document.getElementById('currentHint');
    const positionEvaluation = document.getElementById('positionEvaluation');
    
    if (currentHint) {
      currentHint.textContent = '等待 AI 思考...';
    }
    
    if (positionEvaluation) {
      positionEvaluation.textContent = '-';
    }
  }

  async resign() {
    if (confirm('確定要認輸嗎？')) {
      try {
        const response = await fetch('/api/game/resign', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            roomId: this.currentRoom.id,
            userId: this.currentUser.id
          })
        });
        
        const data = await response.json();
        if (data.success) {
          this.showMessage('您已認輸，遊戲結束');
      this.endGame('resignation');
        } else {
          this.showError(data.error || '認輸失敗');
        }
      } catch (error) {
        console.error('Resign error:', error);
        this.showError('認輸失敗，請稍後再試');
      }
    }
  }

  async offerDraw() {
    if (confirm('確定要提議和棋嗎？')) {
      try {
        const response = await fetch('/api/game/offer-draw', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            roomId: this.currentRoom.id,
            userId: this.currentUser.id,
            message: '提議和棋'
          })
        });
        
        const data = await response.json();
        if (data.success) {
      this.showMessage('已提議和棋，等待對手回應');
        } else {
          this.showError(data.error || '和棋提議失敗');
        }
      } catch (error) {
        console.error('Offer draw error:', error);
        this.showError('和棋提議失敗，請稍後再試');
      }
    }
  }

  async requestRematch() {
    if (confirm('確定要請求重賽嗎？')) {
      try {
        const response = await fetch('/api/game/rematch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            roomId: this.currentRoom.id,
            userId: this.currentUser.id
          })
        });
        
        const data = await response.json();
        if (data.success) {
      this.showMessage('已請求重賽，等待對手回應');
        } else {
          this.showError(data.error || '重賽請求失敗');
        }
      } catch (error) {
        console.error('Request rematch error:', error);
        this.showError('重賽請求失敗，請稍後再試');
      }
    }
  }

  checkGameActions(room) {
    if (!this.currentRoom || !room) return;
    
    // 檢查認輸
    if (room.status === 'finished' && room.endReason === 'resignation' && room.resignedBy) {
      const resignedPlayer = room.players.find(p => p.id === room.resignedBy);
      if (resignedPlayer && resignedPlayer.id !== this.currentUser.id) {
        // 認輸通知已經在 checkGameEnd 中處理，這裡不需要重複處理
      }
    }
    
    // 檢查和棋提議
    if (room.drawOffers && room.drawOffers.length > 0) {
      const latestDrawOffer = room.drawOffers[room.drawOffers.length - 1];
      if (latestDrawOffer.from !== this.currentUser.id && 
          latestDrawOffer.status === 'pending' &&
          !this.displayedNotifications.drawOffers.has(latestDrawOffer.id)) {
        this.showDrawOfferNotification(latestDrawOffer);
        this.displayedNotifications.drawOffers.add(latestDrawOffer.id);
      }
    }
    
    // 檢查重賽請求
    if (room.rematchRequests && room.rematchRequests.length > 0) {
      const latestRematchRequest = room.rematchRequests[room.rematchRequests.length - 1];
      if (latestRematchRequest.from !== this.currentUser.id && 
          latestRematchRequest.status === 'pending' &&
          !this.displayedNotifications.rematchRequests.has(latestRematchRequest.id)) {
        this.showRematchRequestNotification(latestRematchRequest);
        this.displayedNotifications.rematchRequests.add(latestRematchRequest.id);
      }
    }
  }

  checkGameEnd(room) {
    if (!this.currentRoom || !room) return;
    
    // 檢查遊戲是否結束
    if (room.status === 'finished' && room.endReason) {
      // 創建遊戲結束的唯一標識
      const gameEndKey = `${room.id}-${room.endReason}-${room.finishedAt}`;
      
      // 避免重複顯示遊戲結束消息
      if (this.displayedNotifications.gameEnd !== gameEndKey) {
        const reasonText = this.getGameEndReasonText(room.endReason);
        let message = `遊戲結束：${reasonText}`;
        
        // 如果有獲勝者，顯示獲勝信息
        if (room.winner) {
          const winner = room.players.find(p => p.color === room.winner);
          if (winner) {
            if (winner.id === this.currentUser.id) {
              message += '，您獲勝！';
            } else {
              message += `，${winner.username} 獲勝！`;
            }
          }
        }
        
        this.showGameResult(message);
        this.displayedNotifications.gameEnd = gameEndKey;
      }
    }
  }

  // 清理所有模態框
  clearAllModals() {
    const modals = document.querySelectorAll('.modal');
    console.log('Clearing', modals.length, 'modals');
    modals.forEach((modal, index) => {
      console.log(`Modal ${index}:`, modal);
      // 跳過靜態的升變選擇模態框
      if (modal.id === 'promotionModal') {
        console.log(`Skipping static promotion modal ${index}`);
        return;
      }
      
      if (document.body.contains(modal)) {
        document.body.removeChild(modal);
        console.log(`Modal ${index} removed successfully`);
      } else {
        console.log(`Modal ${index} not in body`);
      }
    });
    
    // 再次檢查是否還有模態框
    const remainingModals = document.querySelectorAll('.modal');
    console.log('Remaining modals after cleanup:', remainingModals.length);
  }

  showDrawOfferNotification(drawOffer) {
    const message = `${drawOffer.fromUsername} 提議和棋`;
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'flex';
    modal.innerHTML = `
      <div class="modal-content">
        <h3>和棋提議</h3>
        <p>${message}</p>
        <div class="modal-actions">
          <button class="btn btn-success" onclick="this.acceptDraw('${drawOffer.id}')">接受</button>
          <button class="btn btn-danger" onclick="this.rejectDraw('${drawOffer.id}')">拒絕</button>
        </div>
      </div>
    `;
    
    // 添加事件處理
    modal.querySelector('.btn-success').onclick = () => this.acceptDraw(drawOffer.id);
    modal.querySelector('.btn-danger').onclick = () => this.rejectDraw(drawOffer.id);
    
    document.body.appendChild(modal);
    
    // 5秒後自動關閉
    setTimeout(() => {
      if (document.body.contains(modal)) {
        document.body.removeChild(modal);
      }
    }, 5000);
  }

  showRematchRequestNotification(rematchRequest) {
    const message = `${rematchRequest.fromUsername} 請求重賽`;
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'flex';
    modal.innerHTML = `
      <div class="modal-content">
        <h3>重賽請求</h3>
        <p>${message}</p>
        <div class="modal-actions">
          <button class="btn btn-success" onclick="this.acceptRematch('${rematchRequest.id}')">接受</button>
          <button class="btn btn-danger" onclick="this.rejectRematch('${rematchRequest.id}')">拒絕</button>
        </div>
      </div>
    `;
    
    // 添加事件處理
    modal.querySelector('.btn-success').onclick = () => this.acceptRematch(rematchRequest.id);
    modal.querySelector('.btn-danger').onclick = () => this.rejectRematch(rematchRequest.id);
    
    document.body.appendChild(modal);
    
    // 10秒後自動關閉
    setTimeout(() => {
      if (document.body.contains(modal)) {
        document.body.removeChild(modal);
      }
    }, 10000);
  }

  async acceptDraw(drawOfferId) {
    // 關閉模態框
    const modal = document.querySelector('.modal');
    if (modal) {
      document.body.removeChild(modal);
    }
    
    try {
      const response = await fetch('/api/game/accept-draw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId: this.currentRoom.id,
          userId: this.currentUser.id,
          drawOfferId: drawOfferId
        })
      });
      
      const data = await response.json();
      if (data.success) {
        this.showMessage('和棋提議已接受，遊戲結束');
        this.endGame('draw');
      } else {
        this.showError(data.error || '接受和棋失敗');
      }
    } catch (error) {
      console.error('Accept draw error:', error);
      this.showError('接受和棋失敗，請稍後再試');
    }
  }

  async rejectDraw(drawOfferId) {
    // 關閉模態框
    const modal = document.querySelector('.modal');
    if (modal) {
      document.body.removeChild(modal);
    }
    
    this.showMessage('已拒絕和棋提議');
  }

  async acceptRematch(rematchRequestId) {
    // 關閉模態框
    const modal = document.querySelector('.modal');
    if (modal) {
      document.body.removeChild(modal);
    }
    
    try {
      const response = await fetch('/api/game/accept-rematch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId: this.currentRoom.id,
          userId: this.currentUser.id,
          rematchRequestId: rematchRequestId
        })
      });
      
      const data = await response.json();
      if (data.success) {
        this.showMessage('重賽請求已接受，開始新遊戲');
        // 重新初始化遊戲
        this.initializeGame();
      } else {
        this.showError(data.error || '接受重賽失敗');
      }
    } catch (error) {
      console.error('Accept rematch error:', error);
      this.showError('接受重賽失敗，請稍後再試');
    }
  }

  async rejectRematch(rematchRequestId) {
    // 關閉模態框
    const modal = document.querySelector('.modal');
    if (modal) {
      document.body.removeChild(modal);
    }
    
    this.showMessage('已拒絕重賽請求');
  }

  async leaveGame() {
    if (confirm('確定要離開遊戲嗎？')) {
      try {
        // 如果 WebSocket 連接存在，發送離開房間消息
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
          this.socket.send(JSON.stringify({
            type: 'leave_room',
            userId: this.currentUser.id,
            roomId: this.currentRoom.id
          }));
        }
        
        // 調用後端 API
        if (this.currentRoom && this.currentUser) {
          const response = await fetch('/api/game/leave', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              roomId: this.currentRoom.id,
              userId: this.currentUser.id
            })
          });
          
          const data = await response.json();
          if (!data.success) {
            this.showError(data.error || '離開房間失敗');
            return;
          }
          
          // 如果房間被關閉，顯示相應訊息
          if (data.roomClosed) {
            this.showMessage('房間已關閉');
          }
        }
        
        // 停止輪詢
        this.stopGamePolling();
        
        // 停止棋鐘
        this.stopClock();
        
        // 清理所有模態框
        this.clearAllModals();
        
        // 清理遊戲狀態
      this.currentRoom = null;
      this.chess = null;
        this.game = null;
        
        // 清理通知狀態
        this.displayedNotifications = {
          gameEnd: null,
          drawOffers: new Set(),
          rematchRequests: new Set()
        };
        
        // 返回大廳
        this.showView('lobby');
        this.loadLobby();
        
      } catch (error) {
        console.error('Leave game error:', error);
        this.showError('離開遊戲失敗，請稍後再試');
      }
    }
  }

  endGame(reason) {
    const reasonText = this.getGameEndReasonText(reason);
    this.showGameResult(`遊戲結束：${reasonText}`);
  }

  getGameEndReasonText(reason) {
    const reasonMap = {
      'resignation': '認輸',
      'opponent_resignation': '對手認輸',
      'draw': '和棋',
      'checkmate': '將軍',
      'timeout': '時間到',
      'stalemate': '逼和',
      'insufficient_material': '子力不足',
      'threefold_repetition': '三次重複',
      'fifty_move_rule': '五十步規則'
    };
    
    return reasonMap[reason] || reason;
  }

  showGameResult(message) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
      <div class="modal-content">
        <h3>遊戲結果</h3>
        <p>${message}</p>
        <button class="btn btn-primary return-lobby-btn">返回大廳</button>
      </div>
    `;
    
    // 直接綁定事件處理器
    const returnBtn = modal.querySelector('.return-lobby-btn');
    returnBtn.addEventListener('click', () => {
      console.log('Return lobby button clicked directly');
      this.clearAllModals();
      this.showView('lobby');
    });
    
    document.body.appendChild(modal);
  }

  connectToGame() {
    try {
      // 暫時使用輪詢方式替代 WebSocket
      console.log('Using polling for game updates');
      this.startGamePolling();
    } catch (error) {
      console.error('Error setting up game connection:', error);
      this.showError('無法建立遊戲連接');
    }
  }

  startGamePolling() {
    // 每 2 秒輪詢一次遊戲狀態
    this.gamePollingInterval = setInterval(async () => {
      if (this.currentRoom && this.currentUser) {
        try {
          const response = await fetch('/api/game/status', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
        roomId: this.currentRoom.id,
              userId: this.currentUser.id
            })
          });
          
          if (response.ok) {
            const data = await response.json();
            if (data.success && data.room) {
              // 檢查是否有新的聊天訊息
              if (this.currentRoom && this.currentRoom.chat && data.room.chat) {
                const oldChatLength = this.currentRoom.chat.length;
                const newChatLength = data.room.chat.length;
                
                if (newChatLength > oldChatLength) {
                  // 有新訊息，顯示它們
                  const newMessages = data.room.chat.slice(oldChatLength);
                  newMessages.forEach(message => {
                    this.displayChatMessage(message);
                  });
                }
              }
              
              // 檢查遊戲動作通知
              this.checkGameActions(data.room);
              
              // 檢查遊戲是否結束
              this.checkGameEnd(data.room);
              
              // 檢查是否有新的棋局狀態需要同步
              const oldFen = this.currentRoom?.fen;
              const newFen = data.room.fen;
              
              this.currentRoom = data.room;
              this.updatePlayerInfo();
              this.updateGameStatus();
              
              // 如果有新的 FEN 狀態，更新棋盤
              if (newFen && newFen !== oldFen && this.chess) {
                this.chess.load(newFen);
                this.updateBoard();
                this.checkGameStatus();
              }
            }
          }
        } catch (error) {
          console.error('Game polling error:', error);
        }
      }
    }, 2000);
  }

  stopGamePolling() {
    if (this.gamePollingInterval) {
      clearInterval(this.gamePollingInterval);
      this.gamePollingInterval = null;
    }
  }

  startLobbyPolling() {
    // 每 3 秒輪詢一次大廳房間列表
    this.lobbyPollingInterval = setInterval(async () => {
      if (this.currentView === 'lobby' && this.currentUser) {
        try {
          await this.loadLobby();
        } catch (error) {
          console.error('Lobby polling error:', error);
        }
      }
    }, 3000);
  }

  stopLobbyPolling() {
    if (this.lobbyPollingInterval) {
      clearInterval(this.lobbyPollingInterval);
      this.lobbyPollingInterval = null;
    }
  }

  handleGameMessage(data) {
    switch (data.type) {
      case 'room_joined':
        this.handleRoomJoined(data);
        break;
      case 'room_left':
        this.handleRoomLeft(data);
        break;
      case 'room_closed':
        this.handleRoomClosed(data);
        break;
      case 'host_changed':
        this.handleHostChanged(data);
        break;
      case 'move_made':
        this.handleOpponentMove(data);
        break;
      case 'game_started':
        this.handleGameStarted(data);
        break;
      case 'game_ended':
        this.handleGameEnded(data);
        break;
      case 'chat_message':
        this.handleChatMessage(data);
        break;
      case 'error':
        this.showError(data.message);
        break;
      default:
        console.log('Unknown message type:', data.type);
    }
  }

  handleRoomJoined(data) {
    console.log('Room joined:', data.message);
    this.currentRoom = data.room;
    this.showMessage(data.message);
    this.updatePlayerInfo();
  }

  handleRoomLeft(data) {
    console.log('Room left:', data.message);
    this.showMessage(data.message);
  }

  handleRoomClosed(data) {
    console.log('Room closed:', data.message);
    this.showMessage(data.message);
    // 房間關閉，返回大廳
    setTimeout(() => {
      this.clearAllModals();
      this.showView('lobby');
      this.loadLobby();
    }, 2000);
  }

  handleHostChanged(data) {
    console.log('Host changed:', data.message);
    this.showMessage(data.message);
    // 更新房間資訊
    if (this.currentRoom) {
      this.currentRoom.hostUsername = data.newHost;
    }
  }

  handleOpponentMove(data) {
    // 更新棋盤
    this.chess.load(data.fen);
    this.updateBoard();
    this.checkGameStatus();
  }

  handleGameStarted(data) {
    this.showMessage('遊戲開始！');
  }

  updatePlayerInfo() {
    if (!this.currentRoom || !this.currentRoom.players) return;
    
    const whitePlayer = this.currentRoom.players.find(p => p.color === 'white');
    const blackPlayer = this.currentRoom.players.find(p => p.color === 'black');
    
    const whitePlayerElement = document.getElementById('whitePlayer');
    const blackPlayerElement = document.getElementById('blackPlayer');
    
    if (whitePlayerElement) {
      whitePlayerElement.textContent = whitePlayer ? whitePlayer.username : '等待加入...';
    }
    
    if (blackPlayerElement) {
      blackPlayerElement.textContent = blackPlayer ? blackPlayer.username : '等待加入...';
    }
  }

  handleGameEnded(data) {
    this.showGameResult(data.result.reason);
  }

  handleChatMessage(data) {
    // 處理聊天訊息
    const chatContainer = document.getElementById('chatContainer');
    if (chatContainer) {
      const messageElement = document.createElement('div');
      messageElement.className = 'chat-message';
      messageElement.innerHTML = `
        <span class="username">${data.message.username}:</span>
        <span class="message">${data.message.message}</span>
      `;
      chatContainer.appendChild(messageElement);
      chatContainer.scrollTop = chatContainer.scrollHeight;
    }
  }

  displayChatMessage(message) {
    // 顯示聊天訊息
    const chatContainer = document.getElementById('chatContainer');
    if (chatContainer) {
      const messageElement = document.createElement('div');
      messageElement.className = 'chat-message';
      
      // 格式化時間
      const timestamp = new Date(message.timestamp).toLocaleTimeString();
      
      messageElement.innerHTML = `
        <div class="message-header">
          <span class="username">${message.fromUsername}</span>
          <span class="timestamp">${timestamp}</span>
        </div>
        <div class="message-content">${message.message}</div>
      `;
      
      chatContainer.appendChild(messageElement);
      chatContainer.scrollTop = chatContainer.scrollHeight;
    }
  }

  showView(view) {
    this.currentView = view;
    
    // 停止所有輪詢
    this.stopGamePolling();
    this.stopLobbyPolling();
    
    // 隱藏所有視圖
    document.querySelectorAll('.view').forEach(v => v.style.display = 'none');
    
    // 顯示指定視圖
    const targetView = document.getElementById(view + 'View');
    if (targetView) {
      targetView.style.display = 'block';
    }
    
    // 根據視圖執行特定邏輯
    switch (view) {
      case 'lobby':
        this.loadLobby();
        this.startLobbyPolling();
        break;
      case 'admin':
        this.loadAdminData();
        break;
      case 'game':
        // 遊戲視圖已在 initializeGame 中處理
        break;
    }
  }

  showMessage(message) {
    const messageContainer = document.getElementById('messageContainer');
    if (messageContainer) {
      messageContainer.textContent = message;
      messageContainer.style.display = 'block';
      setTimeout(() => {
        messageContainer.style.display = 'none';
      }, 3000);
    }
  }

  showError(message) {
    this.showMessage(`錯誤：${message}`);
  }

  showSuccess(message) {
    this.showMessage(`成功：${message}`);
  }

  // 顯示建立房間表單
  showCreateRoomForm() {
    const form = document.getElementById('createRoomForm');
    if (form) {
      form.style.display = 'block';
    }
  }

  // 隱藏建立房間表單
  hideCreateRoomForm() {
    const form = document.getElementById('createRoomForm');
    if (form) {
      form.style.display = 'none';
    }
  }

  // 登出功能
  logout() {
    localStorage.removeItem('chess_token');
    localStorage.removeItem('chess_user');
    this.currentUser = null;
    this.currentRoom = null;
    this.showView('login');
  }

  // 管理後台功能
  async loadAdminData() {
    try {
      console.log('Loading admin data...');
      const response = await fetch('/api/admin/rooms');
      const data = await response.json();
      console.log('Admin data:', data);
      
      if (data.success) {
        this.renderAdminRoomList(data.rooms);
        this.updateAdminStats(data.stats);
      } else {
        this.showError(data.error || '無法載入管理數據');
      }
    } catch (error) {
      console.error('Load admin data error:', error);
      this.showError('無法載入管理數據');
    }
  }

  renderAdminRoomList(rooms) {
    const adminRoomList = document.getElementById('adminRoomList');
    if (!adminRoomList) return;

    if (rooms.length === 0) {
      adminRoomList.innerHTML = '<p style="text-align: center; color: #666;">目前沒有活躍房間</p>';
      return;
    }

    adminRoomList.innerHTML = rooms.map(room => {
      const humanPlayers = room.players.filter(p => p.role !== 'ai');
      const aiPlayers = room.players.filter(p => p.role === 'ai');
      const activePlayers = room.players.filter(p => p.isActive !== false);
      
      return `
        <div class="admin-room-item">
          <div class="admin-room-header">
            <div class="admin-room-name">${room.name}</div>
            <div class="admin-room-status ${room.status}">${room.status === 'waiting' ? '等待中' : '進行中'}</div>
          </div>
          <div class="admin-room-info">
            <p><strong>房主：</strong>${room.hostUsername}</p>
            <p><strong>人類玩家：</strong>${humanPlayers.length}/2</p>
            <p><strong>AI 對手：</strong>${aiPlayers.length > 0 ? '是' : '否'}</p>
            <p><strong>活躍玩家：</strong>${activePlayers.length}</p>
            <p><strong>創建時間：</strong>${new Date(room.createdAt).toLocaleString()}</p>
            ${room.startedAt ? `<p><strong>開始時間：</strong>${new Date(room.startedAt).toLocaleString()}</p>` : ''}
          </div>
          <div class="admin-room-actions">
            <button class="btn btn-danger force-close-room-btn" data-room-id="${room.id}">強制關閉</button>
          </div>
        </div>
      `;
    }).join('');
  }

  updateAdminStats(stats) {
    const totalRooms = document.getElementById('totalRooms');
    const activePlayers = document.getElementById('activePlayers');
    const aiGames = document.getElementById('aiGames');
    const playingGames = document.getElementById('playingGames');

    if (totalRooms) totalRooms.textContent = stats.totalRooms || 0;
    if (activePlayers) activePlayers.textContent = stats.activePlayers || 0;
    if (aiGames) aiGames.textContent = stats.aiGames || 0;
    if (playingGames) playingGames.textContent = stats.playingGames || 0;
  }

  async forceCloseRoom(roomId) {
    if (!confirm('確定要強制關閉這個房間嗎？此操作無法撤銷。')) {
      return;
    }

    try {
      const response = await fetch('/api/admin/force-close-room', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId })
      });

      const data = await response.json();
      
      if (data.success) {
        this.showMessage('房間已強制關閉');
        this.loadAdminData(); // 重新載入數據
      } else {
        this.showError(data.error || '強制關閉房間失敗');
      }
    } catch (error) {
      console.error('Force close room error:', error);
      this.showError('強制關閉房間失敗，請稍後再試');
    }
  }

  // 發送聊天訊息
  async sendChatMessage() {
    const chatInput = document.getElementById('chatInput');
    if (!chatInput || !chatInput.value.trim()) return;

    const message = chatInput.value.trim();
    chatInput.value = '';

    try {
      // 發送聊天訊息到後端
      const response = await fetch('/api/game/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId: this.currentRoom.id,
          userId: this.currentUser.id,
          username: this.currentUser.username,
          message: message
        })
      });

      const data = await response.json();
      if (!data.success) {
        this.showError(data.error || '發送訊息失敗');
      }
    } catch (error) {
      console.error('Send chat message error:', error);
      this.showError('發送訊息失敗，請稍後再試');
    }
  }
}

// 全域變數
let app;

// 頁面載入完成後初始化應用
document.addEventListener('DOMContentLoaded', () => {
  app = new ChessGameApp();
});
