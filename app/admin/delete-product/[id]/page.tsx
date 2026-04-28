"use client";

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import ProtectedAdminRoute from '@/components/auth/protected-admin-route';
import SidebarNav from '../../sections/SideBarNav';
import { useSession } from 'next-auth/react';
import { Loader2, ArrowRight, AlertTriangle, Image as ImageIcon } from 'lucide-react';

interface Product {
  _id?: string;
  name: string;
  price: number;
  mainImage: string;
  description: string;
  stock: number;
  isActive: boolean;
}

const DeleteProductPage = () => {
  const router = useRouter();
  const params = useParams();
  const productId = params.id as string;
  const { data: session } = useSession();
  
  const [loading, setLoading] = useState<boolean>(true);
  const [deleting, setDeleting] = useState<boolean>(false);
  const [product, setProduct] = useState<Product | null>(null);
  const [confirmText, setConfirmText] = useState("");
  const [isNavigatingBack, setIsNavigatingBack] = useState(false);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/admin/products/${productId}`);
        
        if (response.ok) {
          const data = await response.json();
          setProduct(data.product);
        } else {
          toast.error('فشل في تحميل بيانات المنتج');
          router.push('/admin#products');
        }
      } catch (error) {
        console.error('Error fetching product:', error);
        toast.error('حدث خطأ أثناء تحميل بيانات المنتج');
        router.push('/admin#products');
      } finally {
        setLoading(false);
      }
    };

    if (productId) {
      fetchProduct();
    }
  }, [productId, router]);

  const handleBack = () => {
    setIsNavigatingBack(true);
    router.push('/admin#products');
  };

  const handleDeleteProduct = async () => {
    if (!product) return;
    setDeleting(true);
    
    try {
      const response = await fetch(`/api/admin/products/${productId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('تم حذف المنتج بنجاح!');
        router.push('/admin?refresh=true#products');
      } else {
        toast.error('فشل في حذف المنتج. يرجى المحاولة مرة أخرى.');
        setDeleting(false);
      }
    } catch (error) {
      console.error('Error deleting product:', error);
      toast.error('حدث خطأ أثناء حذف المنتج. يرجى المحاولة مرة أخرى.');
      setDeleting(false);
    }
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div className="max-w-2xl mx-auto flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin border-white mx-auto mb-4 text-white/50" />
            <p className="text-white/50">جاري تحميل بيانات المنتج...</p>
          </div>
        </div>
      );
    }

    if (!product) {
      return (
        <div className="max-w-2xl mx-auto flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <p className="text-red-400 mb-4">لم يتم العثور على المنتج</p>
            <Button
              onClick={handleBack}
              disabled={isNavigatingBack}
              className="bg-white text-black hover:bg-white/90"
            >
              {isNavigatingBack && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              العودة للمنتجات
            </Button>
          </div>
        </div>
      );
    }

    return (
      <div className="max-w-2xl mx-auto pt-4 md:pt-8">
        {/* Header Navigation */}
        <div className="flex items-center justify-between mb-6 border-b border-white/[0.06] pb-4">
          <h1 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
            حذف المنتج
          </h1>
          <button
            onClick={handleBack}
            disabled={isNavigatingBack}
            className="flex items-center gap-2 text-white/50 hover:text-white transition-colors text-sm disabled:opacity-50"
          >
            {isNavigatingBack ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ArrowRight className="w-4 h-4" />
            )}
            العودة للمنتجات
          </button>
        </div>

        {/* Warning Alert */}
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-6 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <h2 className="text-sm font-bold text-red-200 mb-1">لا يمكن التراجع عن هذا الإجراء!</h2>
            <p className="text-red-300/80 text-xs leading-relaxed">
              سيتم حذف هذا المنتج نهائياً من متجرك وإزالته من جميع الطلبات المرتبطة به.
            </p>
          </div>
        </div>

        {/* Product Compact Card */}
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4 items-center sm:items-start">
            <div className="relative w-24 h-24 rounded-md overflow-hidden border border-white/[0.08] bg-black/40 flex-shrink-0 flex items-center justify-center">
              {product.mainImage ? (
                <img
                  src={product.mainImage}
                  alt={product.name}
                  className="w-full h-full object-cover"
                  onError={(e) => { e.currentTarget.src = '/images/placeholder.png'; }}
                />
              ) : (
                <ImageIcon className="w-8 h-8 text-white/20" />
              )}
            </div>
            
            <div className="flex-1 w-full text-center sm:text-right">
              <h3 className="text-lg font-bold text-white mb-3 line-clamp-1">{product.name}</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-white/40 block text-xs mb-0.5">السعر</span>
                  <span className="text-white font-medium">{product.price.toLocaleString()} L.E</span>
                </div>
                <div>
                  <span className="text-white/40 block text-xs mb-0.5">المخزون</span>
                  <span className={`font-medium ${product.stock > 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {product.stock} وحدة
                  </span>
                </div>
                <div>
                  <span className="text-white/40 block text-xs mb-0.5">الحالة</span>
                  <span className={`font-medium ${product.isActive ? 'text-green-400' : 'text-red-400'}`}>
                    {product.isActive ? 'نشط' : 'غير نشط'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Confirmation Section */}
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-5">
          <div className="mb-4">
            <label htmlFor="confirmInput" className="block text-sm font-medium text-white/80 mb-2">
              لتأكيد الحذف، اكتب <span className="font-mono bg-white/10 px-1.5 py-0.5 rounded text-white select-all">{product.name}</span>
            </label>
            <Input
              type="text"
              id="confirmInput"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="اكتب اسم المنتج هنا..."
              className="w-full p-3 h-11 bg-black/20 border-white/[0.12] rounded-md text-white focus:border-white/[0.3] focus-visible:ring-0 focus-visible:ring-offset-0"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && e.currentTarget.value === product.name) {
                  handleDeleteProduct();
                }
              }}
            />
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <Button
              type="button"
              onClick={handleBack}
              disabled={isNavigatingBack || deleting}
              className="bg-transparent text-white hover:bg-white/[0.05] border-0"
              variant="ghost"
            >
              إلغاء
            </Button>
            
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  disabled={deleting || confirmText !== product.name}
                  className="bg-red-600/90 hover:bg-red-600 text-white disabled:bg-white/10 disabled:text-white/30"
                >
                  {deleting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      جاري الحذف...
                    </>
                  ) : (
                    'حذف نهائياً'
                  )}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="bg-stone-900 border border-white/[0.08] text-white" dir="rtl">
                <AlertDialogHeader>
                  <AlertDialogTitle>هل أنت متأكد تماماً؟</AlertDialogTitle>
                  <AlertDialogDescription className="text-white/60">
                    لا يمكن التراجع عن هذا الإجراء. سيتم حذف <span className="text-white font-medium">{product.name}</span> نهائياً.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="flex-row sm:justify-start gap-2">
                  <AlertDialogCancel className="bg-white/[0.05] hover:bg-white/[0.1] hover:text-white border-white/[0.12] text-white m-0">
                    إلغاء
                  </AlertDialogCancel>
                  <AlertDialogAction onClick={handleDeleteProduct} className="bg-red-600 text-white hover:bg-red-700 border-0 m-0">
                    حذف المنتج
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </div>
    );
  };

  return (
    <ProtectedAdminRoute>
      <div className="flex min-h-screen flex-col relative bg-stone-900">
        <SidebarNav
          activeSection="products"
          onSectionChange={() => router.push('/admin')}
          userName={session?.user?.name || "المدير"}
        />
        <main className="flex-1 p-4 md:p-8 pb-20 lg:pb-8 overflow-x-hidden relative z-10 md:mr-[220px]" dir="rtl">
          {renderContent()}
        </main>
      </div>
    </ProtectedAdminRoute>
  );
};

export default DeleteProductPage;
