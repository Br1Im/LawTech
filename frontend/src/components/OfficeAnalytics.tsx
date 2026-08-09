import { useCallback, useEffect, useState } from 'react';
import { CalendarOutlined, ArrowUpOutlined, ArrowDownOutlined, InfoCircleOutlined, PlusOutlined, EditOutlined, StopOutlined, CheckOutlined } from '@ant-design/icons';
import { apiInstance } from '../shared/api/instance';
import { Modal, Input, notification, Tabs, Table, Tag } from 'antd';
import { useAuth } from '../shared/lib/hooks/useAuth';
import './OfficeAnalytics.css';

type SourceRow = { source:string; leads:number; appointments:number; arrived:number; contracts:number; conversion:number; average_check:number; revenue:number; no_show:number };
type Loss = { reason:string; label:string; count:number; percentage:number };
type Analytics = {
  period:{from:string;to:string};
  kpi:{leads:number;total_records:number;arrived:number;contracts_signed:number;conversion:number;no_show:number;average_check:number;contract_revenue:number};
  funnel:Array<{stage:string;count:number;rate:number}>;
  source_ranking:SourceRow[];
  losses:{total:number;items:Loss[]};
};

const money = (v:number) => `${Math.round(Number(v)||0).toLocaleString('ru-RU')} ₽`;
const lossColors = ['#ef5b69','#f0a12a','#e7bd28','#6d61df','#7d8496','#a1a6b3'];
const funnelColors = ['#dad4ff','#ffedbd','#d4f3e5','#ffd8dd'];

const analyticsCache = new Map<string, Promise<Analytics>>();
function fetchOfficeAnalytics(officeId:string|number, from:string, to:string){
  const key = `${officeId}:${from}:${to}`;
  if(!analyticsCache.has(key)){
    const request = apiInstance.get('/analytics/call-center',{params:{office_id:officeId,date_from:from,date_to:to}})
      .then(r => r.data?.data as Analytics)
      .finally(() => window.setTimeout(() => analyticsCache.delete(key), 1200));
    analyticsCache.set(key, request);
  }
  return analyticsCache.get(key)!;
}

export function OfficeAnalyticsTop({officeId, from, to}:{officeId:string|number;from:string;to:string}) {
  const [data,setData]=useState<Analytics|null>(null);
  const [loading,setLoading]=useState(true);
  useEffect(()=>{ let alive=true; setLoading(true); fetchOfficeAnalytics(officeId,from,to).then(result=>{if(alive)setData(result||null)}).catch(()=>{if(alive)setData(null)}).finally(()=>{if(alive)setLoading(false)}); return()=>{alive=false};},[officeId,from,to]);
  if(loading) return <section className="oa-panel oa-skeleton" aria-label="Загрузка аналитики"><span/><span/><span/><span/></section>;
  if(!data) return <section className="oa-panel oa-empty"><InfoCircleOutlined/> Не удалось загрузить аналитику за выбранный период</section>;
  return <section className="oa-panel oa-funnel-panel">
    <h2>Воронка продаж за период</h2>
    <div className="oa-funnel-layout">
      <div className="oa-funnel" aria-label="Воронка продаж">
        {data.funnel.map((item,i)=><div className="oa-funnel-row" key={item.stage}>
          <div className="oa-funnel-label"><span className="oa-stage-dot" style={{background:funnelColors[i]}}>{i+1}</span><b>{item.stage}</b></div>
          <div className="oa-funnel-shape" style={{background:funnelColors[i],width:`${Math.max(42,100-i*15)}%`}}><strong>{item.count.toLocaleString('ru-RU')}</strong></div>
        </div>)}
      </div>
      <div className="oa-kpis">
        <div><small>Конверсия в договор</small><strong>{data.kpi.conversion}%</strong><span className="oa-positive"><ArrowUpOutlined/> по пришедшим</span></div>
        <div><small>Не пришли на консультацию</small><strong>{data.kpi.no_show}</strong><span>{data.kpi.total_records ? Math.round(data.kpi.no_show/data.kpi.total_records*100):0}%</span></div>
        <div><small>Средний чек</small><strong>{money(data.kpi.average_check)}</strong></div>
        <div><small>Общая касса</small><strong>{money(data.kpi.contract_revenue)}</strong></div>
      </div>
    </div>
  </section>;
}

