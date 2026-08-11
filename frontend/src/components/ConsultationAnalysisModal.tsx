import React, { useEffect, useMemo, useState } from 'react';
import { Alert, App, Button, Input, Modal, Radio, Tag } from 'antd';
import { apiInstance } from '../shared/api/instance';

type Props = { open:boolean; consultation:any; onClose:()=>void; onSaved:()=>void };
type Value = 'YES'|'PARTIAL'|'NO'|'NONE'|'NA'|'HIGH'|'MEDIUM'|'LOW'|'UNKNOWN';
type Form = {
  legally_solvable:Value; commercial_potential:Value; service_fit:Value;
  need_identified:Value; decision_maker_identified:Value;
  objection_identified:Value; objection_processed:Value; offer_made:Value;
  client_objection:string; manager_comment:string; version:number;
};
const initial:Form={legally_solvable:'UNKNOWN',commercial_potential:'UNKNOWN',service_fit:'UNKNOWN',need_identified:'UNKNOWN',decision_maker_identified:'UNKNOWN',objection_identified:'UNKNOWN',objection_processed:'UNKNOWN',offer_made:'UNKNOWN',client_objection:'',manager_comment:'',version:0};
const tri=[['YES','Да'],['PARTIAL','Частично'],['NO','Нет']];
const yn=[['YES','Да'],['NO','Нет']];
const potential=[['HIGH','Высокий'],['MEDIUM','Средний'],['LOW','Низкий'],['NONE','Отсутствует']];
const decision=[['YES','Да'],['NO','Нет'],['NA','Не применимо']];
const objection=[['YES','Да'],['NO','Нет'],['NONE','Возражения не было']];

const Segments=({label,value,options,onChange,hint}:{label:string;value:string;options:string[][];onChange:(v:any)=>void;hint?:string})=><fieldset className="ca-quick-field"><legend>{label}</legend>{hint&&<small>{hint}</small>}<Radio.Group className="ca-quick-segments" optionType="button" buttonStyle="solid" value={value==='UNKNOWN'?undefined:value} onChange={e=>onChange(e.target.value)} options={options.map(([v,l])=>({value:v,label:l}))}/></fieldset>;

