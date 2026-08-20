const Message = require('../models/message');
const Office = require('../models/office');
const { formatMessageResponse } = require('../utils/formatters');
const { emitChatMessage } = require('../middleware/socketEmitter');
const db = require('../db');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const config = require('../config');
const crypto = require('crypto');

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
  const oid=Number(officeId), ch=String(channel || '');
  if (!oid || !ch || !(await channelExists(oid,ch))) return false;
  return isChannelMember(oid, Number(user.id), ch);
}

async function channelExists(officeId, channel) {
  const [rows] = await db.query(
    'SELECT id, name, created_by, is_system FROM chat_channels WHERE office_id=? AND channel=? AND archived_at IS NULL LIMIT 1',
    [officeId, channel]
  );
  return rows[0] || null;
}


async function touchPresence(userId) {
  await db.query(`INSERT INTO chat_user_presence (user_id,last_seen_at) VALUES (?,NOW())
    ON DUPLICATE KEY UPDATE last_seen_at=NOW()`,[userId]);
}

async function canManageOfficeChat(officeId, user) {
  const oid=Number(officeId);
  if (!oid || !canManageChat(user)) return false;
  const [rows] = await db.query(
    `SELECT 1 FROM users u
       LEFT JOIN offices o ON o.id=?
      WHERE u.id=? AND u.is_active=1
        AND (u.office_id=? OR (u.role='director' AND o.owner_id=u.id)) LIMIT 1`,
    [oid,user.id,oid]
  );
  return rows.length > 0;
}

// Multer config for chat file uploads
const chatUploadDir = path.join(config.paths?.uploads || '/app/uploads', 'chat');
if (!fs.existsSync(chatUploadDir)) {
  fs.mkdirSync(chatUploadDir, { recursive: true });
}

const CHAT_FILE_TYPES = new Map([
  ['image/jpeg','.jpg'],['image/png','.png'],['image/gif','.gif'],['image/webp','.webp'],
  ['application/pdf','.pdf'],['text/plain','.txt'],['application/zip','.zip'],
  ['application/msword','.doc'],['application/vnd.openxmlformats-officedocument.wordprocessingml.document','.docx'],
  ['application/vnd.ms-excel','.xls'],['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','.xlsx'],
]);
const chatUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 1 },
  fileFilter: (_req,file,cb) => CHAT_FILE_TYPES.has(file.mimetype)
    ? cb(null,true) : cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE','file')),
});

function removeUploadedFile(fileUrl) {
  if (!fileUrl || !fileUrl.startsWith('/uploads/chat/')) return;
  const filePath=path.join(chatUploadDir,path.basename(fileUrl));
  try { if (fs.existsSync(filePath)) fs.unlinkSync(filePath); } catch (e) { console.error('chat file cleanup:',e.message); }
}

function getFileType(mimetype) {
  if (mimetype?.startsWith('image/')) return 'image';
  if (mimetype?.startsWith('video/')) return 'video';
  return 'document';
}

