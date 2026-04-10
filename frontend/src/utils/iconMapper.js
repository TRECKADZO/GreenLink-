import {
  ShoppingBag,
  Building2,
  Sparkles,
  Award,
  GitCompare,
  MessageSquare,
  BarChart3,
  UserPlus,
  ImagePlus,
  TrendingUp,
  TreePine,
  Leaf,
  FileText,
  Shield,
  Smartphone,
  Wallet,
  Package,
  Wheat,
  AlertTriangle
} from 'lucide-react';

export const iconMap = {
  ShoppingBag,
  Building2,
  Sparkles,
  Award,
  GitCompare,
  MessageSquare,
  BarChart3,
  UserPlus,
  ImagePlus,
  TrendingUp,
  TreePine,
  Leaf,
  FileText,
  Shield,
  Smartphone,
  Wallet,
  Package,
  Wheat,
  AlertTriangle
};

export const getIconComponent = (iconName) => {
  return iconMap[iconName] || ShoppingBag;
};