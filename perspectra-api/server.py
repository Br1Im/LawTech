#!/usr/bin/env python3
"""
Perspectra API Server
Простой API для обработки документов с помощью Perspectra
"""

from flask import Flask, request, send_file, jsonify
from flask_cors import CORS
import subprocess
import os
import uuid
from pathlib import Path

app = Flask(__name__)
CORS(app)

# Директории для работы
INPUT_DIR = Path('/input')
OUTPUT_DIR = Path('/output')

INPUT_DIR.mkdir(exist_ok=True)
OUTPUT_DIR.mkdir(exist_ok=True)

@app.route('/health', methods=['GET'])
def health():
    """Проверка здоровья сервиса"""
    return jsonify({'status': 'ok', 'service': 'perspectra-api'})

@app.route('/scan', methods=['POST'])
def scan_document():
    """
    Сканирование документа с автоматическим выравниванием перспективы
    """
    if 'image' not in request.files:
        return jsonify({'error': 'No image provided'}), 400
    
    file = request.files['image']
    if file.filename == '':
        return jsonify({'error': 'Empty filename'}), 400
    
    # Генерируем уникальное имя файла
    file_id = str(uuid.uuid4())
    input_ext = Path(file.filename).suffix or '.jpg'
    input_path = INPUT_DIR / f"{file_id}{input_ext}"
    output_path = OUTPUT_DIR / f"{file_id}_corrected.jpg"
    
    try:
        # Сохраняем загруженный файл
        file.save(str(input_path))
        
        # Запускаем Perspectra для коррекции перспективы
        result = subprocess.run(
            ['perspectra', 'correct', '--binary=gauss-diff', str(input_path)],
            capture_output=True,
            text=True,
            timeout=30
        )
        
        if result.returncode != 0:
            return jsonify({
                'error': 'Perspectra processing failed',
                'details': result.stderr
            }), 500
        
        # Проверяем, что выходной файл создан
        if not output_path.exists():
            return jsonify({'error': 'Output file not created'}), 500
        
        # Возвращаем обработанное изображение
        return send_file(
            str(output_path),
            mimetype='image/jpeg',
            as_attachment=False,
            download_name=f'scanned_{file.filename}'
        )
    
    except subprocess.TimeoutExpired:
        return jsonify({'error': 'Processing timeout'}), 504
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        # Очищаем временные файлы
        if input_path.exists():
            input_path.unlink()
        if output_path.exists():
            output_path.unlink()

@app.route('/corners', methods=['POST'])
def detect_corners():
    """
    Определение углов документа
    """
    if 'image' not in request.files:
        return jsonify({'error': 'No image provided'}), 400
    
    file = request.files['image']
    file_id = str(uuid.uuid4())
    input_ext = Path(file.filename).suffix or '.jpg'
    input_path = INPUT_DIR / f"{file_id}{input_ext}"
    
    try:
        file.save(str(input_path))
        
        result = subprocess.run(
            ['perspectra', 'corners', str(input_path)],
            capture_output=True,
            text=True,
            timeout=10
        )
        
        if result.returncode != 0:
            return jsonify({'error': 'Corner detection failed'}), 500
        
        # Парсим вывод Perspectra (формат: x1,y1 x2,y2 x3,y3 x4,y4)
        corners_str = result.stdout.strip()
        
        return jsonify({
            'corners': corners_str,
            'success': True
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        if input_path.exists():
            input_path.unlink()

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001, debug=False)
