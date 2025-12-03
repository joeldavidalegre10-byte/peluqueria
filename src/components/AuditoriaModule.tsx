import { useState, useEffect } from 'react';
import { CashRegister } from '../App';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { AlertCircle, CheckCircle, Eye, Calendar, Filter, TrendingDown, TrendingUp } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { formatGuaranies } from '../utils/currency';
import { getCashRegisterHistory, getTransactionsByCashRegister } from '../utils/database';

export function AuditoriaModule() {
  const [cashRegisters, setCashRegisters] = useState<CashRegister[]>([]);
  const [filterDate, setFilterDate] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'cerrada' | 'pendiente_revision'>('all');

  useEffect(() => {
    const loadHistory = async () => {
      const history = await getCashRegisterHistory();
      setCashRegisters(history);
    };
    
    loadHistory();
  }, []);

  const filteredRegisters = cashRegisters.filter((cr) => {
    const matchesDate = filterDate ? cr.openingDate.startsWith(filterDate) : true;
    const matchesStatus = filterStatus === 'all' ? true : cr.status === filterStatus;
    return matchesDate && matchesStatus;
  });

  const sortedRegisters = [...filteredRegisters].sort(
    (a, b) => new Date(b.openingDate).getTime() - new Date(a.openingDate).getTime()
  );

  // Estadísticas de auditoría
  const totalCierres = cashRegisters.length;
  const cierresCorrectos = cashRegisters.filter((cr) => cr.status === 'cerrada' && (cr.difference || 0) === 0).length;
  const cierresConDiferencia = cashRegisters.filter((cr) => cr.status === 'cerrada' && (cr.difference || 0) !== 0).length;
  const cierresPendientes = cashRegisters.filter((cr) => cr.status === 'pendiente_revision').length;
  const totalDiferencias = cashRegisters.reduce((sum, cr) => sum + Math.abs(cr.difference || 0), 0);

  const getStatusBadge = (status: CashRegister['status']) => {
    if (status === 'cerrada') {
      return (
        <Badge className="bg-green-100 text-green-800">
          <CheckCircle className="size-3 mr-1" />
          Correcta
        </Badge>
      );
    } else if (status === 'pendiente_revision') {
      return (
        <Badge className="bg-yellow-100 text-yellow-800">
          <AlertCircle className="size-3 mr-1" />
          Pendiente de Revisión
        </Badge>
      );
    }
    return <Badge>Abierta</Badge>;
  };

  const formatDate = (isoDate: string) => {
    return new Date(isoDate).toLocaleString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const CashRegisterDetail = ({ cashRegister }: { cashRegister: CashRegister }) => {
    const [transactions, setTransactions] = useState([]);

    useEffect(() => {
      const loadTransactions = async () => {
        const trans = await getTransactionsByCashRegister(cashRegister.id);
        setTransactions(trans as any);
      };
      
      loadTransactions();
    }, [cashRegister.id]);

    // Calcular ventas por método de pago - incluye manejo de pagos mixtos
    let cashSales = 0;
    let cardSales = 0;
    let transferSales = 0;

    transactions.forEach((t: any) => {
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

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <p className="text-sm text-gray-600">Cajero</p>
            <p>{cashRegister.userName}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-gray-600">Estado</p>
            <div>{getStatusBadge(cashRegister.status)}</div>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-gray-600">Apertura</p>
            <p>{formatDate(cashRegister.openingDate)}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-gray-600">Cierre</p>
            <p>{cashRegister.closingDate ? formatDate(cashRegister.closingDate) : 'N/A'}</p>
          </div>
        </div>

        <div className="bg-gray-50 p-4 rounded-lg space-y-2">
          <h4>Movimientos de Caja</h4>
          <div className="space-y-1">
            <div className="flex justify-between">
              <span className="text-gray-600">Monto Inicial:</span>
              <span>₲ {formatGuaranies(cashRegister.openingAmount || 0)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Ingresos en Efectivo:</span>
              <span>₲ {formatGuaranies(cashSales)}</span>
            </div>
            <div className="flex justify-between pt-2 border-t">
              <span>Efectivo Esperado:</span>
              <span>₲ {formatGuaranies(cashRegister.expectedCash || 0)}</span>
            </div>
            <div className="flex justify-between">
              <span>Efectivo Contado:</span>
              <span>₲ {formatGuaranies(cashRegister.actualCash || 0)}</span>
            </div>
            <div className="flex justify-between pt-2 border-t">
              <span>Diferencia:</span>
              <span
                className={
                  (cashRegister.difference || 0) === 0
                    ? 'text-green-600'
                    : (cashRegister.difference || 0) > 0
                    ? 'text-blue-600'
                    : 'text-red-600'
                }
              >
                {(cashRegister.difference || 0) > 0 ? '+' : ''}₲ {formatGuaranies(Math.abs(cashRegister.difference || 0))}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-gray-50 p-4 rounded-lg space-y-2">
          <h4>Ventas por Método de Pago</h4>
          <div className="space-y-1">
            <div className="flex flex-col sm:flex-row justify-between gap-1">
              <span className="text-gray-600">Efectivo:</span>
              <span className="font-semibold">₲ {formatGuaranies(cashSales)}</span>
            </div>
            <div className="flex flex-col sm:flex-row justify-between gap-1">
              <span className="text-gray-600">Tarjeta:</span>
              <span className="font-semibold">₲ {formatGuaranies(cardSales)}</span>
            </div>
            <div className="flex flex-col sm:flex-row justify-between gap-1">
              <span className="text-gray-600">Transferencia:</span>
              <span className="font-semibold">₲ {formatGuaranies(transferSales)}</span>
            </div>
            <div className="flex flex-col sm:flex-row justify-between pt-2 border-t gap-1">
              <span>Total Ventas:</span>
              <span className="text-green-600 font-semibold">
                ₲ {formatGuaranies(cashSales + cardSales + transferSales)}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-gray-50 p-4 rounded-lg">
          <h4 className="mb-2">Transacciones ({transactions.length})</h4>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {transactions.map((t: any, idx) => (
              <div key={t.id} className="bg-white p-3 rounded border">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <p className="text-sm">
                      #{idx + 1} - {new Date(t.date).toLocaleTimeString('es-ES')}
                    </p>
                    <p className="text-xs text-gray-600">
                      {t.items.length} item(s) - {t.paymentMethod}
                    </p>
                    {t.paymentMethod === 'mixto' && t.paymentDetails && (
                      <div className="mt-1 text-xs text-blue-600 space-y-0.5">
                        {t.paymentDetails.efectivo > 0 && (
                          <div>Efectivo: ₲ {formatGuaranies(t.paymentDetails.efectivo)}</div>
                        )}
                        {t.paymentDetails.tarjeta > 0 && (
                          <div>Tarjeta: ₲ {formatGuaranies(t.paymentDetails.tarjeta)}</div>
                        )}
                        {t.paymentDetails.transferencia > 0 && (
                          <div>Transferencia: ₲ {formatGuaranies(t.paymentDetails.transferencia)}</div>
                        )}
                      </div>
                    )}
                  </div>
                  <span className="text-green-600 ml-2">₲ {formatGuaranies(t.total)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Estadísticas de Auditoría */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex flex-col items-center text-center gap-2">
              <div className="bg-blue-100 p-2 rounded-full">
                <Calendar className="size-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-gray-600">Total Cierres</p>
                <p className="text-lg font-semibold">{totalCierres}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex flex-col items-center text-center gap-2">
              <div className="bg-green-100 p-2 rounded-full">
                <CheckCircle className="size-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-gray-600">Cierres Correctos</p>
                <p className="text-lg font-semibold">{cierresCorrectos}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex flex-col items-center text-center gap-2">
              <div className="bg-yellow-100 p-2 rounded-full">
                <AlertCircle className="size-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-xs text-gray-600">Con Diferencias</p>
                <p className="text-lg font-semibold">{cierresConDiferencia}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex flex-col items-center text-center gap-2">
              <div className="bg-red-100 p-2 rounded-full">
                <TrendingDown className="size-5 text-red-600" />
              </div>
              <div>
                <p className="text-xs text-gray-600">Total Diferencias</p>
                <p className="text-lg font-semibold">₲ {formatGuaranies(totalDiferencias)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Auditoría de Cierres de Caja</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-end gap-4">
              <div className="flex-1 max-w-xs space-y-2">
                <Label htmlFor="filterDate">Filtrar por fecha</Label>
                <Input
                  id="filterDate"
                  type="date"
                  value={filterDate}
                  onChange={(e) => setFilterDate(e.target.value)}
                />
              </div>
              <div className="flex-1 max-w-xs space-y-2">
                <Label htmlFor="filterStatus">Filtrar por estado</Label>
                <select
                  id="filterStatus"
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as any)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                >
                  <option value="all">Todos</option>
                  <option value="cerrada">Cerradas</option>
                  <option value="pendiente_revision">Pendientes de Revisión</option>
                </select>
              </div>
              {(filterDate || filterStatus !== 'all') && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setFilterDate('');
                    setFilterStatus('all');
                  }}
                >
                  <Filter className="size-4 mr-2" />
                  Limpiar Filtros
                </Button>
              )}
            </div>

            <div className="grid grid-cols-1 gap-3">
              {sortedRegisters.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Calendar className="size-12 mx-auto mb-4 text-gray-400" />
                  <p>No hay cierres de caja registrados</p>
                </div>
              ) : (
                sortedRegisters.map((cashRegister) => (
                  <Card key={cashRegister.id}>
                    <CardContent className="py-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 grid grid-cols-5 gap-4">
                          <div>
                            <p className="text-sm text-gray-600">Fecha</p>
                            <p>
                              {new Date(cashRegister.openingDate).toLocaleDateString('es-ES')}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Cajero</p>
                            <p>{cashRegister.userName}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Estado</p>
                            <div className="mt-1">{getStatusBadge(cashRegister.status)}</div>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Total Ventas</p>
                            <p className="text-green-600">
                              ₲ {formatGuaranies(cashRegister.totalSales || 0)}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Diferencia</p>
                            <p
                              className={
                                (cashRegister.difference || 0) === 0
                                  ? 'text-green-600'
                                  : 'text-red-600'
                              }
                            >
                              {(cashRegister.difference || 0) > 0 ? '+' : ''}₲ {formatGuaranies(Math.abs(cashRegister.difference || 0))}
                            </p>
                          </div>
                        </div>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm">
                              <Eye className="size-4 mr-2" />
                              Ver Detalles
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                            <DialogHeader>
                              <DialogTitle>Detalle de Cierre de Caja</DialogTitle>
                              <DialogDescription>
                                ID: {cashRegister.id}
                              </DialogDescription>
                            </DialogHeader>
                            <CashRegisterDetail cashRegister={cashRegister} />
                          </DialogContent>
                        </Dialog>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}