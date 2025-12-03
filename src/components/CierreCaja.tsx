import { useState, useEffect } from 'react';
import { CashRegister, Transaction } from '../App';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { DollarSign, AlertCircle, CheckCircle } from 'lucide-react';
import { Alert, AlertDescription } from './ui/alert';
import { formatGuaranies } from '../utils/currency';
import { getTransactionsByCashRegister } from '../utils/database';

interface CierreCajaProps {
  cashRegister: CashRegister;
  onClose: (actualCash: number, expectedCash: number, totalSales: number) => void;
}

export function CierreCaja({ cashRegister, onClose }: CierreCajaProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [actualCash, setActualCash] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    loadTransactions();
  }, [cashRegister.id]);

  const loadTransactions = async () => {
    try {
      const loaded = await getTransactionsByCashRegister(cashRegister.id);
      setTransactions(loaded);
    } catch (error) {
      console.error('Error al cargar transacciones:', error);
    }
  };

  // Calcular totales - incluye manejo de pagos mixtos
  const totalSales = transactions.reduce((sum, t) => sum + t.total, 0);
  
  let cashSales = 0;
  let cardSales = 0;
  let transferSales = 0;

  transactions.forEach((t) => {
    if (t.paymentMethod === 'mixto' && t.paymentDetails) {
      // Para pagos mixtos, sumar cada método por separado
      cashSales += t.paymentDetails.efectivo || 0;
      cardSales += t.paymentDetails.tarjeta || 0;
      transferSales += t.paymentDetails.transferencia || 0;
    } else {
      // Para pagos simples
      if (t.paymentMethod === 'efectivo') cashSales += t.total;
      if (t.paymentMethod === 'tarjeta') cardSales += t.total;
      if (t.paymentMethod === 'transferencia') transferSales += t.total;
    }
  });

  const expectedCash = cashRegister.openingAmount + cashSales;
  const actualCashValue = parseFloat(actualCash) || 0;
  const difference = actualCashValue - expectedCash;

  // Desglose por tipo
  const servicesSales = transactions
    .filter((t) => t.type === 'servicio')
    .reduce((sum, t) => sum + t.total, 0);
  const productsSales = transactions
    .filter((t) => t.type === 'producto')
    .reduce((sum, t) => sum + t.total, 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowConfirm(true);
  };

  const confirmClose = () => {
    onClose(actualCashValue, expectedCash, totalSales);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Cierre de Caja</CardTitle>
          <CardDescription>
            Revisa el resumen de ventas del día y registra el efectivo contado
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Resumen de Caja */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm text-blue-600">Monto Inicial</p>
              <p className="text-2xl">₲ {formatGuaranies(cashRegister.openingAmount)}</p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <p className="text-sm text-green-600">Ingresos en Efectivo</p>
              <p className="text-2xl">₲ {formatGuaranies(cashSales)}</p>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <p className="text-sm text-purple-600">Efectivo Esperado</p>
              <p className="text-2xl">₲ {formatGuaranies(expectedCash)}</p>
            </div>
          </div>

          {/* Desglose por Método de Pago */}
          <div>
            <h3 className="mb-3">Desglose por Método de Pago</h3>
            <div className="space-y-2 bg-gray-50 p-4 rounded-lg">
              <div className="flex flex-col sm:flex-row justify-between gap-1">
                <span>Efectivo:</span>
                <span className="font-semibold">₲ {formatGuaranies(cashSales)}</span>
              </div>
              <div className="flex flex-col sm:flex-row justify-between gap-1">
                <span>Tarjeta:</span>
                <span className="font-semibold">₲ {formatGuaranies(cardSales)}</span>
              </div>
              <div className="flex flex-col sm:flex-row justify-between gap-1">
                <span>Transferencia:</span>
                <span className="font-semibold">₲ {formatGuaranies(transferSales)}</span>
              </div>
              <div className="flex flex-col sm:flex-row justify-between pt-2 border-t gap-1">
                <span>Total Ventas:</span>
                <span className="font-semibold">₲ {formatGuaranies(totalSales)}</span>
              </div>
            </div>
          </div>

          {/* Desglose por Tipo */}
          <div>
            <h3 className="mb-3">Desglose por Tipo</h3>
            <div className="space-y-2 bg-gray-50 p-4 rounded-lg">
              <div className="flex flex-col sm:flex-row justify-between gap-1">
                <span>Servicios:</span>
                <span className="font-semibold">₲ {formatGuaranies(servicesSales)}</span>
              </div>
              <div className="flex flex-col sm:flex-row justify-between gap-1">
                <span>Productos:</span>
                <span className="font-semibold">₲ {formatGuaranies(productsSales)}</span>
              </div>
              <div className="flex flex-col sm:flex-row justify-between gap-1">
                <span>Total Transacciones:</span>
                <span className="font-semibold">{transactions.length}</span>
              </div>
            </div>
          </div>

          {/* Registro de Efectivo Contado */}
          {!showConfirm ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="actualCash">
                  Efectivo Contado (Físico en Caja)
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                    ₲
                  </span>
                  <Input
                    id="actualCash"
                    type="number"
                    step="1"
                    min="0"
                    value={actualCash}
                    onChange={(e) => setActualCash(e.target.value)}
                    placeholder="0"
                    className="pl-8"
                    required
                  />
                </div>
                <p className="text-sm text-gray-500">
                  Cuenta el efectivo físico en la caja y registra el monto total
                </p>
              </div>

              {actualCash && (
                <div className="space-y-3">
                  <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                    <div className="flex justify-between">
                      <span>Efectivo Esperado:</span>
                      <span>₲ {formatGuaranies(expectedCash)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Efectivo Contado:</span>
                      <span>₲ {formatGuaranies(actualCashValue)}</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t">
                      <span>Diferencia:</span>
                      <span
                        className={
                          difference === 0
                            ? 'text-green-600'
                            : difference > 0
                            ? 'text-blue-600'
                            : 'text-red-600'
                        }
                      >
                        {difference > 0 ? '+' : ''}₲ {formatGuaranies(Math.abs(difference))}
                      </span>
                    </div>
                  </div>

                  {Math.abs(difference) <= 1000 ? (
                    <Alert className="bg-green-50 border-green-200">
                      <CheckCircle className="size-4 text-green-600" />
                      <AlertDescription className="text-green-800">
                        La diferencia está dentro del margen aceptable (₲ 1.000). El cierre se marcará como correcto.
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <Alert className="bg-yellow-50 border-yellow-200">
                      <AlertCircle className="size-4 text-yellow-600" />
                      <AlertDescription className="text-yellow-800">
                        Hay una diferencia de ₲ {formatGuaranies(Math.abs(difference))} 
                        {difference > 0 ? ' (sobrante)' : ' (faltante)'}. 
                        El cierre se marcará como "Pendiente de Revisión" para que el administrador lo verifique.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              )}

              <Button type="submit" className="w-full" size="lg">
                Continuar al Cierre
              </Button>
            </form>
          ) : (
            <div className="space-y-4">
              <Alert>
                <AlertCircle className="size-4" />
                <AlertDescription>
                  ¿Estás seguro de que deseas cerrar la caja? Esta acción no se puede deshacer.
                </AlertDescription>
              </Alert>

              <div className="bg-gray-900 text-white p-6 rounded-lg space-y-2">
                <h4 className="text-center mb-4">Resumen Final</h4>
                <div className="flex justify-between">
                  <span>Monto Inicial:</span>
                  <span>₲ {formatGuaranies(cashRegister.openingAmount)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Total Ventas:</span>
                  <span>₲ {formatGuaranies(totalSales)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Efectivo Esperado:</span>
                  <span>₲ {formatGuaranies(expectedCash)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Efectivo Contado:</span>
                  <span>₲ {formatGuaranies(actualCashValue)}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-gray-700">
                  <span>Diferencia:</span>
                  <span className={difference === 0 ? 'text-green-400' : 'text-yellow-400'}>
                    {difference > 0 ? '+' : ''}₲ {formatGuaranies(Math.abs(difference))}
                  </span>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowConfirm(false)}
                >
                  Cancelar
                </Button>
                <Button className="flex-1" size="lg" onClick={confirmClose}>
                  <DollarSign className="size-4 mr-2" />
                  Cerrar Caja
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}