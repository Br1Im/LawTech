const Message = require('../models/message');
const Office = require('../models/office');
const { formatMessageResponse } = require('../utils/formatters');
const { emitChatMessage } = require('../middleware/socketEmitter');
const db = require('../db');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const config = require('../config');

/**
 * Контроллер для работы с чатом офисов
 * Каналы:
 *   'reception'    — Администратор + Менеджер + ОКК + Директор
 *   'call_center'  — Начальник КЦ + Менеджер + ОКК + Директор
 *   'cc_internal'  — Начальник КЦ + Операторы КЦ
 */

const CHANNEL_ACCESS = {
  reception:    ['admin', 'administrator', 'manager', 'okk', 'director'],
  call_center:  ['cc_manager', 'manager', 'okk', 'director'],
  cc_internal:  ['cc_manager', 'cc_operator'],
};

function hasChannelAccess(role, channel) {
  const allowed = CHANNEL_ACCESS[channel];
  if (!allowed) return false;
  return allowed.includes(role);
}

// Multer config for chat file uploads
const chatUploadDir = path.join(config.paths?.uploads || '/app/uploads', 'chat');
if (!fs.existsSync(chatUploadDir)) {
  fs.mkdirSync(chatUploadDir, { recursive: true });
}

const chatStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, chatUploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `chat_${Date.now()}_${Math.random().toString(36).slice(2, 8)}${ext}`);
  }
});

const chatUpload = multer({
  storage: chatStorage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
});

function getFileType(mimetype) {
  if (mimetype?.startsWith('image/')) return 'image';
  if (mimetype?.startsWith('video/')) return 'video';
  return 'document';
}

