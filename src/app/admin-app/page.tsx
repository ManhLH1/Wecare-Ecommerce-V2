'use client';

import SalesOrderForm from './_components/SalesOrderForm';
import ToastManager from '../../components/ToastManager';

export default function AdminAppPage() {
  return (
    <>
      <ToastManager />
      <SalesOrderForm />
    </>
  );
}

