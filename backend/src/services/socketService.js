let ioInstance = null;

function setSocketIO(io) {
  ioInstance = io;
}

function getSocketIO() {
  return ioInstance;
}

function emitToCanteen(canteenId, event, data) {
  if (ioInstance) {
    ioInstance.to(`canteen_${canteenId}`).emit(event, data);
  }
}

function emitToUser(userId, event, data) {
  if (ioInstance) {
    ioInstance.to(`user_${userId}`).emit(event, data);
  }
}

module.exports = {
  setSocketIO,
  getSocketIO,
  emitToCanteen,
  emitToUser
};