const chatController = {
  chatUploadMiddleware: chatUpload.single('file'),

  async getAvailableChannels(req, res) {
    try {
      const role = req.user.role;
      const channels = [];
      if (hasChannelAccess(role, 'reception'))   channels.push({ key: 'reception', label: 'Ресепшен' });
      if (hasChannelAccess(role, 'call_center')) channels.push({ key: 'call_center', label: 'Колл-центр' });
      if (hasChannelAccess(role, 'cc_internal')) channels.push({ key: 'cc_internal', label: 'Внутренний чат КЦ' });
      return res.json({ channels });
    } catch (error) {
      console.error('getAvailableChannels error:', error);
      return res.status(500).json({ success: false, message: 'Внутренняя ошибка сервера' });
    }
  },

  async getOfficeMessages(req, res) {
    try {
      const { officeId } = req.params;
      const channel = req.query.channel || 'reception';
      const role = req.user.role;

      if (!hasChannelAccess(role, channel))
        return res.status(403).json({ success: false, message: 'Нет доступа к каналу' });

      const messages = await Message.getByOfficeAndChannel(officeId, channel);
      const formatted = messages.map(m => formatMessageResponse(m, req.user.id));

      // Mark all as delivered for this user
      const unreadIds = messages
        .filter(m => m.sender_id !== req.user.id && (!m.status || m.status === 'sent'))
        .map(m => m.id);
      if (unreadIds.length > 0) {
        await db.query(
          `UPDATE messages SET status = 'delivered' WHERE id IN (?) AND status = 'sent'`,
          [unreadIds]
        );
      }

      return res.json(formatted);
    } catch (error) {
      console.error('getOfficeMessages error:', error);
      return res.status(500).json({ success: false, message: 'Внутренняя ошибка сервера' });
    }
  },

  async sendMessage(req, res) {
    try {
      const { officeId } = req.params;
      const { text, channel = 'reception' } = req.body;
      const role = req.user.role;

      if (!hasChannelAccess(role, channel))
        return res.status(403).json({ success: false, message: 'Нет доступа к каналу' });

      const hasFile = !!req.file;
      if ((!text || !text.trim()) && !hasFile)
        return res.status(400).json({ success: false, message: 'Текст или файл обязательны' });

      const [userRows] = await db.query('SELECT first_name, last_name, email, role FROM users WHERE id = ?', [req.user.id]);
      const u = userRows[0] || {};
      const senderName = `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.email || req.user.email;

      let fileUrl = null, fileName = null, fileType = null;
      if (hasFile) {
        fileUrl = `/uploads/chat/${req.file.filename}`;
        fileName = req.file.originalname;
        fileType = getFileType(req.file.mimetype);
      }

      const message = await Message.create({
        content: (text || '').trim() || (hasFile ? fileName : ''),
        sender_name: senderName,
        office_id: officeId,
        sender_id: req.user.id,
        channel,
        file_url: fileUrl,
        file_name: fileName,
        file_type: fileType,
      });

      message.user_role = u.role;
      message.first_name = u.first_name;
      message.last_name = u.last_name;
      message.user_email = u.email;

      const formatted = formatMessageResponse(message, req.user.id);
      emitChatMessage(officeId, channel, formatted);

      return res.status(201).json(formatted);
    } catch (error) {
      console.error('sendMessage error:', error);
      return res.status(500).json({ success: false, message: 'Внутренняя ошибка сервера' });
    }
  },

  async markMessageAsRead(req, res) {
    try {
      const { messageId } = req.params;
      await db.query(`UPDATE messages SET is_read = 1, status = 'read' WHERE id = ?`, [messageId]);
      return res.json({ success: true });
    } catch (error) {
      console.error('markMessageAsRead error:', error);
      return res.status(500).json({ success: false, message: 'Внутренняя ошибка сервера' });
    }
  },

  async markAllAsRead(req, res) {
    try {
      const { officeId } = req.params;
      const { channel = 'reception' } = req.body;
      await db.query(
        `UPDATE messages SET is_read = 1, status = 'read'
         WHERE office_id = ? AND channel = ? AND sender_id != ? AND status != 'read'`,
        [officeId, channel, req.user.id]
      );
      return res.json({ success: true });
    } catch (error) {
      console.error('markAllAsRead error:', error);
      return res.status(500).json({ success: false, message: 'Внутренняя ошибка сервера' });
    }
  },

  async getUnreadCounts(req, res) {
    try {
      const { officeId } = req.params;
      const userId = req.user.id;
      const [rows] = await db.query(
        `SELECT channel, COUNT(*) AS cnt
         FROM messages
         WHERE office_id = ? AND sender_id != ? AND status != 'read'
         GROUP BY channel`,
        [officeId, userId]
      );
      const counts = {};
      for (const r of rows) counts[r.channel] = r.cnt;
      return res.json({ counts });
    } catch (error) {
      console.error('getUnreadCounts error:', error);
      return res.status(500).json({ success: false, message: 'Внутренняя ошибка сервера' });
    }
  },

  async searchMessages(req, res) {
    try {
      const { officeId } = req.params;
      const { channel = 'reception', q } = req.query;
      const role = req.user.role;

      if (!hasChannelAccess(role, channel))
        return res.status(403).json({ success: false, message: 'Нет доступа к каналу' });
      if (!q || !q.trim())
        return res.json([]);

      const [rows] = await db.query(
        `SELECT m.*, u.role AS user_role, u.first_name, u.last_name, u.email AS user_email
         FROM messages m
         LEFT JOIN users u ON m.sender_id = u.id
         WHERE m.office_id = ? AND m.channel = ? AND m.content LIKE ?
         ORDER BY m.created_at DESC LIMIT 50`,
        [officeId, channel, `%${q.trim()}%`]
      );

      const formatted = rows.map(m => formatMessageResponse(m, req.user.id));
      return res.json(formatted);
    } catch (error) {
      console.error('searchMessages error:', error);
      return res.status(500).json({ success: false, message: 'Внутренняя ошибка сервера' });
    }
  },

  async getChannelParticipants(req, res) {
    try {
      const { officeId, channel = 'reception' } = req.query;
      const allowedRoles = CHANNEL_ACCESS[channel] || [];

      if (!officeId || allowedRoles.length === 0) {
        return res.json({ participants: [] });
      }

      const [users] = await db.query(
        `SELECT id, first_name, last_name, role, is_active
         FROM users
         WHERE office_id = ? AND role IN (?) AND is_active = 1
         ORDER BY first_name ASC`,
        [officeId, allowedRoles]
      );

      const result = users.map(u => ({
        id: u.id,
        name: `${u.first_name || ''} ${u.last_name || ''}`.trim() || 'Пользователь',
        role: u.role,
        online: !!u.is_active,
      }));

      return res.json({ participants: result });
    } catch (error) {
      console.error('getChannelParticipants error:', error);
      return res.status(500).json({ success: false, message: 'Внутренняя ошибка сервера' });
    }
  },

  async deleteMessage(req, res) {
    try {
      const { messageId } = req.params;
      await Message.delete(messageId);
      return res.json({ success: true });
    } catch (error) {
      console.error('deleteMessage error:', error);
      return res.status(500).json({ success: false, message: 'Внутренняя ошибка сервера' });
    }
  },
};

module.exports = chatController;
