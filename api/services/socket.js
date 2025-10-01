const socketIo = require("socket.io");
let io;
const notification = require("../models/notification");

function initSocket(server) {
  io = socketIo(server, {
    cors: {
      origin: ["http://localhost:8076", "https://meanstack.smartdatainc.com:8076","https://portal.gns-cpas.com"],
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  io.on("connection", (socket) => {
    const { staffId, clientId } = socket.handshake.query;
    let room;

    if (staffId) {
      room = `staff_${staffId}`;
      socket.join(room);
      console.log(`✅ Staff ${staffId} connected to room ${room}`);
    } else if (clientId) {
      room = `client_${clientId}`;
      socket.join(room);
      console.log(`✅ Client ${clientId} connected to room ${room}`);
    } else {
      console.log("⚠️ Socket connected without staffId or clientId");
      return;
    }

    socket.on("disconnect", () => {
      console.log(`❌ Disconnected: ${room}`);
    });
  });
}

function getIo() {
  if (!io) throw new Error("Socket.io not initialized");
  return io;
}

async function sendReminder(staffId, clientId) {
  let query = {};
  let room;

  if (staffId) {
    query.staffId = staffId;
    room = `staff_${staffId}`;
    query.mode = "staff";
  } else if (clientId) {
    query.clientId = clientId;
    room = `client_${clientId}`;
    query.mode = "client";
    // query.type = "Review Document";
  } else {
    console.log("⚠️ sendReminder called without staffId or clientId");
    return;
  }

  const data = await notification.find(query).sort({ createdAt: -1 });
  getIo().to(room).emit("reminder", data);
  console.log(`🔔 Reminder sent to ${room}:`, data);
}

module.exports = { initSocket, getIo, sendReminder };
