import ProtectedRoute from '../components/ProtectedRoute';
import { DashboardContent } from './dashboard';

export default function Profile() {
  return (
    <ProtectedRoute>
      <DashboardContent />
    </ProtectedRoute>
  );
}
