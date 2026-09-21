import {http} from '../../services/http';
import type {Paginated, Property} from '../../types/api';

export type PropertyPayload={
  name:string; slug:string; description?:string; address?:string; city:string; country:string;
  timezone:string; booking_interval_minutes:number; minimum_booking_minutes:number;
  maximum_booking_minutes:number; cancellation_deadline_hours:number; cancellation_fee_percent:number;
  status:Property['status'];
};

export const propertiesCrudApi={
  list:async(params:Record<string,unknown>={})=>(await http.get<Paginated<Property>>('/api/admin/properties',{params})).data,
  create:async(payload:PropertyPayload)=>(await http.post('/api/admin/properties',payload)).data,
  update:async(id:string,payload:Partial<PropertyPayload>)=>(await http.patch(`/api/admin/properties/${id}`,payload)).data,
  remove:async(id:string)=>(await http.delete(`/api/admin/properties/${id}`)).data,
};
