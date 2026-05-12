import {
  Landmark, Briefcase, TrendingUp, Wallet, PiggyBank, Gift, DollarSign, Coins, Building2, CreditCard,
  UtensilsCrossed, Coffee, Pizza, Apple, Beer, Soup, Utensils,
  Car, Bike, Bus, Train, Plane, Fuel,
  Home, Zap, Wifi, Phone, Tv,
  ShoppingBag, ShoppingCart, Tag, Package,
  Heart, Stethoscope, Dumbbell, Baby,
  Music, Film, Gamepad2, Camera, Headphones, BookOpen,
  Dog, Shirt, Monitor, Smartphone, Watch, Globe, Star, MoreHorizontal,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export const ICON_LIST: { name: string; label: string; Icon: LucideIcon }[] = [
  { name: 'Landmark',       label: 'Bank',      Icon: Landmark },
  { name: 'Briefcase',      label: 'Work',      Icon: Briefcase },
  { name: 'TrendingUp',     label: 'Invest',    Icon: TrendingUp },
  { name: 'Wallet',         label: 'Wallet',    Icon: Wallet },
  { name: 'PiggyBank',      label: 'Savings',   Icon: PiggyBank },
  { name: 'Gift',           label: 'Gift',      Icon: Gift },
  { name: 'DollarSign',     label: 'Money',     Icon: DollarSign },
  { name: 'Coins',          label: 'Coins',     Icon: Coins },
  { name: 'Building2',      label: 'Office',    Icon: Building2 },
  { name: 'CreditCard',     label: 'Card',      Icon: CreditCard },
  { name: 'UtensilsCrossed',label: 'Food',      Icon: UtensilsCrossed },
  { name: 'Coffee',         label: 'Coffee',    Icon: Coffee },
  { name: 'Pizza',          label: 'Pizza',     Icon: Pizza },
  { name: 'Apple',          label: 'Fruit',     Icon: Apple },
  { name: 'Beer',           label: 'Drink',     Icon: Beer },
  { name: 'Soup',           label: 'Meal',      Icon: Soup },
  { name: 'Utensils',       label: 'Dining',    Icon: Utensils },
  { name: 'Car',            label: 'Car',       Icon: Car },
  { name: 'Bike',           label: 'Bike',      Icon: Bike },
  { name: 'Bus',            label: 'Bus',       Icon: Bus },
  { name: 'Train',          label: 'Train',     Icon: Train },
  { name: 'Plane',          label: 'Travel',    Icon: Plane },
  { name: 'Fuel',           label: 'Fuel',      Icon: Fuel },
  { name: 'Home',           label: 'Home',      Icon: Home },
  { name: 'Zap',            label: 'Electric',  Icon: Zap },
  { name: 'Wifi',           label: 'Internet',  Icon: Wifi },
  { name: 'Phone',          label: 'Phone',     Icon: Phone },
  { name: 'Tv',             label: 'TV',        Icon: Tv },
  { name: 'ShoppingBag',    label: 'Shopping',  Icon: ShoppingBag },
  { name: 'ShoppingCart',   label: 'Cart',      Icon: ShoppingCart },
  { name: 'Tag',            label: 'Tag',       Icon: Tag },
  { name: 'Package',        label: 'Package',   Icon: Package },
  { name: 'Heart',          label: 'Health',    Icon: Heart },
  { name: 'Stethoscope',    label: 'Doctor',    Icon: Stethoscope },
  { name: 'Dumbbell',       label: 'Gym',       Icon: Dumbbell },
  { name: 'Baby',           label: 'Baby',      Icon: Baby },
  { name: 'Music',          label: 'Music',     Icon: Music },
  { name: 'Film',           label: 'Movie',     Icon: Film },
  { name: 'Gamepad2',       label: 'Game',      Icon: Gamepad2 },
  { name: 'Camera',         label: 'Photo',     Icon: Camera },
  { name: 'Headphones',     label: 'Audio',     Icon: Headphones },
  { name: 'BookOpen',       label: 'Study',     Icon: BookOpen },
  { name: 'Dog',            label: 'Pet',       Icon: Dog },
  { name: 'Shirt',          label: 'Clothes',   Icon: Shirt },
  { name: 'Monitor',        label: 'Tech',      Icon: Monitor },
  { name: 'Smartphone',     label: 'Mobile',    Icon: Smartphone },
  { name: 'Watch',          label: 'Watch',     Icon: Watch },
  { name: 'Globe',          label: 'Travel',    Icon: Globe },
  { name: 'Star',           label: 'Star',      Icon: Star },
  { name: 'MoreHorizontal', label: 'Other',     Icon: MoreHorizontal },
]

export const ICON_REGISTRY: Record<string, LucideIcon> = Object.fromEntries(
  ICON_LIST.map(({ name, Icon }) => [name, Icon]),
)

export function getIcon(name: string | null | undefined): LucideIcon {
  if (name && ICON_REGISTRY[name]) return ICON_REGISTRY[name]
  return MoreHorizontal
}
