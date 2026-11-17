export interface User {
  id: number;
  name: string;
  email: string;
  role: "student" | "owner";
}
export interface Property {
  id: number;
  owner_id: number;
  owner_name: string;
  name: string;
  area: string;
  campus: string;
  address: string;
  price: number;
  gender: "Putri" | "Putra" | "Campur";
  kind: "Reguler" | "Eksklusif";
  total_rooms: number;
  available_rooms: number;
  available_from: string;
  size: string;
  distance: number;
  description: string;
  facilities: string[];
  rules: string[];
  photos: string[];
  fees: string;
  phone: string;
  updated_at: string;
}
export interface Complaint {
  id: number;
  property_id: number;
  property_name: string;
  reporter: string;
  title: string;
  message: string;
  status: "Baru" | "Diproses" | "Selesai";
  created_at: string;
}
export interface Tenant {
  id: number;
  property_id: number;
  property_name: string;
  name: string;
  room: string;
  monthly_rent: number;
  paid_amount: number;
}
export interface Inquiry {
  id: number;
  property_name: string;
  student_name: string;
  student_email: string;
  visit_date: string;
  message: string;
}
export interface DashboardData {
  properties: Property[];
  tenants: Tenant[];
  inquiries: Inquiry[];
  month: string;
  stats: {
    total_rooms: number;
    available_rooms: number;
    income: number;
    outstanding: number;
  };
}
