import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { Home } from './pages/Home';
import { MarketplacePage } from './pages/marketplace/MarketplacePage';
import { ProductDetailsPage } from './pages/marketplace/ProductDetailsPage';
import { ArtisanPublicProfilePage } from './pages/marketplace/ArtisanPublicProfilePage';
import { CustomerLogin } from './pages/customer/CustomerLogin';
import { CustomerRegister } from './pages/customer/CustomerRegister';
import { CustomerOrders } from './pages/customer/CustomerOrders';
import { CustomerProfile } from './pages/customer/CustomerProfile';
import { CustomerCart } from './pages/customer/CustomerCart';
import { CustomerMessages } from './pages/customer/CustomerMessages';
import { CustomRequestFormPage } from './pages/customer/CustomRequestFormPage';
import { CustomerCustomRequestsPage } from './pages/customer/CustomerCustomRequestsPage';
import { CheckoutConfirm } from './pages/customer/CheckoutConfirm';
import { PaymentDetails } from './pages/customer/PaymentDetails';
import { ArtisanRegistration } from './pages/ArtisanRegistration';
import { ArtisanDashboard } from './pages/ArtisanDashboard';
import { ArtisanMessages } from './pages/ArtisanMessages';
import { AddProduct } from './pages/AddProduct';
import { AddCraftChoice } from './pages/AddCraftChoice';
import { ProfessionalStudio } from './pages/ProfessionalStudio';
import { ProductPreview } from './pages/ProductPreview';
import { AdminDashboard } from './pages/AdminDashboard';
import { AdminLogin } from './pages/admin/AdminLogin';
import { ProtectedAdminRoute } from './components/admin/ProtectedAdminRoute';
import { ProtectedArtisanRoute } from './components/ProtectedArtisanRoute';
import { SupportedLanguage } from './types';

function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}

function AddProductRoute() {
  const { search } = useLocation();
  const isEditing = new URLSearchParams(search).get('mode') === 'edit';

  return isEditing ? <AddProduct /> : <AddCraftChoice />;
}

function MainLayout({
  currentLang,
  onLangChange,
}: {
  currentLang: SupportedLanguage;
  onLangChange: (lang: SupportedLanguage) => void;
}) {
  const location = useLocation();

  const isMarketplaceOrCustomerRoute =
    location.pathname.startsWith('/marketplace') ||
    location.pathname.startsWith('/customer');

  const isAdminRoute = location.pathname.startsWith('/admin');
  const hideStandardNav = isMarketplaceOrCustomerRoute || isAdminRoute;

  return (
    <div className="min-h-screen flex flex-col bg-[#fcfaf6]">
      {!hideStandardNav && (
        <Navbar currentLang={currentLang} onLangChange={onLangChange} />
      )}

      <div className="flex-1">
        <Routes>
          <Route path="/" element={<Home currentLang={currentLang} />} />

          <Route path="/marketplace" element={<MarketplacePage />} />
          <Route
            path="/marketplace/products/:productId"
            element={<ProductDetailsPage />}
          />
          <Route
            path="/marketplace/artisans/:artisanId"
            element={<ArtisanPublicProfilePage />}
          />

          <Route path="/customer/login" element={<CustomerLogin />} />
          <Route path="/customer/register" element={<CustomerRegister />} />
          <Route path="/customer/orders" element={<CustomerOrders />} />
          <Route path="/customer/cart" element={<CustomerCart />} />
          <Route path="/customer/profile" element={<CustomerProfile />} />
          <Route path="/customer/messages" element={<CustomerMessages />} />
          <Route path="/customer/custom-request" element={<CustomRequestFormPage />} />
          <Route path="/customer/custom-requests" element={<CustomerCustomRequestsPage />} />
          <Route path="/customer/checkout" element={<CheckoutConfirm />} />
          <Route path="/customer/payment" element={<PaymentDetails />} />

          <Route path="/artisan/register" element={<ArtisanRegistration />} />

          <Route
            path="/artisan/dashboard"
            element={
              <ProtectedArtisanRoute>
                <ArtisanDashboard />
              </ProtectedArtisanRoute>
            }
          />

          <Route
            path="/artisan/messages"
            element={
              <ProtectedArtisanRoute>
                <ArtisanMessages />
              </ProtectedArtisanRoute>
            }
          />

          <Route
            path="/artisan/add-product"
            element={
              <ProtectedArtisanRoute>
                <AddProductRoute />
              </ProtectedArtisanRoute>
            }
          />

          <Route
            path="/artisan/add-product/ai-assisted"
            element={
              <ProtectedArtisanRoute>
                <AddProduct />
              </ProtectedArtisanRoute>
            }
          />

          <Route
            path="/artisan/professional-studio"
            element={
              <ProtectedArtisanRoute>
                <ProfessionalStudio />
              </ProtectedArtisanRoute>
            }
          />

          <Route
            path="/artisan/product-preview"
            element={
              <ProtectedArtisanRoute>
                <ProductPreview />
              </ProtectedArtisanRoute>
            }
          />

          <Route path="/admin/login" element={<AdminLogin />} />

          <Route
            path="/admin/dashboard"
            element={
              <ProtectedAdminRoute>
                <AdminDashboard />
              </ProtectedAdminRoute>
            }
          />

          <Route path="*" element={<Home currentLang={currentLang} />} />
        </Routes>
      </div>
    </div>
  );
}

export default function App() {
  const [currentLang, setCurrentLang] = useState<SupportedLanguage>(() => {
    const saved = localStorage.getItem('karigarsetu_language');

    return saved === 'bn-IN' || saved === 'hi-IN' || saved === 'en-IN'
      ? saved
      : 'bn-IN';
  });

  const changeLanguage = (lang: SupportedLanguage) => {
    setCurrentLang(lang);
    localStorage.setItem('karigarsetu_language', lang);
    document.documentElement.lang = lang;
  };

  useEffect(() => {
    document.documentElement.lang = currentLang;
  }, [currentLang]);

  return (
    <BrowserRouter>
      <ScrollToTop />
      <MainLayout currentLang={currentLang} onLangChange={changeLanguage} />
    </BrowserRouter>
  );
}