const chatController = {
  chatUploadMiddleware(req,res,next) {
    chatUpload.single('file')(req,res,(error) => {
      if (!error) return next();
      if (error instanceof multer.MulterError) return res.status(400).json({success:false,message:'Недопустимый файл или превышен лимит 10 МБ'});
      return res.status(400).json({success:false,message:'Не удалось обработать файл'});
    });
  },

  async getAvailableChannels(req, res) {
    try {
      const officeId = Number(req.query.officeId || req.user.office_id);
      if (!officeId) return res.json({ channels: [], canManage: false });
      const [rows] = await db.query(
        `SELECT c.channel AS \`key\`, c.name AS label, c.is_system AS isSystem,
                c.created_by AS createdBy, COUNT(DISTINCT cm2.id) AS memberCount,
                lm.id AS lastMessageId,
                COALESCE(NULLIF(TRIM(CONCAT_WS(' ', lu.first_name, lu.last_name)), ''), lu.email, '?????????') AS lastSender,
                COALESCE(NULLIF(lm.content, ''), lm.file_name, '') AS lastText,
                lm.created_at AS lastCreatedAt
           FROM chat_channels c
           JOIN chat_channel_members mine ON mine.office_id=c.office_id
             AND mine.channel=c.channel AND mine.user_id=?
           LEFT JOIN chat_channel_members cm2 ON cm2.office_id=c.office_id
             AND cm2.channel=c.channel
           LEFT JOIN messages lm ON lm.id=(
             SELECT MAX(m.id) FROM messages m WHERE m.office_id=c.office_id AND m.channel=c.channel
           )
           LEFT JOIN users lu ON lu.id=lm.sender_id
          WHERE c.office_id=? AND c.archived_at IS NULL
          GROUP BY c.id, lm.id, lu.id ORDER BY c.is_system DESC, c.created_at ASC`,
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

      await touchPresence(req.user.id);
      const page=await Message.getByOfficeAndChannel(officeId,channel,{limit:req.query.limit,before:req.query.before});
      const formatted=page.messages.map(m=>formatMessageResponse(m,req.user.id));
      return res.json({messages:formatted,hasMore:page.hasMore});
    } catch (error) {
      console.error('getOfficeMessages error:', error);
      return res.status(500).json({ success: false, message: 'Внутренняя ошибка сервера' });
    }
  },

  async sendMessage(req, res) {
    let savedFileUrl=null;
    try {
      const { officeId } = req.params;
      const { text, channel = 'reception' } = req.body;

      if (!(await canAccessChannel(officeId, req.user, channel)))
        return res.status(403).json({ success:false, message:'Нет доступа к чату' });

      const cleanText=String(text || '').trim();
      if (cleanText.length>10000) return res.status(413).json({success:false,message:'Сообщение длиннее 10 000 символов'});
      const hasFile=!!req.file;
      if (!cleanText && !hasFile)
        return res.status(400).json({ success: false, message: 'Текст или файл обязательны' });

      const [userRows] = await db.query('SELECT first_name, last_name, email, role FROM users WHERE id = ?', [req.user.id]);
      const u = userRows[0] || {};
      const senderName = `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.email || req.user.email;

      let fileUrl = null, fileName = null, fileType = null;
      if (hasFile) {
        const ext=CHAT_FILE_TYPES.get(req.file.mimetype);
        const storedName=`chat_${Date.now()}_${crypto.randomBytes(12).toString('hex')}${ext}`;
        fs.writeFileSync(path.join(chatUploadDir,storedName),req.file.buffer,{flag:'wx',mode:0o600});
        fileUrl=`/uploads/chat/${storedName}`; savedFileUrl=fileUrl;
        fileName=path.basename(req.file.originalname).replace(/[\r\n]/g,' ').slice(0,180);
        fileType=getFileType(req.file.mimetype);
      }

      const message = await Message.create({
        content: cleanText || (hasFile ? fileName : ''),
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
      if (savedFileUrl) removeUploadedFile(savedFileUrl);
      console.error('sendMessage error:', error);
      return res.status(500).json({ success:false, message:'Внутренняя ошибка сервера' });
    }
  },

  async markMessageAsRead(req, res) {
    try {
      const { messageId } = req.params;
      const [rows]=await db.query('SELECT office_id,channel,sender_id FROM messages WHERE id=? LIMIT 1',[messageId]);
      if (!rows.length) return res.status(404).json({success:false,message:'Сообщение не найдено'});
      const m=rows[0];
      if (!(await canAccessChannel(m.office_id,req.user,m.channel))) return res.status(403).json({success:false,message:'Нет доступа к чату'});
      await touchPresence(req.user.id);
      if (Number(m.sender_id)!==Number(req.user.id)) await db.query(
        'INSERT INTO chat_message_reads (message_id,user_id,read_at) VALUES (?,?,NOW()) ON DUPLICATE KEY UPDATE read_at=NOW()',
        [messageId,req.user.id]
      );
      return res.json({success:true});
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
      await touchPresence(req.user.id);
      await db.query(`INSERT IGNORE INTO chat_message_reads (message_id,user_id,read_at)
        SELECT id,?,NOW() FROM messages WHERE office_id=? AND channel=? AND sender_id<>?`,
        [req.user.id,officeId,channel,req.user.id]);
      return res.json({success:true});
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
        `SELECT m.channel,COUNT(*) AS cnt FROM messages m
           JOIN chat_channel_members cm ON cm.office_id=m.office_id AND cm.channel=m.channel AND cm.user_id=?
           LEFT JOIN chat_message_reads mr ON mr.message_id=m.id AND mr.user_id=?
          WHERE m.office_id=? AND m.sender_id<>? AND mr.message_id IS NULL GROUP BY m.channel`,
        [userId,userId,officeId,userId]
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
      await touchPresence(req.user.id);
      const [users] = await db.query(
        `SELECT u.id, u.first_name, u.last_name, u.role, u.is_active,
                cm.source, cm.call_center_id, cc.name AS call_center_name,
                IF(p.last_seen_at >= DATE_SUB(NOW(),INTERVAL 90 SECOND),1,0) AS is_online
           FROM chat_channel_members cm
           JOIN users u ON u.id=cm.user_id
           LEFT JOIN call_centers cc ON cc.id=cm.call_center_id
           LEFT JOIN chat_user_presence p ON p.user_id=u.id
          WHERE cm.office_id=? AND cm.channel=? AND u.is_active=1
          ORDER BY u.first_name, u.last_name`, [officeId, channel]
      );
      return res.json({
        participants: users.map(u => ({
          id:u.id, name:`${u.first_name || ''} ${u.last_name || ''}`.trim() || 'Сотрудник',
          role:u.role, online:!!u.is_online, source:u.source,
          callCenterId:u.call_center_id, callCenterName:u.call_center_name || null,
        })),
        canManage: await canManageOfficeChat(officeId, req.user),
      });
    } catch (error) {
      console.error('getChannelParticipants error:', error);
      return res.status(500).json({ success:false, message:'Не удалось загрузить участников' });
    }
  },

  async downloadChatFile(req,res) {
    try {
      const messageId=Number(req.params.messageId);
      const [rows]=await db.query('SELECT office_id,channel,file_url,file_name,file_type FROM messages WHERE id=? LIMIT 1',[messageId]);
      if (!rows.length || !rows[0].file_url) return res.status(404).json({success:false,message:'Файл не найден'});
      const m=rows[0];
      if (!(await canAccessChannel(m.office_id,req.user,m.channel))) return res.status(403).json({success:false,message:'Нет доступа к файлу'});
      const filePath=path.join(chatUploadDir,path.basename(m.file_url));
      if (!fs.existsSync(filePath)) return res.status(404).json({success:false,message:'Файл не найден'});
      res.setHeader('X-Content-Type-Options','nosniff');
      res.setHeader('Cache-Control','private, no-store');
      if (m.file_type==='image') return res.sendFile(filePath);
      return res.download(filePath,m.file_name || path.basename(filePath));
    } catch(error) { console.error('downloadChatFile error:',error); return res.status(500).json({success:false,message:'Не удалось загрузить файл'}); }
  },

  async deleteMessage(req, res) {
    try {
      const { messageId } = req.params;
      const [rows]=await db.query('SELECT office_id,channel,sender_id,file_url FROM messages WHERE id=? LIMIT 1',[messageId]);
      if (!rows.length) return res.status(404).json({success:false,message:'Сообщение не найдено'});
      const m=rows[0];
      if (!(await canAccessChannel(m.office_id,req.user,m.channel))) return res.status(403).json({success:false,message:'Нет доступа к чату'});
      if (Number(m.sender_id)!==Number(req.user.id) && !(await canManageOfficeChat(m.office_id,req.user)))
        return res.status(403).json({success:false,message:'Нет прав удалить сообщение'});
      await Message.delete(messageId);
      removeUploadedFile(m.file_url);
      return res.json({success:true});
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
      const [rows]=await db.query(
        `SELECT q.id,MAX(q.first_name) first_name,MAX(q.last_name) last_name,MAX(q.role) role,
                IF(MAX(q.call_center_id) IS NULL,'office','call_center') source,
                MAX(q.call_center_id) call_center_id,MAX(q.call_center_name) call_center_name,
                MAX(IF(cm.user_id IS NULL,0,1)) is_member
           FROM (
             SELECT u.id,u.first_name,u.last_name,u.role,NULL call_center_id,NULL call_center_name
               FROM users u WHERE u.office_id=? AND u.is_active=1
             UNION ALL
             SELECT u.id,u.first_name,u.last_name,u.role,cc.id,CASE WHEN cc.name LIKE '%?%' THEN 'Подключённый колл-центр' ELSE cc.name END
               FROM office_call_centers occ
               JOIN call_centers cc ON cc.id=occ.call_center_id AND cc.is_active=1
               JOIN call_center_members ccm ON ccm.call_center_id=cc.id JOIN users u ON u.id=ccm.user_id AND u.is_active=1
              WHERE occ.office_id=? AND occ.is_active=1
           ) q LEFT JOIN chat_channel_members cm ON cm.office_id=? AND cm.channel=? AND cm.user_id=q.id
          GROUP BY q.id ORDER BY source,call_center_name,first_name,last_name`,
        [officeId,officeId,officeId,memberChannel]
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