export function OfficeAnalyticsBottom({officeId,from,to}:{officeId:string|number;from:string;to:string}){
  const [data,setData]=useState<Analytics|null>(null);
  const [lossData,setLossData]=useState<any>(null);
  const [sourceRows,setSourceRows]=useState<any[]>([]);
  const [loading,setLoading]=useState(true);
  const [detailOpen,setDetailOpen]=useState(false);
  const [detailRows,setDetailRows]=useState<any[]>([]);
  const [employeeRows,setEmployeeRows]=useState<any[]>([]);
  const [detailLoading,setDetailLoading]=useState(false);
  useEffect(()=>{let alive=true;setLoading(true);Promise.all([
    fetchOfficeAnalytics(officeId,from,to),
    apiInstance.get('/consultation-analysis/analytics/summary',{params:{date_from:from,date_to:to}}).then(r=>r.data?.data).catch(()=>null),
    apiInstance.get('/consultation-analysis/analytics/rankings/sources',{params:{date_from:from,date_to:to}}).then(r=>r.data?.data||[]).catch(()=>[])
  ]).then(([base,losses,sources])=>{if(alive){setData(base||null);setLossData(losses);setSourceRows(sources)}}).finally(()=>{if(alive)setLoading(false)});return()=>{alive=false};},[officeId,from,to]);
  const rows=data?.source_ranking||[];
  const labels:any={LEAD_QUALITY:'Качество / перспективность лидов',SALES_PROCESS:'Проблемы процесса продаж',CLIENT_DELAY:'Отложенное решение клиента',SERVICE_PROBLEM:'Предложение / услуга',NON_TARGET:'Нецелевые обращения',UNRESOLVED:'Недостаточно данных',OTHER:'Прочее'};
  const totalAnalyzed=Number(lossData?.analyzed||0);
  const lossItems=(lossData?.categories||[]).map((x:any)=>({reason:x.category,label:labels[x.category]||x.category,count:Number(x.count),percentage:totalAnalyzed?Math.round(Number(x.count)*1000/totalAnalyzed)/10:0}));
  const openDetails=async()=>{setDetailOpen(true);setDetailLoading(true);try{const [d,e]=await Promise.all([apiInstance.get('/consultation-analysis/analytics/details',{params:{date_from:from,date_to:to,limit:100}}),apiInstance.get('/consultation-analysis/analytics/rankings/employees',{params:{date_from:from,date_to:to}})]);setDetailRows(d.data?.data||[]);setEmployeeRows(e.data?.data||[])}catch{notification.error({message:'Не удалось загрузить детализацию'})}finally{setDetailLoading(false)}};
  if(loading) return <div className="oa-split"><section className="oa-panel oa-skeleton oa-skeleton-compact"><span/><span/><span/><span/></section><section className="oa-panel oa-skeleton oa-skeleton-compact"><span/><span/><span/><span/></section></div>;
  return <>
    <div className="oa-split">
      <section className="oa-panel oa-losses"><h2>Где компания теряет деньги</h2><div className="oa-loss-list">
        {(lossItems.length?lossItems:(data?.losses.items||[])).slice(0,6).map((item,i)=><div className="oa-loss" key={item.reason}><b style={{color:lossColors[i]}}>{item.percentage}%</b><div><span>{item.label}</span><div className="oa-loss-track"><i style={{width:`${item.percentage}%`,background:lossColors[i]}}/></div></div></div>)}
        {!lossItems.length&&!data?.losses.items?.length&&<p className="oa-muted">За период потери не зафиксированы</p>}
      </div>{lossData&&<p className="oa-scroll-hint">Разобрано {lossData.analyzed} из {lossData.lost}: покрытие {lossData.coverage_pct}% · перспективных {lossData.promising} · конверсия среди перспективных {lossData.conversion_promising_pct}% · потенциальная выручка {money(lossData.potential_lost_revenue)}</p>}<button className="oa-link" type="button" onClick={openDetails}>Подробнее →</button></section>
      <section className="oa-panel oa-sources"><div className="oa-sources-head"><h2>Рейтинг источников</h2>{rows.length > 5 && <span>{rows.length} источников</span>}</div><div className="oa-table-wrap" tabIndex={0} aria-label="Рейтинг источников, прокручиваемая таблица"><table><thead><tr><th>Источник</th><th>Лиды</th><th>Пришло</th><th>Договоры</th><th>Конверсия</th><th>Средний чек</th></tr></thead><tbody>
        {(sourceRows.length?sourceRows:rows).map((r:any)=><tr key={r.id||r.source}><td><b>{r.name||r.source}</b></td><td>{r.analyzed??r.leads??0}</td><td>{r.promising??r.arrived??0}</td><td>{r.sales_losses??r.contracts??0}</td><td>{r.analyzed?Math.round((r.promising||0)*1000/r.analyzed)/10:r.conversion||0}%</td><td>{r.insufficient??money(r.average_check)}</td></tr>)}
        {!rows.length&&<tr><td colSpan={6} className="oa-muted">Нет данных за выбранный период</td></tr>}
      </tbody></table></div>{rows.length > 5 && <p className="oa-scroll-hint">Прокрутите таблицу, чтобы увидеть остальные источники</p>}</section>
    </div>
    <Modal title="Детализация потерь" open={detailOpen} onCancel={()=>setDetailOpen(false)} footer={null} width={980}>
      <Tabs items={[
        {key:'losses',label:'Потерянные консультации',children:<Table loading={detailLoading} rowKey="id" pagination={{pageSize:10}} dataSource={detailRows} columns={[
          {title:'Клиент',dataIndex:'client_name'},{title:'Дата',dataIndex:'appointment_date'},{title:'Сотрудник',dataIndex:'employee_name'},
          {title:'Категория',dataIndex:'loss_category',render:(v:string)=><Tag>{labels[v]||v}</Tag>},{title:'Причина',dataIndex:'loss_reason'},
          {title:'Потенциальная выручка',dataIndex:'potential_lost_revenue',align:'right' as const,render:(v:number)=>money(v)}
        ]}/>},
        {key:'employees',label:'Сотрудники',children:<Table loading={detailLoading} rowKey="id" pagination={false} dataSource={employeeRows} columns={[
          {title:'Сотрудник',dataIndex:'name'},{title:'Разобрано',dataIndex:'analyzed',align:'right' as const},{title:'Перспективные',dataIndex:'promising',align:'right' as const},{title:'Потери процесса',dataIndex:'sales_losses',align:'right' as const},{title:'Недостаточно данных',dataIndex:'insufficient',align:'right' as const}
        ]}/>}
      ]}/>
    </Modal>
  </>;
}

