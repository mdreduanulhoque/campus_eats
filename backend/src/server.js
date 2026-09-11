const http = require('http');
const { Server } = require('socket.io');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const app = require('./app');
const { testConnection } = require('./config/db');

const PORT = process.env.PORT || 5000;
const server = http.createServer(app);

// Initialize Socket.io
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST']
  }
});

const { setSocketIO } = require('./services/socketService');
const { initCron } = require('./services/cronService');

setSocketIO(io);

// Attach io instance to app
app.set('io', io);

io.on('connection', (socket) => {
  console.log(`[Socket.io] Client connected: ${socket.id}`);

  // Joining room logic
  socket.on('join_canteen', (canteenId) => {
    socket.join(`canteen_${canteenId}`);
    console.log(`[Socket.io] Socket ${socket.id} joined canteen_${canteenId}`);
  });

  socket.on('join_user', (userId) => {
    socket.join(`user_${userId}`);
    console.log(`[Socket.io] Socket ${socket.id} joined user_${userId}`);
  });

  socket.on('disconnect', () => {
    console.log(`[Socket.io] Client disconnected: ${socket.id}`);
  });
});

// Start Server
async function startServer() {
  try {
    await testConnection();
    initCron();
    server.listen(PORT, () => {
      console.log(`=============================================`);
      console.log(`  CampusEats API Server Running on Port ${PORT}`);
      console.log(`  Health Check: http://localhost:${PORT}/api/health`);
      console.log(`  Environment:  ${process.env.NODE_ENV || 'development'}`);
      console.log(`=============================================`);
    });
  } catch (err) {
    console.error('[Server Startup Error] Failed to connect to MySQL:', err.message);
    console.error('Please ensure XAMPP MySQL is running on port 3306 and campus_eats database exists.');
    process.exit(1);
  }
}

if (require.main === module) {
  startServer();
}

module.exports = { server, io };
