'use client';

import React from 'react';
import SalesOrderFormWrapper from './_components/SalesOrderFormWrapper';
import ToastManager from '../../components/ToastManager';

export default function AdminAppPage() {
  return (
    <>
      <ToastManager />
      <SalesOrderFormWrapper />
    </>
  );
}

