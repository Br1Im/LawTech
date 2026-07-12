// Движок бизнес-процессов (напоминания/задачи по делам).
// Событие -> подходящие правила -> задачи + уведомления. Безопасен: пока не вызывается — ничего не делает.
const db = require("../db");

async function resolveAssignee(rule, contract) {
  // Кому ставим задачу: для expert — эксперт дела; для lawyer — юрист дела; иначе — первый в офисе по роли.
  if (rule.target_role === "expert" && contract.expert_id) return contract.expert_id;
  if (rule.target_role === "lawyer" && contract.id_employee) return contract.id_employee;
  if (!rule.target_role) return null;
  const [[u]] = await db.query(
    "SELECT id FROM users WHERE role = ? AND office_id = ? AND is_active = 1 LIMIT 1",
    [rule.target_role, contract.office_id]
  );
  return u ? u.id : null;
}

async function createNotification({ user_id, office_id, contract_id, title, message, dedup_key }) {
  if (!user_id) return;
  try {
    await db.query(
      "INSERT IGNORE INTO notifications (user_id, office_id, contract_id, type, title, message, dedup_key) VALUES (?,?,?,?,?,?,?)",
      [user_id, office_id || null, contract_id || null, "task", title, message || null, dedup_key || null]
    );
  } catch (e) { console.error("[workflowEngine] notif:", e.message); }
}

// Основная точка входа: обработать событие по договору.
async function handleEvent(eventType, contractId, actorUserId) {
  try {
    await db.query(
      "INSERT INTO workflow_events (event_type, contract_id, actor_user_id, processed) VALUES (?,?,?,1)",
      [eventType, contractId || null, actorUserId || null]
    );
    if (!contractId) return;
    const [[c]] = await db.query(
      "SELECT id, office_id, expert_id, id_employee, status FROM contracts WHERE id = ?",
      [contractId]
    );
    if (!c) return;
    if (c.status === "terminated") return; // расторгнутые не трогаем
    const [rules] = await db.query(
      "SELECT * FROM workflow_rules WHERE trigger_event = ? AND is_active = 1 AND (office_id IS NULL OR office_id = ?)",
      [eventType, c.office_id]
    );
    for (const rule of rules) {
      const assignee = await resolveAssignee(rule, c);
      const dueAt = new Date(Date.now() + (rule.due_offset_hours || 24) * 3600000);
      const dedup = `wf:${rule.id}:${c.id}`;
      try {
        await db.query(
          "INSERT IGNORE INTO workflow_tasks (rule_id, contract_id, office_id, assignee_user_id, title, description, status, due_at, dedup_key) VALUES (?,?,?,?,?,?,?,?,?)",
          [rule.id, c.id, c.office_id, assignee, rule.task_title, rule.task_desc, "open", dueAt, dedup]
        );
      } catch (e) { console.error("[workflowEngine] task:", e.message); }
      await createNotification({
        user_id: assignee, office_id: c.office_id, contract_id: c.id,
        title: rule.task_title, message: rule.task_desc, dedup_key: `wfn:${rule.id}:${c.id}`,
      });
    }
  } catch (e) {
    console.error("[workflowEngine] handleEvent:", e.message);
  }
}

// Фоновый проход: просроченные задачи -> эскалация руководителю (ежедневно).
async function runTaskSweep() {
  try {
    const [tasks] = await db.query(
      `SELECT t.*, r.escalate_role FROM workflow_tasks t
         LEFT JOIN workflow_rules r ON r.id = t.rule_id
        WHERE t.status = "open" AND t.due_at IS NOT NULL AND t.due_at < NOW()`
    );
    const dayKey = new Date().toISOString().slice(0, 10);
    let esc = 0;
    for (const t of tasks) {
      if (!t.escalate_role || !t.office_id) continue;
      const [[boss]] = await db.query(
        "SELECT id FROM users WHERE role = ? AND office_id = ? AND is_active = 1 LIMIT 1",
        [t.escalate_role, t.office_id]
      );
      if (!boss) continue;
      await createNotification({
        user_id: boss.id, office_id: t.office_id, contract_id: t.contract_id,
        title: `Просрочена задача: ${t.title}`,
        message: `Задача по делу #${t.contract_id} не выполнена в срок.`,
        dedup_key: `wfesc:${t.id}:${dayKey}`,
      });
      esc++;
    }
    console.log(`[workflowEngine] task sweep: overdue=${tasks.length}, escalations=${esc}`);
  } catch (e) {
    console.error("[workflowEngine] runTaskSweep:", e.message);
  }
}

function startScheduler() {
  setTimeout(() => { runTaskSweep(); }, 20000);
  setInterval(() => { runTaskSweep(); }, 60 * 60 * 1000);
  console.log("[workflowEngine] scheduler started (hourly task sweep)");
}

module.exports = { handleEvent, runTaskSweep, startScheduler };