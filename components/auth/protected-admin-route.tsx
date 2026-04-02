"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface ProtectedAdminRouteProps {
  children: React.ReactNode;
  role?: 'admin' | 'manager' | 'viewer'; // RBAC enhancement
}

export default function ProtectedAdminRoute({ children, role = 'admin' }: ProtectedAdminRouteProps) {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    // Check if user is authenticated
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/admin/check-auth', { 
          signal: controller.signal 
        });
        const data = await response.json();
        
        const roleHierarchy = ['viewer', 'manager', 'admin'];

        // Strict RBAC top-down inheritance logic 
        if (
          data.authenticated &&
          roleHierarchy.indexOf(data.role) >= roleHierarchy.indexOf(role)
        ) {
          setIsAuthorized(true);
        } else {
          router.push('/admin/login');
        }
      } catch (error: any) {
        if (error.name !== 'AbortError') {
          router.push('/admin/login');
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsChecking(false);
        }
      }
    };

    checkAuth();

    return () => {
      controller.abort();
    };
  }, [router, role]);

  if (isChecking) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
      </div>
    );
  }

  if (!isAuthorized) {
    return null; // Will redirect to login
  }

  return <>{children}</>;
}