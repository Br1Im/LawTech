import { apiInstance } from './instance';

export interface ChatRequest {
  message: string;
}

export interface ChatResponse {
  text: string;
  source: 'gigachat' | 'local';
}

export interface FileUploadResponse {
  text: string;
}

/**
 * API для работы с юридическим чатом
 */
export const chatAPI = {
  /**
   * Отправка сообщения в чат
   * @param data Данные сообщения
   */
  sendMessage: async (data: ChatRequest): Promise<ChatResponse> => {
    const response = await apiInstance.post('/chat', data);
    return response.data;
  },

  /**
   * Загрузка файла для извлечения текста
   * @param file Загружаемый файл
   */
  uploadFile: async (file: File): Promise<FileUploadResponse> => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await apiInstance.post('/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    return response.data;
  }
}; 