'use client';

import { useState } from 'react';
import SalesOrderForm from './SalesOrderForm';
import SalesOrderBaoGiaForm from './SalesOrderBaoGiaForm';

type FormType = 'SO' | 'SOBG';

export default function SalesOrderFormWrapper() {
  const [activeForm, setActiveForm] = useState<FormType>('SO');

  return (
    <div className="admin-app-wrapper">
      {/* Header with Toggle and Version */}
      <div className="admin-app-header">
        <div className="admin-app-header-left">
          <div className="admin-app-title">Admin App</div>
          <div className="admin-app-subtitle">
            {activeForm === 'SO' ? 'Quản lý đơn hàng bán hàng' : 'Quản lý đơn hàng báo giá'}
          </div>
        </div>
        <div className="admin-app-header-right">
          <div className="admin-app-form-toggle">
            <button
              onClick={() => setActiveForm('SO')}
              className={`admin-app-toggle-btn ${activeForm === 'SO' ? 'admin-app-toggle-btn-active' : ''}`}
            >
              SO
            </button>
            <button
              onClick={() => setActiveForm('SOBG')}
              className={`admin-app-toggle-btn ${activeForm === 'SOBG' ? 'admin-app-toggle-btn-active' : ''}`}
            >
              SOBG
            </button>
          </div>
          <span className="admin-app-badge admin-app-badge-version">
            V0
          </span>
        </div>
      </div>

      {/* Render Active Form */}
      {activeForm === 'SO' ? <SalesOrderForm hideHeader /> : <SalesOrderBaoGiaForm hideHeader />}
    </div>
  );
}

