import { useState, useEffect } from 'react';
import { Service, Product, MiscItem } from '../App';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Plus, Edit, Scissors, Package, Trash2, Sparkles, Box, TrendingUp } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { formatGuaranies } from '../utils/currency';
import { ConfirmModal } from './ConfirmModal';
import { 
  getServices, 
  getProducts, 
  addService, 
  updateService, 
  deleteService,
  addProduct,
  updateProduct,
  deleteProduct,
  getMiscItems,
  addMiscItem,
  updateMiscItem,
  deleteMiscItem
} from '../utils/database';

export function InventoryModule() {
  const [services, setServices] = useState<Service[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [miscItems, setMiscItems] = useState<MiscItem[]>([]);
  const [isServiceDialogOpen, setIsServiceDialogOpen] = useState(false);
  const [isProductDialogOpen, setIsProductDialogOpen] = useState(false);
  const [isMiscItemDialogOpen, setIsMiscItemDialogOpen] = useState(false);
  const [isStockDialogOpen, setIsStockDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editingMiscItem, setEditingMiscItem] = useState<MiscItem | null>(null);

  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmModalProps, setConfirmModalProps] = useState({
    title: '',
    description: '',
    type: 'info' as 'success' | 'error' | 'warning' | 'info',
  });

  const [serviceForm, setServiceForm] = useState({
    name: '',
    price: '',
    duration: '',
    commission: '',
  });

  const [productForm, setProductForm] = useState({
    name: '',
    price: '',
    stock: '',
    minStock: '',
    category: '',
  });

  const [miscItemForm, setMiscItemForm] = useState({
    name: '',
    price: '',
    stock: '',
    minStock: '',
  });

  const [stockForm, setStockForm] = useState({
    itemType: 'producto' as 'producto' | 'articulo',
    itemId: '',
    quantity: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [loadedServices, loadedProducts, loadedMiscItems] = await Promise.all([
        getServices(),
        getProducts(),
        getMiscItems(),
      ]);
      setServices(loadedServices);
      setProducts(loadedProducts);
      setMiscItems(loadedMiscItems);
    } catch (error) {
      console.error('Error al cargar datos:', error);
    }
  };

  // Funciones para Aumentar Stock
  const handleStockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stockForm.itemId || !stockForm.quantity) {
      setConfirmModalProps({
        title: 'Datos Incompletos',
        description: 'Por favor seleccione un item y la cantidad a agregar',
        type: 'warning',
      });
      setShowConfirmModal(true);
      return;
    }

    const quantity = parseInt(stockForm.quantity);
    if (quantity <= 0) {
      setConfirmModalProps({
        title: 'Cantidad Inválida',
        description: 'La cantidad debe ser mayor a 0',
        type: 'warning',
      });
      setShowConfirmModal(true);
      return;
    }

    try {
      if (stockForm.itemType === 'producto') {
        const product = products.find(p => p.id === stockForm.itemId);
        if (product) {
          const updatedProduct = {
            ...product,
            stock: product.stock + quantity,
          };
          await updateProduct(updatedProduct);
          setConfirmModalProps({
            title: '¡Stock Actualizado!',
            description: `Se agregaron ${quantity} unidades de "${product.name}". Stock actual: ${updatedProduct.stock}`,
            type: 'success',
          });
        }
      } else {
        const miscItem = miscItems.find(m => m.id === stockForm.itemId);
        if (miscItem) {
          const updatedMiscItem = {
            ...miscItem,
            stock: miscItem.stock + quantity,
          };
          await updateMiscItem(updatedMiscItem);
          setConfirmModalProps({
            title: '¡Stock Actualizado!',
            description: `Se agregaron ${quantity} unidades de "${miscItem.name}". Stock actual: ${updatedMiscItem.stock}`,
            type: 'success',
          });
        }
      }

      await loadData();
      resetStockForm();
      setShowConfirmModal(true);
    } catch (error) {
      console.error('Error al actualizar stock:', error);
      setConfirmModalProps({
        title: 'Error',
        description: 'No se pudo actualizar el stock',
        type: 'error',
      });
      setShowConfirmModal(true);
    }
  };

  const resetStockForm = () => {
    setStockForm({ itemType: 'producto', itemId: '', quantity: '' });
    setIsStockDialogOpen(false);
  };

  // Funciones para Servicios
  const handleServiceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!serviceForm.name || !serviceForm.price || !serviceForm.duration || !serviceForm.commission) {
      setConfirmModalProps({
        title: 'Datos Incompletos',
        description: 'Por favor complete todos los campos',
        type: 'warning',
      });
      setShowConfirmModal(true);
      return;
    }

    try {
      if (editingService) {
        const updatedService = {
          ...editingService,
          name: serviceForm.name,
          price: parseFloat(serviceForm.price.replace(/\./g, '')),
          duration: parseInt(serviceForm.duration),
          commission: parseFloat(serviceForm.commission),
        };
        await updateService(updatedService);
        setConfirmModalProps({
          title: '¡Servicio Actualizado!',
          description: `El servicio "${serviceForm.name}" ha sido actualizado exitosamente`,
          type: 'success',
        });
      } else {
        const newService: Service = {
          id: `S${Date.now()}`,
          name: serviceForm.name,
          price: parseFloat(serviceForm.price.replace(/\./g, '')),
          duration: parseInt(serviceForm.duration),
          commission: parseFloat(serviceForm.commission),
        };
        await addService(newService);
        setConfirmModalProps({
          title: '¡Servicio Agregado!',
          description: `El servicio "${serviceForm.name}" ha sido agregado exitosamente`,
          type: 'success',
        });
      }

      await loadData();
      resetServiceForm();
      setShowConfirmModal(true);
    } catch (error) {
      console.error('Error al guardar servicio:', error);
      setConfirmModalProps({
        title: 'Error',
        description: 'No se pudo guardar el servicio',
        type: 'error',
      });
      setShowConfirmModal(true);
    }
  };

  const resetServiceForm = () => {
    setServiceForm({ name: '', price: '', duration: '', commission: '' });
    setEditingService(null);
    setIsServiceDialogOpen(false);
  };

  const handleEditService = (service: Service) => {
    setEditingService(service);
    setServiceForm({
      name: service.name,
      price: formatGuaranies(service.price),
      duration: service.duration.toString(),
      commission: service.commission.toString(),
    });
    setIsServiceDialogOpen(true);
  };

  const handleDeleteService = async (service: Service) => {
    try {
      await deleteService(service.id);
      await loadData();
      setConfirmModalProps({
        title: 'Servicio Eliminado',
        description: `El servicio "${service.name}" ha sido eliminado`,
        type: 'info',
      });
      setShowConfirmModal(true);
    } catch (error) {
      console.error('Error al eliminar servicio:', error);
      setConfirmModalProps({
        title: 'Error',
        description: 'No se pudo eliminar el servicio',
        type: 'error',
      });
      setShowConfirmModal(true);
    }
  };

  const handleServicePriceChange = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers === '') {
      setServiceForm({ ...serviceForm, price: '' });
      return;
    }
    const formatted = formatGuaranies(parseInt(numbers));
    setServiceForm({ ...serviceForm, price: formatted });
  };

  // Funciones para Productos
  const handleProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!productForm.name || !productForm.price || !productForm.stock || !productForm.minStock || !productForm.category) {
      setConfirmModalProps({
        title: 'Datos Incompletos',
        description: 'Por favor complete todos los campos',
        type: 'warning',
      });
      setShowConfirmModal(true);
      return;
    }

    try {
      if (editingProduct) {
        const updatedProduct = {
          ...editingProduct,
          name: productForm.name,
          price: parseFloat(productForm.price.replace(/\./g, '')),
          stock: parseInt(productForm.stock),
          minStock: parseInt(productForm.minStock),
          category: productForm.category,
        };
        await updateProduct(updatedProduct);
        setConfirmModalProps({
          title: '¡Producto Actualizado!',
          description: `El producto "${productForm.name}" ha sido actualizado exitosamente`,
          type: 'success',
        });
      } else {
        const newProduct: Product = {
          id: `P${Date.now()}`,
          name: productForm.name,
          price: parseFloat(productForm.price.replace(/\./g, '')),
          stock: parseInt(productForm.stock),
          minStock: parseInt(productForm.minStock),
          category: productForm.category,
        };
        await addProduct(newProduct);
        setConfirmModalProps({
          title: '¡Producto Agregado!',
          description: `El producto "${productForm.name}" ha sido agregado exitosamente`,
          type: 'success',
        });
      }

      await loadData();
      resetProductForm();
      setShowConfirmModal(true);
    } catch (error) {
      console.error('Error al guardar producto:', error);
      setConfirmModalProps({
        title: 'Error',
        description: 'No se pudo guardar el producto',
        type: 'error',
      });
      setShowConfirmModal(true);
    }
  };

  const resetProductForm = () => {
    setProductForm({ name: '', price: '', stock: '', minStock: '', category: '' });
    setEditingProduct(null);
    setIsProductDialogOpen(false);
  };

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
    setProductForm({
      name: product.name,
      price: formatGuaranies(product.price),
      stock: product.stock.toString(),
      minStock: product.minStock.toString(),
      category: product.category,
    });
    setIsProductDialogOpen(true);
  };

  const handleDeleteProduct = async (product: Product) => {
    try {
      await deleteProduct(product.id);
      await loadData();
      setConfirmModalProps({
        title: 'Producto Eliminado',
        description: `El producto "${product.name}" ha sido eliminado`,
        type: 'info',
      });
      setShowConfirmModal(true);
    } catch (error) {
      console.error('Error al eliminar producto:', error);
      setConfirmModalProps({
        title: 'Error',
        description: 'No se pudo eliminar el producto',
        type: 'error',
      });
      setShowConfirmModal(true);
    }
  };

  const handleProductPriceChange = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers === '') {
      setProductForm({ ...productForm, price: '' });
      return;
    }
    const formatted = formatGuaranies(parseInt(numbers));
    setProductForm({ ...productForm, price: formatted });
  };

  // Funciones para Artículos Misceláneos
  const handleMiscItemSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!miscItemForm.name || !miscItemForm.price || !miscItemForm.stock || !miscItemForm.minStock) {
      setConfirmModalProps({
        title: 'Datos Incompletos',
        description: 'Por favor complete todos los campos',
        type: 'warning',
      });
      setShowConfirmModal(true);
      return;
    }

    try {
      if (editingMiscItem) {
        const updatedMiscItem = {
          ...editingMiscItem,
          name: miscItemForm.name,
          price: parseFloat(miscItemForm.price.replace(/\./g, '')),
          stock: parseInt(miscItemForm.stock),
          minStock: parseInt(miscItemForm.minStock),
        };
        await updateMiscItem(updatedMiscItem);
        setConfirmModalProps({
          title: '¡Artículo Actualizado!',
          description: `El artículo "${miscItemForm.name}" ha sido actualizado exitosamente`,
          type: 'success',
        });
      } else {
        const newMiscItem: MiscItem = {
          id: `M${Date.now()}`,
          name: miscItemForm.name,
          price: parseFloat(miscItemForm.price.replace(/\./g, '')),
          stock: parseInt(miscItemForm.stock),
          minStock: parseInt(miscItemForm.minStock),
        };
        await addMiscItem(newMiscItem);
        setConfirmModalProps({
          title: '¡Artículo Agregado!',
          description: `El artículo "${miscItemForm.name}" ha sido agregado exitosamente`,
          type: 'success',
        });
      }

      await loadData();
      resetMiscItemForm();
      setShowConfirmModal(true);
    } catch (error) {
      console.error('Error al guardar artículo:', error);
      setConfirmModalProps({
        title: 'Error',
        description: 'No se pudo guardar el artículo',
        type: 'error',
      });
      setShowConfirmModal(true);
    }
  };

  const resetMiscItemForm = () => {
    setMiscItemForm({ name: '', price: '', stock: '', minStock: '' });
    setEditingMiscItem(null);
    setIsMiscItemDialogOpen(false);
  };

  const handleEditMiscItem = (miscItem: MiscItem) => {
    setEditingMiscItem(miscItem);
    setMiscItemForm({
      name: miscItem.name,
      price: formatGuaranies(miscItem.price),
      stock: miscItem.stock.toString(),
      minStock: miscItem.minStock.toString(),
    });
    setIsMiscItemDialogOpen(true);
  };

  const handleDeleteMiscItem = async (miscItem: MiscItem) => {
    try {
      await deleteMiscItem(miscItem.id);
      await loadData();
      setConfirmModalProps({
        title: 'Artículo Eliminado',
        description: `El artículo "${miscItem.name}" ha sido eliminado`,
        type: 'info',
      });
      setShowConfirmModal(true);
    } catch (error) {
      console.error('Error al eliminar artículo:', error);
      setConfirmModalProps({
        title: 'Error',
        description: 'No se pudo eliminar el artículo',
        type: 'error',
      });
      setShowConfirmModal(true);
    }
  };

  const handleMiscItemPriceChange = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers === '') {
      setMiscItemForm({ ...miscItemForm, price: '' });
      return;
    }
    const formatted = formatGuaranies(parseInt(numbers));
    setMiscItemForm({ ...miscItemForm, price: formatted });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <Box className="size-8 text-green-600 dark:text-green-400" />
        <div>
          <h2 className="text-2xl text-foreground">Gestión de Inventario</h2>
          <p className="text-muted-foreground">Administra servicios, productos y artículos del salón</p>
        </div>
      </div>

      <Tabs defaultValue="services" className="w-full">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 max-w-full sm:max-w-3xl h-auto gap-1">
          <TabsTrigger value="services" className="text-xs md:text-sm py-2">
            <Scissors className="size-3 md:size-4 mr-1 md:mr-2" />
            <span className="hidden sm:inline">Servicios</span>
            <span className="inline sm:hidden">Serv.</span>
          </TabsTrigger>
          <TabsTrigger value="products" className="text-xs md:text-sm py-2">
            <Package className="size-3 md:size-4 mr-1 md:mr-2" />
            <span className="hidden sm:inline">Productos</span>
            <span className="inline sm:hidden">Prod.</span>
          </TabsTrigger>
          <TabsTrigger value="miscItems" className="text-xs md:text-sm py-2">
            <Sparkles className="size-3 md:size-4 mr-1 md:mr-2" />
            <span className="hidden sm:inline">Artículos</span>
            <span className="inline sm:hidden">Arts.</span>
          </TabsTrigger>
          <TabsTrigger value="stock" className="text-xs md:text-sm py-2">
            <TrendingUp className="size-3 md:size-4 mr-1 md:mr-2" />
            <span className="hidden sm:inline">Aumentar Stock</span>
            <span className="inline sm:hidden">Stock</span>
          </TabsTrigger>
        </TabsList>

        {/* TAB DE SERVICIOS */}
        <TabsContent value="services" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                <div>
                  <CardTitle className="text-lg md:text-xl">Servicios del Salón</CardTitle>
                  <p className="text-xs md:text-sm text-muted-foreground">{services.length} servicios registrados</p>
                </div>
                <Dialog open={isServiceDialogOpen} onOpenChange={(open) => {
                  setIsServiceDialogOpen(open);
                  if (!open) resetServiceForm();
                }}>
                  <DialogTrigger asChild>
                    <Button className="text-sm">
                      <Plus className="size-3 md:size-4 mr-2" />
                      Nuevo Servicio
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>
                        {editingService ? 'Editar Servicio' : 'Agregar Nuevo Servicio'}
                      </DialogTitle>
                      <DialogDescription>
                        Configura el nombre, precio, duración y comisión del servicio
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleServiceSubmit} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="serviceName">Nombre del Servicio</Label>
                        <Input
                          id="serviceName"
                          placeholder="Ej: Corte de Cabello"
                          value={serviceForm.name}
                          onChange={(e) => setServiceForm({ ...serviceForm, name: e.target.value })}
                          required
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="servicePrice">Precio (₲)</Label>
                          <Input
                            id="servicePrice"
                            type="text"
                            placeholder="50000"
                            value={serviceForm.price}
                            onChange={(e) => handleServicePriceChange(e.target.value)}
                            required
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="serviceDuration">Duración (min)</Label>
                          <Input
                            id="serviceDuration"
                            type="number"
                            min="5"
                            step="5"
                            placeholder="30"
                            value={serviceForm.duration}
                            onChange={(e) => setServiceForm({ ...serviceForm, duration: e.target.value })}
                            required
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="serviceCommission">Comisión del Estilista (%)</Label>
                        <Input
                          id="serviceCommission"
                          type="number"
                          step="1"
                          min="0"
                          max="100"
                          placeholder="40"
                          value={serviceForm.commission === '' ? '' : (parseFloat(serviceForm.commission) * 100).toString()}
                          onChange={(e) => setServiceForm({ ...serviceForm, commission: (parseFloat(e.target.value) / 100).toString() })}
                          required
                        />
                        <p className="text-sm text-muted-foreground">
                          Ingresa el porcentaje (ej: 40 para 40%)
                        </p>
                      </div>

                      <Button type="submit" className="w-full">
                        {editingService ? 'Actualizar Servicio' : 'Agregar Servicio'}
                      </Button>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {services.map((service) => (
                  <div key={service.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 md:p-4 bg-secondary/50 rounded-lg hover:bg-secondary transition-colors gap-2">
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm md:text-base truncate text-foreground">{service.name}</h4>
                      <div className="flex flex-wrap gap-2 md:gap-4 mt-1">
                        <p className="text-xs md:text-sm text-muted-foreground">₲ {formatGuaranies(service.price)}</p>
                        <p className="text-xs md:text-sm text-muted-foreground">{service.duration} min</p>
                        <p className="text-xs md:text-sm text-muted-foreground">
                          Comisión: {(service.commission * 100).toFixed(0)}%
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2 self-end sm:self-center">
                      <Button variant="ghost" size="sm" onClick={() => handleEditService(service)} className="h-8 w-8 p-0">
                        <Edit className="size-3 md:size-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDeleteService(service)} className="h-8 w-8 p-0">
                        <Trash2 className="size-3 md:size-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
                {services.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">No hay servicios registrados</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB DE PRODUCTOS */}
        <TabsContent value="products" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                <div>
                  <CardTitle className="text-lg md:text-xl">Productos del Salón</CardTitle>
                  <p className="text-xs md:text-sm text-muted-foreground">{products.length} productos registrados</p>
                </div>
                <Dialog open={isProductDialogOpen} onOpenChange={(open) => {
                  setIsProductDialogOpen(open);
                  if (!open) resetProductForm();
                }}>
                  <DialogTrigger asChild>
                    <Button className="text-sm">
                      <Plus className="size-3 md:size-4 mr-2" />
                      Nuevo Producto
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>
                        {editingProduct ? 'Editar Producto' : 'Agregar Nuevo Producto'}
                      </DialogTitle>
                      <DialogDescription>
                        Configura el nombre, precio, stock y categoría del producto
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleProductSubmit} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="productName">Nombre del Producto</Label>
                        <Input
                          id="productName"
                          placeholder="Ej: Shampoo Profesional"
                          value={productForm.name}
                          onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="productCategory">Categoría</Label>
                        <Input
                          id="productCategory"
                          placeholder="Ej: Cuidado Capilar"
                          value={productForm.category}
                          onChange={(e) => setProductForm({ ...productForm, category: e.target.value })}
                          required
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="productPrice">Precio (₲)</Label>
                          <Input
                            id="productPrice"
                            type="text"
                            placeholder="85000"
                            value={productForm.price}
                            onChange={(e) => handleProductPriceChange(e.target.value)}
                            required
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="productStock">Stock Inicial</Label>
                          <Input
                            id="productStock"
                            type="number"
                            min="0"
                            placeholder="20"
                            value={productForm.stock}
                            onChange={(e) => setProductForm({ ...productForm, stock: e.target.value })}
                            required
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="productMinStock">Stock Mínimo (Alerta)</Label>
                        <Input
                          id="productMinStock"
                          type="number"
                          min="0"
                          placeholder="5"
                          value={productForm.minStock}
                          onChange={(e) => setProductForm({ ...productForm, minStock: e.target.value })}
                          required
                        />
                        <p className="text-sm text-muted-foreground">
                          Se te alertará cuando el stock llegue a este nivel
                        </p>
                      </div>

                      <Button type="submit" className="w-full">
                        {editingProduct ? 'Actualizar Producto' : 'Agregar Producto'}
                      </Button>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {products.map((product) => (
                  <div key={product.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 md:p-4 bg-secondary/50 rounded-lg hover:bg-secondary transition-colors gap-2">
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm md:text-base truncate text-foreground">{product.name}</h4>
                      <div className="flex flex-wrap gap-2 md:gap-4 mt-1">
                        <p className="text-xs md:text-sm text-muted-foreground">₲ {formatGuaranies(product.price)}</p>
                        <p className={`text-xs md:text-sm ${product.stock <= product.minStock ? 'text-destructive font-semibold' : 'text-muted-foreground'}`}>
                          Stock: {product.stock} unidades
                        </p>
                        <p className="text-xs md:text-sm text-muted-foreground">{product.category}</p>
                      </div>
                    </div>
                    <div className="flex gap-2 self-end sm:self-center">
                      <Button variant="ghost" size="sm" onClick={() => handleEditProduct(product)} className="h-8 w-8 p-0">
                        <Edit className="size-3 md:size-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDeleteProduct(product)} className="h-8 w-8 p-0">
                        <Trash2 className="size-3 md:size-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
                {products.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">No hay productos registrados</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB DE ARTÍCULOS MISCELÁNEOS */}
        <TabsContent value="miscItems" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                <div>
                  <CardTitle className="text-lg md:text-xl">Artículos Varios</CardTitle>
                  <p className="text-xs md:text-sm text-muted-foreground">{miscItems.length} artículos registrados</p>
                </div>
                <Dialog open={isMiscItemDialogOpen} onOpenChange={(open) => {
                  setIsMiscItemDialogOpen(open);
                  if (!open) resetMiscItemForm();
                }}>
                  <DialogTrigger asChild>
                    <Button className="text-sm">
                      <Plus className="size-3 md:size-4 mr-2" />
                      Nuevo Artículo
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>
                        {editingMiscItem ? 'Editar Artículo' : 'Agregar Nuevo Artículo'}
                      </DialogTitle>
                      <DialogDescription>
                        Configura el nombre, precio y stock del artículo
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleMiscItemSubmit} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="miscItemName">Nombre del Artículo</Label>
                        <Input
                          id="miscItemName"
                          placeholder="Ej: Toalla"
                          value={miscItemForm.name}
                          onChange={(e) => setMiscItemForm({ ...miscItemForm, name: e.target.value })}
                          required
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="miscItemPrice">Precio (₲)</Label>
                          <Input
                            id="miscItemPrice"
                            type="text"
                            placeholder="15000"
                            value={miscItemForm.price}
                            onChange={(e) => handleMiscItemPriceChange(e.target.value)}
                            required
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="miscItemStock">Stock Inicial</Label>
                          <Input
                            id="miscItemStock"
                            type="number"
                            min="0"
                            placeholder="10"
                            value={miscItemForm.stock}
                            onChange={(e) => setMiscItemForm({ ...miscItemForm, stock: e.target.value })}
                            required
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="miscItemMinStock">Stock Mínimo (Alerta)</Label>
                        <Input
                          id="miscItemMinStock"
                          type="number"
                          min="0"
                          placeholder="3"
                          value={miscItemForm.minStock}
                          onChange={(e) => setMiscItemForm({ ...miscItemForm, minStock: e.target.value })}
                          required
                        />
                        <p className="text-sm text-muted-foreground">
                          Se te alertará cuando el stock llegue a este nivel
                        </p>
                      </div>

                      <Button type="submit" className="w-full">
                        {editingMiscItem ? 'Actualizar Artículo' : 'Agregar Artículo'}
                      </Button>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {miscItems.map((miscItem) => (
                  <div key={miscItem.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 md:p-4 bg-secondary/50 rounded-lg hover:bg-secondary transition-colors gap-2">
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm md:text-base truncate text-foreground">{miscItem.name}</h4>
                      <div className="flex flex-wrap gap-2 md:gap-4 mt-1">
                        <p className="text-xs md:text-sm text-muted-foreground">₲ {formatGuaranies(miscItem.price)}</p>
                        <p className={`text-xs md:text-sm ${miscItem.stock <= miscItem.minStock ? 'text-destructive font-semibold' : 'text-muted-foreground'}`}>
                          Stock: {miscItem.stock} unidades
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2 self-end sm:self-center">
                      <Button variant="ghost" size="sm" onClick={() => handleEditMiscItem(miscItem)} className="h-8 w-8 p-0">
                        <Edit className="size-3 md:size-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDeleteMiscItem(miscItem)} className="h-8 w-8 p-0">
                        <Trash2 className="size-3 md:size-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
                {miscItems.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">No hay artículos registrados</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB DE AUMENTAR STOCK */}
        <TabsContent value="stock" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <TrendingUp className="size-6 text-green-600 dark:text-green-400" />
                <div>
                  <CardTitle className="text-lg md:text-xl">Aumentar Stock</CardTitle>
                  <p className="text-xs md:text-sm text-muted-foreground">Incrementa el inventario de productos y artículos</p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleStockSubmit} className="space-y-6 max-w-2xl">
                <div className="space-y-2">
                  <Label htmlFor="itemType">Tipo de Item</Label>
                  <select
                    id="itemType"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    value={stockForm.itemType}
                    onChange={(e) => {
                      setStockForm({ ...stockForm, itemType: e.target.value as 'producto' | 'articulo', itemId: '' });
                    }}
                  >
                    <option value="producto">Producto</option>
                    <option value="articulo">Artículo Varios</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="itemId">Seleccionar {stockForm.itemType === 'producto' ? 'Producto' : 'Artículo'}</Label>
                  <select
                    id="itemId"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    value={stockForm.itemId}
                    onChange={(e) => setStockForm({ ...stockForm, itemId: e.target.value })}
                    required
                  >
                    <option value="">-- Seleccione un item --</option>
                    {stockForm.itemType === 'producto' ? (
                      products.map((product) => (
                        <option key={product.id} value={product.id}>
                          {product.name} (Stock actual: {product.stock})
                        </option>
                      ))
                    ) : (
                      miscItems.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name} (Stock actual: {item.stock})
                        </option>
                      ))
                    )}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="quantity">Cantidad a Agregar</Label>
                  <Input
                    id="quantity"
                    type="number"
                    min="1"
                    placeholder="Ej: 10"
                    value={stockForm.quantity}
                    onChange={(e) => setStockForm({ ...stockForm, quantity: e.target.value })}
                    required
                  />
                  <p className="text-sm text-muted-foreground">
                    Ingresa la cantidad de unidades que deseas agregar al inventario
                  </p>
                </div>

                {stockForm.itemId && (
                  <div className="p-4 bg-secondary/30 rounded-lg border border-border">
                    <h4 className="font-medium mb-2 text-foreground">Vista Previa</h4>
                    {stockForm.itemType === 'producto' ? (
                      (() => {
                        const product = products.find(p => p.id === stockForm.itemId);
                        return product ? (
                          <div className="space-y-1 text-sm">
                            <p className="text-muted-foreground">Producto: <span className="text-foreground font-medium">{product.name}</span></p>
                            <p className="text-muted-foreground">Stock actual: <span className="text-foreground font-medium">{product.stock} unidades</span></p>
                            {stockForm.quantity && (
                              <p className="text-green-600 dark:text-green-400 font-medium">
                                Nuevo stock: {product.stock + parseInt(stockForm.quantity)} unidades
                              </p>
                            )}
                          </div>
                        ) : null;
                      })()
                    ) : (
                      (() => {
                        const miscItem = miscItems.find(m => m.id === stockForm.itemId);
                        return miscItem ? (
                          <div className="space-y-1 text-sm">
                            <p className="text-muted-foreground">Artículo: <span className="text-foreground font-medium">{miscItem.name}</span></p>
                            <p className="text-muted-foreground">Stock actual: <span className="text-foreground font-medium">{miscItem.stock} unidades</span></p>
                            {stockForm.quantity && (
                              <p className="text-green-600 dark:text-green-400 font-medium">
                                Nuevo stock: {miscItem.stock + parseInt(stockForm.quantity)} unidades
                              </p>
                            )}
                          </div>
                        ) : null;
                      })()
                    )}
                  </div>
                )}

                <Button type="submit" className="w-full" size="lg">
                  <TrendingUp className="size-4 mr-2" />
                  Aumentar Stock
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

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
