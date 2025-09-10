import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout/Layout';
import Dashboard from './pages/Dashboard';
import Properties from './pages/Properties';
import Inspection from './pages/Inspection';
import Reports from './pages/Reports';
import PropertyDetail from './pages/PropertyDetail';
import CompareInspections from './pages/CompareInspections';
import Profile from './pages/Profile';
import Subscription from './pages/Subscription';
import LandingPage from './pages/LandingPage';
import Login from './pages/Login';
import Signup from './pages/Signup';
import ResetPassword from './pages/ResetPassword';
import ProtectedRoute from './components/common/ProtectedRoute';
import ToastContainer from './components/common/ToastContainer';

const AppLayout = () => <Layout />;

function App() {
  return (
    <>
      <Router>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          
          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/properties" element={<Properties />} />
              <Route path="/property/:id" element={<PropertyDetail />} />
              <Route path="/inspection" element={<Inspection />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/profile/:section" element={<Profile />} />
              <Route path="/subscription" element={<Subscription />} />
              <Route path="/compare/:entryInspectionId/:exitInspectionId" element={<CompareInspections />} />
            </Route>
          </Route>
        </Routes>
      </Router>
      <ToastContainer />
    </>
  );
}

export default App;
