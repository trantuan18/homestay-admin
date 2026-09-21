import {useMemo} from 'react';
import {useTranslation} from 'react-i18next';
import {Bar,BarChart,CartesianGrid,Legend,ResponsiveContainer,Tooltip,XAxis,YAxis} from 'recharts';
import type {Booking} from '../../types/api';

export function BookingChart({bookings,days=14}:{bookings:Booking[];days?:number}){
  const {t}=useTranslation();
  const data=useMemo(()=>{const now=new Date(); const rows=Array.from({length:days},(_,i)=>{const d=new Date(now);d.setHours(0,0,0,0);d.setDate(now.getDate()-(days-1-i));return {key:d.toISOString().slice(0,10),label:d.toLocaleDateString(undefined,{day:'2-digit',month:'2-digit'}),confirmed:0,pending:0,completed:0,cancelled:0}}); const map=new Map(rows.map(r=>[r.key,r])); bookings.forEach(b=>{const key=new Date(b.start_at).toISOString().slice(0,10);const row=map.get(key);if(!row)return;if(b.status==='PENDING')row.pending++;else if(b.status==='CONFIRMED'||b.status==='CHECKED_IN')row.confirmed++;else if(b.status==='CHECKED_OUT')row.completed++;else if(b.status==='CANCELLED'||b.status==='EXPIRED'||b.status==='NO_SHOW')row.cancelled++});return rows},[bookings,days]);
  return <div className="booking-chart"><ResponsiveContainer width="100%" height={300}><BarChart data={data} margin={{top:8,right:8,left:-12,bottom:4}}><CartesianGrid strokeDasharray="3 3" vertical={false}/><XAxis dataKey="label"/><YAxis allowDecimals={false}/><Tooltip/><Legend/><Bar dataKey="confirmed" name={t('bookingChart.confirmed')} stackId="bookings"/><Bar dataKey="pending" name={t('bookingChart.pending')} stackId="bookings"/><Bar dataKey="completed" name={t('bookingChart.completed')} stackId="bookings"/><Bar dataKey="cancelled" name={t('bookingChart.cancelled')} stackId="bookings"/></BarChart></ResponsiveContainer></div>
}
