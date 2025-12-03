import { useState, useEffect } from 'react';
import { Product, Service, Transaction, TransactionItem, CashRegister, MiscItem } from '../App';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { ShoppingBag, Scissors, ShoppingCart, Trash2, DollarSign, CreditCard, ArrowLeftRight, Receipt, Sparkles } from 'lucide-react';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { formatGuaranies } from '../utils/currency';
import { ConfirmModal } from './ConfirmModal';
import { 
  getProducts, 
  getServices, 
  getTransactionsByCashRegister, 
  addTransaction, 
  updateCashRegister,
  getMiscItems
} from '../utils/database';

interface VentasModuleProps {
  cashRegister: CashRegister;
  cart: TransactionItem[];
  setCart: React.Dispatch<React.SetStateAction<TransactionItem[]>>;
}

// Datos de ejemplo
const STYLISTS = ['Ana Martínez', 'Laura Pérez', 'Sofía Rodríguez', 'Carmen López'];

export function VentasModule({ cashRegister, cart, setCart }: VentasModuleProps) {
  const [paymentMethod, setPaymentMethod] = useState<'efectivo' | 'tarjeta' | 'transferencia' | 'mixto'>('efectivo');
  const [selectedStylist, setSelectedStylist] = useState('');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [amountReceived, setAmountReceived] = useState('');
  const [amountReceivedDisplay, setAmountReceivedDisplay] = useState('');
  
  // Estados para productos y servicios desde IndexedDB
  const [products, setProducts] = useState<Product[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [miscItems, setMiscItems] = useState<MiscItem[]>([]);
  
  // Estados para pago mixto
  const [pagoEfectivo, setPagoEfectivo] = useState('');
  const [pagoEfectivoDisplay, setPagoEfectivoDisplay] = useState('');
  const [pagoTarjeta, setPagoTarjeta] = useState('');
  const [pagoTarjetaDisplay, setPagoTarjetaDisplay] = useState('');
  const [pagoTransferencia, setPagoTransferencia] = useState('');
  const [pagoTransferenciaDisplay, setPagoTransferenciaDisplay] = useState('');
  
  // Estados para modales
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmModalProps, setConfirmModalProps] = useState({
    title: '',
    description: '',
    type: 'info' as 'success' | 'error' | 'warning' | 'info',
  });

  // Cargar datos desde IndexedDB
  useEffect(() => {
    const loadData = async () => {
      const [loadedTransactions, loadedProducts, loadedServices, loadedMiscItems] = await Promise.all([
        getTransactionsByCashRegister(cashRegister.id),
        getProducts(),
        getServices(),
        getMiscItems()
      ]);
      
      setTransactions(loadedTransactions);
      setProducts(loadedProducts);
      setServices(loadedServices);
      setMiscItems(loadedMiscItems);
    };
    
    loadData();
  }, [cashRegister.id]);

  const addServiceToCart = (service: Service) => {
    if (!selectedStylist) {
      setConfirmModalProps({
        title: 'Selecciona un Estilista',
        description: 'Por favor selecciona un estilista antes de agregar un servicio',
        type: 'warning',
      });
      setShowConfirmModal(true);
      return;
    }

    const item: TransactionItem = {
      id: `${service.id}-${Date.now()}`,
      name: service.name,
      price: service.price,
      quantity: 1,
      stylist: selectedStylist,
    };
    setCart([...cart, item]);
  };

  const addProductToCart = (product: Product) => {
    const existingItem = cart.find((item) => item.id === product.id);
    if (existingItem) {
      setCart(
        cart.map((item) =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      );
    } else {
      const item: TransactionItem = {
        id: product.id,
        name: product.name,
        price: product.price,
        quantity: 1,
      };
      setCart([...cart, item]);
    }
  };

  const addMiscItemToCart = (miscItem: MiscItem) => {
    const existingItem = cart.find((item) => item.id === miscItem.id);
    if (existingItem) {
      setCart(
        cart.map((item) =>
          item.id === miscItem.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      );
    } else {
      const item: TransactionItem = {
        id: miscItem.id,
        name: miscItem.name,
        price: miscItem.price,
        quantity: 1,
      };
      setCart([...cart, item]);
    }
  };

  const removeFromCart = (itemId: string) => {
    setCart(cart.filter((item) => item.id !== itemId));
  };

  const updateQuantity = (itemId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(itemId);
      return;
    }
    setCart(
      cart.map((item) =>
        item.id === itemId ? { ...item, quantity } : item
      )
    );
  };

  const calculateTotal = () => {
    return cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  };

  const handleCheckout = () => {
    if (cart.length === 0) return;
    setShowPaymentModal(true);
  };

  const confirmPayment = () => {
    const total = calculateTotal();
    
    if (paymentMethod === 'efectivo') {
      if (receivedAmount < total) {
        setConfirmModalProps({
          title: 'Monto Insuficiente',
          description: 'El monto recibido debe ser mayor o igual al total de la venta',
          type: 'error',
        });
        setShowConfirmModal(true);
        return;
      }
    }

    if (paymentMethod === 'mixto') {
      const totalPagado = (parseFloat(pagoEfectivo) || 0) + 
                          (parseFloat(pagoTarjeta) || 0) + 
                          (parseFloat(pagoTransferencia) || 0);
      
      if (totalPagado < total) {
        setConfirmModalProps({
          title: 'Monto Insuficiente',
          description: `Falta pagar ₲ ${formatGuaranies(total - totalPagado)}`,
          type: 'error',
        });
        setShowConfirmModal(true);
        return;
      }

      // Permitir pagar de más (por ejemplo cuando pagan con tarjeta + efectivo sin sencillo)
      // Ya no mostramos error si pagan de más
    }

    const newTransaction: Transaction = {
      id: `T-${Date.now()}`,
      cashRegisterId: cashRegister.id,
      date: new Date().toISOString(),
      type: cart.some((item) => item.stylist) ? 'servicio' : 'producto',
      items: [...cart],
      total: calculateTotal(),
      paymentMethod,
      status: 'activa',
    };

    // Si es pago mixto, agregar los detalles
    if (paymentMethod === 'mixto') {
      newTransaction.paymentDetails = {
        efectivo: parseFloat(pagoEfectivo) || 0,
        tarjeta: parseFloat(pagoTarjeta) || 0,
        transferencia: parseFloat(pagoTransferencia) || 0,
      };
    }

    // Guardar en IndexedDB
    addTransaction(newTransaction).then(() => {
      const updatedTransactions = [...transactions, newTransaction];
      setTransactions(updatedTransactions);

      // Actualizar total de ventas en la caja
      const updatedCashRegister = {
        ...cashRegister,
        totalSales: (cashRegister.totalSales || 0) + calculateTotal(),
      };
      updateCashRegister(updatedCashRegister);
    });

    // Limpiar carrito y cerrar modal
    setCart([]);
    setShowPaymentModal(false);
    setAmountReceived('');
    setAmountReceivedDisplay('');
    setPagoEfectivo('');
    setPagoEfectivoDisplay('');
    setPagoTarjeta('');
    setPagoTarjetaDisplay('');
    setPagoTransferencia('');
    setPagoTransferenciaDisplay('');
    setPaymentMethod('efectivo');
    
    // Mostrar confirmación de éxito
    setConfirmModalProps({
      title: '¡Venta Registrada!',
      description: 'La venta ha sido registrada exitosamente en el sistema',
      type: 'success',
    });
    setShowConfirmModal(true);
  };

  const total = calculateTotal();
  const receivedAmount = parseFloat(amountReceived) || 0;
  const changeAmount = receivedAmount - total;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
      {/* Área de selección de productos/servicios */}
      <div className="lg:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg md:text-xl">Punto de Venta</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="servicios">
              <TabsList className="grid w-full grid-cols-3 h-auto">
                <TabsTrigger value="servicios" className="text-xs md:text-sm py-2">
                  <Scissors className="size-3 md:size-4 mr-1 md:mr-2" />
                  <span className="hidden sm:inline">Servicios</span>
                  <span className="inline sm:hidden">Serv.</span>
                </TabsTrigger>
                <TabsTrigger value="productos" className="text-xs md:text-sm py-2">
                  <ShoppingBag className="size-3 md:size-4 mr-1 md:mr-2" />
                  <span className="hidden sm:inline">Productos</span>
                  <span className="inline sm:hidden">Prod.</span>
                </TabsTrigger>
                <TabsTrigger value="articulos" className="text-xs md:text-sm py-2">
                  <Sparkles className="size-3 md:size-4 mr-1 md:mr-2" />
                  <span className="hidden sm:inline">Artículos Varios</span>
                  <span className="inline sm:hidden">Arts.</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="servicios" className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm">Seleccionar Estilista</Label>
                  <Select value={selectedStylist} onValueChange={setSelectedStylist}>
                    <SelectTrigger className="text-sm">
                      <SelectValue placeholder="Elige un estilista" />
                    </SelectTrigger>
                    <SelectContent>
                      {STYLISTS.map((stylist) => (
                        <SelectItem key={stylist} value={stylist}>
                          {stylist}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 md:gap-3 mt-4 max-h-[400px] md:max-h-[500px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                  {services.map((service) => (
                    <Button
                      key={service.id}
                      variant="outline"
                      className="h-auto flex flex-col items-start p-3 md:p-4 text-left"
                      onClick={() => addServiceToCart(service)}
                    >
                      <span className="text-sm md:text-base">{service.name}</span>
                      <span className="text-green-600 text-sm md:text-base">₲ {formatGuaranies(service.price)}</span>
                      <span className="text-xs text-muted-foreground">{service.duration} min</span>
                    </Button>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="productos">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 md:gap-3 max-h-[400px] md:max-h-[500px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                  {products.map((product) => (
                    <Button
                      key={product.id}
                      variant="outline"
                      className="h-auto flex flex-col items-start p-3 md:p-4 text-left"
                      onClick={() => addProductToCart(product)}
                      disabled={product.stock === 0}
                    >
                      <span className="text-sm md:text-base">{product.name}</span>
                      <span className="text-green-600 text-sm md:text-base">₲ {formatGuaranies(product.price)}</span>
                      <span className="text-xs text-muted-foreground">
                        Stock: {product.stock}
                      </span>
                      {product.stock <= product.minStock && (
                        <Badge variant="destructive" className="mt-1 text-xs">
                          Stock Bajo
                        </Badge>
                      )}
                    </Button>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="articulos">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 md:gap-3 max-h-[400px] md:max-h-[500px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                  {miscItems.map((miscItem) => (
                    <Button
                      key={miscItem.id}
                      variant="outline"
                      className="h-auto flex flex-col items-start p-3 md:p-4 text-left"
                      onClick={() => addMiscItemToCart(miscItem)}
                    >
                      <span className="text-sm md:text-base">{miscItem.name}</span>
                      <span className="text-green-600 text-sm md:text-base">₲ {formatGuaranies(miscItem.price)}</span>
                    </Button>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* Carrito y resumen */}
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
              <ShoppingCart className="size-4 md:size-5" />
              Carrito ({cart.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {cart.length === 0 ? (
              <p className="text-center text-muted-foreground py-8 text-sm md:text-base">
                No hay items en el carrito
              </p>
            ) : (
              <>
                <div className="space-y-3 max-h-80 md:max-h-96 overflow-y-auto">
                  {cart.map((item) => (
                    <div key={item.id} className="flex items-start gap-2 p-2 md:p-3 bg-secondary rounded-lg">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm md:text-base truncate">{item.name}</p>
                        {item.stylist && (
                          <p className="text-xs md:text-sm text-muted-foreground truncate">
                            Estilista: {item.stylist}
                          </p>
                        )}
                        <p className="text-xs md:text-sm text-green-600">
                          ₲ {formatGuaranies(item.price)} × {item.quantity}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 md:gap-2 flex-shrink-0">
                        <Input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) =>
                            updateQuantity(item.id, parseInt(e.target.value) || 1)
                          }
                          className="w-12 md:w-16 h-7 md:h-8 text-xs md:text-sm"
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFromCart(item.id)}
                          className="h-7 w-7 md:h-8 md:w-8 p-0"
                        >
                          <Trash2 className="size-3 md:size-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="space-y-3 pt-4 border-t">
                  <div className="flex justify-between items-center">
                    <span className="text-sm md:text-base">Total:</span>
                    <span className="text-xl md:text-2xl text-green-600">₲ {formatGuaranies(total)}</span>
                  </div>

                  <Button className="w-full text-sm md:text-base" size="lg" onClick={handleCheckout}>
                    <Receipt className="size-3 md:size-4 mr-2" />
                    Procesar Pago
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Resumen del día */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg md:text-xl">Resumen del Día</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm md:text-base">
                <span className="text-muted-foreground">Ventas Totales:</span>
                <span>{transactions.length}</span>
              </div>
              <div className="flex justify-between text-sm md:text-base">
                <span className="text-muted-foreground">Total Recaudado:</span>
                <span className="text-green-600">
                  ₲ {formatGuaranies(transactions.reduce((sum, t) => sum + t.total, 0))}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Modal de pago */}
      <Dialog open={showPaymentModal} onOpenChange={(open) => {
        setShowPaymentModal(open);
        if (!open) {
          setAmountReceived('');
          setAmountReceivedDisplay('');
        }
      }}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Finalizar Venta</DialogTitle>
            <DialogDescription>
              Complete la información de pago
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 overflow-y-auto pr-2 flex-1">
            {/* Total a pagar */}
            <div className="bg-primary text-primary-foreground p-6 rounded-lg text-center">
              <p className="text-sm mb-2">Total a Pagar</p>
              <p className="text-4xl">₲ {formatGuaranies(total)}</p>
            </div>

            {/* Método de pago */}
            <div className="space-y-2">
              <Label>Método de Pago</Label>
              <Select value={paymentMethod} onValueChange={(v: any) => setPaymentMethod(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="efectivo">Efectivo</SelectItem>
                  <SelectItem value="tarjeta">Tarjeta</SelectItem>
                  <SelectItem value="transferencia">Transferencia</SelectItem>
                  <SelectItem value="mixto">Mixto</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Campo para pago en efectivo */}
            {paymentMethod === 'efectivo' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="amountReceived">Monto Recibido</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      ₲
                    </span>
                    <Input
                      id="amountReceived"
                      type="text"
                      value={amountReceivedDisplay}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\./g, '');
                        if (value === '' || /^\d+$/.test(value)) {
                          setAmountReceived(value);
                          setAmountReceivedDisplay(value ? formatGuaranies(parseInt(value)) : '');
                        }
                      }}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && receivedAmount >= total) {
                          confirmPayment();
                        }
                      }}
                      placeholder="0"
                      className="pl-8"
                      autoFocus
                    />
                  </div>
                </div>

                {receivedAmount >= total && (
                  <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Total:</span>
                        <span>₲ {formatGuaranies(total)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Recibido:</span>
                        <span>₲ {formatGuaranies(receivedAmount)}</span>
                      </div>
                      <div className="flex justify-between pt-2 border-t border-green-300">
                        <span className="font-semibold text-green-700">Vuelto:</span>
                        <span className="text-xl text-green-700">
                          ₲ {formatGuaranies(changeAmount)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {receivedAmount > 0 && receivedAmount < total && (
                  <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg text-center">
                    <p className="text-sm text-yellow-800">
                      Falta ₲ {formatGuaranies(total - receivedAmount)}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Pago mixto - Mostrar múltiples campos */}
            {paymentMethod === 'mixto' && (() => {
              const totalPagado = (parseFloat(pagoEfectivo) || 0) + 
                                  (parseFloat(pagoTarjeta) || 0) + 
                                  (parseFloat(pagoTransferencia) || 0);
              const faltante = total - totalPagado;
              
              return (
                <div className="space-y-4">
                  <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg">
                    <p className="text-sm text-center text-blue-800">
                      Divide el pago entre los métodos disponibles
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="pagoEfectivo">Efectivo</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                        ₲
                      </span>
                      <Input
                        id="pagoEfectivo"
                        type="text"
                        value={pagoEfectivoDisplay}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\./g, '');
                          if (value === '' || /^\d+$/.test(value)) {
                            setPagoEfectivo(value);
                            setPagoEfectivoDisplay(value ? formatGuaranies(parseInt(value)) : '');
                          }
                        }}
                        placeholder="0"
                        className="pl-8"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="pagoTarjeta">Tarjeta</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                        ₲
                      </span>
                      <Input
                        id="pagoTarjeta"
                        type="text"
                        value={pagoTarjetaDisplay}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\./g, '');
                          if (value === '' || /^\d+$/.test(value)) {
                            setPagoTarjeta(value);
                            setPagoTarjetaDisplay(value ? formatGuaranies(parseInt(value)) : '');
                          }
                        }}
                        placeholder="0"
                        className="pl-8"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="pagoTransferencia">Transferencia</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                        ₲
                      </span>
                      <Input
                        id="pagoTransferencia"
                        type="text"
                        value={pagoTransferenciaDisplay}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\./g, '');
                          if (value === '' || /^\d+$/.test(value)) {
                            setPagoTransferencia(value);
                            setPagoTransferenciaDisplay(value ? formatGuaranies(parseInt(value)) : '');
                          }
                        }}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter' && faltante === 0) {
                            confirmPayment();
                          }
                        }}
                        placeholder="0"
                        className="pl-8"
                      />
                    </div>
                  </div>

                  <div className={`border p-4 rounded-lg ${faltante === 0 ? 'bg-green-50 border-green-200' : faltante > 0 ? 'bg-yellow-50 border-yellow-200' : 'bg-red-50 border-red-200'}`}>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Total a pagar:</span>
                        <span>₲ {formatGuaranies(total)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Total ingresado:</span>
                        <span>₲ {formatGuaranies(totalPagado)}</span>
                      </div>
                      <div className="flex justify-between pt-2 border-t">
                        <span className="font-semibold">
                          {faltante > 0 ? 'Falta:' : faltante < 0 ? 'Excedente:' : 'Completo:'}
                        </span>
                        <span className={`text-lg ${faltante === 0 ? 'text-green-600' : faltante > 0 ? 'text-yellow-600' : 'text-red-600'}`}>
                          ₲ {formatGuaranies(Math.abs(faltante))}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Mensaje para pagos no efectivo y no mixto */}
            {(paymentMethod === 'tarjeta' || paymentMethod === 'transferencia') && (
              <div className="bg-secondary p-4 rounded-lg text-center text-muted-foreground">
                El pago se registrará como {paymentMethod}
              </div>
            )}
          </div>
          
          {/* Botón fijo en la parte inferior */}
          <div className="pt-4 border-t mt-4">
            <Button
              className="w-full"
              size="lg"
              onClick={confirmPayment}
              disabled={
                (paymentMethod === 'efectivo' && receivedAmount < total) ||
                (paymentMethod === 'mixto' && (() => {
                  const totalPagado = (parseFloat(pagoEfectivo) || 0) + 
                                      (parseFloat(pagoTarjeta) || 0) + 
                                      (parseFloat(pagoTransferencia) || 0);
                  return totalPagado < total; // Permitir pagar de más, solo validar que no sea menos
                })())
              }
            >
              <Receipt className="size-4 mr-2" />
              Confirmar Venta
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de confirmación */}
      <ConfirmModal
        open={showConfirmModal}
        onOpenChange={setShowConfirmModal}
        title={confirmModalProps.title}
        description={confirmModalProps.description}
        type={confirmModalProps.type}
      />
    </div>
  );
}