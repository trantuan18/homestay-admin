import {useEffect,useMemo,useState} from 'react';
import type {FormEvent} from 'react';
import {useMutation,useQuery,useQueryClient} from '@tanstack/react-query';
import {useTranslation} from 'react-i18next';
import toast from 'react-hot-toast';
import {Pencil,Plus,Trash2} from 'lucide-react';
import {propertiesCrudApi,type PropertyPayload} from './api';
import type {Property} from '../../types/api';
import {Loading} from '../../components/ui/Loading';
import {ErrorState} from '../../components/ui/ErrorState';
import {StatusBadge} from '../../components/ui/StatusBadge';
import {Modal} from '../../components/ui/Modal';

const emptyForm:PropertyPayload={name:'',slug:'',description:'',address:'',city:'',country:'Vietnam',timezone:'Asia/Ho_Chi_Minh',booking_interval_minutes:60,minimum_booking_minutes:60,maximum_booking_minutes:1440,cancellation_deadline_hours:24,cancellation_fee_percent:0,status:'ACTIVE'};

export function PropertiesPage(){
  const {t}=useTranslation(); const qc=useQueryClient();
  const [search,setSearch]=useState(''); const [editing,setEditing]=useState<Property|null>(null); const [open,setOpen]=useState(false);
  const q=useQuery({queryKey:['admin-properties'],queryFn:()=>propertiesCrudApi.list({page:1,limit:100}),staleTime:30_000});
  const mutation=useMutation({mutationFn:({id,payload}:{id?:string;payload:PropertyPayload})=>id?propertiesCrudApi.update(id,payload):propertiesCrudApi.create(payload),onSuccess:()=>{qc.invalidateQueries({queryKey:['admin-properties']});setOpen(false);setEditing(null);toast.success(t('properties.saved'));},onError:()=>toast.error(t('properties.saveError'))});
  const remove=useMutation({mutationFn:propertiesCrudApi.remove,onSuccess:()=>{qc.invalidateQueries({queryKey:['admin-properties']});toast.success(t('properties.deleted'));},onError:()=>toast.error(t('properties.deleteError'))});
  const data=useMemo(()=>{const rows=q.data?.data||[]; const s=search.trim().toLowerCase(); return s?rows.filter(p=>[p.name,p.slug,p.city,p.country].some(v=>(v||'').toLowerCase().includes(s))):rows},[q.data,search]);
  const startCreate=()=>{setEditing(null);setOpen(true)}; const startEdit=(p:Property)=>{setEditing(p);setOpen(true)};
  const handleDelete=(p:Property)=>{if(window.confirm(t('properties.confirmDelete',{name:p.name})))remove.mutate(p.id)};
  if(q.isLoading)return <Loading/>; if(q.isError)return <ErrorState onRetry={()=>q.refetch()}/>;
  return <>
    <div className="page-head"><div><p className="eyebrow">{t('nav.properties').toUpperCase()}</p><h1>{t('nav.properties')}</h1><p className="muted">{t('management.propertiesDesc')}</p></div><button className="primary" onClick={startCreate}><Plus size={17}/> {t('common.create')}</button></div>
    <div className="panel"><div className="toolbar"><input value={search} onChange={e=>setSearch(e.target.value)} placeholder={t('common.search')}/><span className="toolbar-meta">{data.length} / {q.data?.total ?? data.length}</span></div>
      <div className="table-wrap"><table><thead><tr><th>{t('table.name')}</th><th>{t('table.city')}</th><th>{t('table.timezone')}</th><th>{t('table.bookingInterval')}</th><th>{t('common.status')}</th><th>{t('common.actions')}</th></tr></thead>
      <tbody>{data.length?data.map(p=><tr key={p.id}><td><b>{p.name}</b><small className="subline">{p.slug}</small></td><td>{p.city||'—'}</td><td>{p.timezone}</td><td>{p.booking_interval_minutes} {t('common.minutes')}</td><td><StatusBadge status={p.status}/></td><td><div className="row-actions"><button className="ghost" onClick={()=>startEdit(p)}><Pencil size={15}/>{t('common.edit')}</button><button className="danger ghost" disabled={remove.isPending} onClick={()=>handleDelete(p)}><Trash2 size={15}/>{t('common.delete')}</button></div></td></tr>):<tr><td colSpan={6} className="empty-cell">{t('common.empty')}</td></tr>}</tbody></table></div>
    </div>
    <PropertyForm open={open} property={editing} busy={mutation.isPending} onClose={()=>{setOpen(false);setEditing(null)}} onSubmit={payload=>mutation.mutate({id:editing?.id,payload})}/>
  </>;
}

