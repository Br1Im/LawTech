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

const CHAT_MANAGER_ROLES = ['director', 'manager', 'okk'];

function canManageChat(user) {
  return CHAT_MANAGER_ROLES.includes(String(user?.role || '').toLowerCase());
}

async function isChannelMember(officeId, userId, channel) {
  const [rows] = await db.query(
    'SELECT 1 FROM chat_channel_members WHERE office_id=? AND channel=? AND user_id=? LIMIT 1',
    [officeId, channel, userId]
  );
  return rows.length > 0;
}

async function canAccessChannel(officeId, user, channel) {
  return isChannelMember(Number(officeId), Number(user.id), String(channel));
}

async function channelExists(officeId, channel) {
  const [rows] = await db.query(
    'SELECT id, name, created_by, is_system FROM chat_channels WHERE office_id=? AND channel=? AND archived_at IS NULL LIMIT 1',
    [officeId, channel]
  );
  return rows[0] || null;
}

async function canManageOfficeChat(officeId, user) {
  if (!canManageChat(user)) return false;
  if (Number(user.office_id) === Number(officeId)) return true;
  const [rows] = await db.query(
    `SELECT 1 FROM users WHERE id=? AND is_active=1 AND (office_id=? OR role='director') LIMIT 1`,
    [user.id, officeId]
  );
  return rows.length > 0;
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
      const officeId = Number(req.query.officeId || req.user.office_id);
      if (!officeId) return res.json({ channels: [], canManage: false });
      const [rows] = await db.query(
        `SELECT c.channel AS \`key\`, c.name AS label, c.is_system AS isSystem,
                c.created_by AS createdBy, COUNT(cm2.id) AS memberCount
           FROM chat_channels c
           JOIN chat_channel_members mine ON mine.office_id=c.office_id
             AND mine.channel=c.channel AND mine.user_id=?
           LEFT JOIN chat_channel_members cm2 ON cm2.office_id=c.office_id
             AND cm2.channel=c.channel
          WHERE c.office_id=? AND c.archived_at IS NULL
          GROUP BY c.id ORDER BY c.is_system DESC, c.created_at ASC`,
        [req.user.id, officeId]
      );
      return res.json({
        channels: rows.map(r => ({ ...r, isSystem: !!r.isSystem, memberCount: Number(r.memberCount || 0) })),
        canManage: await canManageOfficeChat(officeId, req.user),
      });
    } catch (error) {
      console.error('getAvailableChannels error:', error);
      return res.status(500).json({ success:false, message:'Не удалось загрузить чаты' });
    }
  },

  async getOfficeMessages(req, res) {
    try {
      const { officeId } = req.params;
      const channel = req.query.channel || 'reception';

      if (!(await canAccessChannel(officeId, req.user, channel)))
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

      if (!(await canAccessChannel(officeId, req.user, channel)))
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
      if (!(await canAccessChannel(officeId, req.user, channel)))
        return res.status(403).json({ success:false, message:'Нет доступа к чату' });
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
        `SELECT m.channel, COUNT(*) AS cnt
           FROM messages m
           JOIN chat_channel_members cm ON cm.office_id=m.office_id
             AND cm.channel=m.channel AND cm.user_id=?
          WHERE m.office_id=? AND m.sender_id != ? AND m.status != 'read'
          GROUP BY m.channel`,
        [userId, officeId, userId]
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
      if (!(await canAccessChannel(officeId, req.user, channel)))
        return res.status(403).json({ success:false, message:'Нет доступа к чату' });
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
      const officeId = Number(req.query.officeId);
      const channel = String(req.query.channel || '');
      if (!officeId || !channel || !(await canAccessChannel(officeId, req.user, channel)))
        return res.status(403).json({ success:false, message:'Нет доступа к чату' });
      const [users] = await db.query(
        `SELECT u.id, u.first_name, u.last_name, u.role, u.is_active,
                cm.source, cm.call_center_id, cc.name AS call_center_name
           FROM chat_channel_members cm
           JOIN users u ON u.id=cm.user_id
           LEFT JOIN call_centers cc ON cc.id=cm.call_center_id
          WHERE cm.office_id=? AND cm.channel=? AND u.is_active=1
          ORDER BY u.first_name, u.last_name`, [officeId, channel]
      );
      return res.json({
        participants: users.map(u => ({
          id:u.id, name:`${u.first_name || ''} ${u.last_name || ''}`.trim() || 'Сотрудник',
          role:u.role, online:!!u.is_active, source:u.source,
          callCenterId:u.call_center_id, callCenterName:u.call_center_name || null,
        })),
        canManage: await canManageOfficeChat(officeId, req.user),
      });
    } catch (error) {
      console.error('getChannelParticipants error:', error);
      return res.status(500).json({ success:false, message:'Не удалось загрузить участников' });
    }
  },

  async deleteMessage(req, res) {
    try {
      const { messageId } = req.params;
      const [rows] = await db.query('SELECT office_id,sender_id FROM messages WHERE id=? LIMIT 1',[messageId]);
      if (!rows.length) return res.status(404).json({success:false,message:'Сообщение не найдено'});
      if (Number(rows[0].sender_id)!==Number(req.user.id) && !(await canManageOfficeChat(rows[0].office_id,req.user)))
        return res.status(403).json({success:false,message:'Нет прав удалить сообщение'});
      await Message.delete(messageId);
      return res.json({ success: true });
    } catch (error) {
      console.error('deleteMessage error:', error);
      return res.status(500).json({ success: false, message: 'Внутренняя ошибка сервера' });
    }
  },
  async getChannelCandidates(req, res) {
    try {
      const officeId = Number(req.query.officeId);
      const channel = String(req.query.channel || '');
      if (!(await canManageOfficeChat(officeId, req.user)))
        return res.status(403).json({ success:false, message:'Нет прав управлять участниками' });
      if (channel !== '__new__' && !(await channelExists(officeId, channel)))
        return res.status(404).json({ success:false, message:'Чат не найден' });
      const memberChannel = channel === '__new__' ? '__new__' : channel;
      const [rows] = await db.query(
        `SELECT q.id, q.first_name, q.last_name, q.role, q.source,
                q.call_center_id, q.call_center_name,
                IF(cm.user_id IS NULL,0,1) AS is_member
           FROM (
             SELECT u.id,u.first_name,u.last_name,u.role,'office' AS source,
                    NULL AS call_center_id,NULL AS call_center_name
               FROM users u WHERE u.office_id=? AND u.is_active=1
             UNION
             SELECT u.id,u.first_name,u.last_name,u.role,'call_center' AS source,
                    cc.id AS call_center_id,cc.name AS call_center_name
               FROM office_call_centers occ
               JOIN call_centers cc ON cc.id=occ.call_center_id AND cc.is_active=1
               JOIN call_center_members ccm ON ccm.call_center_id=cc.id
               JOIN users u ON u.id=ccm.user_id AND u.is_active=1
              WHERE occ.office_id=? AND occ.is_active=1
           ) q
           LEFT JOIN chat_channel_members cm ON cm.office_id=? AND cm.channel=? AND cm.user_id=q.id
          ORDER BY q.source, q.call_center_name, q.first_name, q.last_name`,
        [officeId, officeId, officeId, memberChannel]
      );
      return res.json({ candidates:rows.map(u => ({
        id:u.id, name:`${u.first_name || ''} ${u.last_name || ''}`.trim() || 'Сотрудник',
        role:u.role, source:u.source, callCenterId:u.call_center_id,
        callCenterName:u.call_center_name || null, isMember:!!u.is_member,
      })) });
    } catch (error) {
      console.error('getChannelCandidates error:', error);
      return res.status(500).json({ success:false, message:'Не удалось загрузить список сотрудников' });
    }
  },

  async createChannel(req, res) {
    const connection = await db.getClient();
    try {
      const officeId = Number(req.body.officeId);
      const name = String(req.body.name || '').trim().replace(/\s+/g, ' ').slice(0, 100);
      const memberIds = [...new Set((req.body.memberIds || []).map(Number).filter(Boolean))];
      if (!(await canManageOfficeChat(officeId, req.user)))
        return res.status(403).json({ success:false, message:'Создавать чаты могут директор, менеджер и руководитель ОКК' });
      if (name.length < 2) return res.status(400).json({ success:false, message:'Введите название чата' });
      const channel = `room_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,8)}`;
      await connection.beginTransaction();
      await connection.query(
        'INSERT INTO chat_channels (office_id,channel,name,created_by,is_system) VALUES (?,?,?,?,0)',
        [officeId, channel, name, req.user.id]
      );
      const ids = [...new Set([req.user.id, ...memberIds])];
      if (ids.length) {
        const [valid] = await connection.query(
          `SELECT q.id,q.source,q.call_center_id FROM (
             SELECT u.id,'office' source,NULL call_center_id FROM users u WHERE u.office_id=? AND u.is_active=1
             UNION SELECT u.id,'call_center',cc.id FROM office_call_centers occ
               JOIN call_centers cc ON cc.id=occ.call_center_id AND cc.is_active=1
               JOIN call_center_members ccm ON ccm.call_center_id=cc.id
               JOIN users u ON u.id=ccm.user_id AND u.is_active=1
              WHERE occ.office_id=? AND occ.is_active=1
           ) q WHERE q.id IN (?)`, [officeId, officeId, ids]
        );
        for (const u of valid) await connection.query(
          'INSERT IGNORE INTO chat_channel_members (office_id,channel,user_id,added_by,source,call_center_id) VALUES (?,?,?,?,?,?)',
          [officeId,channel,u.id,req.user.id,u.source,u.call_center_id]
        );
      }
      await connection.commit();
      return res.status(201).json({ success:true, channel:{ key:channel,label:name,isSystem:false,memberCount:ids.length } });
    } catch (error) {
      try { await connection.rollback(); } catch (_) {}
      console.error('createChannel error:', error);
      return res.status(500).json({ success:false, message:'Не удалось создать чат' });
    } finally { connection.release(); }
  },

  async renameChannel(req, res) {
    try {
      const officeId=Number(req.body.officeId); const channel=String(req.params.channel || '');
      const name=String(req.body.name || '').trim().replace(/\s+/g,' ').slice(0,100);
      if (!(await canManageOfficeChat(officeId, req.user))) return res.status(403).json({success:false,message:'Нет прав'});
      if (name.length<2) return res.status(400).json({success:false,message:'Введите название чата'});
      const [r]=await db.query('UPDATE chat_channels SET name=? WHERE office_id=? AND channel=? AND archived_at IS NULL',[name,officeId,channel]);
      if (!r.affectedRows) return res.status(404).json({success:false,message:'Чат не найден'});
      return res.json({success:true});
    } catch(error) { console.error('renameChannel error:',error); return res.status(500).json({success:false,message:'Не удалось переименовать чат'}); }
  },

  async archiveChannel(req, res) {
    try {
      const officeId=Number(req.body.officeId); const channel=String(req.params.channel || '');
      if (!(await canManageOfficeChat(officeId, req.user))) return res.status(403).json({success:false,message:'Нет прав'});
      const [rows]=await db.query('SELECT is_system FROM chat_channels WHERE office_id=? AND channel=? AND archived_at IS NULL',[officeId,channel]);
      if (!rows.length) return res.status(404).json({success:false,message:'Чат не найден'});
      if (rows[0].is_system) return res.status(400).json({success:false,message:'Системный чат нельзя удалить'});
      await db.query('UPDATE chat_channels SET archived_at=NOW() WHERE office_id=? AND channel=?',[officeId,channel]);
      return res.json({success:true});
    } catch(error) { console.error('archiveChannel error:',error); return res.status(500).json({success:false,message:'Не удалось удалить чат'}); }
  },

  async addChannelMember(req, res) {
    try {
      const officeId=Number(req.body.officeId), userId=Number(req.body.userId), channel=String(req.body.channel || '');
      if (!(await canManageOfficeChat(officeId, req.user))) return res.status(403).json({success:false,message:'Нет прав'});
      if (!(await channelExists(officeId,channel))) return res.status(404).json({success:false,message:'Чат не найден'});
      const [valid]=await db.query(
        `SELECT q.id,q.source,q.call_center_id FROM (
           SELECT u.id,'office' source,NULL call_center_id FROM users u WHERE u.office_id=? AND u.is_active=1
           UNION SELECT u.id,'call_center',cc.id FROM office_call_centers occ
             JOIN call_centers cc ON cc.id=occ.call_center_id AND cc.is_active=1
             JOIN call_center_members ccm ON ccm.call_center_id=cc.id
             JOIN users u ON u.id=ccm.user_id AND u.is_active=1
            WHERE occ.office_id=? AND occ.is_active=1
         ) q WHERE q.id=? LIMIT 1`, [officeId,officeId,userId]
      );
      if (!valid.length) return res.status(400).json({success:false,message:'Сотрудник не относится к офису или подключённому колл-центру'});
      const u=valid[0];
      await db.query('INSERT INTO chat_channel_members (office_id,channel,user_id,added_by,source,call_center_id) VALUES (?,?,?,?,?,?) ON DUPLICATE KEY UPDATE source=VALUES(source),call_center_id=VALUES(call_center_id),added_by=VALUES(added_by)',[officeId,channel,userId,req.user.id,u.source,u.call_center_id]);
      return res.json({success:true});
    } catch(error) { console.error('addChannelMember error:',error); return res.status(500).json({success:false,message:'Не удалось добавить участника'}); }
  },

  async removeChannelMember(req, res) {
    try {
      const officeId=Number(req.body.officeId), userId=Number(req.body.userId), channel=String(req.body.channel || '');
      if (!(await canManageOfficeChat(officeId, req.user))) return res.status(403).json({success:false,message:'Нет прав'});
      const [[count]] = await db.query('SELECT COUNT(*) cnt FROM chat_channel_members WHERE office_id=? AND channel=?',[officeId,channel]);
      if (Number(count.cnt)<=1) return res.status(400).json({success:false,message:'В чате должен остаться хотя бы один участник'});
      await db.query('DELETE FROM chat_channel_members WHERE office_id=? AND channel=? AND user_id=?',[officeId,channel,userId]);
      return res.json({success:true});
    } catch(error) { console.error('removeChannelMember error:',error); return res.status(500).json({success:false,message:'Не удалось удалить участника'}); }
  },
};

module.exports = chatController;
