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
  TrendingUp
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
  TrendingUp
};

export const getIconComponent = (iconName) => {
  return iconMap[iconName] || ShoppingBag;
};