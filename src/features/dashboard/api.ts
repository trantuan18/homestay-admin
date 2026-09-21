import {http} from '../../services/http'; import type {AdminDashboard,Paginated,Property,Room,Booking,Payment} from '../../types/api';
export const dashboardApi={get:async()=> (await http.get<AdminDashboard>('/api/admin/dashboard')).data};
export const propertiesApi={list:async(params={})=>(await http.get<Paginated<Property>>('/api/admin/properties',{params})).data};
export const roomsApi={list:async(params={})=>(await http.get<Paginated<Room>>('/api/admin/rooms',{params})).data};
export const bookingsApi={list:async(params={})=>(await http.get<Paginated<Booking>>('/api/admin/bookings',{params})).data};
export const paymentsApi={list:async(params={})=>(await http.get<Paginated<Payment>>('/api/admin/bookings/payments',{params})).data};
export const usersApi={list:async(params={})=>(await http.get<Paginated<{id:string;email:string;role:string;full_name:string}>>('/api/admin/users',{params})).data};
