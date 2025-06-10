
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Workspace from "./pages/Workspace";
import NotFound from "./pages/NotFound";
import PremiumPlanPage from "./pages/PremiumPlanPage"; // PremiumPlanPage import 추가
import { GuestProvider } from "./contexts/GuestContext"; // GuestProvider import 추가
import { ModalProvider } from "./contexts/ModalContext"; // ModalProvider import 추가
import AuthModal from "./components/auth/AuthModal"; // AuthModal import 추가
import { useModal } from "./contexts/ModalContext"; // useModal import 추가

const queryClient = new QueryClient();

// AppContent 컴포넌트를 만들어 useModal을 사용합니다.
const AppContent = () => {
  const { modalType, closeModal } = useModal();

  return (
    <>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/workspace/:id" element={<Workspace />} />
          <Route path="/premium-plan" element={<PremiumPlanPage />} /> {/* /premium-plan 경로 추가 */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
      {modalType === 'authModal' && <AuthModal isOpen={true} onClose={closeModal} />}
    </>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <GuestProvider> {/* GuestProvider 추가 */}
        <ModalProvider> {/* ModalProvider 추가 */}
          <AppContent />
        </ModalProvider>
      </GuestProvider> {/* GuestProvider 추가 */}
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
