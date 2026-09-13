export type Product = {
  id: string
  name: string
  costPrice: number
  salePrice: number
  quantity: number
  createdAt: number
}

export type Sale = {
  id: string
  productId: string
  productName: string
  costPrice: number
  salePrice: number
  quantity: number
  createdAt: number
}

export type StoreState = {
  products: Product[]
  sales: Sale[]
}
