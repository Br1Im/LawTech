const fs=require('fs'); const path=require('path');
describe('LT-018 UI consistency policy',()=>{
 const root=path.join(__dirname,'../../frontend/src');
 const css=fs.readFileSync(path.join(root,'lawtech-design-system.css'),'utf8');
 const rail=fs.readFileSync(path.join(root,'components/ui/MobileIconRail.tsx'),'utf8');
 const clients=fs.readFileSync(path.join(root,'components/Clients.tsx'),'utf8');
 const chat=fs.readFileSync(path.join(root,'components/OfficeChat.tsx'),'utf8');
 test('mobile navigation keeps full desktop terminology',()=>{
   expect(rail).toContain("label: 'Сотрудники'");
   expect(rail).toContain("label: 'Зарплата'");
   expect(rail).toContain("label: 'Колл-центр'");
   expect(rail).not.toContain("label: 'Кадры'");
   expect(rail).not.toContain("label: 'ЗП'");
 });
 test('mobile controls have a 44px target and Office is excluded from consistency selectors',()=>{
   expect(css).toContain('min-height: 44px');
   const pass=css.slice(css.indexOf('UI consistency pass 2026-08-18'));
   expect(pass).not.toContain('.office-content');
 });
 test('deadline status does not depend on OS emoji',()=>{
   expect(clients).not.toMatch(/🟢|🟠|🔴/);
   expect(css).toContain('.deadline-badge::before');
 });
 test('chat icon controls have accessible labels',()=>{
   for(const label of ['Участники чата','Поиск по сообщениям','Прикрепить файл','Отправить сообщение']) expect(chat).toContain(`aria-label="${label}"`);
 });
});

describe('LT-018 phase 2 accessibility and layering',()=>{
 const root=path.join(__dirname,'../../frontend/src');
 const main=fs.readFileSync(path.join(root,'main.tsx'),'utf8');
 const sidebar=fs.readFileSync(path.join(root,'components/ui/Sidebar.tsx'),'utf8');
 const css=fs.readFileSync(path.join(root,'lawtech-design-system.css'),'utf8');
 test('legacy controls receive an accessible fallback name',()=>expect(main).toContain('ensureAccessibleControlNames'));
 test('unknown user avatar is not a question mark',()=>expect(sidebar).toContain("return s + n || 'П'"));
 test('semantic z index and reduced motion policies exist',()=>{expect(css).toContain('--lt-z-modal');expect(css).toContain('@media (prefers-reduced-motion: reduce)')});
});

describe('LT-018 phase 3 loading and destructive actions',()=>{
 const root=path.join(__dirname,'../../frontend/src');
 const read=(f)=>fs.readFileSync(path.join(root,f),'utf8');
 test('key screens use skeleton loading',()=>{for(const f of ['components/Salary.tsx','components/Employees.tsx','components/MyCases.tsx'])expect(read(f)).toContain('TableSkeleton')});
 test('call center has a shaped loading state',()=>expect(read('components/CallCenter.tsx')).toContain('ui-table-loading'));
 test('balance does not use browser confirm',()=>{const x=read('components/Balance.tsx');expect(x).not.toContain('window.confirm');expect(x).toContain('Modal.confirm')});
});

describe('LT-018 phase 4 dates and actionable empty states',()=>{
 const root=path.join(__dirname,'../../frontend/src');
 const read=(f)=>fs.readFileSync(path.join(root,f),'utf8');
 test('shared Russian date formatter is used by key screens',()=>{
   expect(read('shared/utils/dateFormat.ts')).toContain('formatRuDateRange');
   expect(read('components/CallCenter.tsx')).toContain('formatRuDateRange(statsPeriod.from, statsPeriod.to)');
   expect(read('components/Clients.tsx')).toContain('formatRuDate(c.contract_date)');
 });
 test('empty employee and lead results offer filter reset',()=>{
   expect(read('components/Employees.tsx')).toContain('Измените поиск или сбросьте выбранные фильтры');
   expect(read('components/CallCenter.tsx')).toContain('ui-actionable-empty');
 });
 test('balance icon controls have names',()=>{
   const balance=read('components/Balance.tsx');
   expect(balance).toContain('aria-label="Удалить расход"');
   expect((balance.match(/aria-label="Закрыть"/g)||[]).length).toBeGreaterThanOrEqual(3);
 });
});

describe('LT-018 mobile containment',()=>{
 const root=path.join(__dirname,'../../frontend/src'); const read=f=>fs.readFileSync(path.join(root,f),'utf8');
 test('mobile rail is capped at four role items plus More',()=>expect(read('components/ui/MobileIconRail.tsx')).toContain('.slice(0, 4)'));
 test('mobile rail is a fixed five-column grid',()=>expect(read('components/ui/MobileIconRail.css')).toContain('grid-template-columns: repeat(5, minmax(0, 1fr))'));
 test('representative cases use cards on mobile',()=>expect(read('components/MyCases.tsx')).toContain('mobile-case-card'));
 test('wide tables are contained on mobile',()=>expect(read('lawtech-design-system.css')).toContain('overscroll-behavior-x:contain'));
});

describe('LT-018 narrow call-center date controls',()=>{
 test('date navigation uses a bounded mobile grid',()=>{
   const css=fs.readFileSync(path.join(__dirname,'../../frontend/src/components/CallCenter.css'),'utf8');
   expect(css).toContain('grid-template-columns: 44px minmax(0, 1fr) 44px 44px');
 });
});
