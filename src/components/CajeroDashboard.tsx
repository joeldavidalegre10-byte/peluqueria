import { useState, useEffect } from 'react';
import { User, CashRegister, TransactionItem } from '../App';
import { Button } from './ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { LogOut, ShoppingCart, Calendar, AlertCircle, History, Menu, Settings } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from './ui/sheet';
import { VentasModule } from './VentasModule';
import { CitasModule } from './CitasModule';
import { HistorialVentasModule } from './HistorialVentasModule';
import { CashierConfigModule } from './CashierConfigModule';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { KeyboardShortcutsIndicator } from './KeyboardShortcutsIndicator';
import { getCashRegistersByStatus } from '../utils/database';

interface CajeroDashboardProps {
  user: User;
  onLogout: () => void;
}

export function CajeroDashboard({ user, onLogout }: CajeroDashboardProps) {
  const [cashRegister, setCashRegister] = useState<CashRegister | null>(null);
  const [activeTab, setActiveTab] = useState('ventas');
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

      const tabs = ['ventas', 'citas', 'historial', 'config'];
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

  // Cargar caja abierta si existe
  useEffect(() => {
    const checkCashRegister = async () => {
      try {
        // Buscar en cajas activas desde IndexedDB
        const activeCashRegisters = await getCashRegistersByStatus('abierta');
        const myCashRegister = activeCashRegisters.find(
          (cr: CashRegister) => cr.userId === user.id
        );
        
        if (myCashRegister) {
          setCashRegister(myCashRegister);
        } else {
          setCashRegister(null);
        }
      } catch (error) {
        console.error('Error al cargar caja:', error);
        setCashRegister(null);
      }
    };

    checkCashRegister();
    // Revisar cada 5 segundos si se abrió la caja
    const interval = setInterval(checkCashRegister, 5000);
    return () => clearInterval(interval);
  }, [user.id]);

  const handleLoadToCart = (items: TransactionItem[]) => {
    setCart(items);
    setActiveTab('ventas');
  };

  const menuItems = [
    { value: 'ventas', icon: ShoppingCart, label: 'Punto de Venta' },
    { value: 'citas', icon: Calendar, label: 'Citas' },
    { value: 'historial', icon: History, label: 'Historial de Ventas' },
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
                          disabled={!cashRegister && item.value !== 'config'}
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
                <h1 className="text-base sm:text-lg md:text-xl">Sistema de Gestión - Salón</h1>
                <p className="text-muted-foreground text-xs md:text-sm hidden sm:block">Cajero: {user.name}</p>
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
        {!cashRegister && activeTab !== 'config' ? (
          <Card>
            <CardHeader>
              <CardTitle>Esperando Apertura de Caja</CardTitle>
            </CardHeader>
            <CardContent>
              <Alert className="bg-secondary border-border">
                <AlertCircle className="size-4 text-orange-600 dark:text-orange-400 ocean:text-orange-400" />
                <AlertDescription className="text-foreground">
                  <strong>Atención:</strong> La caja aún no ha sido habilitada. 
                  Por favor, solicite al administrador que abra la caja para poder comenzar a trabajar.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        ) : (
          <>
            {cashRegister && <KeyboardShortcutsIndicator />}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              {/* Desktop Tabs - Hidden on mobile */}
              {cashRegister && (
                <div className="hidden md:block">
                  <TabsList className="grid w-full grid-cols-4 max-w-3xl">
                    <TabsTrigger value="ventas">
                      <ShoppingCart className="size-4 mr-2" />
                      Ventas
                    </TabsTrigger>
                    <TabsTrigger value="citas">
                      <Calendar className="size-4 mr-2" />
                      Citas
                    </TabsTrigger>
                    <TabsTrigger value="historial">
                      <History className="size-4 mr-2" />
                      Historial
                    </TabsTrigger>
                    <TabsTrigger value="config">
                      <Settings className="size-4 mr-2" />
                      Config
                    </TabsTrigger>
                  </TabsList>
                </div>
              )}

              {/* Mobile: Show current tab name */}
              {cashRegister && (
                <div className="md:hidden mb-4">
                  <h2 className="text-lg">
                    {menuItems.find(item => item.value === activeTab)?.label}
                  </h2>
                </div>
              )}

            {cashRegister && (
              <>
                <TabsContent value="ventas" className="mt-6">
                  <VentasModule cashRegister={cashRegister} cart={cart} setCart={setCart} />
                </TabsContent>

                <TabsContent value="citas" className="mt-6">
                  <CitasModule />
                </TabsContent>

                <TabsContent value="historial" className="mt-6">
                  <HistorialVentasModule cashRegister={cashRegister} onLoadToCart={handleLoadToCart} />
                </TabsContent>
              </>
            )}

            <TabsContent value="config" className="mt-6">
              <CashierConfigModule />
            </TabsContent>
            </Tabs>
          </>
        )}
      </main>
    </div>
  );
}