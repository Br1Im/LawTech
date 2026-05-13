/**
 * Socket.IO Manager — централизованное управление WebSocket-соединениями
 * 
 * События (серверные):
 *   - lead:new           — новый лид поступил
 *   - lead:updated       — лид обновлён (статус, оператор)
 *   - appointment:new    — клиент записан на консультацию
 *   - appointment:status — статус записи изменён (пришёл/не пришёл)
 *   - visit:result       — результат консультации (заключил/не заключил)
 *   - contract:new       — новый договор создан
 *   - contract:updated   — договор обновлён
 *   - act:new            — новый акт создан
 *   - act:confirmed      — акт подтверждён
 *   - chat:message       — новое сообщение в чате
 *   - employee:updated   — сотрудник обновлён
 *   - expense:new        — новый расход добавлен
 */

const jwt = require('jsonwebtoken');
const config = require('./config');

const JWT_SECRET = config.JWT_SECRET || config.jwt?.secret || 'law-tech-secret-key';

let io = null;

// Маппинг userId -> Set<socketId>
const userSockets = new Map();
// Маппинг officeId -> Set<socketId>
const officeSockets = new Map();
// Маппинг socketId -> { userId, officeId, role }
const socketMeta = new Map();

function init(httpServer) {
  const { Server } = require('socket.io');

  io = new Server(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
    path: '/socket.io',
    transports: ['websocket', 'polling'],
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    if (!token) {
      return next(new Error('Authentication required'));
    }
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      socket.user = decoded;
      next();
    } catch (err) {
      return next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const { id: userId, role, office_id: officeId } = socket.user;

    // Регистрация сокета
    if (!userSockets.has(userId)) userSockets.set(userId, new Set());
    userSockets.get(userId).add(socket.id);

    if (officeId) {
      if (!officeSockets.has(officeId)) officeSockets.set(officeId, new Set());
      officeSockets.get(officeId).add(socket.id);
      socket.join(`office:${officeId}`);
    }

    socketMeta.set(socket.id, { userId, officeId, role });

    console.log(`🔌 WS connected: user=${userId} role=${role} office=${officeId} sid=${socket.id}`);

    // Клиент может переключить офис (директор)
    socket.on('switch_office', (newOfficeId) => {
      if (officeId) {
        const set = officeSockets.get(officeId);
        if (set) set.delete(socket.id);
        socket.leave(`office:${officeId}`);
      }
      const meta = socketMeta.get(socket.id);
      if (meta) meta.officeId = newOfficeId;
      if (!officeSockets.has(newOfficeId)) officeSockets.set(newOfficeId, new Set());
      officeSockets.get(newOfficeId).add(socket.id);
      socket.join(`office:${newOfficeId}`);
    });

    socket.on('disconnect', () => {
      const meta = socketMeta.get(socket.id);
      if (meta) {
        const uSet = userSockets.get(meta.userId);
        if (uSet) {
          uSet.delete(socket.id);
          if (uSet.size === 0) userSockets.delete(meta.userId);
        }
        if (meta.officeId) {
          const oSet = officeSockets.get(meta.officeId);
          if (oSet) {
            oSet.delete(socket.id);
            if (oSet.size === 0) officeSockets.delete(meta.officeId);
          }
        }
        socketMeta.delete(socket.id);
      }
    });
  });

  return io;
}

/**
 * Отправить событие всем пользователям офиса
 */
function emitToOffice(officeId, event, data) {
  if (!io) return;
  io.to(`office:${officeId}`).emit(event, data);
}

/**
 * Отправить событие конкретному пользователю
 */
function emitToUser(userId, event, data) {
  if (!io) return;
  const sockets = userSockets.get(userId);
  if (sockets) {
    for (const sid of sockets) {
      io.to(sid).emit(event, data);
    }
  }
}

/**
 * Отправить событие всем пользователям офиса с определёнными ролями
 */
function emitToOfficeRoles(officeId, roles, event, data) {
  if (!io) return;
  const sockets = officeSockets.get(officeId);
  if (!sockets) return;
  for (const sid of sockets) {
    const meta = socketMeta.get(sid);
    if (meta && roles.includes(meta.role)) {
      io.to(sid).emit(event, data);
    }
  }
}

function getIO() {
  return io;
}

module.exports = {
  init,
  getIO,
  emitToOffice,
  emitToUser,
  emitToOfficeRoles,
};
