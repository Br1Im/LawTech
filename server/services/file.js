/**
 * Сервис для обработки файлов
 */
const fs = require('fs');
const path = require('path');
const { createWorker } = require('tesseract.js');
const pdf = require('pdf-parse');
const config = require('../config');

// Функция для извлечения текста из PDF
const extractTextFromPdf = async (filePath) => {
  try {
    const dataBuffer = fs.readFileSync(filePath);
    const pdfData = await pdf(dataBuffer);
    return pdfData.text;
  } catch (error) {
    console.error('Ошибка при извлечении текста из PDF:', error);
    throw error;
  }
};

// Функция для извлечения текста из изображения с помощью OCR
const extractTextFromImage = async (filePath) => {
  try {
    const worker = await createWorker('rus');
    const { data } = await worker.recognize(filePath);
    await worker.terminate();
    return data.text;
  } catch (error) {
    console.error('Ошибка при извлечении текста из изображения:', error);
    throw error;
  }
};

// Функция для обработки текстовых файлов
const extractTextFromTextFile = (filePath) => {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    console.error('Ошибка при чтении текстового файла:', error);
    throw error;
  }
};

// Основная функция обработки файла и извлечения текста
const processFile = async (filePath) => {
  const fileExt = path.extname(filePath).toLowerCase();
  
  // Обработка PDF
  if (fileExt === '.pdf') {
    return await extractTextFromPdf(filePath);
  } 
  // Обработка изображений
  else if (['.jpg', '.jpeg', '.png'].includes(fileExt)) {
    return await extractTextFromImage(filePath);
  } 
  // Обработка текстовых файлов
  else if (['.txt', '.doc', '.docx'].includes(fileExt)) {
    return extractTextFromTextFile(filePath);
  } else {
    throw new Error('Неподдерживаемый формат файла');
  }
};

module.exports = {
  processFile,
  extractTextFromPdf,
  extractTextFromImage,
  extractTextFromTextFile
}; 