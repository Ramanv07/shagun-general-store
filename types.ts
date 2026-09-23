
export enum UserRole {
  USER = 'user',
  ADMIN = 'admin'
}

export interface User {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
  addresses?: Address[];
  token?: string;
}

export interface Product {
  _id: string;
  name: string;
  price: number;
  category: string;
  stock: number;
  description: string;
  image: string;
  rating?: number;
  reviews?: number;
  isBestseller?: boolean;
}

export interface CartItem extends Product {
  quantity: number;
}

export enum OrderStatus {
  PROCESSING = 'Processing',
  PACKED = 'Packed',
  OUT_FOR_DELIVERY = 'Out for Delivery',
  DELIVERED = 'Delivered',
  CANCELLED = 'Cancelled'
}

export interface Order {
  _id: string;
  user: User;
  items: CartItem[];
  totalAmount: number;
  shippingAddress: Address;
  paymentMethod?: string;
  paymentStatus?: string;
  status: OrderStatus;
  createdAt: string;
}

export interface Address {
  _id?: string;
  fullName: string;
  mobile: string;
  houseNo: string;
  street: string;
  city: string;
  state: string;
  pinCode: string;
  isDefault?: boolean;
}


export interface Review {
  id: string;
  user: string;
  rating: number;
  comment: string;
  date: string;
}
