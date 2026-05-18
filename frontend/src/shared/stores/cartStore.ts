import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CartItem, CartStore, Producto } from '../types';

/**
 * Genera una clave compuesta única e identificable para un ítem del carrito
 * basada en el producto y sus ingredientes excluidos de forma ordenada.
 */
const getCartItemKey = (productoId: number, exclusiones: number[]): string => {
  const sortedExclusions = [...exclusiones].sort((a, b) => a - b);
  return `${productoId}-${sortedExclusions.join(',')}`;
};

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (producto: Producto, cantidad: number, exclusiones: number[], exclusiones_nombres: string[]) => {
        // Regla RN-CR04: Validar eager que solo se excluyan ingredientes reales del plato
        const validExclusiones = exclusiones.filter(id =>
          producto.ingredientes.some(ing => ing.id === id)
        );

        // Generar clave compuesta
        const key = getCartItemKey(producto.id, validExclusiones);

        set((state) => {
          const existingIndex = state.items.findIndex(item => item.cart_item_key === key);

          if (existingIndex > -1) {
            // Regla RN-CR03: Si es idéntico (misma clave), incrementa la cantidad
            const newItems = [...state.items];
            newItems[existingIndex].cantidad += cantidad;
            return { items: newItems };
          } else {
            // Regla RN-CR05: Crear una nueva línea de item con su respectivo snapshot
            const newItem: CartItem = {
              cart_item_key: key,
              producto_id: producto.id,
              nombre: producto.nombre,
              precio: Number(producto.precio), // Convertir a número para evitar problemas con Decimal (string) de la API
              cantidad: cantidad,
              imagen_url: producto.imagen_url,
              exclusiones: validExclusiones,
              exclusiones_nombres: exclusiones_nombres,
            };
            return { items: [...state.items, newItem] };
          }
        });
      },

      updateQuantity: (cartItemKey: string, cantidad: number) => {
        set((state) => {
          // Forzar que la cantidad mínima permitida sea 1
          const safeCantidad = Math.max(1, cantidad);

          return {
            items: state.items.map(item =>
              item.cart_item_key === cartItemKey
                ? { ...item, cantidad: safeCantidad }
                : item
            )
          };
        });
      },

      removeItem: (cartItemKey: string) => {
        set((state) => ({
          items: state.items.filter(item => item.cart_item_key !== cartItemKey)
        }));
      },

      clearCart: () => {
        set({ items: [] });
      },

      // Métodos y selectores derivados reactivos
      getSubtotal: (item: CartItem) => {
        return Number((Number(item.precio) * item.cantidad).toFixed(2));
      },

      getTotalItems: () => {
        const { items } = get();
        return items.reduce((acc, item) => acc + item.cantidad, 0);
      },

      getTotalPrice: () => {
        const { items } = get();
        const rawTotal = items.reduce((acc, item) => acc + (Number(item.precio) * item.cantidad), 0);
        return Number(rawTotal.toFixed(2));
      },
    }),
    {
      name: 'foodstore-cart',
    }
  )
);
