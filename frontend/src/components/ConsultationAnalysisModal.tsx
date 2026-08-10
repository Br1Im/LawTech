import React, { useEffect, useMemo, useState } from 'react';
import { Alert, App, Input, InputNumber, Modal, Radio, Select, Tag } from 'antd';
import { apiInstance } from '../shared/api/instance';

type Props = { open: boolean; consultation: any; onClose: () => void; onSaved: () => void };
type Option = { value: string; label: string };

const YPN: Option[] = [
  { value: 'YES', label: 'Да' }, { value: 'PARTIAL', label: 'Частично' },
  { value: 'NO', label: 'Нет' }, { value: 'UNKNOWN', label: 'Не определить' },
];
const YES_NO_UNKNOWN: Option[] = [
  { value: 'YES', label: 'Да' }, { value: 'NO', label: 'Нет' }, { value: 'UNKNOWN', label: 'Не определить' },
];
const REASONS = [
  ['CLIENT_DELAY','NEED_THINK','Нужно подумать'],['CLIENT_DELAY','CONSULT_OTHERS','Нужно посоветоваться'],['CLIENT_DELAY','NOT_READY','Не готов принять решение'],['CLIENT_DELAY','RETURN_LATER','Вернётся позже'],['CLIENT_DELAY','DELAY_OTHER','Иная отложенная причина'],
  ['SERVICE_PROBLEM','PRICE','Стоимость услуги'],['SERVICE_PROBLEM','NO_MONEY_NOW','Нет денег сейчас'],['SERVICE_PROBLEM','PAYMENT_SCHEME','Не устраивает схема оплаты'],['SERVICE_PROBLEM','CONDITIONS','Не устроили условия'],['SERVICE_PROBLEM','SERVICE_SCOPE','Не устроил объём услуги'],['SERVICE_PROBLEM','VALUE_NOT_CLEAR','Не понял ценность'],['SERVICE_PROBLEM','SOLUTION_REJECTED','Не устроило решение'],['SERVICE_PROBLEM','FINANCE_OTHER','Иная финансовая причина'],['SERVICE_PROBLEM','PRODUCT_OTHER','Иная причина предложения'],
  ['SALES_PROCESS','NEED_NOT_IDENTIFIED','Не выявлена потребность'],['SALES_PROCESS','SOLUTION_NOT_CLEAR','Клиент не понял решение'],['SALES_PROCESS','VALUE_NOT_FORMED','Не сформирована ценность'],['SALES_PROCESS','OBJECTION_NOT_HANDLED','Не отработано возражение'],['SALES_PROCESS','OFFER_NOT_MADE','Договор не предложен'],['SALES_PROCESS','ARGUMENTS_INSUFFICIENT','Недостаточно аргументации'],
  ['LEAD_QUALITY','LOW_POTENTIAL','Низкая перспективность'],['LEAD_QUALITY','ECONOMICALLY_UNVIABLE','Экономически нецелесообразно'],['LEAD_QUALITY','NO_SUPPORT_NEEDED','Сопровождение не требуется'],['LEAD_QUALITY','NOT_LEGALLY_SOLVABLE','Вопрос не решается юридически'],
  ['NON_TARGET','NON_TARGET_SERVICE','Нецелевая услуга'],['NON_TARGET','OUT_OF_PROFILE','Не соответствует профилю'],['OTHER','OTHER','Иная причина'],['UNRESOLVED','INSUFFICIENT_DATA','Недостаточно данных'],
] as const;
const CATEGORIES: Option[] = [
  {value:'LEAD_QUALITY',label:'Качество / перспективность'}, {value:'SALES_PROCESS',label:'Процесс продажи'},
  {value:'CLIENT_DELAY',label:'Отложенное решение'}, {value:'SERVICE_PROBLEM',label:'Предложение / услуга'},
  {value:'NON_TARGET',label:'Нецелевое обращение'}, {value:'UNRESOLVED',label:'Недостаточно данных'}, {value:'OTHER',label:'Прочее'},
];
const initial: any = {
  lead_quality:'UNKNOWN', commercial_potential:'UNKNOWN', service_fit:'UNKNOWN', legally_solvable:'UNKNOWN',
  need_identified:'UNKNOWN', decision_maker_identified:'UNKNOWN', solution_understood:'UNKNOWN', offer_made:'UNKNOWN',
  objection_identified:'UNKNOWN', objection_processed:'UNKNOWN', next_step:'NOT_FIXED', loss_category:'UNRESOLVED',
  loss_reason:'INSUFFICIENT_DATA', evidence_sources:['CRM'], data_sufficiency:'INSUFFICIENT',
  missing_data_reason:'Причина отказа не зафиксирована', classification_basis:'MIXED', confidence_score:30, version:0,
};

const Field: React.FC<{ label: string; wide?: boolean; children: React.ReactNode; hint?: string }> = ({label,wide,children,hint}) => (
  <label className={wide ? 'ca-field ca-field--wide' : 'ca-field'}>
    <span className="ca-field-label">{label}</span>{children}{hint && <small>{hint}</small>}
  </label>
);
const Section: React.FC<{ number: string; title: string; note?: string; children: React.ReactNode }> = ({number,title,note,children}) => (
  <section className="ca-section">
    <div className="ca-section-head"><span>{number}</span><div><h3>{title}</h3>{note && <p>{note}</p>}</div></div>
    <div className="ca-section-grid">{children}</div>
  </section>
);

