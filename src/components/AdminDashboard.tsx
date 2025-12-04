import { useState, useEffect } from 'react';
import { User, TransactionItem } from '../App';
import { Button } from './ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { LogOut, DollarSign, ShoppingCart, Calendar, Package, BarChart3, Settings, Users as UsersIcon, UserCog, Menu } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from './ui/sheet';
import { VentasModule } from './VentasModule';
import { CitasModule } from './CitasModule';
import { InventoryModule } from './InventoryModule';
import { ReportsModule } from './ReportsModule';
import { ConfigModule } from './ConfigModule';
import { AuditoriaModule } from './AuditoriaModule';
import { CashManagementModule } from './CashManagementModule';
import { CashierSalesModule } from './CashierSalesModule';
import { UsersModule } from './UsersModule';
import { KeyboardShortcutsIndicator } from './KeyboardShortcutsIndicator';

interface AdminDashboardProps {
  user: User;
  onLogout: () => void;
}

export function AdminDashboard({ user, onLogout }: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState('caja');
  const [cart, setCart] = useState<TransactionItem[]>([]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Atajos de teclado para navegación
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Solo activar si no hay ningún input/textarea enfocado
      if (document.activeElement?.tagName === 'INPUT' || 
          document.activeElement?.tagName === 'TEXTAREA') {
        return;
      }

      const tabs = ['caja', 'ventasCajeros', 'usuarios', 'reportes', 'auditoria', 'inventario', 'tpv', 'citas', 'config'];
      const currentIndex = tabs.indexOf(activeTab);

      if (e.key === 'ArrowRight') {
        e.preventDefault();
        const nextIndex = (currentIndex + 1) % tabs.length;
        setActiveTab(tabs[nextIndex]);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        const prevIndex = (currentIndex - 1 + tabs.length) % tabs.length;
        setActiveTab(tabs[prevIndex]);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [activeTab]);

  // Crear una caja ficticia para el admin si quiere hacer ventas
  const mockCashRegister = {
    id: 'admin-session',
    userId: user.id,
    userName: user.name,
    openingDate: new Date().toISOString(),
    openingAmount: 0,
    status: 'abierta' as const,
    totalSales: 0,
  };

  const menuItems = [
    { value: 'caja', icon: DollarSign, label: 'Gestión de Caja' },
    { value: 'ventasCajeros', icon: UsersIcon, label: 'Ventas por Cajero' },
    { value: 'usuarios', icon: UserCog, label: 'Usuarios' },
    { value: 'reportes', icon: BarChart3, label: 'Reportes' },
    { value: 'auditoria', icon: DollarSign, label: 'Auditoría' },
    { value: 'inventario', icon: Package, label: 'Inventario' },
    { value: 'tpv', icon: ShoppingCart, label: 'Punto de Venta' },
    { value: 'citas', icon: Calendar, label: 'Citas' },
    { value: 'config', icon: Settings, label: 'Configuración' },
  ];

  const handleMenuItemClick = (value: string) => {
    setActiveTab(value);
    setMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
          <div className="flex justify-between items-center gap-3">
            {/* Mobile Menu Button */}
            <div className="flex items-center gap-3">
              <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" size="sm" className="md:hidden">
                    <Menu className="size-4" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-[280px] sm:w-[350px]">
                  <SheetHeader>
                    <SheetTitle>Menú de Navegación</SheetTitle>
                  </SheetHeader>
                  <nav className="flex flex-col gap-2 mt-6">
                    {menuItems.map((item) => {
                      const Icon = item.icon;
                      return (
                        <Button
                          key={item.value}
                          variant={activeTab === item.value ? 'default' : 'ghost'}
                          className="justify-start"
                          onClick={() => handleMenuItemClick(item.value)}
                        >
                          <Icon className="size-4 mr-3" />
                          {item.label}
                        </Button>
                      );
                    })}
                  </nav>
                </SheetContent>
              </Sheet>
              
              <div>
                <h1 className="text-base sm:text-lg md:text-xl text-foreground">Panel de Administración</h1>
                <p className="text-muted-foreground text-xs md:text-sm hidden sm:block">Administrador: {user.name}</p>
              </div>
            </div>
            
            <Button onClick={onLogout} variant="outline" size="sm">
              <LogOut className="size-3 md:size-4 mr-0 sm:mr-2" />
              <span className="hidden sm:inline text-xs md:text-sm">Cerrar Sesión</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <KeyboardShortcutsIndicator />
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          {/* Desktop Tabs - Hidden on mobile */}
          <div className="hidden md:block overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
            <TabsList className="inline-flex w-auto min-w-full sm:grid sm:w-full sm:grid-cols-9 sm:max-w-6xl h-auto">
              <TabsTrigger value="caja" className="text-xs whitespace-nowrap px-2 sm:px-3">
                <DollarSign className="size-3 sm:size-4 mr-1 sm:mr-2" />
                Caja
              </TabsTrigger>
              <TabsTrigger value="ventasCajeros" className="text-xs whitespace-nowrap px-2 sm:px-3">
                <UsersIcon className="size-3 sm:size-4 mr-1 sm:mr-2" />
                Ventas
              </TabsTrigger>
              <TabsTrigger value="usuarios" className="text-xs whitespace-nowrap px-2 sm:px-3">
                <UserCog className="size-3 sm:size-4 mr-1 sm:mr-2" />
                Usuarios
              </TabsTrigger>
              <TabsTrigger value="reportes" className="text-xs whitespace-nowrap px-2 sm:px-3">
                <BarChart3 className="size-3 sm:size-4 mr-1 sm:mr-2" />
                Reportes
              </TabsTrigger>
              <TabsTrigger value="auditoria" className="text-xs whitespace-nowrap px-2 sm:px-3">
                <DollarSign className="size-3 sm:size-4 mr-1 sm:mr-2" />
                Auditoría
              </TabsTrigger>
              <TabsTrigger value="inventario" className="text-xs whitespace-nowrap px-2 sm:px-3">
                <Package className="size-3 sm:size-4 mr-1 sm:mr-2" />
                Inventario
              </TabsTrigger>
              <TabsTrigger value="tpv" className="text-xs whitespace-nowrap px-2 sm:px-3">
                <ShoppingCart className="size-3 sm:size-4 mr-1 sm:mr-2" />
                TPV
              </TabsTrigger>
              <TabsTrigger value="citas" className="text-xs whitespace-nowrap px-2 sm:px-3">
                <Calendar className="size-3 sm:size-4 mr-1 sm:mr-2" />
                Citas
              </TabsTrigger>
              <TabsTrigger value="config" className="text-xs whitespace-nowrap px-2 sm:px-3">
                <Settings className="size-3 sm:size-4 mr-1 sm:mr-2" />
                Config
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Mobile: Show current tab name */}
          <div className="md:hidden mb-4">
            <h2 className="text-lg font-semibold text-foreground">
              {menuItems.find(item => item.value === activeTab)?.label}
            </h2>
          </div>

          <TabsContent value="caja" className="mt-6">
            <CashManagementModule />
          </TabsContent>

          <TabsContent value="ventasCajeros" className="mt-6">
            <CashierSalesModule />
          </TabsContent>

          <TabsContent value="usuarios" className="mt-6">
            <UsersModule />
          </TabsContent>

          <TabsContent value="reportes" className="mt-6">
            <ReportsModule />
          </TabsContent>

          <TabsContent value="auditoria" className="mt-6">
            <AuditoriaModule />
          </TabsContent>

          <TabsContent value="inventario" className="mt-6">
            <InventoryModule />
          </TabsContent>

          <TabsContent value="tpv" className="mt-6">
            <VentasModule cashRegister={mockCashRegister} cart={cart} setCart={setCart} />
          </TabsContent>

          <TabsContent value="citas" className="mt-6">
            <CitasModule />
          </TabsContent>

          <TabsContent value="config" className="mt-6">
            <ConfigModule />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}