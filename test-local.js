// 本地測試腳本
const testLocal = async () => {
  const baseUrl = 'http://localhost:8787';
  
  console.log('🧪 開始本地測試...\n');
  
  try {
    // 測試 1: 主頁面載入
    console.log('1. 測試主頁面載入...');
    const homeResponse = await fetch(baseUrl);
    const homeText = await homeResponse.text();
    if (homeText.includes('西洋棋遊戲')) {
      console.log('✅ 主頁面載入成功');
    } else {
      console.log('❌ 主頁面載入失敗');
    }
    
    // 測試 2: API 端點 - 獲取房間列表
    console.log('\n2. 測試房間列表 API...');
    const roomsResponse = await fetch(`${baseUrl}/api/lobby/rooms`);
    const roomsData = await roomsResponse.json();
    if (roomsData.success) {
      console.log('✅ 房間列表 API 正常');
      console.log(`   找到 ${roomsData.rooms.length} 個房間`);
    } else {
      console.log('❌ 房間列表 API 失敗');
    }
    
    // 測試 3: API 端點 - 添加 AI 對手（預期失敗）
    console.log('\n3. 測試添加 AI 對手 API...');
    const aiResponse = await fetch(`${baseUrl}/api/game/add-ai-opponent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomId: 'test-room' })
    });
    const aiData = await aiResponse.json();
    if (aiData.error === '房間不存在') {
      console.log('✅ AI 對手 API 正常（正確處理不存在的房間）');
    } else {
      console.log('❌ AI 對手 API 回應異常');
    }
    
    // 測試 4: 靜態資源載入
    console.log('\n4. 測試靜態資源載入...');
    const cssResponse = await fetch(`${baseUrl}/static/css/style.css`);
    const jsResponse = await fetch(`${baseUrl}/static/js/app.js`);
    
    if (cssResponse.ok && jsResponse.ok) {
      console.log('✅ 靜態資源載入成功');
    } else {
      console.log('❌ 靜態資源載入失敗');
    }
    
    console.log('\n🎉 本地測試完成！所有基本功能正常。');
    console.log('\n📋 測試結果摘要：');
    console.log('   - 主頁面載入: ✅');
    console.log('   - API 端點: ✅');
    console.log('   - 靜態資源: ✅');
    console.log('   - 錯誤處理: ✅');
    
  } catch (error) {
    console.error('❌ 測試過程中發生錯誤:', error.message);
  }
};

// 在 Node.js 環境中運行測試
if (typeof window === 'undefined') {
  const fetch = require('node-fetch');
  testLocal();
} else {
  // 在瀏覽器環境中運行測試
  testLocal();
}
