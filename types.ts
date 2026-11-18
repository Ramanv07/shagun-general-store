
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
  isTester?: boolean;
  addresses?: Address[];
  token?: string;
}

export interface Product {
  _id: string;
  name: string;
  price: number;
  mrp?: number;
  category: string;
  stock: number;
  description: string;
  image: string;
  images?: string[];
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
  orderNumber?: string;
  user: User;
  items: CartItem[];
  totalAmount: number;
  shippingAddress: Address;
  paymentMethod?: string;
  paymentStatus?: string;
  status: OrderStatus;
  isTestOrder?: boolean;
  createdAt: string;
  upiTxnRef?: string;
  upiUtr?: string;
  upiUtrAttempts?: number;
  paymentExpiresAt?: string;
  paidAt?: string;
  rejectionReason?: string;
  upiIntent?: {
    upiUri: string;
    pa: string;
    pn: string;
    am: string;
    tr: string;
    expiresAt: string;
  };
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

export enum RentalStatus {
  BOOKED = 'Booked',
  ACTIVE = 'Active',
  RETURNED = 'Returned',
  CANCELLED = 'Cancelled'
}

export interface RentalBooking {
  _id: string;
  lehenga: string | Product;
  lehengaName: string;
  lehengaImage?: string;
  user?: string | User;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  startDate: string;
  returnDate: string;
  actualReturnDate?: string;
  rentalPrice: number;
  securityDeposit: number;
  totalAmount: number;
  status: RentalStatus | string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ActiveRentalInfo {
  isBooked: boolean;
  rentalId: string;
  customerName: string;
  startDate: string;
  returnDate: string;
  availableFrom: string;
  status: string;
}

export interface CategorySectionItem {
  _id?: string;
  name: string;
  slug: string;
  image: string;
  localImage?: string;
  link: string;
  bgColor?: string;
  badge?: string;
  order?: number;
}

export interface CategorySectionGroup {
  _id: string;
  sectionTitle: string;
  sectionSubtitle?: string;
  order: number;
  items: CategorySectionItem[];
}

