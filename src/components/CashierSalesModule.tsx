import { useState, useEffect } from 'react';
import { CashRegister, Transaction } from '../App';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Users, FileSpreadsheet, Eye, DollarSign, CreditCard, Banknote } from 'lucide-react';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { formatGuaranies } from '../utils/currency';
import { getCashRegisters, getCashRegisterHistory, getTransactionsByCashRegister, getAnulledTransactions } from '../utils/database';

export function CashierSalesModule() {
  const [cashRegisters, setCashRegisters] = useState<CashRegister[]>([]);
  const [selectedCashier, setSelectedCashier] = useState('');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  useEffect(() => {
    loadCashRegisters();
  }, []);

  const loadCashRegisters = async () => {
    try {
      const history = await getCashRegisterHistory();
      const activeCashRegisters = await getCashRegisters();
      const allCashRegisters = [...activeCashRegisters, ...history];
      setCashRegisters(allCashRegisters);
    } catch (error) {
      console.error('Error al cargar cajas:', error);
    }
  };

  useEffect(() => {
    if (selectedCashier) {
      loadTransactions();
    } else {
      setTransactions([]);
    }
  }, [selectedCashier, cashRegisters]);

  const loadTransactions = async () => {
    if (!selectedCashier) return;
    
    try {
      // Cargar ventas activas de esta caja
      const activeTransactions = await getTransactionsByCashRegister(selectedCashier);

      // Cargar ventas anuladas de esta caja
      const allAnulledTransactions = await getAnulledTransactions();
      const anulledFromThisCashier = allAnulledTransactions.filter(
        (t: Transaction) => t.cashRegisterId === selectedCashier
      );

      // Combinar transacciones
      const allTransactions = [...activeTransactions, ...anulledFromThisCashier];

      // Ordenar por fecha (más recientes primero)
      allTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      setTransactions(allTransactions);
    } catch (error) {
      console.error('Error al cargar transacciones:', error);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleViewDetails = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setShowDetailsModal(true);
  };

  const handleExportToExcel = () => {
    if (transactions.length === 0) return;

    const cashier = cashRegisters.find((r) => r.id === selectedCashier);
    if (!cashier) return;

    // Crear contenido CSV
    let csvContent = 'ID Transacción,Fecha,Tipo,Método de Pago,Total (₲),Items\n';
    
    transactions.forEach((t) => {
      const items = t.items.map((item) => `${item.name} x${item.quantity}`).join('; ');
      csvContent += `${t.id},${formatDate(t.date)},${t.type === 'servicio' ? 'Servicio' : 'Producto'},${t.paymentMethod === 'efectivo' ? 'Efectivo' : t.paymentMethod === 'tarjeta' ? 'Tarjeta' : 'Transferencia'},₲ ${formatGuaranies(t.total)},"${items}"\n`;
    });

    // Agregar resumen
    csvContent += '\n\nResumen\n';
    csvContent += `Cajero,${cashier.userName}\n`;
    csvContent += `Fecha Apertura,${formatDate(cashier.openingDate)}\n`;
    csvContent += `Fecha Cierre,${cashier.closingDate ? formatDate(cashier.closingDate) : 'N/A'}\n`;
    csvContent += `Total Transacciones,${transactions.length}\n`;
    csvContent += `Total Ventas,₲ ${formatGuaranies(transactions.reduce((sum, t) => sum + t.total, 0))}\n`;
    csvContent += `Efectivo,₲ ${formatGuaranies(transactions.filter((t) => t.paymentMethod === 'efectivo').reduce((sum, t) => sum + t.total, 0))}\n`;
    csvContent += `Tarjeta,₲ ${formatGuaranies(transactions.filter((t) => t.paymentMethod === 'tarjeta').reduce((sum, t) => sum + t.total, 0))}\n`;
    csvContent += `Transferencia,₲ ${formatGuaranies(transactions.filter((t) => t.paymentMethod === 'transferencia').reduce((sum, t) => sum + t.total, 0))}\n`;

    // Crear y descargar archivo
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `Ventas_${cashier.userName}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const totalSales = transactions.reduce((sum, t) => sum + t.total, 0);
  const cashSales = transactions.filter((t) => t.paymentMethod === 'efectivo').reduce((sum, t) => sum + t.total, 0);
  const cardSales = transactions.filter((t) => t.paymentMethod === 'tarjeta').reduce((sum, t) => sum + t.total, 0);
  const transferSales = transactions.filter((t) => t.paymentMethod === 'transferencia').reduce((sum, t) => sum + t.total, 0);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Ventas por Cajero</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {cashRegisters.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="size-16 mx-auto mb-4 text-muted-foreground" />
              <p className="text-lg mb-2">No hay cajas registradas todavía</p>
              <p className="text-sm">Las cajas aparecerán aquí una vez que los cajeros abran su caja</p>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <label className="text-sm">Seleccionar Cajero</label>
                <Select value={selectedCashier} onValueChange={setSelectedCashier}>
                  <SelectTrigger>
                    <SelectValue placeholder="Elige un cajero para ver sus ventas" />
                  </SelectTrigger>
                  <SelectContent>
                    {cashRegisters.map((register) => (
                      <SelectItem key={register.id} value={register.id}>
                        {register.userName} - {formatDate(register.openingDate)} {register.closingDate ? '(Cerrada)' : '(Activa)'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedCashier && transactions.length > 0 && (
                <>
                  <div className="grid grid-cols-4 gap-4">
                <div className="bg-secondary p-4 rounded-lg">
                  <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 ocean:text-blue-400 mb-1">
                    <Users className="size-4" />
                    <p className="text-sm">Total Ventas</p>
                  </div>
                  <p className="text-2xl">{transactions.length}</p>
                </div>
                <div className="bg-secondary p-4 rounded-lg">
                  <div className="flex items-center gap-2 text-green-600 dark:text-green-400 ocean:text-green-400 mb-1">
                    <DollarSign className="size-4" />
                    <p className="text-sm">Total Recaudado</p>
                  </div>
                  <p className="text-xl">₲ {formatGuaranies(totalSales)}</p>
                </div>
                <div className="bg-secondary p-4 rounded-lg">
                  <p className="text-sm text-purple-600 dark:text-purple-400 ocean:text-purple-400">Efectivo</p>
                  <p className="text-lg">₲ {formatGuaranies(cashSales)}</p>
                </div>
                <div className="bg-secondary p-4 rounded-lg">
                  <p className="text-sm text-orange-600 dark:text-orange-400 ocean:text-orange-400">Tarjeta/Transfer</p>
                  <p className="text-lg">₲ {formatGuaranies(cardSales + transferSales)}</p>
                </div>
              </div>

              <Button onClick={handleExportToExcel} className="w-full" size="lg">
                <FileSpreadsheet className="size-4 mr-2" />
                Exportar a CSV
              </Button>
                </>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {selectedCashier && transactions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Detalle de Transacciones</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {transactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between p-4 bg-secondary rounded-lg hover:bg-secondary/80 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline">{transaction.id}</Badge>
                      <span className="text-sm text-muted-foreground">
                        {formatDate(transaction.date)}
                      </span>
                      {transaction.status === 'anulada' && (
                        <Badge variant="destructive">Anulada</Badge>
                      )}
                    </div>
                    <div className="mt-2 flex items-center gap-3">
                      <Badge className={
                        transaction.type === 'servicio' 
                          ? 'bg-blue-100 text-blue-800' 
                          : 'bg-purple-100 text-purple-800'
                      }>
                        {transaction.type === 'servicio' ? 'Servicio' : 'Producto'}
                      </Badge>
                      <Badge className={
                        transaction.paymentMethod === 'efectivo'
                          ? 'bg-green-100 text-green-800'
                          : transaction.paymentMethod === 'tarjeta'
                          ? 'bg-orange-100 text-orange-800'
                          : 'bg-blue-100 text-blue-800'
                      }>
                        {transaction.paymentMethod === 'efectivo' ? 'Efectivo' : transaction.paymentMethod === 'tarjeta' ? 'Tarjeta' : 'Transferencia'}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Total</p>
                      <p className="text-xl text-green-600">₲ {formatGuaranies(transaction.total)}</p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewDetails(transaction)}
                    >
                      <Eye className="size-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {selectedCashier && transactions.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Users className="size-12 mx-auto mb-4 text-muted-foreground" />
            <p>No hay transacciones para este cajero</p>
          </CardContent>
        </Card>
      )}

      {/* Modal de detalles */}
      <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Detalle de Transacción</DialogTitle>
            <DialogDescription>
              {selectedTransaction?.id}
            </DialogDescription>
          </DialogHeader>
          {selectedTransaction && (
            <div className="space-y-4">
              {/* Estado de la venta - Si está anulada */}
              {selectedTransaction.status === 'anulada' && (
                <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-red-600 font-semibold">Venta Anulada</p>
                      <p className="text-sm text-red-800 mt-1">
                        Anulada por: <strong>{selectedTransaction.anulledByUserName}</strong>
                      </p>
                      <p className="text-xs text-red-600 mt-1">
                        Fecha: {formatDate(selectedTransaction.anulledDate || '')}
                      </p>
                    </div>
                    <Badge variant="destructive" className="text-lg px-4 py-2">Anulada</Badge>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Fecha y Hora</p>
                  <p>{formatDate(selectedTransaction.date)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Tipo</p>
                  <Badge className={
                    selectedTransaction.type === 'servicio' 
                      ? 'bg-blue-100 text-blue-800' 
                      : 'bg-purple-100 text-purple-800'
                  }>
                    {selectedTransaction.type === 'servicio' ? 'Servicio' : 'Producto'}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Método de Pago</p>
                  {selectedTransaction.paymentMethod === 'mixto' ? (
                    <div className="space-y-1">
                      <Badge className="bg-purple-100 text-purple-800">
                        Pago Mixto
                      </Badge>
                      {selectedTransaction.paymentDetails && (
                        <div className="text-sm mt-2 space-y-1">
                          {selectedTransaction.paymentDetails.efectivo > 0 && (
                            <p className="text-green-600">
                              Efectivo: ₲ {formatGuaranies(selectedTransaction.paymentDetails.efectivo)}
                            </p>
                          )}
                          {selectedTransaction.paymentDetails.tarjeta > 0 && (
                            <p className="text-orange-600">
                              Tarjeta: ₲ {formatGuaranies(selectedTransaction.paymentDetails.tarjeta)}
                            </p>
                          )}
                          {selectedTransaction.paymentDetails.transferencia > 0 && (
                            <p className="text-blue-600">
                              Transferencia: ₲ {formatGuaranies(selectedTransaction.paymentDetails.transferencia)}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <Badge className={
                      selectedTransaction.paymentMethod === 'efectivo'
                        ? 'bg-green-100 text-green-800'
                        : selectedTransaction.paymentMethod === 'tarjeta'
                        ? 'bg-orange-100 text-orange-800'
                        : 'bg-blue-100 text-blue-800'
                    }>
                      {selectedTransaction.paymentMethod === 'efectivo' ? 'Efectivo' : selectedTransaction.paymentMethod === 'tarjeta' ? 'Tarjeta' : 'Transferencia'}
                    </Badge>
                  )}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total</p>
                  <p className="text-xl text-green-600">₲ {formatGuaranies(selectedTransaction.total)}</p>
                </div>
              </div>

              <div className="border-t pt-4">
                <p className="text-sm text-muted-foreground mb-3">Items</p>
                <div className="space-y-2">
                  {selectedTransaction.items.map((item, index) => (
                    <div key={index} className="flex justify-between items-start p-3 bg-secondary rounded-lg">
                      <div>
                        <p>{item.name}</p>
                        {item.stylist && (
                          <p className="text-sm text-muted-foreground">Estilista: {item.stylist}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">
                          ₲ {formatGuaranies(item.price)} × {item.quantity}
                        </p>
                        <p className="text-green-600">
                          ₲ {formatGuaranies(item.price * item.quantity)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t pt-4 flex justify-between items-center">
                <span>Total de la Venta:</span>
                <span className="text-2xl text-green-600">₲ {formatGuaranies(selectedTransaction.total)}</span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}