const ConsultationAnalysisModal:React.FC<Props>=({open,consultation,onClose,onSaved})=>{
 const {message}=App.useApp();const [form,setForm]=useState<Form>(initial);const [step,setStep]=useState(1);const [saving,setSaving]=useState(false);const [aiEnabled,setAiEnabled]=useState(false);
 const set=(key:keyof Form,value:any)=>setForm(old=>({...old,[key]:value}));
 useEffect(()=>{if(!open||!consultation)return;setStep(1);setSaving(true);apiInstance.get(`/consultation-analysis/${consultation.id}`).then(r=>{const d=r.data.data;setAiEnabled(!!r.data.capabilities?.ai_enabled);setForm(d?{...initial,...d,client_objection:d.client_objection||'',manager_comment:d.manager_comment||''}:{...initial});}).catch(()=>message.error('Не удалось загрузить разбор')).finally(()=>setSaving(false));},[open,consultation]);
 useEffect(()=>{if(form.objection_identified==='NONE')setForm(old=>({...old,objection_processed:'NONE',client_objection:''}));},[form.objection_identified]);
 const complete=useMemo(()=>['legally_solvable','commercial_potential','service_fit','need_identified','decision_maker_identified','objection_identified','offer_made'].every(k=>(form as any)[k]!=='UNKNOWN')&&(form.objection_identified==='NONE'||(['YES','PARTIAL','NO'].includes(form.objection_processed)&&form.client_objection.trim().length>0)),[form]);
 const save=async()=>{setSaving(true);try{await apiInstance.put(`/consultation-analysis/${consultation.id}`,{...form,action:'SAVE_DRAFT',lead_quality:form.commercial_potential,evidence_sources:['CRM','MANAGER_COMMENT'],data_sufficiency:form.manager_comment.trim()||form.client_objection.trim()?'PARTIAL':'INSUFFICIENT',loss_category:'UNRESOLVED',loss_reason:'INSUFFICIENT_DATA',missing_data_reason:'AI-анализ будет выполнен после подключения ключа',classification_basis:'MIXED',confidence_score:0});message.success(aiEnabled?'Факты сохранены':'Факты сохранены. AI можно подключить позже');onSaved();onClose();}catch(e:any){message[e?.response?.status===409?'warning':'error'](e?.response?.status===409?'Разбор изменён другим пользователем. Откройте его заново.':e?.response?.data?.message||'Не удалось сохранить');}finally{setSaving(false)}};
 return <Modal className="ca-modal ca-quick-modal unified-form-modal" title={null} open={open} onCancel={onClose} width={760} centered destroyOnClose footer={null}>
  {consultation&&<div className="ca-quick-shell">
   <header className="ca-quick-head"><div><span>Разбор консультации</span><h2>{consultation.client_name}</h2></div><Tag color="orange">Договор не заключён</Tag></header>
   <div className="ca-quick-context"><span>{consultation.appointment_date} · {String(consultation.appointment_time||'').slice(0,5)}</span><span>{consultation.source||'Источник не указан'}</span><span>{consultation.assigned_lawyer_name||'Сотрудник не назначен'}</span></div>
   {!aiEnabled&&<Alert type="info" showIcon message="Сейчас сохраняем факты" description="AI-анализ станет доступен после подключения ключа. Сохранённые разборы уже готовы для будущего анализа."/>}
   <nav className="ca-quick-steps">{[['1','Клиент'],['2','Консультация'],['3','Контекст']].map(([n,l])=><button type="button" key={n} className={step===+n?'active':''} onClick={()=>setStep(+n)}><b>{n}</b><span>{l}</span></button>)}</nav>
   <div className="ca-quick-body">
    {step===1&&<section><h3>Качество обращения</h3><p>Только факты о задаче и потенциале клиента.</p><div className="ca-quick-grid"><Segments label="Вопрос клиента юридически решаем?" value={form.legally_solvable} options={tri} onChange={v=>set('legally_solvable',v)}/><Segments label="Коммерческий потенциал" value={form.commercial_potential} options={potential} onChange={v=>set('commercial_potential',v)}/><Segments label="Вопрос соответствует услугам офиса?" value={form.service_fit} options={yn} onChange={v=>set('service_fit',v)}/></div></section>}
    {step===2&&<section><h3>Работа на консультации</h3><p>Оцениваем процесс, не определяя виновного.</p><div className="ca-quick-grid"><Segments label="Потребность клиента выявлена?" value={form.need_identified} options={tri} onChange={v=>set('need_identified',v)}/><Segments label="ЛПР выявлен?" hint="ЛПР — тот, кто принимает решение о договоре и оплате." value={form.decision_maker_identified} options={decision} onChange={v=>set('decision_maker_identified',v)}/><Segments label="Истинное возражение выявлено?" value={form.objection_identified} options={objection} onChange={v=>set('objection_identified',v)}/>{form.objection_identified!=='NONE'&&<Segments label="Возражение отработано?" value={form.objection_processed} options={tri} onChange={v=>set('objection_processed',v)}/>}<Segments label="Предложение заключить договор было?" value={form.offer_made} options={yn} onChange={v=>set('offer_made',v)}/></div></section>}
    {step===3&&<section><h3>Слова клиента и наблюдения</h3><p>Фиксируйте формулировки, а не готовый вывод.</p><div className="ca-quick-texts">{form.objection_identified!=='NONE'&&<label><span>Какое возражение было у клиента? *</span><Input.TextArea rows={3} maxLength={1500} showCount value={form.client_objection} onChange={e=>set('client_objection',e.target.value)} placeholder="Например: «Хочу посоветоваться с супругой»"/></label>}<label><span>Комментарий руководителя</span><Input.TextArea rows={4} maxLength={3000} showCount value={form.manager_comment} onChange={e=>set('manager_comment',e.target.value)} placeholder="Что происходило на консультации и каких фактов не хватило"/></label></div></section>}
   </div>
   <footer className="ca-quick-footer"><div>{complete?<Tag color="green">Форма заполнена</Tag>:<Tag>Можно сохранить черновик</Tag>}</div><Button onClick={onClose}>Отмена</Button>{step>1&&<Button onClick={()=>setStep(v=>v-1)}>Назад</Button>}{step<3?<Button type="primary" onClick={()=>setStep(v=>v+1)}>Далее</Button>:<Button type="primary" loading={saving} onClick={save}>Сохранить разбор</Button>}</footer>
  </div>}
 </Modal>;
};
export default ConsultationAnalysisModal;
