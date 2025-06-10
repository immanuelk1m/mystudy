
import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import AuthModal from '../auth/AuthModal';
import { Button } from '@/components/ui/button';
import { useGuest } from '@/contexts/GuestContext'; // GuestContext import 추가

interface MainLayoutProps {
  children: React.ReactNode;
}

const MainLayout = ({ children }: MainLayoutProps) => {
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const location = useLocation();
  const isWorkspace = location.pathname.includes('/workspace');
  const { isGuest, loginAsGuest, logoutGuest } = useGuest(); // useGuest 훅 사용

  const handleGuestLogin = () => {
    // 임시 guest ID 생성 또는 서버에서 받아오는 로직 필요 시 추가
    const guestToken = `guest_${Date.now()}`;
    loginAsGuest(guestToken);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-border/50 py-3 px-6 bg-white">
        <div className="container flex justify-between items-center">
          <div className="flex items-center gap-2">
            <a href="/" className="text-2xl font-bold text-primary">아인슈타인</a>
            {isWorkspace && (
              <span className="text-sm text-muted-foreground">/</span>
            )}
            {isWorkspace && (
              <span className="text-sm text-muted-foreground">작업 공간</span>
            )}
          </div>
          <div className="flex items-center gap-3">
            {isGuest ? (
              <>
                <span className="text-sm font-medium">Guest 사용자</span>
                <Button variant="outline" onClick={logoutGuest}>
                  로그아웃
                </Button>
                <Button onClick={() => setAuthModalOpen(true)}>
                  정식 계정으로 로그인/회원가입
                </Button>
              </>
            ) : (
              <>
                <Button variant="ghost" onClick={() => setAuthModalOpen(true)}>
                  로그인
                </Button>
                <Button onClick={() => setAuthModalOpen(true)}>
                  회원가입
                </Button>
                <Button variant="outline" onClick={handleGuestLogin}>
                  Guest로 계속하기
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="flex-grow">
        {children}
      </main>

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onGuestLogin={handleGuestLogin} // onGuestLogin prop 전달
      />
    </div>
  );
};

export default MainLayout;
