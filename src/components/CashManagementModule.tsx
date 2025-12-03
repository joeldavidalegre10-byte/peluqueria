import { useState, useEffect } from 'react';
import { CashRegister, Transaction } from '../App';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { DollarSign, Lock, Unlock, AlertCircle } from 'lucide-react';
import { Badge } from './ui/badge';
import { ConfirmModal } from './ConfirmModal';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { formatGuaranies } from '../utils/currency';
import { 
  getUsers, 
  getCashRegistersByStatus, 
  addCashRegister, 
  updateCashRegister,
  getTransactionsByCashRegister,
  addCashRegisterHistory
} from '../utils/database';

export function CashManagementModule() {
  const [activeCashRegisters, setActiveCashRegisters] = useState<CashRegister[]>([]);
  const [openingAmount, setOpeningAmount] = useState('');
  const [selectedCashier, setSelectedCashier] = useState('');
  const [availableCashiers, setAvailableCashiers] = useState<any[]>([]);
  
  // Estados para cierre de caja
  const [showClosingModal, setShowClosingModal] = useState(false);
  const [cashRegisterToClose, setCashRegisterToClose] = useState<CashRegister | null>(null);
  const [actualCash, setActualCash] = useState('');
  
  // Estados para modales
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmModalProps, setConfirmModalProps] = useState({
    title: '',
    description: '',
    type: 'info' as 'success' | 'error' | 'warning' | 'info',
  });

  useEffect(() => {
    loadActiveCashRegisters();
    loadAvailableCashiers();
  }, []);

  const loadActiveCashRegisters = async () => {
    try {
      const openCashRegisters = await getCashRegistersByStatus('abierta');
      setActiveCashRegisters(openCashRegisters);
    } catch (error) {
      console.error('Error al cargar cajas activas:', error);
    }
  };

  const loadAvailableCashiers = async () => {
    try {
      const users = await getUsers();
      const cajeros = users.filter((u: any) => u.role === 'cajero');
      setAvailableCashiers(cajeros);
    } catch (error) {
      console.error('Error al cargar cajeros:', error);
    }
  };

  const handleOpeningAmountChange = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers === '') {
      setOpeningAmount('');
      return;
    }
    const formatted = formatGuaranies(parseInt(numbers));
    setOpeningAmount(formatted);
  };

  const handleActualCashChange = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers === '') {
      setActualCash('');
      return;
    }
    const formatted = formatGuaranies(parseInt(numbers));
    setActualCash(formatted);
  };

  const handleOpenCashRegister = async () => {
    if (!selectedCashier || !openingAmount) {
      setConfirmModalProps({
        title: 'Datos Incompletos',
        description: 'Por favor complete todos los campos antes de habilitar la caja',
        type: 'warning',
      });
      setShowConfirmModal(true);
      return;
    }

    const cashier = availableCashiers.find((c) => c.id === selectedCashier);
    if (!cashier) return;

    // Verificar si el cajero ya tiene una caja abierta
    if (activeCashRegisters.some((cr) => cr.userId === cashier.id)) {
      setConfirmModalProps({
        title: 'Caja Ya Abierta',
        description: `${cashier.name} ya tiene una caja activa`,
        type: 'warning',
      });
      setShowConfirmModal(true);
      return;
    }

    try {
      const newCashRegister: CashRegister = {
        id: `CR-${Date.now()}`,
        userId: cashier.id,
        userName: cashier.name,
        openingDate: new Date().toISOString(),
        openingAmount: parseFloat(openingAmount.replace(/\./g, '')),
        status: 'abierta',
        totalSales: 0,
      };

      await addCashRegister(newCashRegister);
      const updatedRegisters = [...activeCashRegisters, newCashRegister];
      setActiveCashRegisters(updatedRegisters);
      
      setOpeningAmount('');
      setSelectedCashier('');
      
      setConfirmModalProps({
        title: '¡Caja Habilitada!',
        description: `La caja ha sido abierta exitosamente para ${cashier.name}`,
        type: 'success',
      });
      setShowConfirmModal(true);
    } catch (error) {
      console.error('Error al abrir caja:', error);
      setConfirmModalProps({
        title: 'Error',
        description: 'No se pudo abrir la caja. Por favor intenta nuevamente.',
        type: 'error',
      });
      setShowConfirmModal(true);
    }
  };

  const handleInitiateClosing = (cashRegister: CashRegister) => {
    setCashRegisterToClose(cashRegister);
    setActualCash('');
    setShowClosingModal(true);
  };

  const handleCloseCashRegister = async () => {
    if (!cashRegisterToClose || !actualCash) {
      setConfirmModalProps({
        title: 'Datos Incompletos',
        description: 'Por favor ingrese el efectivo real contado en caja',
        type: 'warning',
      });
      setShowConfirmModal(true);
      return;
    }

    try {
      // Obtener transacciones de esta caja desde IndexedDB
      const transactions = await getTransactionsByCashRegister(cashRegisterToClose.id);

      // Calcular totales
      const totalSales = transactions.reduce((sum, t) => sum + t.total, 0);
      const cashSales = transactions
        .filter((t) => {
          if (t.paymentMethod === 'efectivo') return true;
          if (t.paymentMethod === 'mixto' && t.paymentDetails?.efectivo) {
            return true;
          }
          return false;
        })
        .reduce((sum, t) => {
          if (t.paymentMethod === 'efectivo') return sum + t.total;
          if (t.paymentMethod === 'mixto' && t.paymentDetails?.efectivo) {
            return sum + t.paymentDetails.efectivo;
          }
          return sum;
        }, 0);
      
      // Efectivo esperado = monto inicial + ventas en efectivo
      const expectedCash = cashRegisterToClose.openingAmount + cashSales;
      const actualCashAmount = parseFloat(actualCash.replace(/\./g, ''));
      const difference = actualCashAmount - expectedCash;

      const closedCashRegister: CashRegister = {
        ...cashRegisterToClose,
        status: 'cerrada',
        closingDate: new Date().toISOString(),
        totalSales,
        expectedCash,
        actualCash: actualCashAmount,
        difference,
      };

      // Guardar en historial
      await addCashRegisterHistory(closedCashRegister);
      
      // Actualizar estado de la caja a cerrada
      await updateCashRegister(closedCashRegister);

      // Remover de cajas activas
      const updatedRegisters = activeCashRegisters.filter(
        (cr) => cr.id !== cashRegisterToClose.id
      );
      setActiveCashRegisters(updatedRegisters);
      
      setShowClosingModal(false);
      setCashRegisterToClose(null);
      setActualCash('');
      
      const message = difference === 0 
        ? 'La caja ha sido cerrada exitosamente. Los montos coinciden perfectamente.'
        : difference > 0
        ? `La caja ha sido cerrada. Hay un excedente de ₲ ${formatGuaranies(Math.abs(difference))}`
        : `La caja ha sido cerrada. Hay un faltante de ₲ ${formatGuaranies(Math.abs(difference))}`;
      
      setConfirmModalProps({
        title: 'Caja Cerrada',
        description: message,
        type: difference < 0 ? 'warning' : 'success',
      });
      setShowConfirmModal(true);
    } catch (error) {
      console.error('Error al cerrar caja:', error);
      setConfirmModalProps({
        title: 'Error',
        description: 'No se pudo cerrar la caja. Por favor intenta nuevamente.',
        type: 'error',
      });
      setShowConfirmModal(true);
    }
  };

  const [transactionStats, setTransactionStats] = useState<{[key: string]: {totalSales: number, cashSales: number, transactionCount: number}}>({});

  useEffect(() => {
    const loadStats = async () => {
      const stats: {[key: string]: {totalSales: number, cashSales: number, transactionCount: number}} = {};
      
      for (const cashRegister of activeCashRegisters) {
        const transactions = await getTransactionsByCashRegister(cashRegister.id);
        
        const totalSales = transactions.reduce((sum, t) => sum + t.total, 0);
        const cashSales = transactions
          .filter((t) => {
            if (t.paymentMethod === 'efectivo') return true;
            if (t.paymentMethod === 'mixto' && t.paymentDetails?.efectivo) {
              return true;
            }
            return false;
          })
          .reduce((sum, t) => {
            if (t.paymentMethod === 'efectivo') return sum + t.total;
            if (t.paymentMethod === 'mixto' && t.paymentDetails?.efectivo) {
              return sum + t.paymentDetails.efectivo;
            }
            return sum;
          }, 0);
        
        stats[cashRegister.id] = { totalSales, cashSales, transactionCount: transactions.length };
      }
      
      setTransactionStats(stats);
    };
    
    if (activeCashRegisters.length > 0) {
      loadStats();
    }
  }, [activeCashRegisters]);

  const getTransactionStats = (cashRegisterId: string) => {
    return transactionStats[cashRegisterId] || { totalSales: 0, cashSales: 0, transactionCount: 0 };
  };

  return (
    <div className="space-y-6">
      {/* Sección para abrir nueva caja */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="bg-green-100 p-3 rounded-full">
              <Unlock className="size-5 md:size-6 text-green-600" />
            </div>
            <div>
              <CardTitle className="text-lg md:text-xl">Habilitar Nueva Caja</CardTitle>
              <p className="text-xs md:text-sm text-gray-600">Abrir caja para un cajero</p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cashier" className="text-sm">Seleccionar Cajero</Label>
                <Select value={selectedCashier} onValueChange={setSelectedCashier}>
                  <SelectTrigger className="text-sm">
                    <SelectValue placeholder="Elige un cajero" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableCashiers.map((cajero) => (
                      <SelectItem key={cajero.id} value={cajero.id}>
                        {cajero.name} (@{cajero.username})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="openingAmount" className="text-sm">Monto Inicial (Fondo de Cambio)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                    ₲
                  </span>
                  <Input
                    id="openingAmount"
                    type="text"
                    value={openingAmount}
                    onChange={(e) => handleOpeningAmountChange(e.target.value)}
                    placeholder="0"
                    className="pl-8"
                  />
                </div>
              </div>
            </div>

            <Button 
              onClick={handleOpenCashRegister} 
              className="w-full" 
              size="lg"
              disabled={!selectedCashier || !openingAmount}
            >
              <Unlock className="size-4 mr-2" />
              Habilitar Caja
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Cajas activas */}
      {activeCashRegisters.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-xl">Cajas Activas ({activeCashRegisters.length})</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeCashRegisters.map((cashRegister) => {
              const stats = getTransactionStats(cashRegister.id);
              return (
                <Card key={cashRegister.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="bg-green-100 p-3 rounded-full">
                          <DollarSign className="size-6 text-green-600" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">{cashRegister.userName}</CardTitle>
                          <p className="text-sm text-gray-600">
                            ID: {cashRegister.id}
                          </p>
                        </div>
                      </div>
                      <Badge className="bg-green-100 text-green-800">
                        Abierta
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <p className="text-sm text-gray-600">Monto Inicial</p>
                        <p className="text-lg">₲ {formatGuaranies(cashRegister.openingAmount)}</p>
                      </div>
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <p className="text-sm text-gray-600">Ventas Totales</p>
                        <p className="text-lg">₲ {formatGuaranies(stats.totalSales)}</p>
                      </div>
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <p className="text-sm text-gray-600">Ventas en Efectivo</p>
                        <p className="text-lg">₲ {formatGuaranies(stats.cashSales)}</p>
                      </div>
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <p className="text-sm text-gray-600">N° Transacciones</p>
                        <p className="text-lg">{stats.transactionCount}</p>
                      </div>
                    </div>

                    <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg">
                      <p className="text-sm text-blue-800">
                        <strong>Efectivo esperado en caja:</strong>
                      </p>
                      <p className="text-xl text-blue-900">
                        ₲ {formatGuaranies(cashRegister.openingAmount + stats.cashSales)}
                      </p>
                      <p className="text-xs text-blue-700 mt-1">
                        (Monto inicial + ventas en efectivo)
                      </p>
                    </div>

                    <Button 
                      onClick={() => handleInitiateClosing(cashRegister)} 
                      variant="destructive" 
                      className="w-full"
                    >
                      <Lock className="size-4 mr-2" />
                      Cerrar Caja
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {activeCashRegisters.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            <DollarSign className="size-12 mx-auto mb-4 text-gray-400" />
            <p>No hay cajas activas en este momento</p>
            <p className="text-sm">Habilita una caja para que un cajero pueda trabajar</p>
          </CardContent>
        </Card>
      )}

      {/* Modal de cierre de caja */}
      <Dialog open={showClosingModal} onOpenChange={setShowClosingModal}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Cierre de Caja</DialogTitle>
            <DialogDescription>
              {cashRegisterToClose && `Cajero: ${cashRegisterToClose.userName}`}
            </DialogDescription>
          </DialogHeader>
          {cashRegisterToClose && (() => {
            const stats = getTransactionStats(cashRegisterToClose.id);
            const expectedCash = cashRegisterToClose.openingAmount + stats.cashSales;
            const actualCashAmount = parseFloat(actualCash.replace(/\./g, '')) || 0;
            const difference = actualCashAmount - expectedCash;

            return (
              <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Monto Inicial:</span>
                    <span>₲ {formatGuaranies(cashRegisterToClose.openingAmount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Ventas Totales:</span>
                    <span>₲ {formatGuaranies(stats.totalSales)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Ventas en Efectivo:</span>
                    <span className="text-green-600">₲ {formatGuaranies(stats.cashSales)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Ventas con Tarjeta/Transfer:</span>
                    <span>₲ {formatGuaranies(stats.totalSales - stats.cashSales)}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-gray-300">
                    <span className="font-semibold">Efectivo Esperado en Caja:</span>
                    <span className="text-xl text-blue-600">
                      ₲ {formatGuaranies(expectedCash)}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="actualCash">Efectivo Real Contado en Caja</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                      ₲
                    </span>
                    <Input
                      id="actualCash"
                      type="text"
                      value={actualCash}
                      onChange={(e) => handleActualCashChange(e.target.value)}
                      placeholder="0"
                      className="pl-8 text-xl"
                    />
                  </div>
                  <p className="text-sm text-gray-500">
                    Cuente todo el efectivo físico que hay en la caja (incluyendo el monto inicial)
                  </p>
                </div>

                {actualCash && (
                  <div className={`p-4 rounded-lg border-2 ${
                    difference === 0 
                      ? 'bg-green-50 border-green-300' 
                      : difference > 0 
                      ? 'bg-blue-50 border-blue-300'
                      : 'bg-red-50 border-red-300'
                  }`}>
                    <div className="flex items-start gap-3">
                      <AlertCircle className={`size-6 ${
                        difference === 0 
                          ? 'text-green-600' 
                          : difference > 0 
                          ? 'text-blue-600'
                          : 'text-red-600'
                      }`} />
                      <div className="flex-1">
                        <p className="font-semibold mb-1">
                          {difference === 0 && '✓ Cuadra Perfecto'}
                          {difference > 0 && 'Excedente de Efectivo'}
                          {difference < 0 && '⚠ Faltante de Efectivo'}
                        </p>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span>Esperado:</span>
                            <span>₲ {formatGuaranies(expectedCash)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Real:</span>
                            <span>₲ {formatGuaranies(actualCashAmount)}</span>
                          </div>
                          <div className="flex justify-between pt-2 border-t">
                            <span className="font-semibold">Diferencia:</span>
                            <span className={`text-xl font-semibold ${
                              difference === 0 
                                ? 'text-green-600' 
                                : difference > 0 
                                ? 'text-blue-600'
                                : 'text-red-600'
                            }`}>
                              {difference > 0 && '+'} ₲ {formatGuaranies(Math.abs(difference))}
                            </span>
                          </div>
                        </div>
                        {difference < 0 && (
                          <p className="text-xs text-red-700 mt-2">
                            Posible error en vueltos o ventas no registradas
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex gap-3">
                  <Button 
                    variant="outline" 
                    onClick={() => setShowClosingModal(false)} 
                    className="flex-1"
                  >
                    Cancelar
                  </Button>
                  <Button 
                    onClick={handleCloseCashRegister} 
                    variant="destructive" 
                    className="flex-1"
                    disabled={!actualCash}
                  >
                    <Lock className="size-4 mr-2" />
                    Confirmar Cierre
                  </Button>
                </div>
              </div>
            );
          })()}
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