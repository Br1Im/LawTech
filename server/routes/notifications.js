const express = require("express");
const router = express.Router();
const db = require("../db");
const { authenticateToken } = require("../middleware/auth");

router.use(authenticateToken);

// Список уведомлений текущего пользователя
router.get("/", async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT id, contract_id, type, title, message, is_read, created_at
         FROM notifications WHERE user_id = ?
        ORDER BY is_read ASC, created_at DESC LIMIT 100`,
      [req.user.id]
    );
    res.json({ success: true, data: rows });
  } catch (e) {
    console.error("notifications list error:", e.message);
    res.status(500).json({ success: false, message: "Ошибка загрузки уведомлений" });
  }
});

// Отметить одно прочитанным
router.post("/:id/read", async (req, res) => {
  try {
    await db.query("UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?", [req.params.id, req.user.id]);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false });
  }
});

// Отметить все прочитанными
router.post("/read-all", async (req, res) => {
  try {
    await db.query("UPDATE notifications SET is_read = 1 WHERE user_id = ?", [req.user.id]);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false });
  }
});

module.exports = router;