const socketIo = require('socket.io');
let io;

function initSocket(server) {
    io = socketIo(server, {
        cors: {
          origin: 'http://localhost:3000', // Replace with your React app's origin
          methods: ['GET', 'POST'],
        },
      });

  io.on('connection', socket => {
    console.log('A user connected',socket.id)
    socket.on("message",(data)=>{
        console.log("inputMsg",data,socket.id);
        socket.emit("messages",data)
    })
    socket.on('disconnect', () => {
      console.log('A user disconnected');
    });
  });
}

function getIo() {
  if (!io) {
    throw new Error('Socket.io has not been initialized.');
  }
  return io;
}

module.exports = { initSocket, getIo };
