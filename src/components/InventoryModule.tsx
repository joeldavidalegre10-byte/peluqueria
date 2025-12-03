import { useState, useEffect } from 'react';
import { Product } from '../App';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Badge } from './ui/badge';
import { Plus, Edit, AlertTriangle, Package } from 'lucide-react';
import { Alert, AlertDescription } from './ui/alert';
import { formatGuaranies } from '../utils/currency';
import { ConfirmModal } from './ConfirmModal';
import { getProducts, addProduct, updateProduct } from '../utils/database';

const INITIAL_PRODUCTS: Product[] = [
  { id: 'P1', name: 'Shampoo Premium', price: 85000, stock: 25, minStock: 5, category: 'Cuidado Capilar' },
  { id: 'P2', name: 'Acondicionador', price: 75000, stock: 20, minStock: 5, category: 'Cuidado Capilar' },
  { id: 'P3', name: 'Mascarilla Reparadora', price: 95000, stock: 15, minStock: 3, category: 'Cuidado Capilar' },
  { id: 'P4', name: 'Spray Fijador', price: 60000, stock: 30, minStock: 8, category: 'Styling' },
  { id: 'P5', name: 'Aceite Capilar', price: 110000, stock: 12, minStock: 4, category: 'Cuidado Capilar' },
  { id: 'P6', name: 'Esmalte de Uñas', price: 35000, stock: 50, minStock: 10, category: 'Manicure' },
  { id: 'P7', name: 'Removedor de Esmalte', price: 25000, stock: 15, minStock: 5, category: 'Manicure' },
  { id: 'P8', name: 'Crema para Manos', price: 45000, stock: 20, minStock: 5, category: 'Cuidado de Piel' },
];

