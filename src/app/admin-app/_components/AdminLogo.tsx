'use client';

import Link from 'next/link';

type AdminLogoTone = 'onLight' | 'onBrand';

export default function AdminLogo({ tone = 'onBrand' }: { tone?: AdminLogoTone }) {
  return (
    <Link
      href="/admin-app"
      className="admin-app-logo-link"
      aria-label="Wecare Admin"
      title="Wecare Admin"
    >
      <img
        src="/Logo-Wecare.png"
        alt="Wecare"
        className={`admin-app-logo ${tone === 'onBrand' ? 'admin-app-logo--on-brand' : ''}`}
        loading="eager"
        decoding="async"
      />
    </Link>
  );
}