export function OfficePeriod({from,to,onChange}:{from:string;to:string;onChange:(from:string,to:string)=>void}){
  return <div className="oa-period"><CalendarOutlined/><input aria-label="Начало периода" type="date" value={from} max={to} onChange={e=>onChange(e.target.value,to)}/><span>—</span><input aria-label="Конец периода" type="date" value={to} min={from} onChange={e=>onChange(from,e.target.value)}/></div>;
}

type SourceItem = { id:number; name:string; is_active:number };
export function OfficeSourceManager(){
  const { user } = useAuth();
  const canManage = ['director','manager','okk'].includes(user?.role || '');
  const [open,setOpen]=useState(false);
  const [items,setItems]=useState<SourceItem[]>([]);
  const [editor,setEditor]=useState<SourceItem|null>(null);
  const [name,setName]=useState('');
  const [saving,setSaving]=useState(false);
  const load=useCallback(async()=>{if(!canManage)return;try{const r=await apiInstance.get('/appointment-sources',{params:{include_archived:1}});setItems(r.data?.data||[])}catch{notification.error({message:'Не удалось загрузить источники'})}},[canManage]);
  useEffect(()=>{if(open)load()},[open,load]);
  if(!canManage)return null;
  const edit=(item?:SourceItem)=>{setEditor(item||null);setName(item?.name||'')};
  const save=async()=>{const clean=name.trim();if(!clean)return;setSaving(true);try{if(editor)await apiInstance.patch(`/appointment-sources/${editor.id}`,{name:clean});else await apiInstance.post('/appointment-sources',{name:clean});setEditor(null);setName('');await load();notification.success({message:editor?'Источник обновлён':'Источник добавлен'})}catch(e:any){notification.error({message:e?.response?.data?.message||'Не удалось сохранить источник'})}finally{setSaving(false)}};
  const toggle=async(item:SourceItem)=>{try{await apiInstance.patch(`/appointment-sources/${item.id}`,{is_active:!item.is_active});await load()}catch{notification.error({message:'Не удалось изменить источник'})}};
  return <>
    <button className="oa-source-trigger" type="button" onClick={()=>setOpen(true)}>Источники лидов</button>
    <Modal title="Источники лидов" open={open} onCancel={()=>setOpen(false)} footer={null} width={560}>
      <div className="oa-source-editor"><Input value={name} maxLength={100} placeholder={editor?'Новое название':'Название нового источника'} onChange={e=>setName(e.target.value)} onPressEnter={save}/><button type="button" disabled={!name.trim()||saving} onClick={save}>{editor?<EditOutlined/>:<PlusOutlined/>}{editor?'Сохранить':'Добавить'}</button>{editor&&<button type="button" className="muted" onClick={()=>edit()}>Отмена</button>}</div>
      <div className="oa-source-list">{items.map(item=><div key={item.id} className={item.is_active?'':'archived'}><span><i/>{item.name}</span>{!item.is_active&&<small>В архиве</small>}<div><button type="button" title="Изменить" onClick={()=>edit(item)}><EditOutlined/></button><button type="button" title={item.is_active?'Архивировать':'Восстановить'} onClick={()=>toggle(item)}>{item.is_active?<StopOutlined/>:<CheckOutlined/>}</button></div></div>)}</div>
    </Modal>
  </>;
}