export function InventoryModule() {
  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddStockModal, setShowAddStockModal] = useState(false);
  const [productToAddStock, setProductToAddStock] = useState<Product | null>(null);
  const [stockToAdd, setStockToAdd] = useState('');
  
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmModalProps, setConfirmModalProps] = useState({
    title: '',
    description: '',
    type: 'info' as 'success' | 'error' | 'warning' | 'info',
  });

  const [formData, setFormData] = useState({
    name: '',
    price: '',
    stock: '',
    minStock: '',
    category: '',
  });

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      const loaded = await getProducts();
      if (loaded.length === 0) {
        // Si no hay productos, inicializar con los productos iniciales
        for (const product of INITIAL_PRODUCTS) {
          await addProduct(product);
        }
        setProducts(INITIAL_PRODUCTS);
      } else {
        setProducts(loaded);
      }
    } catch (error) {
      console.error('Error al cargar productos:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingProduct) {
        const updatedProduct: Product = {
          ...editingProduct,
          name: formData.name,
          price: parseFloat(formData.price.replace(/\./g, '')),
          stock: parseInt(formData.stock),
          minStock: parseInt(formData.minStock),
          category: formData.category,
        };
        await updateProduct(updatedProduct);
        setConfirmModalProps({
          title: '¡Producto Actualizado!',
          description: `El producto "${formData.name}" ha sido actualizado exitosamente`,
          type: 'success',
        });
      } else {
        const newProduct: Product = {
          id: `P${Date.now()}`,
          name: formData.name,
          price: parseFloat(formData.price.replace(/\./g, '')),
          stock: parseInt(formData.stock),
          minStock: parseInt(formData.minStock),
          category: formData.category,
        };
        await addProduct(newProduct);
        setConfirmModalProps({
          title: '¡Producto Agregado!',
          description: `El producto "${formData.name}" ha sido agregado exitosamente`,
          type: 'success',
        });
      }

      await loadProducts();
      resetForm();
      setShowConfirmModal(true);
    } catch (error) {
      console.error('Error al guardar producto:', error);
    }
  };

  const resetForm = () => {
    setFormData({ name: '', price: '', stock: '', minStock: '', category: '' });
    setEditingProduct(null);
    setIsDialogOpen(false);
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      price: formatGuaranies(product.price),
      stock: product.stock.toString(),
      minStock: product.minStock.toString(),
      category: product.category,
    });
    setIsDialogOpen(true);
  };

  const adjustStock = async (productId: string, adjustment: number) => {
    try {
      const product = products.find((p) => p.id === productId);
      if (product) {
        const updatedProduct = {
          ...product,
          stock: Math.max(0, product.stock + adjustment),
        };
        await updateProduct(updatedProduct);
        await loadProducts();
      }
    } catch (error) {
      console.error('Error al ajustar stock:', error);
    }
  };

  const handleOpenAddStockModal = (product: Product) => {
    setProductToAddStock(product);
    setStockToAdd('');
    setShowAddStockModal(true);
  };

  const handleAddStock = () => {
    if (productToAddStock && stockToAdd) {
      const qty = parseInt(stockToAdd);
      if (!isNaN(qty) && qty > 0) {
        adjustStock(productToAddStock.id, qty);
        setConfirmModalProps({
          title: '¡Stock Actualizado!',
          description: `Se agregaron ${qty} unidades de "${productToAddStock.name}"`,
          type: 'success',
        });
        setShowConfirmModal(true);
      }
      setShowAddStockModal(false);
      setProductToAddStock(null);
      setStockToAdd('');
    }
  };

  const handlePriceChange = (value: string) => {
    // Remover todo excepto números
    const numbers = value.replace(/\D/g, '');
    if (numbers === '') {
      setFormData({ ...formData, price: '' });
      return;
    }
    // Formatear con separador de miles
    const formatted = formatGuaranies(parseInt(numbers));
    setFormData({ ...formData, price: formatted });
  };

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const lowStockProducts = products.filter((p) => p.stock <= p.minStock);

  return (
    <div className="space-y-6">
      {/* Alertas de Stock Bajo */}
      {lowStockProducts.length > 0 && (
        <Alert className="bg-yellow-50 border-yellow-200">
          <AlertTriangle className="size-4 text-yellow-600" />
          <AlertDescription className="text-yellow-800">
            <strong>Alerta de Stock:</strong> {lowStockProducts.length} producto(s) con stock bajo o agotado.
          </AlertDescription>
        </Alert>
      )}

      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex-1 max-w-md">
          <Input
            placeholder="Buscar productos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="size-4 mr-2" />
              Nuevo Producto
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingProduct ? 'Editar Producto' : 'Agregar Nuevo Producto'}
              </DialogTitle>
              <DialogDescription>
                Completa la información del producto
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre del Producto</Label>
                <Input
                  id="name"
                  placeholder="Ej: Shampoo Premium"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="price">Precio (₲)</Label>
                  <Input
                    id="price"
                    placeholder="85.000"
                    value={formData.price}
                    onChange={(e) => handlePriceChange(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">Categoría</Label>
                  <Input
                    id="category"
                    placeholder="Ej: Cuidado Capilar"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="stock">Stock Actual</Label>
                  <Input
                    id="stock"
                    type="number"
                    min="0"
                    placeholder="25"
                    value={formData.stock}
                    onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="minStock">Stock Mínimo</Label>
                  <Input
                    id="minStock"
                    type="number"
                    min="0"
                    placeholder="5"
                    value={formData.minStock}
                    onChange={(e) => setFormData({ ...formData, minStock: e.target.value })}
                    required
                  />
                </div>
              </div>

              <Button type="submit" className="w-full">
                {editingProduct ? 'Actualizar Producto' : 'Agregar Producto'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Lista de Productos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredProducts.map((product) => (
          <Card key={product.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <CardTitle className="text-lg">{product.name}</CardTitle>
                  <p className="text-sm text-gray-500">{product.category}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleEdit(product)}
                >
                  <Edit className="size-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Precio:</span>
                <span className="text-lg text-green-600">₲ {formatGuaranies(product.price)}</span>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Stock:</span>
                  <div className="flex items-center gap-2">
                    <span className={product.stock <= product.minStock ? 'text-red-600' : ''}>
                      {product.stock} unidades
                    </span>
                    {product.stock <= product.minStock && (
                      <Badge variant="destructive">
                        <AlertTriangle className="size-3 mr-1" />
                        Bajo
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() => adjustStock(product.id, -1)}
                    disabled={product.stock === 0}
                  >
                    -1
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() => adjustStock(product.id, 1)}
                  >
                    +1
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() => handleOpenAddStockModal(product)}
                  >
                    +N
                  </Button>
                </div>
              </div>

              <div className="text-sm text-gray-500">
                Stock mínimo: {product.minStock}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredProducts.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            <Package className="size-12 mx-auto mb-4 text-gray-400" />
            <p>No se encontraron productos</p>
          </CardContent>
        </Card>
      )}

      {/* Modal para agregar stock */}
      <Dialog open={showAddStockModal} onOpenChange={setShowAddStockModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Agregar Stock</DialogTitle>
            <DialogDescription>
              {productToAddStock?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="stockQuantity">Cantidad a Agregar</Label>
              <Input
                id="stockQuantity"
                type="number"
                min="1"
                placeholder="Ej: 10"
                value={stockToAdd}
                onChange={(e) => setStockToAdd(e.target.value)}
                autoFocus
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowAddStockModal(false)}
              >
                Cancelar
              </Button>
              <Button
                className="flex-1"
                onClick={handleAddStock}
                disabled={!stockToAdd || parseInt(stockToAdd) <= 0}
              >
                Agregar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

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