function PropertyForm({open,property,busy,onClose,onSubmit}:{open:boolean;property:Property|null;busy:boolean;onClose:()=>void;onSubmit:(payload:PropertyPayload)=>void}){
  const {t}=useTranslation(); const [form,setForm]=useState<PropertyPayload>(emptyForm);
  useEffect(()=>{if(open)setForm(property?{name:property.name,slug:property.slug,description:property.description||'',address:property.address||'',city:property.city||'',country:property.country||'Vietnam',timezone:property.timezone,booking_interval_minutes:property.booking_interval_minutes,minimum_booking_minutes:property.minimum_booking_minutes,maximum_booking_minutes:property.maximum_booking_minutes,cancellation_deadline_hours:property.cancellation_deadline_hours,cancellation_fee_percent:property.cancellation_fee_percent,status:property.status}:emptyForm)},[open,property]);
  const set=(key:keyof PropertyPayload,value:string|number)=>setForm(v=>({...v,[key]:value}));
  const submit=(e:FormEvent)=>{e.preventDefault(); if(!form.name.trim()||!form.slug.trim()||!form.city.trim()||!form.country.trim()){toast.error(t('properties.required'));return} onSubmit(form)};
  return <Modal open={open} onClose={onClose} title={property?t('properties.editTitle'):t('properties.createTitle')} description={t('properties.formDesc')} footer={<><button className="ghost" onClick={onClose}>{t('common.cancel')}</button><button className="primary" form="property-form" disabled={busy}>{busy?t('common.loading'):t('common.save')}</button></>}>
    <form id="property-form" className="form-grid" onSubmit={submit}>
      <label><span>{t('form.name')}</span><input value={form.name} onChange={e=>set('name',e.target.value)} /></label>
      <label><span>{t('form.slug')}</span><input value={form.slug} onChange={e=>set('slug',e.target.value)} /></label>
      <label className="span-2"><span>{t('form.description')}</span><textarea rows={3} value={form.description} onChange={e=>set('description',e.target.value)}/></label>
      <label className="span-2"><span>{t('form.address')}</span><input value={form.address} onChange={e=>set('address',e.target.value)}/></label>
      <label><span>{t('form.city')}</span><input value={form.city} onChange={e=>set('city',e.target.value)}/></label>
      <label><span>{t('form.country')}</span><input value={form.country} onChange={e=>set('country',e.target.value)}/></label>
      <label><span>{t('form.timezone')}</span><input value={form.timezone} onChange={e=>set('timezone',e.target.value)}/></label>
      <label><span>{t('form.status')}</span><select value={form.status} onChange={e=>set('status',e.target.value as Property['status'])}><option value="ACTIVE">ACTIVE</option><option value="INACTIVE">INACTIVE</option><option value="SUSPENDED">SUSPENDED</option></select></label>
      <label><span>{t('form.bookingInterval')}</span><input type="number" min="1" value={form.booking_interval_minutes} onChange={e=>set('booking_interval_minutes',Number(e.target.value))}/></label>
      <label><span>{t('form.minimumBooking')}</span><input type="number" min="1" value={form.minimum_booking_minutes} onChange={e=>set('minimum_booking_minutes',Number(e.target.value))}/></label>
      <label><span>{t('form.maximumBooking')}</span><input type="number" min="1" value={form.maximum_booking_minutes} onChange={e=>set('maximum_booking_minutes',Number(e.target.value))}/></label>
      <label><span>{t('form.cancelDeadline')}</span><input type="number" min="0" value={form.cancellation_deadline_hours} onChange={e=>set('cancellation_deadline_hours',Number(e.target.value))}/></label>
      <label><span>{t('form.cancelFee')}</span><input type="number" min="0" max="100" step="0.01" value={form.cancellation_fee_percent} onChange={e=>set('cancellation_fee_percent',Number(e.target.value))}/></label>
    </form>
  </Modal>
}
