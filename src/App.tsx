import { useState, useEffect } from 'react';
import { LoginPage } from './components/LoginPage';
import { CajeroDashboard } from './components/CajeroDashboard';
import { AdminDashboard } from './components/AdminDashboard';

export type UserRole = 'cajero' | 'admin';

export interface User {
  id: string;
  name: string;
  username: string;
  password: string;
  role: UserRole;
}

export interface CashRegister {
  id: string;
  userId: string;
  userName: string;
  openingDate: string;
  openingAmount: number;
  status: 'abierta' | 'cerrada' | 'pendiente_revision';
  closingDate?: string;
  expectedCash?: number;
  actualCash?: number;
  difference?: number;
  totalSales?: number;
}

export interface Transaction {
  id: string;
  cashRegisterId: string;
  date: string;
  type: 'servicio' | 'producto';
  items: TransactionItem[];
  total: number;
  paymentMethod: 'efectivo' | 'tarjeta' | 'transferencia' | 'mixto';
  paymentDetails?: {
    efectivo?: number;
    tarjeta?: number;
    transferencia?: number;
  };
  status: 'activa' | 'anulada';
  anulledBy?: string;
  anulledDate?: string;
  anulledByUserName?: string;
}

export interface TransactionItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  stylist?: string;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
  minStock: number;
  category: string;
}

export interface MiscItem {
  id: string;
  name: string;
  price: number;
  stock: number;
  minStock: number;
}

export interface Service {
  id: string;
  name: string;
  price: number;
  duration: number;
  commission: number;
}

export interface Appointment {
  id: string;
  clientName: string;
  clientPhone: string;
  date: string;
  time: string;
  services: string[];
  stylist: string;
  status: 'pendiente' | 'completada' | 'cancelada';
}

function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Cargar y aplicar tema guardado inmediatamente al cargar
  useEffect(() => {
    const savedTheme = localStorage.getItem('salon-theme') || 'light';
    const root = document.documentElement;
    root.classList.remove('light', 'dark', 'ocean');
    root.classList.add(savedTheme);
  }, []);

  const handleLogin = (user: User) => {
    setCurrentUser(user);
  };

  const handleLogout = () => {
    setCurrentUser(null);
  };

  if (!currentUser) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {currentUser.role === 'cajero' ? (
        <CajeroDashboard user={currentUser} onLogout={handleLogout} />
      ) : (
        <AdminDashboard user={currentUser} onLogout={handleLogout} />
      )}
    </div>
  );
}

export default App;