import {create} from 'zustand';
interface UIState{sidebarCollapsed:boolean;dark:boolean;toggleSidebar:()=>void;toggleDark:()=>void}
export const useUIStore=create<UIState>(set=>({sidebarCollapsed:false,dark:false,toggleSidebar:()=>set(s=>({sidebarCollapsed:!s.sidebarCollapsed})),toggleDark:()=>set(s=>({dark:!s.dark}))}));