const ConsultationAnalysisModal: React.FC<Props> = ({open,consultation,onClose,onSaved}) => {
  const { message } = App.useApp();
  const [f,setF] = useState<any>(initial);
  const [loading,setLoading] = useState(false);
  const [step,setStep] = useState(1);
  const set = (key:string,value:any) => setF((old:any)=>({...old,[key]:value}));
  useEffect(()=>{ if(!open||!consultation)return; setStep(1); (async()=>{ setLoading(true); try{
    const r=await apiInstance.get(`/consultation-analysis/${consultation.id}`); const data=r.data.data;
    setF(data ? {...initial,...data,evidence_sources:typeof data.evidence_sources==='string'?JSON.parse(data.evidence_sources):data.evidence_sources}
      : {...initial,employee_id:consultation.assigned_lawyer_id,source_id:consultation.source_id,topic:consultation.comment});
  }catch{message.error('Не удалось загрузить разбор')}finally{setLoading(false)} })(); },[open,consultation]);
  const reasonOptions=useMemo(()=>REASONS.map(x=>({value:x[1],label:x[2]})),[]);
  const chooseReason=(value:string)=>{const r=REASONS.find(x=>x[1]===value);setF((old:any)=>({...old,loss_reason:value,loss_category:r?.[0]}));};
  const save=async()=>{setLoading(true);try{await apiInstance.put(`/consultation-analysis/${consultation.id}`,f);message.success('Разбор сохранён');onSaved();onClose();}
    catch(e:any){message[e?.response?.status===409?'warning':'error'](e?.response?.status===409?'Запись уже изменена. Откройте разбор повторно.':e?.response?.data?.message||'Не удалось сохранить');}finally{setLoading(false)}};
  const basisColor=f.classification_basis==='FACTS'?'green':f.classification_basis==='HYPOTHESIS'?'orange':'blue';
  return <Modal className="ca-modal" title={null} open={open} onCancel={onClose} onOk={save} okText="Сохранить разбор" cancelText="Отмена" confirmLoading={loading} width={920} centered destroyOnClose>
    {consultation && <div className="ca-shell">
      <header className="ca-modal-head"><div><span className="ca-eyebrow">Управленческий разбор</span><h2>{consultation.client_name}</h2></div><Tag color="red">Договор не заключён</Tag></header>
      <div className="ca-context">
        <div><small>Дата и время</small><b>{consultation.appointment_date} · {String(consultation.appointment_time||'').slice(0,5)}</b></div>
        <div><small>Источник</small><b>{consultation.source||'Не указан'}</b></div>
        <div><small>Юрист</small><b>{consultation.assigned_lawyer_name||'Не назначен'}</b></div>
      </div>
      <Alert className="ca-principle" type="info" showIcon message="Фиксируйте только доступные сведения" description="Если факт нельзя подтвердить, выберите «Не определить». Разбор не устанавливает виновность сотрудника." />
      <nav className="ca-step-nav" aria-label="Разделы разбора">
        {[['1','Основание'],['2','Перспективность'],['3','Консультация'],['4','Итог']].map(([n,label])=><button key={n} type="button" className={step===Number(n)?'active':''} onClick={()=>setStep(Number(n))}><span>{n}</span>{label}</button>)}
      </nav>
      {step===1&&<Section number="1" title="Основание разбора" note="Откуда получена информация и достаточно ли её для вывода">
        <Field label="Источник сведений" wide><Select mode="multiple" value={f.evidence_sources} onChange={v=>set('evidence_sources',v)} options={[['CRM','Данные CRM'],['ADMIN_COMMENT','Комментарий администратора'],['LAWYER_INFO','Информация от юриста'],['CLIENT_FEEDBACK','Сообщение клиента'],['DOCUMENTS','Документы / переписка'],['MANAGER_PRESENT','Личное присутствие'],['OTHER','Иное']].map(x=>({value:x[0],label:x[1]}))}/></Field>
        <Field label="Достаточность данных" wide><Radio.Group className="ca-segments" optionType="button" buttonStyle="solid" value={f.data_sufficiency} onChange={e=>set('data_sufficiency',e.target.value)} options={[{value:'SUFFICIENT',label:'Достаточно'},{value:'PARTIAL',label:'Частично'},{value:'INSUFFICIENT',label:'Недостаточно'}]}/></Field>
        {f.data_sufficiency==='INSUFFICIENT'&&<Field label="Каких сведений не хватает" wide><Input value={f.missing_data_reason} onChange={e=>set('missing_data_reason',e.target.value)} placeholder="Например, не зафиксирована причина отказа"/></Field>}
      </Section>}
      {step===2&&<Section number="2" title="Перспективность обращения" note="Оцениваем соответствие обращения услугам, а не «качество клиента»">
        <Field label="Перспективность"><Select value={f.lead_quality} onChange={v=>set('lead_quality',v)} options={[['HIGH','Высокая'],['MEDIUM','Средняя'],['LOW','Низкая'],['ECONOMICALLY_UNVIABLE','Экономически нецелесообразно'],['NOT_LEGALLY_SOLVABLE','Не решается юридически'],['UNKNOWN','Не определить']].map(x=>({value:x[0],label:x[1]}))}/></Field>
        <Field label="Коммерческий потенциал"><Select value={f.commercial_potential} onChange={v=>set('commercial_potential',v)} options={[['HIGH','Высокий'],['MEDIUM','Средний'],['LOW','Низкий'],['NONE','Отсутствует'],['UNKNOWN','Не определить']].map(x=>({value:x[0],label:x[1]}))}/></Field>
        <Field label="Соответствует услугам офиса"><Select value={f.service_fit} onChange={v=>set('service_fit',v)} options={YPN}/></Field>
        <Field label="Решается юридически"><Select value={f.legally_solvable} onChange={v=>set('legally_solvable',v)} options={YPN}/></Field>
      </Section>}
      {step===3&&<Section number="3" title="Ход консультации" note="Наблюдаемые признаки процесса продажи">
        <Field label="Потребность выявлена"><Select value={f.need_identified} onChange={v=>set('need_identified',v)} options={YPN}/></Field>
        <Field label="Лицо принимает решение"><Select value={f.decision_maker_identified} onChange={v=>set('decision_maker_identified',v)} options={[{value:'YES',label:'Да'},{value:'NO',label:'Нет'},{value:'NA',label:'Не применимо'},{value:'UNKNOWN',label:'Не определить'}]}/></Field>
        <Field label="Клиент понял решение"><Select value={f.solution_understood} onChange={v=>set('solution_understood',v)} options={YPN}/></Field>
        <Field label="Договор предложен"><Select value={f.offer_made} onChange={v=>set('offer_made',v)} options={YES_NO_UNKNOWN}/></Field>
        <Field label="Возражение выявлено"><Select value={f.objection_identified} onChange={v=>set('objection_identified',v)} options={[...YES_NO_UNKNOWN,{value:'NONE',label:'Не было'}]}/></Field>
        <Field label="Возражение отработано"><Select value={f.objection_processed} onChange={v=>set('objection_processed',v)} options={[...YPN,{value:'NONE',label:'Не было'}]}/></Field>
      </Section>}
      {step===4&&<Section number="4" title="Итог и причина потери" note="Причина определяет основную категорию автоматически">
        <Field label="Причина незаключения" wide><Select showSearch optionFilterProp="label" value={f.loss_reason} onChange={chooseReason} options={reasonOptions}/></Field>
        <Field label="Основная категория"><Select value={f.loss_category} onChange={v=>set('loss_category',v)} options={CATEGORIES}/></Field>
        <Field label="Следующий шаг"><Select value={f.next_step} onChange={v=>set('next_step',v)} options={[{value:'FOLLOW_UP',label:'Повторный контакт'},{value:'PROPOSAL_SENT',label:'Предложение отправлено'},{value:'CLIENT_DECLINED',label:'Клиент отказался'},{value:'NOT_FIXED',label:'Не зафиксирован'}]}/></Field>
        <Field label="Предложенная услуга"><Input value={f.proposed_service} onChange={e=>set('proposed_service',e.target.value)} placeholder="Необязательно"/></Field>
        <Field label="Предложенная цена"><InputNumber min={0} controls={false} addonAfter="₽" value={f.proposed_price} onChange={v=>set('proposed_price',v)} style={{width:'100%'}}/></Field>
        <Field label="Основание вывода"><Select value={f.classification_basis} onChange={v=>set('classification_basis',v)} options={[{value:'FACTS',label:'Факты'},{value:'MIXED',label:'Факты и гипотезы'},{value:'HYPOTHESIS',label:'Гипотеза'}]}/></Field>
        <Field label="Уверенность"><InputNumber min={0} max={100} addonAfter="%" value={f.confidence_score} onChange={v=>set('confidence_score',v)} style={{width:'100%'}}/></Field>
        <Field label="Комментарий руководителя" wide><Input.TextArea rows={3} maxLength={1000} showCount value={f.manager_comment} onChange={e=>set('manager_comment',e.target.value)} placeholder="Нужен при ручном изменении категории или спорном выводе"/></Field>
        <div className="ca-result ca-field--wide"><span>Итог</span><Tag color={basisColor}>{CATEGORIES.find(x=>x.value===f.loss_category)?.label||f.loss_category}</Tag><small>{f.classification_basis==='HYPOTHESIS'?'Гипотеза, требует подтверждения':'Будет учтено в аналитике офиса'}</small></div>
      </Section>}
      <div className="ca-step-actions">
        <button type="button" disabled={step===1} onClick={()=>setStep(v=>Math.max(1,v-1))}>Назад</button>
        <span>Шаг {step} из 4</span>
        {step<4&&<button type="button" className="primary" onClick={()=>setStep(v=>Math.min(4,v+1))}>Далее</button>}
      </div>
    </div>}
  </Modal>;
};
export default ConsultationAnalysisModal;
