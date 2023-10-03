/**
 * Контроллер для загрузки и обработки файлов
 */
const { processFile } = require('../services/file');

// Обработка загруженных файлов и извлечение текста
const handleFileUpload = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Файл не загружен' });
    }

    const filePath = req.file.path;
    
    // Обрабатываем файл и извлекаем текст
    try {
      const text = await processFile(filePath);
      return res.json({ text });
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
  } catch (error) {
    console.error('Ошибка при обработке файла:', error);
    return res.status(500).json({ error: 'Ошибка при обработке файла' });
  }
};

module.exports = {
  handleFileUpload
}; 