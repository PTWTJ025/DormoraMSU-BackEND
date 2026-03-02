const { WebSocketServer } = require("ws");

let wss = null;

function broadcastOnlineCount() {
  if (!wss) return;
  const count = wss.clients.size;
  const msg = JSON.stringify({ type: "online_count", count });
  wss.clients.forEach((ws) => {
    if (ws.readyState === 1) ws.send(msg);
  });
}

/**
 * สร้าง WebSocket server สำหรับ Presence (Online count)
 * @param {import('http').Server} server - HTTP server ที่ใช้ร่วมกับ Express
 */
function createPresenceServer(server) {
  wss = new WebSocketServer({ server, path: "/ws" });

  wss.on("connection", (ws) => {
    broadcastOnlineCount();
    ws.on("close", broadcastOnlineCount);
    ws.on("error", broadcastOnlineCount);
  });

  console.log("📡 WebSocket Presence: ws://[host]/ws");
  return wss;
}

/**
 * คืนจำนวนผู้ใช้ออนไลน์ (สำหรับ HTTP fallback ถ้าต้องการ)
 */
function getOnlineCount() {
  return wss ? wss.clients.size : 0;
}

module.exports = { createPresenceServer, getOnlineCount };
