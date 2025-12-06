// =====================================================
// DEPRECATED: Halaman ini sudah tidak digunakan
// =====================================================
// Transfer inventaris sekarang dilakukan dari modul Inventaris
// Path: /inventaris/transfer
// =====================================================

import { Navigate } from 'react-router-dom';

export default function TransferInventarisPage() {
  // Redirect ke halaman transfer di modul inventaris
  return <Navigate to="/inventaris/transfer" replace />;
}
