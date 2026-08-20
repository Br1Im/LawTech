// Сервис уведомлений о дедлайнах подготовки документов (роль Эксперт).
const db = require("../db");

function fmtDate(d) {
  const dt = new Date(d);
  const dd = String(dt.getDate()).padStart(2, "0");
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  return `${dd}.${mm}.${dt.getFullYear()}`;
}

// Сколько полных дней от сегодня до даты дедлайна (по дате, без времени).
function daysUntil(dateStr) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const d = new Date(dateStr); d.setHours(0, 0, 0, 0);
  return Math.round((d - today) / 86400000);
}

async function createNotification({ user_id, office_id, contract_id, type, title, message, dedup_key }) {
  if (!user_id) return;
  try {
    await db.query(
      `INSERT IGNORE INTO notifications (user_id, office_id, contract_id, type, title, message, dedup_key)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [user_id, office_id || null, contract_id || null, type || "info", title, message || null, dedup_key || null]
    );
  } catch (e) {
    console.error("[deadlineNotifications] createNotification error:", e.message);
  }
}

// Вызывается при установке/изменении дедлайна в карточке. Создаёт задачу эксперту.
async function onDeadlineSet(contractId) {
  try {
    const [rows] = await db.query(
      `SELECT c.id, c.expert_id, exp.user_id AS expert_user_id, c.office_id, c.expert_deadline, c.expert_deadline_time, c.expert_deadline_comment,
              cl.name AS client_name
         FROM contracts c
         LEFT JOIN employees exp ON exp.id = c.expert_id
         LEFT JOIN clients cl ON cl.id = c.id_client
        WHERE c.id = ?`,
      [contractId]
    );
    const c = rows && rows[0];
    if (!c || !c.expert_id || !c.expert_deadline) return;
    const dateS = fmtDate(c.expert_deadline);
    const timeS = c.expert_deadline_time ? String(c.expert_deadline_time).slice(0, 5) : null;
    const who = c.client_name ? `по клиенту ${c.client_name}` : `по договору #${c.id}`;
    const msg = `Срок подготовки документов ${who}: ${dateS}${timeS ? " " + timeS : ""}.` +
      (c.expert_deadline_comment ? ` Комментарий: ${c.expert_deadline_comment}` : "");
    await createNotification({
      user_id: c.expert_user_id, office_id: c.office_id, contract_id: c.id,
      type: "task", title: "Назначен дедлайн подготовки документов", message: msg,
      dedup_key: `deadline-set:${c.id}:${dateS}`,
    });
  } catch (e) {
    console.error("[deadlineNotifications] onDeadlineSet error:", e.message);
  }
}

// Ежедневный проход: напоминания за 2 дня, 1 день, в день, и ежедневно после просрочки.
async function runDeadlineSweep() {
  try {
    const [rows] = await db.query(
      `SELECT c.id, c.expert_id, exp.user_id AS expert_user_id, c.office_id, c.expert_deadline, cl.name AS client_name
         FROM contracts c
         LEFT JOIN employees exp ON exp.id = c.expert_id
         LEFT JOIN clients cl ON cl.id = c.id_client
        WHERE c.expert_id IS NOT NULL
          AND c.expert_deadline IS NOT NULL
          AND (c.docs_status IS NULL OR c.docs_status NOT IN ("ready", "completed"))
          AND (c.status IS NULL OR c.status <> "terminated")`
    );
    const todayKey = fmtDate(new Date());
    let created = 0;
    for (const c of rows) {
      const diff = daysUntil(c.expert_deadline);
      const dateS = fmtDate(c.expert_deadline);
      const who = c.client_name ? `клиент ${c.client_name}` : `договор #${c.id}`;
      let kind = null, title = null, message = null, type = "warning";
      if (diff === 2) { kind = "2d"; title = "Дедлайн через 2 дня"; message = `Через 2 дня срок подготовки документов (${who}), до ${dateS}.`; }
      else if (diff === 1) { kind = "1d"; title = "Дедлайн завтра"; message = `Завтра срок подготовки документов (${who}), до ${dateS}.`; }
      else if (diff === 0) { kind = "0d"; type = "warning"; title = "Сегодня дедлайн"; message = `Сегодня последний день подготовки документов (${who}).`; }
      else if (diff < 0) { kind = "overdue"; type = "error"; title = "Просрочен дедлайн"; message = `Просрочена подготовка документов (${who}), срок был ${dateS}.`; }
      if (!kind) continue;
      // overdue — ежедневно (dedup по текущему дню); остальные — один раз на дедлайн
      const dedup = kind === "overdue"
        ? `deadline:${c.id}:${todayKey}:overdue`
        : `deadline:${c.id}:${dateS}:${kind}`;
      await createNotification({
        user_id: c.expert_user_id, office_id: c.office_id, contract_id: c.id,
        type, title, message, dedup_key: dedup,
      });
      created++;
    }
    console.log(`[deadlineNotifications] sweep done, candidates=${rows.length}, upserts=${created}`);
  } catch (e) {
    console.error("[deadlineNotifications] runDeadlineSweep error:", e.message);
  }
}

// Запуск: сразу + раз в час (внутренний dedup не даёт дублей в пределах дня).
function startScheduler() {
  setTimeout(() => { runDeadlineSweep(); }, 15000);
  setInterval(() => { runDeadlineSweep(); }, 60 * 60 * 1000);
  console.log("[deadlineNotifications] scheduler started (hourly sweep)");
}

module.exports = { createNotification, onDeadlineSet, runDeadlineSweep, startScheduler };