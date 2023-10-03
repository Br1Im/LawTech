// Скрипт для запуска Docker-контейнеров

const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('Запуск LawTech через Docker...');

// Переходим в директорию проекта
const projectDir = path.resolve(__dirname);
process.chdir(projectDir);

// Проверяем наличие docker-compose.yml
if (!fs.existsSync(path.join(projectDir, 'docker-compose.yml'))) {
  console.error('Ошибка: Файл docker-compose.yml не найден!');
  process.exit(1);
}

// Запускаем контейнеры через docker-compose
const command = 'docker-compose up -d';

console.log(`Выполняется команда: ${command}`);
exec(command, (error, stdout, stderr) => {
  if (error) {
    console.error(`Ошибка при запуске: ${error.message}`);
    return;
  }
  
  if (stderr) {
    console.error(`Предупреждения: ${stderr}`);
  }
  
  console.log(`Вывод команды: ${stdout}`);
  console.log('\nКонтейнеры успешно запущены!');
  console.log('Фронтенд доступен по адресу: http://localhost');
  console.log('API сервера доступен по адресу: http://localhost/api');
  console.log('\nДля просмотра логов используйте команду: docker-compose logs -f');
}); 