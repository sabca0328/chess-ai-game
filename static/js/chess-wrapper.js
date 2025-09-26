// Chess.js 瀏覽器包裝器
// 這個檔案將 ESM 格式的 chess.js 轉換為瀏覽器兼容的格式

// 創建一個全局的 Chess 類別
window.Chess = class Chess {
  constructor(fen) {
    // 創建一個簡單的西洋棋引擎
    this.board = this.initializeBoard();
    this._turn = 'w';
    this.moveHistory = [];
    this.gameOver = false;
    this.winner = null;
    
    if (fen) {
      this.load(fen);
    }
  }
  
  initializeBoard() {
    // 初始化標準西洋棋棋盤
    const board = Array(8).fill(null).map(() => Array(8).fill(null));
    
    // 放置黑方棋子
    board[0] = ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'];
    board[1] = ['p', 'p', 'p', 'p', 'p', 'p', 'p', 'p'];
    
    // 放置白方棋子
    board[6] = ['P', 'P', 'P', 'P', 'P', 'P', 'P', 'P'];
    board[7] = ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R'];
    
    return board;
  }
  
  get(square) {
    const file = square.charCodeAt(0) - 97; // a=0, b=1, etc.
    const rank = 8 - parseInt(square[1]);   // 8=0, 7=1, etc.
    
    if (file < 0 || file > 7 || rank < 0 || rank > 7) {
      return null;
    }
    
    const piece = this.board[rank][file];
    if (!piece) return null;
    
    return {
      type: piece.toLowerCase(),
      color: piece === piece.toUpperCase() ? 'w' : 'b'
    };
  }
  
  set(square, piece) {
    const file = square.charCodeAt(0) - 97;
    const rank = 8 - parseInt(square[1]);
    
    if (file < 0 || file > 7 || rank < 0 || rank > 7) {
      return;
    }
    
    if (piece === null) {
      this.board[rank][file] = null;
    } else {
      // 將棋子對象轉換為字符
      const char = piece.color === 'w' ? piece.type.toUpperCase() : piece.type.toLowerCase();
      this.board[rank][file] = char;
    }
  }
  
  move(move) {
    // 簡單的移動驗證和執行
    if (this.gameOver) return null;
    
    let from, to;
    
    // 檢查移動格式
    if (typeof move === 'string') {
      // SAN 格式移動 (如 "Nf6", "e4")
      const sanMove = this.parseSANMove(move);
      if (!sanMove) return null;
      from = sanMove.from;
      to = sanMove.to;
    } else if (move.from && move.to) {
      // 坐標格式移動 (如 {from: "g8", to: "f6"})
      from = move.from;
      to = move.to;
    } else {
      return null;
    }
    
    const fromPiece = this.get(from);
    if (!fromPiece) return null;
    
    // 檢查是否輪到該顏色的棋子移動
    if (fromPiece.color !== this._turn) return null;
    
    // 檢查移動是否合法
    if (!this.isValidMove(from, to)) {
      return null;
    }
    
    // 檢查移動後是否會讓自己的王被將軍
    if (this.wouldMoveExposeKing(from, to)) {
      return null;
    }
    
    // 執行移動
    const fromFile = from.charCodeAt(0) - 97;
    const fromRank = 8 - parseInt(from[1]);
    const toFile = to.charCodeAt(0) - 97;
    const toRank = 8 - parseInt(to[1]);
    
    const piece = this.board[fromRank][fromFile];
    this.board[fromRank][fromFile] = null;
    this.board[toRank][toFile] = piece;
    
    // 處理王車易位
    if (fromPiece.type === 'k' && Math.abs(toFile - fromFile) === 2) {
      // 這是王車易位
      let rookFrom, rookTo;
      if (toFile === 6) { // 短易位 (王翼)
        rookFrom = fromRank === 0 ? 'h8' : 'h1';
        rookTo = fromRank === 0 ? 'f8' : 'f1';
      } else if (toFile === 2) { // 長易位 (后翼)
        rookFrom = fromRank === 0 ? 'a8' : 'a1';
        rookTo = fromRank === 0 ? 'd8' : 'd1';
      }
      
      if (rookFrom && rookTo) {
        const rookFromFile = rookFrom.charCodeAt(0) - 97;
        const rookFromRank = 8 - parseInt(rookFrom[1]);
        const rookToFile = rookTo.charCodeAt(0) - 97;
        const rookToRank = 8 - parseInt(rookTo[1]);
        
        const rook = this.board[rookFromRank][rookFromFile];
        this.board[rookFromRank][rookFromFile] = null;
        this.board[rookToRank][rookToFile] = rook;
      }
    }
    
    // 切換回合
    this._turn = this._turn === 'w' ? 'b' : 'w';
    
    const result = {
      from: from,
      to: to,
      piece: fromPiece.type,
      color: fromPiece.color,
      san: typeof move === 'string' ? move : `${from}-${to}`,
      fen: this.fen()
    };
    
    this.moveHistory.push(result);
    return result;
  }
  
  parseSANMove(sanMove) {
    // 支援坐標格式和 SAN 格式的移動解析
    if (!sanMove || typeof sanMove !== 'string') return null;
    
    // 坐標格式移動 (如 "e2-e4", "b8-c6", "f6xe4")
    if (sanMove.includes('-') || sanMove.includes('x')) {
      const parts = sanMove.split(/[-x]/);
      if (parts.length === 2) {
        const from = parts[0];
        const to = parts[1];
        
        // 檢查升變 (如 "d7-d8=Q")
        let targetSquare = to;
        if (to.includes('=')) {
          targetSquare = to.split('=')[0];
        }
        
        // 檢查將軍/將死 (如 "f3-h4+", "h5-h8#")
        if (targetSquare.endsWith('+') || targetSquare.endsWith('#')) {
          targetSquare = targetSquare.slice(0, -1);
        }
        
        if (this.isValidSquare(from) && this.isValidSquare(targetSquare)) {
          return {
            from: from,
            to: targetSquare
          };
        }
      }
    }
    
    // 兵移動 (如 "e4", "d5")
    if (sanMove.length === 2 && /^[a-h][1-8]$/.test(sanMove)) {
      const file = sanMove[0];
      const rank = sanMove[1];
      const targetSquare = sanMove;
      
      // 查找可以移動到目標位置的兵
      const fromSquare = this.findPiecePosition('p', this._turn, targetSquare);
      if (fromSquare) {
        return {
          from: fromSquare,
          to: targetSquare
        };
      }
    }
    
    // 棋子移動 (如 "Nf6", "Bxc5", "Qd1", "Nxg4", "Nbd5", "N1d5")
    if (sanMove.length >= 3 && /^[KQRBN][a-h]?[1-8]?[x]?[a-h][1-8][+#]?$/.test(sanMove)) {
      const pieceType = sanMove[0]; // K, Q, R, B, N
      
      // 提取目標位置，去除結尾的 + 或 #
      let targetSquare;
      if (sanMove.includes('x')) {
        // 吃子移動：找到 'x' 後的位置
        const xIndex = sanMove.indexOf('x');
        targetSquare = sanMove.slice(xIndex + 1);
      } else {
        // 非吃子移動：取最後兩個字符
        targetSquare = sanMove.slice(-2);
      }
      
      if (targetSquare.endsWith('+') || targetSquare.endsWith('#')) {
        targetSquare = targetSquare.slice(0, -1);
      }
      
      // 檢查是否為吃子移動 (包含 'x')
      const isCapture = sanMove.includes('x');
      
      // 解析起始位置提示
      let fromFile = null;
      let fromRank = null;
      
      // 檢查是否有文件或行提示 (如 "Nbd5", "N1d5", "Nbd5")
      const movePart = sanMove.slice(1); // 去除棋子類型
      const targetPart = targetSquare;
      
      // 提取文件提示 (a-h)
      const fileMatch = movePart.match(/^([a-h])/);
      if (fileMatch) {
        fromFile = fileMatch[1];
      }
      
      // 提取行提示 (1-8)
      const rankMatch = movePart.match(/([1-8])/);
      if (rankMatch) {
        fromRank = parseInt(rankMatch[1]);
      }
      
      // 根據棋子類型和當前回合確定起始位置
      let fromSquare = null;
      
      if (this._turn === 'b') {
        // 黑方移動
        switch (pieceType) {
          case 'N': // 馬
            fromSquare = this.findPiecePositionWithHint('n', 'b', targetSquare, fromFile, fromRank);
            break;
          case 'B': // 象
            fromSquare = this.findPiecePositionWithHint('b', 'b', targetSquare, fromFile, fromRank);
            break;
          case 'R': // 車
            fromSquare = this.findPiecePositionWithHint('r', 'b', targetSquare, fromFile, fromRank);
            break;
          case 'Q': // 后
            fromSquare = this.findPiecePositionWithHint('q', 'b', targetSquare, fromFile, fromRank);
            break;
          case 'K': // 王
            fromSquare = this.findPiecePositionWithHint('k', 'b', targetSquare, fromFile, fromRank);
            break;
        }
      } else {
        // 白方移動
        switch (pieceType) {
          case 'N': // 馬
            fromSquare = this.findPiecePositionWithHint('n', 'w', targetSquare, fromFile, fromRank);
            break;
          case 'B': // 象
            fromSquare = this.findPiecePositionWithHint('b', 'w', targetSquare, fromFile, fromRank);
            break;
          case 'R': // 車
            fromSquare = this.findPiecePositionWithHint('r', 'w', targetSquare, fromFile, fromRank);
            break;
          case 'Q': // 后
            fromSquare = this.findPiecePositionWithHint('q', 'w', targetSquare, fromFile, fromRank);
            break;
          case 'K': // 王
            fromSquare = this.findPiecePositionWithHint('k', 'w', targetSquare, fromFile, fromRank);
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
    
    return null;
  }
  
  canKnightReach(from, to) {
    // 檢查馬是否可以從 from 移動到 to
    const fromFile = from.charCodeAt(0) - 97;
    const fromRank = 8 - parseInt(from[1]);
    const toFile = to.charCodeAt(0) - 97;
    const toRank = 8 - parseInt(to[1]);
    
    const fileDiff = Math.abs(toFile - fromFile);
    const rankDiff = Math.abs(toRank - fromRank);
    
    // 馬的移動是 L 形：2格+1格 或 1格+2格
    return (fileDiff === 2 && rankDiff === 1) || (fileDiff === 1 && rankDiff === 2);
  }
  
  isValidSquare(square) {
    // 檢查坐標是否有效
    if (!square || square.length !== 2) return false;
    const file = square.charCodeAt(0) - 97;
    const rank = 8 - parseInt(square[1]);
    return file >= 0 && file <= 7 && rank >= 0 && rank <= 7;
  }
  
  findPiecePosition(pieceType, color, targetSquare) {
    // 查找指定類型和顏色的棋子，並檢查是否可以到達目標位置
    for (let rank = 0; rank < 8; rank++) {
      for (let file = 0; file < 8; file++) {
        const square = String.fromCharCode(97 + file) + (8 - rank);
        const piece = this.get(square);
        
        if (piece && piece.type === pieceType && piece.color === color) {
          // 檢查這個棋子是否可以到達目標位置
          if (this.canPieceReach(square, targetSquare, pieceType)) {
            return square;
          }
        }
      }
    }
    return null;
  }
  
  findPiecePositionWithHint(pieceType, color, targetSquare, fromFile, fromRank) {
    // 查找指定類型和顏色的棋子，使用起始位置提示來區分多個相同棋子
    const candidates = [];
    
    for (let rank = 0; rank < 8; rank++) {
      for (let file = 0; file < 8; file++) {
        const square = String.fromCharCode(97 + file) + (8 - rank);
        const piece = this.get(square);
        
        if (piece && piece.type === pieceType && piece.color === color) {
          // 檢查這個棋子是否可以到達目標位置
          if (this.canPieceReach(square, targetSquare, pieceType)) {
            candidates.push(square);
          }
        }
      }
    }
    
    // 如果只有一個候選，直接返回
    if (candidates.length === 1) {
      return candidates[0];
    }
    
    // 如果有多個候選，使用提示來篩選
    if (candidates.length > 1) {
      // 使用文件提示篩選
      if (fromFile) {
        const fileFiltered = candidates.filter(square => square[0] === fromFile);
        if (fileFiltered.length === 1) {
          return fileFiltered[0];
        }
        if (fileFiltered.length > 0) {
          candidates = fileFiltered;
        }
      }
      
      // 使用行提示篩選
      if (fromRank) {
        const rankFiltered = candidates.filter(square => {
          const squareRank = 8 - parseInt(square[1]);
          return squareRank === fromRank;
        });
        if (rankFiltered.length === 1) {
          return rankFiltered[0];
        }
        if (rankFiltered.length > 0) {
          candidates = rankFiltered;
        }
      }
      
      // 如果仍然有多個候選，使用智能選擇
      if (candidates.length > 1) {
        // 優先選擇更靠近目標位置的棋子
        return this.selectBestCandidate(candidates, targetSquare, pieceType);
      }
    }
    
    return null;
  }
  
  selectBestCandidate(candidates, targetSquare, pieceType) {
    // 智能選擇最佳候選棋子
    if (candidates.length === 0) return null;
    if (candidates.length === 1) return candidates[0];
    
    // 對於馬，優先選擇更靠近目標位置的
    if (pieceType === 'n') {
      return this.selectClosestKnight(candidates, targetSquare);
    }
    
    // 對於其他棋子，優先選擇更靠近目標位置的
    return this.selectClosestPiece(candidates, targetSquare);
  }
  
  selectClosestKnight(candidates, targetSquare) {
    // 馬的移動是 L 形，選擇移動距離最短的
    let bestCandidate = candidates[0];
    let minDistance = this.getKnightDistance(bestCandidate, targetSquare);
    
    for (let i = 1; i < candidates.length; i++) {
      const distance = this.getKnightDistance(candidates[i], targetSquare);
      if (distance < minDistance) {
        minDistance = distance;
        bestCandidate = candidates[i];
      }
    }
    
    return bestCandidate;
  }
  
  selectClosestPiece(candidates, targetSquare) {
    // 選擇最靠近目標位置的棋子
    let bestCandidate = candidates[0];
    let minDistance = this.getDistance(bestCandidate, targetSquare);
    
    for (let i = 1; i < candidates.length; i++) {
      const distance = this.getDistance(candidates[i], targetSquare);
      if (distance < minDistance) {
        minDistance = distance;
        bestCandidate = candidates[i];
      }
    }
    
    return bestCandidate;
  }
  
  getKnightDistance(from, to) {
    // 計算馬移動的距離（L 形移動）
    const fromFile = from.charCodeAt(0) - 97;
    const fromRank = 8 - parseInt(from[1]);
    const toFile = to.charCodeAt(0) - 97;
    const toRank = 8 - parseInt(to[1]);
    
    const fileDiff = Math.abs(toFile - fromFile);
    const rankDiff = Math.abs(toRank - fromRank);
    
    // 馬的移動距離是 3（L 形：2+1 或 1+2）
    return fileDiff + rankDiff;
  }
  
  getDistance(from, to) {
    // 計算兩點之間的歐幾里得距離
    const fromFile = from.charCodeAt(0) - 97;
    const fromRank = 8 - parseInt(from[1]);
    const toFile = to.charCodeAt(0) - 97;
    const toRank = 8 - parseInt(to[1]);
    
    const fileDiff = toFile - fromFile;
    const rankDiff = toRank - fromRank;
    
    return Math.sqrt(fileDiff * fileDiff + rankDiff * rankDiff);
  }
  
  canPieceReach(from, to, pieceType) {
    // 檢查指定類型的棋子是否可以從 from 移動到 to
    const fromFile = from.charCodeAt(0) - 97;
    const fromRank = 8 - parseInt(from[1]);
    const toFile = to.charCodeAt(0) - 97;
    const toRank = 8 - parseInt(to[1]);
    
    const fileDiff = Math.abs(toFile - fromFile);
    const rankDiff = Math.abs(toRank - fromRank);
    
    switch (pieceType) {
      case 'p': // 兵
        return this.canPawnReach(from, to);
      
      case 'n': // 馬
        return (fileDiff === 2 && rankDiff === 1) || (fileDiff === 1 && rankDiff === 2);
      
      case 'b': // 象
        return fileDiff === rankDiff && this.isPathClear(from, to);
      
      case 'r': // 車
        return (fileDiff === 0 || rankDiff === 0) && this.isPathClear(from, to);
      
      case 'q': // 后
        return (fileDiff === rankDiff || fileDiff === 0 || rankDiff === 0) && this.isPathClear(from, to);
      
      case 'k': // 王
        return fileDiff <= 1 && rankDiff <= 1;
      
      default:
        return false;
    }
  }
  
  canPawnReach(from, to) {
    // 檢查兵是否可以從 from 移動到 to
    const fromFile = from.charCodeAt(0) - 97;
    const fromRank = 8 - parseInt(from[1]);
    const toFile = to.charCodeAt(0) - 97;
    const toRank = 8 - parseInt(to[1]);
    
    const fileDiff = Math.abs(toFile - fromFile);
    const rankDiff = Math.abs(toRank - fromRank);
    
    // 根據顏色確定移動方向
    const piece = this.get(from);
    if (!piece) return false;
    
    const direction = piece.color === 'w' ? -1 : 1; // 白方向上，黑方向下
    const targetPiece = this.get(to);
    
    // 檢查是否為吃子移動（對角移動）
    if (fileDiff === 1 && rankDiff === 1) {
      // 兵吃子：必須是對角移動，且目標位置有對方棋子
      const expectedRank = fromRank + direction;
      if (toRank === expectedRank && targetPiece && targetPiece.color !== piece.color) {
        return true;
      }
      return false;
    }
    
    // 檢查是否為前進移動
    if (fileDiff !== 0) return false;
    
    // 檢查目標位置是否為空（前進移動不能吃子）
    if (targetPiece) return false;
    
    const expectedRank = fromRank + direction;
    
    // 檢查是否移動到正確的目標位置
    if (toRank !== expectedRank) {
      // 檢查是否為起始位置的兩格移動
      const startRank = piece.color === 'w' ? 6 : 1; // 白方起始在第6行，黑方在第1行
      if (fromRank === startRank && toRank === fromRank + 2 * direction) {
        return true;
      }
      return false;
    }
    
    return true;
  }
  
  isPathClear(from, to) {
    // 檢查從 from 到 to 的路徑是否被阻擋
    const fromFile = from.charCodeAt(0) - 97;
    const fromRank = 8 - parseInt(from[1]);
    const toFile = to.charCodeAt(0) - 97;
    const toRank = 8 - parseInt(to[1]);
    
    const fileStep = toFile > fromFile ? 1 : toFile < fromFile ? -1 : 0;
    const rankStep = toRank > fromRank ? 1 : toRank < fromRank ? -1 : 0;
    
    let currentFile = fromFile + fileStep;
    let currentRank = fromRank + rankStep;
    
    while (currentFile !== toFile || currentRank !== toRank) {
      const square = String.fromCharCode(97 + currentFile) + (8 - currentRank);
      if (this.get(square)) {
        return false; // 路徑被阻擋
      }
      currentFile += fileStep;
      currentRank += rankStep;
    }
    
    return true; // 路徑暢通
  }
  
  fen() {
    // 生成 FEN 字串
    let fen = '';
    
    for (let rank = 0; rank < 8; rank++) {
      let emptyCount = 0;
      for (let file = 0; file < 8; file++) {
        const piece = this.board[rank][file];
        if (piece) {
          if (emptyCount > 0) {
            fen += emptyCount;
            emptyCount = 0;
          }
          fen += piece;
        } else {
          emptyCount++;
        }
      }
      if (emptyCount > 0) {
        fen += emptyCount;
      }
      if (rank < 7) fen += '/';
    }
    
    fen += ` ${this._turn} KQkq - 0 1`;
    return fen;
  }
  
  load(fen) {
    // 從 FEN 字串載入棋盤
    const parts = fen.split(' ');
    const boardFen = parts[0];
    this._turn = parts[1] || 'w';
    
    const ranks = boardFen.split('/');
    this.board = Array(8).fill(null).map(() => Array(8).fill(null));
    
    for (let rank = 0; rank < 8; rank++) {
      let file = 0;
      for (const char of ranks[rank]) {
        if (isNaN(char)) {
          this.board[rank][file] = char;
          file++;
        } else {
          file += parseInt(char);
        }
      }
    }
  }
  
  isGameOver() {
    return this.gameOver;
  }
  
  isCheckmate() {
    return this.gameOver && this.winner;
  }
  
  isDraw() {
    return this.gameOver && !this.winner;
  }
  
  isCheck() {
    // 簡單的將軍檢查
    return false;
  }
  
  turn() {
    // 返回當前回合
    return this._turn;
  }
  
  moves(options = {}) {
    // 返回所有可能的移動
    const moves = [];
    
    if (options.square) {
      // 返回特定棋子的可能移動
      const piece = this.get(options.square);
      if (!piece || piece.color !== this._turn) return [];
      
      // 根據棋子類型生成合法移動
      moves.push(...this.getPieceMoves(options.square, piece));
    } else {
      // 返回當前回合所有可能的移動
      for (let rank = 0; rank < 8; rank++) {
        for (let file = 0; file < 8; file++) {
          const square = String.fromCharCode(97 + file) + (8 - rank);
          const piece = this.get(square);
          if (piece && piece.color === this._turn) {
            moves.push(...this.getPieceMoves(square, piece));
          }
        }
      }
    }
    
    return options.verbose ? moves : moves.map(m => `${m.from}-${m.to}`);
  }

  getPieceMoves(square, piece) {
    const moves = [];
    const [file, rank] = this.squareToCoords(square);
    
    switch (piece.type) {
      case 'p': // 兵
        moves.push(...this.getPawnMoves(file, rank, piece.color));
        break;
      case 'r': // 車
        moves.push(...this.getRookMoves(file, rank, piece.color));
        break;
      case 'n': // 馬
        moves.push(...this.getKnightMoves(file, rank, piece.color));
        break;
      case 'b': // 象
        moves.push(...this.getBishopMoves(file, rank, piece.color));
        break;
      case 'q': // 后
        moves.push(...this.getQueenMoves(file, rank, piece.color));
        break;
      case 'k': // 王
        moves.push(...this.getKingMoves(file, rank, piece.color));
        break;
    }
    
    return moves.map(move => ({
      from: square,
      to: this.coordsToSquare(move.file, move.rank),
      piece: piece.type,
      color: piece.color
    }));
  }

  squareToCoords(square) {
    const file = square.charCodeAt(0) - 97; // a=0, b=1, etc.
    const rank = 8 - parseInt(square[1]);   // 8=0, 7=1, etc.
    return [file, rank];
  }

  coordsToSquare(file, rank) {
    return String.fromCharCode(97 + file) + (8 - rank);
  }

  getPawnMoves(file, rank, color) {
    const moves = [];
    const direction = color === 'w' ? -1 : 1; // 白方向上，黑方向下
    const startRank = color === 'w' ? 6 : 1; // 白方起始在第6行，黑方在第1行
    
    // 向前移動
    const newRank = rank + direction;
    if (newRank >= 0 && newRank < 8) {
      const targetSquare = this.coordsToSquare(file, newRank);
      if (!this.get(targetSquare)) {
        moves.push({ file, rank: newRank });
        
        // 起始位置可以向前移動兩格
        if (rank === startRank) {
          const newRank2 = rank + 2 * direction;
          if (newRank2 >= 0 && newRank2 < 8) {
            const targetSquare2 = this.coordsToSquare(file, newRank2);
            if (!this.get(targetSquare2)) {
              moves.push({ file, rank: newRank2 });
            }
          }
        }
      }
    }
    
    // 吃子（斜向）
    for (const fileOffset of [-1, 1]) {
      const newFile = file + fileOffset;
      const newRank = rank + direction;
      if (newFile >= 0 && newFile < 8 && newRank >= 0 && newRank < 8) {
        const targetSquare = this.coordsToSquare(newFile, newRank);
        const targetPiece = this.get(targetSquare);
        if (targetPiece && targetPiece.color !== color) {
          moves.push({ file: newFile, rank: newRank });
        }
      }
    }
    
    return moves;
  }

  getRookMoves(file, rank, color) {
    const moves = [];
    const directions = [[0, 1], [0, -1], [1, 0], [-1, 0]]; // 上下左右
    
    for (const [fileOffset, rankOffset] of directions) {
      for (let i = 1; i < 8; i++) {
        const newFile = file + fileOffset * i;
        const newRank = rank + rankOffset * i;
        
        if (newFile < 0 || newFile >= 8 || newRank < 0 || newRank >= 8) break;
        
        const targetSquare = this.coordsToSquare(newFile, newRank);
        const targetPiece = this.get(targetSquare);
        
        if (!targetPiece) {
          moves.push({ file: newFile, rank: newRank });
        } else {
          if (targetPiece.color !== color) {
            moves.push({ file: newFile, rank: newRank });
          }
          break;
        }
      }
    }
    
    return moves;
  }

  getKnightMoves(file, rank, color) {
    const moves = [];
    const knightMoves = [
      [-2, -1], [-2, 1], [-1, -2], [-1, 2],
      [1, -2], [1, 2], [2, -1], [2, 1]
    ];
    
    for (const [fileOffset, rankOffset] of knightMoves) {
      const newFile = file + fileOffset;
      const newRank = rank + rankOffset;
      
      if (newFile >= 0 && newFile < 8 && newRank >= 0 && newRank < 8) {
        const targetSquare = this.coordsToSquare(newFile, newRank);
        const targetPiece = this.get(targetSquare);
        
        if (!targetPiece || targetPiece.color !== color) {
          moves.push({ file: newFile, rank: newRank });
        }
      }
    }
    
    return moves;
  }

  getBishopMoves(file, rank, color) {
    const moves = [];
    const directions = [[1, 1], [1, -1], [-1, 1], [-1, -1]]; // 四個對角線方向
    
    for (const [fileOffset, rankOffset] of directions) {
      for (let i = 1; i < 8; i++) {
        const newFile = file + fileOffset * i;
        const newRank = rank + rankOffset * i;
        
        if (newFile < 0 || newFile >= 8 || newRank < 0 || newRank >= 8) break;
        
        const targetSquare = this.coordsToSquare(newFile, newRank);
        const targetPiece = this.get(targetSquare);
        
        if (!targetPiece) {
          moves.push({ file: newFile, rank: newRank });
        } else {
          if (targetPiece.color !== color) {
            moves.push({ file: newFile, rank: newRank });
          }
          break;
        }
      }
    }
    
    return moves;
  }

  getQueenMoves(file, rank, color) {
    // 后 = 車 + 象
    return [...this.getRookMoves(file, rank, color), ...this.getBishopMoves(file, rank, color)];
  }

  getKingMoves(file, rank, color) {
    const moves = [];
    const directions = [
      [-1, -1], [-1, 0], [-1, 1],
      [0, -1],           [0, 1],
      [1, -1],  [1, 0],  [1, 1]
    ];
    
    for (const [fileOffset, rankOffset] of directions) {
      const newFile = file + fileOffset;
      const newRank = rank + rankOffset;
      
      if (newFile >= 0 && newFile < 8 && newRank >= 0 && newRank < 8) {
        const targetSquare = this.coordsToSquare(newFile, newRank);
        const targetPiece = this.get(targetSquare);
        
        if (!targetPiece || targetPiece.color !== color) {
          moves.push({ file: newFile, rank: newRank });
        }
      }
    }
    
    return moves;
  }
  
  validateMove(move) {
    // 簡單的移動驗證
    return true;
  }
  
  isValidMove(from, to) {
    const fromPiece = this.get(from);
    if (!fromPiece) return false;
    
    const toPiece = this.get(to);
    
    // 不能吃自己的棋子
    if (toPiece && toPiece.color === fromPiece.color) return false;
    
    // 特別處理王車易位
    if (fromPiece.type === 'k') {
      const fromFile = from.charCodeAt(0) - 97;
      const toFile = to.charCodeAt(0) - 97;
      const fromRank = 8 - parseInt(from[1]);
      
      // 檢查是否是王車易位（王移動兩格）
      if (Math.abs(toFile - fromFile) === 2 && (fromRank === 0 || fromRank === 7)) {
        // 檢查王車易位的條件
        return this.canCastle(from, to, fromPiece.color);
      }
    }
    
    // 檢查移動是否符合棋子規則
    return this.canPieceReach(from, to, fromPiece.type);
  }
  
  canCastle(from, to, color) {
    const fromFile = from.charCodeAt(0) - 97;
    const toFile = to.charCodeAt(0) - 97;
    const fromRank = 8 - parseInt(from[1]);
    
    // 簡化的王車易位檢查 - 假設總是允許
    // 在實際應用中，應該檢查：
    // 1. 王和車是否都沒有移動過
    // 2. 王和車之間的路徑是否暢通
    // 3. 王是否在將軍狀態
    // 4. 王經過的路徑是否安全
    
    // 檢查是否是有效的王車易位目標位置
    if (color === 'w') {
      // 白方：e1-g1 (短易位) 或 e1-c1 (長易位)
      return (fromRank === 7 && fromFile === 4 && (toFile === 6 || toFile === 2));
    } else {
      // 黑方：e8-g8 (短易位) 或 e8-c8 (長易位)
      return (fromRank === 0 && fromFile === 4 && (toFile === 6 || toFile === 2));
    }
  }
  
  wouldMoveExposeKing(from, to) {
    // 模擬移動
    const fromPiece = this.get(from);
    const toPiece = this.get(to);
    
    // 執行移動
    this.set(to, fromPiece);
    this.set(from, null);
    
    // 檢查自己的王是否被將軍
    const isInCheck = this.isInCheck(this._turn);
    
    // 恢復移動
    this.set(from, fromPiece);
    this.set(to, toPiece);
    
    return isInCheck;
  }
  
  isInCheck(color) {
    // 找到王的位置
    const kingSquare = this.findKing(color);
    if (!kingSquare) return false;
    
    // 檢查是否被對方棋子攻擊
    const opponentColor = color === 'w' ? 'b' : 'w';
    
    for (let rank = 0; rank < 8; rank++) {
      for (let file = 0; file < 8; file++) {
        const square = String.fromCharCode(97 + file) + (8 - rank);
        const piece = this.get(square);
        
        if (piece && piece.color === opponentColor) {
          // 檢查這個棋子是否可以攻擊王
          if (this.canPieceReach(square, kingSquare, piece.type)) {
            return true;
          }
        }
      }
    }
    
    return false;
  }
  
  findKing(color) {
    for (let rank = 0; rank < 8; rank++) {
      for (let file = 0; file < 8; file++) {
        const square = String.fromCharCode(97 + file) + (8 - rank);
        const piece = this.get(square);
        
        if (piece && piece.type === 'k' && piece.color === color) {
          return square;
        }
      }
    }
    return null;
  }

  reset() {
    this.board = this.initializeBoard();
    this._turn = 'w';
    this.moveHistory = [];
    this.gameOver = false;
    this.winner = null;
  }
};

// 導出常量
window.WHITE = 'w';
window.BLACK = 'b';
window.PAWN = 'p';
window.KNIGHT = 'n';
window.BISHOP = 'b';
window.ROOK = 'r';
window.QUEEN = 'q';
window.KING = 'k';
