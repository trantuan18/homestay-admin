import {http} from '../../services/http'; import type {AuthResponse} from '../../types/api';
export async function login(payload:{email:string;password:string}){const {data}=await http.post('/api/auth/login',payload); return data}
export async function getMe():Promise<AuthResponse>{const {data}=await http.get('/api/auth/me');return data}
export async function logout(){await http.post('/api/auth/logout')}
