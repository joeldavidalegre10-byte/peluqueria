import { useState, useEffect } from 'react';
import { Transaction, TransactionItem, CashRegister, User } from '../App';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Eye, XCircle, Search, Calendar, DollarSign, CreditCard, ArrowLeftRight, Banknote, FileDown } from 'lucide-react';
import { formatGuaranies } from '../utils/currency';
import { ConfirmModal } from './ConfirmModal';
import { getTransactionsByCashRegister, updateTransaction, addAnulledTransaction, getUsers } from '../utils/database';
import jsPDF from 'jspdf';

interface HistorialVentasModuleProps {
  cashRegister: CashRegister;
  onLoadToCart: (items: TransactionItem[]) => void;
}

export function HistorialVentasModule({ cashRegister, onLoadToCart }: HistorialVentasModuleProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [transactionToAnnul, setTransactionToAnnul] = useState<Transaction | null>(null);
  
  // Estados para modales
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmModalProps, setConfirmModalProps] = useState({
    title: '',
    description: '',
    type: 'info' as 'success' | 'error' | 'warning' | 'info',
  });

  // Cargar transacciones
  useEffect(() => {
    loadTransactions();
  }, [cashRegister.id]);

  const loadTransactions = async () => {
    try {
      const loaded = await getTransactionsByCashRegister(cashRegister.id);
      // Agregar status 'activa' a transacciones viejas que no lo tienen
      const updated = loaded.map((t: Transaction) => ({
        ...t,
        status: t.status || 'activa'
      }));
      setTransactions(updated);
      setFilteredTransactions(updated);
    } catch (error) {
      console.error('Error al cargar transacciones:', error);
    }
  };

  // Filtrar transacciones
  useEffect(() => {
    if (searchTerm) {
      const filtered = transactions.filter(t => 
        t.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.items.some(item => item.name.toLowerCase().includes(searchTerm.toLowerCase()))
      );
      setFilteredTransactions(filtered);
    } else {
      setFilteredTransactions(transactions);
    }
  }, [searchTerm, transactions]);

  const handleViewDetails = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setShowDetailsModal(true);
  };

  const handleAnnulClick = (transaction: Transaction) => {
    if (transaction.status === 'anulada') {
      setConfirmModalProps({
        title: 'Venta Ya Anulada',
        description: 'Esta venta ya ha sido anulada anteriormente',
        type: 'warning',
      });
      setShowConfirmModal(true);
      return;
    }

    setTransactionToAnnul(transaction);
    setShowPasswordModal(true);
  };

  const handlePasswordSubmit = async () => {
    try {
      // Verificar contraseña del administrador
      const users = await getUsers();
      const admin = users.find((u: User) => u.role === 'admin' && u.password === adminPassword);

      if (!admin) {
        setConfirmModalProps({
          title: 'Contraseña Incorrecta',
          description: 'La contraseña de administrador no es válida',
          type: 'error',
        });
        setShowConfirmModal(true);
        setAdminPassword('');
        return;
      }

      // Anular la transacción
      if (transactionToAnnul) {
        const updatedTransaction: Transaction = {
          ...transactionToAnnul,
          status: 'anulada',
          anulledBy: admin.id,
          anulledByUserName: admin.name,
          anulledDate: new Date().toISOString(),
        };

        // Guardar en ventas anuladas
        await addAnulledTransaction(updatedTransaction);

        // Actualizar el estado de la transacción en la caja actual
        await updateTransaction(updatedTransaction);

        // Recargar transacciones
        await loadTransactions();

        // Cargar items al carrito
        onLoadToCart(transactionToAnnul.items);

        // Cerrar modales y limpiar
        setShowPasswordModal(false);
        setShowDetailsModal(false);
        setAdminPassword('');
        setTransactionToAnnul(null);

        // Mostrar confirmación
        setConfirmModalProps({
          title: '¡Venta Anulada!',
          description: 'La venta ha sido anulada exitosamente. Los items se han cargado en el carrito para su revisión.',
          type: 'success',
        });
        setShowConfirmModal(true);
      }
    } catch (error) {
      console.error('Error al anular venta:', error);
      setConfirmModalProps({
        title: 'Error',
        description: 'Hubo un error al anular la venta',
        type: 'error',
      });
      setShowConfirmModal(true);
    }
  };

  const getPaymentIcon = (method: string) => {
    switch (method) {
      case 'efectivo':
        return <DollarSign className="size-4" />;
      case 'tarjeta':
        return <CreditCard className="size-4" />;
      case 'transferencia':
        return <ArrowLeftRight className="size-4" />;
      case 'mixto':
        return <Banknote className="size-4" />;
      default:
        return null;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-PY', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('es-PY', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const generatePDF = (transaction: Transaction) => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text('Detalles de Venta', 10, 10);
    doc.setFontSize(12);
    doc.text(`ID: ${transaction.id}`, 10, 20);
    doc.text(`Fecha: ${formatDate(transaction.date)}`, 10, 30);
    doc.text(`Hora: ${formatTime(transaction.date)}`, 10, 40);
    doc.text(`Método de Pago: ${transaction.paymentMethod}`, 10, 50);
    doc.text(`Total: ₲ ${formatGuaranies(transaction.total)}`, 10, 60);
    doc.text(`Estado: ${transaction.status}`, 10, 70);
    if (transaction.status === 'anulada') {
      doc.text(`Anulada por: ${transaction.anulledByUserName}`, 10, 80);
      doc.text(`Fecha de Anulación: ${formatDate(transaction.anulledDate || '')} ${formatTime(transaction.anulledDate || '')}`, 10, 90);
    }
    doc.text('Items de la Venta:', 10, 110);
    let y = 120;
    transaction.items.forEach((item, index) => {
      doc.text(`${index + 1}. ${item.name} - ₲ ${formatGuaranies(item.price)} x ${item.quantity} = ₲ ${formatGuaranies(item.price * item.quantity)}`, 10, y);
      y += 10;
    });
    doc.save(`venta_${transaction.id}.pdf`);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Historial de Ventas</CardTitle>
            <Badge variant="outline" className="text-lg px-4 py-2">
              Total: {filteredTransactions.filter(t => t.status === 'activa').length} ventas activas
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Búsqueda */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
              <Input
                placeholder="Buscar por ID de venta o nombre de producto/servicio..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Tabla de transacciones */}
          {filteredTransactions.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p>No hay ventas registradas en esta caja</p>
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID Venta</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Hora</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Método</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTransactions.map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell className="font-mono text-sm">{transaction.id}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="size-4 text-gray-400" />
                          {formatDate(transaction.date)}
                        </div>
                      </TableCell>
                      <TableCell>{formatTime(transaction.date)}</TableCell>
                      <TableCell className="text-green-600 font-semibold">
                        ₲ {formatGuaranies(transaction.total)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getPaymentIcon(transaction.paymentMethod)}
                          <span className="capitalize">{transaction.paymentMethod}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {transaction.status === 'activa' ? (
                          <Badge variant="default" className="bg-green-600">Activa</Badge>
                        ) : (
                          <Badge variant="destructive">Anulada</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewDetails(transaction)}
                          >
                            <Eye className="size-4 mr-1" />
                            Ver
                          </Button>
                          {transaction.status === 'activa' && (
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleAnnulClick(transaction)}
                            >
                              <XCircle className="size-4 mr-1" />
                              Anular
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => generatePDF(transaction)}
                          >
                            <FileDown className="size-4 mr-1" />
                            PDF
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de detalles */}
      <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Detalles de Venta</DialogTitle>
            <DialogDescription>
              ID: {selectedTransaction?.id}
            </DialogDescription>
          </DialogHeader>
          
          {selectedTransaction && (
            <div className="space-y-6">
              {/* Estado */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm text-gray-600">Estado de la Venta</p>
                  {selectedTransaction.status === 'activa' ? (
                    <Badge variant="default" className="bg-green-600 mt-1">Activa</Badge>
                  ) : (
                    <Badge variant="destructive" className="mt-1">Anulada</Badge>
                  )}
                </div>
                {selectedTransaction.status === 'anulada' && (
                  <div className="text-right text-sm">
                    <p className="text-gray-600">Anulada por:</p>
                    <p className="font-semibold">{selectedTransaction.anulledByUserName}</p>
                    <p className="text-xs text-gray-500">
                      {formatDate(selectedTransaction.anulledDate || '')} {formatTime(selectedTransaction.anulledDate || '')}
                    </p>
                  </div>
                )}
              </div>

              {/* Información general */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-600">Fecha</Label>
                  <p>{formatDate(selectedTransaction.date)}</p>
                </div>
                <div>
                  <Label className="text-gray-600">Hora</Label>
                  <p>{formatTime(selectedTransaction.date)}</p>
                </div>
                <div>
                  <Label className="text-gray-600">Método de Pago</Label>
                  {selectedTransaction.paymentMethod === 'mixto' ? (
                    <div className="space-y-2 mt-1">
                      <div className="flex items-center gap-2">
                        <ArrowLeftRight className="size-4 text-purple-600" />
                        <span className="capitalize font-semibold text-purple-600">Pago Mixto</span>
                      </div>
                      {selectedTransaction.paymentDetails && (
                        <div className="text-sm space-y-1 pl-6">
                          {selectedTransaction.paymentDetails.efectivo > 0 && (
                            <div className="flex items-center gap-2 text-green-600">
                              <Banknote className="size-4" />
                              <span>Efectivo: ₲ {formatGuaranies(selectedTransaction.paymentDetails.efectivo)}</span>
                            </div>
                          )}
                          {selectedTransaction.paymentDetails.tarjeta > 0 && (
                            <div className="flex items-center gap-2 text-orange-600">
                              <CreditCard className="size-4" />
                              <span>Tarjeta: ₲ {formatGuaranies(selectedTransaction.paymentDetails.tarjeta)}</span>
                            </div>
                          )}
                          {selectedTransaction.paymentDetails.transferencia > 0 && (
                            <div className="flex items-center gap-2 text-blue-600">
                              <ArrowLeftRight className="size-4" />
                              <span>Transferencia: ₲ {formatGuaranies(selectedTransaction.paymentDetails.transferencia)}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 mt-1">
                      {getPaymentIcon(selectedTransaction.paymentMethod)}
                      <span className="capitalize">{selectedTransaction.paymentMethod}</span>
                    </div>
                  )}
                </div>
                <div>
                  <Label className="text-gray-600">Tipo</Label>
                  <p className="capitalize">{selectedTransaction.type}</p>
                </div>
              </div>

              {/* Items */}
              <div>
                <Label className="text-gray-600 mb-3 block">Items de la Venta</Label>
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Producto/Servicio</TableHead>
                        <TableHead>Precio Unit.</TableHead>
                        <TableHead>Cant.</TableHead>
                        <TableHead className="text-right">Subtotal</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedTransaction.items.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell>
                            <div>
                              <p>{item.name}</p>
                              {item.stylist && (
                                <p className="text-sm text-gray-500">
                                  Estilista: {item.stylist}
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>₲ {formatGuaranies(item.price)}</TableCell>
                          <TableCell>{item.quantity}</TableCell>
                          <TableCell className="text-right">
                            ₲ {formatGuaranies(item.price * item.quantity)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Total */}
              <div className="flex justify-between items-center p-4 bg-gray-900 text-white rounded-lg">
                <span className="text-lg">Total de la Venta</span>
                <span className="text-3xl">₲ {formatGuaranies(selectedTransaction.total)}</span>
              </div>

              {/* Botón de anular */}
              <DialogFooter>
                {selectedTransaction.status === 'activa' && (
                  <Button
                    variant="destructive"
                    onClick={() => handleAnnulClick(selectedTransaction)}
                  >
                    <XCircle className="size-4 mr-2" />
                    Anular Esta Venta
                  </Button>
                )}
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal de contraseña de administrador */}
      <Dialog open={showPasswordModal} onOpenChange={(open) => {
        setShowPasswordModal(open);
        if (!open) {
          setAdminPassword('');
          setTransactionToAnnul(null);
        }
      }}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Autorización Requerida</DialogTitle>
            <DialogDescription>
              Ingrese la contraseña del administrador para anular esta venta
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="adminPassword">Contraseña del Administrador</Label>
              <Input
                id="adminPassword"
                type="password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                placeholder="Ingrese la contraseña"
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && adminPassword) {
                    handlePasswordSubmit();
                  }
                }}
              />
            </div>

            <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg">
              <p className="text-sm text-yellow-800">
                <strong>Atención:</strong> Al anular esta venta, los items se cargarán en el carrito 
                para que pueda revisarlos y eliminar cualquier error antes de completar.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowPasswordModal(false);
                setAdminPassword('');
                setTransactionToAnnul(null);
              }}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handlePasswordSubmit}
              disabled={!adminPassword}
            >
              <XCircle className="size-4 mr-2" />
              Anular Venta
            </Button>
          </DialogFooter>
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