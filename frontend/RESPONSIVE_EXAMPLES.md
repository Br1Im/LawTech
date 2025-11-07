# 🎨 Примеры адаптивных компонентов

## 📋 Содержание
1. [Адаптивные таблицы](#адаптивные-таблицы)
2. [Адаптивные формы](#адаптивные-формы)
3. [Адаптивные карточки](#адаптивные-карточки)
4. [Адаптивная навигация](#адаптивная-навигация)
5. [Адаптивные модальные окна](#адаптивные-модальные-окна)

---

## Адаптивные таблицы

### Пример 1: Таблица с горизонтальным скроллом

```tsx
// Desktop: полная таблица
// Mobile: горизонтальный скролл

<div className="table-responsive">
  <table className="documents-table">
    <thead>
      <tr>
        <th>Номер</th>
        <th>Название</th>
        <th>Тип</th>
        <th>Статус</th>
        <th>Дата</th>
        <th>Клиент</th>
        <th>Действия</th>
      </tr>
    </thead>
    <tbody>
      {data.map(item => (
        <tr key={item.id}>
          <td data-label="Номер">{item.number}</td>
          <td data-label="Название">{item.title}</td>
          <td data-label="Тип">{item.type}</td>
          <td data-label="Статус">{item.status}</td>
          <td data-label="Дата">{item.date}</td>
          <td data-label="Клиент">{item.client}</td>
          <td className="actions-cell">
            <button>Редактировать</button>
            <button>Удалить</button>
          </td>
        </tr>
      ))}
    </tbody>
  </table>
</div>
```

### CSS для карточного вида на мобильных:

```css
/* Desktop - обычная таблица */
.documents-table {
  width: 100%;
  border-collapse: collapse;
}

/* Mobile - карточный вид */
@media (max-width: 480px) {
  .documents-table {
    display: block;
  }
  
  .documents-table thead {
    display: none;
  }
  
  .documents-table tbody {
    display: block;
  }
  
  .documents-table tr {
    display: block;
    margin-bottom: 12px;
    background: var(--color-bg-alt);
    border-radius: 12px;
    padding: 12px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  }
  
  .documents-table td {
    display: block;
    text-align: left;
    padding: 8px 0;
    padding-left: 45%;
    position: relative;
  }
  
  .documents-table td::before {
    content: attr(data-label);
    position: absolute;
    left: 0;
    width: 40%;
    font-weight: 600;
    color: var(--color-accent);
  }
}
```

---

## Адаптивные формы

### Пример 2: Форма с адаптивными полями

```tsx
const ResponsiveForm = () => {
  return (
    <form className="form-responsive">
      {/* Одна колонка на mobile, две на desktop */}
      <div className="form-row-responsive">
        <div className="form-group">
          <label>Имя</label>
          <input type="text" placeholder="Введите имя" />
        </div>
        <div className="form-group">
          <label>Фамилия</label>
          <input type="text" placeholder="Введите фамилию" />
        </div>
      </div>
      
      {/* Полная ширина на всех устройствах */}
      <div className="form-group">
        <label>Email</label>
        <input type="email" placeholder="example@mail.com" />
      </div>
      
      {/* Адаптивные кнопки */}
      <div className="form-actions flex-responsive flex-responsive-column-mobile">
        <button type="button" className="btn-secondary">
          Отмена
        </button>
        <button type="submit" className="btn-primary">
          Сохранить
        </button>
      </div>
    </form>
  );
};
```

### CSS:

```css
.form-responsive {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-row-responsive {
  display: flex;
  gap: 16px;
}

.form-group {
  flex: 1;
}

.form-group input {
  width: 100%;
  padding: 12px;
  font-size: 16px; /* Предотвращает зум на iOS */
  border: 1px solid var(--color-border);
  border-radius: 8px;
}

/* Mobile */
@media (max-width: 768px) {
  .form-row-responsive {
    flex-direction: column;
  }
  
  .form-actions button {
    width: 100%;
  }
}
```

---

## Адаптивные карточки

### Пример 3: Сетка карточек

```tsx
const ResponsiveCards = ({ items }) => {
  return (
    <div className="grid-responsive grid-responsive-3">
      {items.map(item => (
        <div key={item.id} className="card-responsive">
          <h3>{item.title}</h3>
          <p>{item.description}</p>
          <div className="card-actions">
            <button>Подробнее</button>
          </div>
        </div>
      ))}
    </div>
  );
};
```

### CSS:

```css
.grid-responsive {
  display: grid;
  gap: 20px;
}

.grid-responsive-3 {
  grid-template-columns: repeat(3, 1fr);
}

.card-responsive {
  background: var(--color-bg-alt);
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  transition: transform 0.3s ease;
}

.card-responsive:hover {
  transform: translateY(-4px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
}

/* Tablet */
@media (max-width: 1024px) {
  .grid-responsive-3 {
    grid-template-columns: repeat(2, 1fr);
  }
}

/* Mobile */
@media (max-width: 768px) {
  .grid-responsive-3 {
    grid-template-columns: 1fr;
  }
  
  .card-responsive {
    padding: 16px;
  }
}
```

---

## Адаптивная навигация

### Пример 4: Мобильное меню

```tsx
const ResponsiveNav = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  return (
    <>
      {/* Гамбургер кнопка - только на мобильных */}
      {isMobile && (
        <button 
          className="hamburger-btn"
          onClick={() => setIsOpen(!isOpen)}
        >
          <span></span>
          <span></span>
          <span></span>
        </button>
      )}
      
      {/* Навигация */}
      <nav className={`nav-responsive ${isOpen ? 'open' : ''}`}>
        <a href="/dashboard">Главная</a>
        <a href="/clients">Клиенты</a>
        <a href="/documents">Документы</a>
        <a href="/calendar">Календарь</a>
      </nav>
    </>
  );
};
```

### CSS:

```css
/* Desktop навигация */
.nav-responsive {
  display: flex;
  gap: 20px;
  align-items: center;
}

.nav-responsive a {
  padding: 10px 16px;
  text-decoration: none;
  color: var(--color-text);
  transition: color 0.3s ease;
}

.nav-responsive a:hover {
  color: var(--color-accent);
}

/* Mobile навигация */
@media (max-width: 768px) {
  .hamburger-btn {
    display: flex;
    flex-direction: column;
    gap: 4px;
    background: none;
    border: none;
    padding: 8px;
    cursor: pointer;
  }
  
  .hamburger-btn span {
    width: 24px;
    height: 2px;
    background: var(--color-text);
    transition: all 0.3s ease;
  }
  
  .nav-responsive {
    position: fixed;
    top: 0;
    left: -100%;
    width: 80%;
    max-width: 300px;
    height: 100vh;
    background: var(--color-bg);
    flex-direction: column;
    padding: 60px 20px 20px;
    box-shadow: 2px 0 10px rgba(0, 0, 0, 0.1);
    transition: left 0.3s ease;
    z-index: 1000;
  }
  
  .nav-responsive.open {
    left: 0;
  }
  
  .nav-responsive a {
    width: 100%;
    padding: 16px;
    border-bottom: 1px solid var(--color-border);
  }
}
```

---

## Адаптивные модальные окна

### Пример 5: Модальное окно

```tsx
const ResponsiveModal = ({ isOpen, onClose, children }) => {
  if (!isOpen) return null;
  
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-content-responsive"
        onClick={(e) => e.stopPropagation()}
      >
        <button className="modal-close" onClick={onClose}>
          ×
        </button>
        {children}
      </div>
    </div>
  );
};
```

### CSS:

```css
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  padding: 20px;
}

.modal-content-responsive {
  background: var(--color-bg);
  border-radius: 16px;
  padding: 24px;
  max-width: 600px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  position: relative;
}

.modal-close {
  position: absolute;
  top: 16px;
  right: 16px;
  background: none;
  border: none;
  font-size: 32px;
  cursor: pointer;
  color: var(--color-muted);
  line-height: 1;
  padding: 0;
  width: 32px;
  height: 32px;
}

/* Mobile - полноэкранное модальное окно */
@media (max-width: 768px) {
  .modal-overlay {
    padding: 0;
  }
  
  .modal-content-responsive {
    width: 100%;
    height: 100vh;
    max-height: 100vh;
    border-radius: 0;
    padding: 60px 16px 16px;
  }
  
  .modal-close {
    top: 12px;
    right: 12px;
  }
}
```

---

## Адаптивные графики

### Пример 6: Responsive Chart

```tsx
import { Line } from 'react-chartjs-2';

const ResponsiveChart = ({ data }) => {
  const [chartHeight, setChartHeight] = useState(300);
  
  useEffect(() => {
    const updateHeight = () => {
      if (window.innerWidth <= 768) {
        setChartHeight(250);
      } else if (window.innerWidth <= 480) {
        setChartHeight(200);
      } else {
        setChartHeight(300);
      }
    };
    
    updateHeight();
    window.addEventListener('resize', updateHeight);
    return () => window.removeEventListener('resize', updateHeight);
  }, []);
  
  return (
    <div className="chart-responsive">
      <Line 
        data={data}
        options={{
          responsive: true,
          maintainAspectRatio: false,
        }}
        height={chartHeight}
      />
    </div>
  );
};
```

### CSS:

```css
.chart-responsive {
  width: 100%;
  height: 300px;
  position: relative;
}

@media (max-width: 768px) {
  .chart-responsive {
    height: 250px;
  }
}

@media (max-width: 480px) {
  .chart-responsive {
    height: 200px;
  }
}
```

---

## Адаптивные списки

### Пример 7: Список с деталями

```tsx
const ResponsiveList = ({ items }) => {
  return (
    <ul className="list-responsive">
      {items.map(item => (
        <li key={item.id} className="list-item-responsive">
          <div className="list-item-header">
            <h4>{item.title}</h4>
            <span className="badge-responsive">{item.status}</span>
          </div>
          <p className="list-item-description">{item.description}</p>
          <div className="list-item-actions">
            <button className="btn-sm">Просмотр</button>
            <button className="btn-sm">Редактировать</button>
          </div>
        </li>
      ))}
    </ul>
  );
};
```

### CSS:

```css
.list-responsive {
  list-style: none;
  padding: 0;
  margin: 0;
}

.list-item-responsive {
  padding: 16px;
  border-bottom: 1px solid var(--color-border);
  transition: background 0.3s ease;
}

.list-item-responsive:hover {
  background: var(--color-bg-alt);
}

.list-item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.list-item-actions {
  display: flex;
  gap: 8px;
  margin-top: 12px;
}

/* Mobile */
@media (max-width: 768px) {
  .list-item-responsive {
    padding: 12px;
  }
  
  .list-item-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
  
  .list-item-actions {
    flex-direction: column;
  }
  
  .list-item-actions button {
    width: 100%;
  }
}
```

---

## Полезные хуки

### useMediaQuery Hook

```tsx
import { useState, useEffect } from 'react';

export const useMediaQuery = (query: string) => {
  const [matches, setMatches] = useState(false);
  
  useEffect(() => {
    const media = window.matchMedia(query);
    
    if (media.matches !== matches) {
      setMatches(media.matches);
    }
    
    const listener = () => setMatches(media.matches);
    media.addEventListener('change', listener);
    
    return () => media.removeEventListener('change', listener);
  }, [matches, query]);
  
  return matches;
};

// Использование:
const MyComponent = () => {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const isTablet = useMediaQuery('(max-width: 1024px)');
  
  return (
    <div>
      {isMobile ? <MobileView /> : <DesktopView />}
    </div>
  );
};
```

### useWindowSize Hook

```tsx
import { useState, useEffect } from 'react';

export const useWindowSize = () => {
  const [windowSize, setWindowSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });
  
  useEffect(() => {
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  return windowSize;
};

// Использование:
const MyComponent = () => {
  const { width, height } = useWindowSize();
  
  return (
    <div>
      Ширина: {width}px, Высота: {height}px
    </div>
  );
};
```

---

## Тестирование адаптивности

### Чеклист для тестирования:

```markdown
## Desktop (1920px+)
- [ ] Все элементы видны
- [ ] Правильное расположение
- [ ] Hover эффекты работают
- [ ] Нет горизонтального скролла

## Laptop (1024px - 1920px)
- [ ] Адаптивная сетка работает
- [ ] Текст читаем
- [ ] Изображения масштабируются

## Tablet (768px - 1024px)
- [ ] Боковая панель адаптирована
- [ ] Таблицы с горизонтальным скроллом
- [ ] Формы вертикальные

## Mobile (320px - 768px)
- [ ] Гамбургер меню работает
- [ ] Таблицы в карточном виде
- [ ] Кнопки минимум 44x44px
- [ ] Модальные окна полноэкранные
- [ ] Нет зума при фокусе на input
```

---

**Эти примеры помогут вам создавать полностью адаптивные компоненты для CRM системы! 🎉**
