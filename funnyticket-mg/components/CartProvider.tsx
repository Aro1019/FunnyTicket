'use client'

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'

export interface CartItem {
  packId: string
  packName: string
  price: number
  durationHours: number
  quantity: number
}

/**
 * Compute the max total tickets allowed based on what's in the cart.
 *
 * Rules (by price):
 *  - Pack 1 000 Ar seul          → max 4
 *  - Pack 5 000 / 20 000 Ar seul → max 2
 *  - Combiné (mix de packs)      → max 3
 */
export function getCartLimit(items: CartItem[]): { max: number; rule: string } {
  if (items.length === 0) return { max: 4, rule: '' }

  const prices = new Set(items.map((i) => i.price))
  const has1000 = prices.has(1000)
  const hasHigher = [...prices].some((p) => p > 1000)

  if (has1000 && !hasHigher) {
    return { max: 4, rule: 'Pack 1 000 Ar uniquement : 4 tickets max.' }
  }
  if (!has1000 && hasHigher) {
    return { max: 2, rule: 'Packs 5 000 / 20 000 Ar : 2 tickets max.' }
  }
  // Mixed
  return { max: 3, rule: 'Combiné (packs différents) : 3 tickets max.' }
}

/** Check whether adding a specific item would exceed the limit */
export function canAddToCart(
  currentItems: CartItem[],
  itemPrice: number
): { allowed: boolean; max: number; rule: string } {
  const totalNow = currentItems.reduce((s, i) => s + i.quantity, 0)

  // Simulate what the cart would look like after adding
  const exists = currentItems.some((i) => i.price === itemPrice)
  const simulated = exists
    ? currentItems
    : [...currentItems, { packId: '', packName: '', price: itemPrice, durationHours: 0, quantity: 0 }]

  const { max, rule } = getCartLimit(simulated)

  return { allowed: totalNow < max, max, rule }
}

interface CartContextType {
  items: CartItem[]
  addItem: (item: Omit<CartItem, 'quantity'>) => string | null
  removeItem: (packId: string) => void
  updateQuantity: (packId: string, quantity: number) => string | null
  clearCart: () => void
  totalItems: number
  totalPrice: number
  cartLimit: { max: number; rule: string }
}

const CartContext = createContext<CartContextType>({
  items: [],
  addItem: () => null,
  removeItem: () => {},
  updateQuantity: () => null,
  clearCart: () => {},
  totalItems: 0,
  totalPrice: 0,
  cartLimit: { max: 4, rule: '' },
})

export function useCart() {
  return useContext(CartContext)
}

const CART_KEY = 'funnyticket-cart'

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(CART_KEY)
      if (stored) {
        setItems(JSON.parse(stored))
      }
    } catch {
      // ignore corrupted data
    }
    setMounted(true)
  }, [])

  useEffect(() => {
    if (mounted) {
      localStorage.setItem(CART_KEY, JSON.stringify(items))
    }
  }, [items, mounted])

  const addItem = useCallback((item: Omit<CartItem, 'quantity'>): string | null => {
    let warning: string | null = null
    setItems((prev) => {
      const { allowed, max, rule } = canAddToCart(prev, item.price)
      if (!allowed) {
        warning = `Limite atteinte (${max} tickets max). ${rule}`
        return prev
      }
      const existing = prev.find((i) => i.packId === item.packId)
      if (existing) {
        return prev.map((i) =>
          i.packId === item.packId ? { ...i, quantity: i.quantity + 1 } : i
        )
      }
      return [...prev, { ...item, quantity: 1 }]
    })
    return warning
  }, [])

  const removeItem = useCallback((packId: string) => {
    setItems((prev) => prev.filter((i) => i.packId !== packId))
  }, [])

  const updateQuantity = useCallback((packId: string, quantity: number): string | null => {
    if (quantity <= 0) {
      setItems((prev) => prev.filter((i) => i.packId !== packId))
      return null
    }
    let warning: string | null = null
    setItems((prev) => {
      const item = prev.find((i) => i.packId === packId)
      if (!item) return prev
      const diff = quantity - item.quantity
      if (diff > 0) {
        // Check limit before increasing
        const totalNow = prev.reduce((s, i) => s + i.quantity, 0)
        const { max, rule } = getCartLimit(prev)
        if (totalNow + diff > max) {
          warning = `Limite atteinte (${max} tickets max). ${rule}`
          return prev
        }
      }
      return prev.map((i) => (i.packId === packId ? { ...i, quantity } : i))
    })
    return warning
  }, [])

  const clearCart = useCallback(() => {
    setItems([])
  }, [])

  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0)
  const totalPrice = items.reduce((sum, i) => sum + i.price * i.quantity, 0)
  const cartLimit = getCartLimit(items)

  return (
    <CartContext.Provider
      value={{ items, addItem, removeItem, updateQuantity, clearCart, totalItems, totalPrice, cartLimit }}
    >
      {children}
    </CartContext.Provider>
  )
}
