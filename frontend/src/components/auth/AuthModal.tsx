
import { useState } from 'react';
import { useGuest } from '@/contexts/GuestContext'; // useGuest import 추가
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGuestLogin?: () => void; // onGuestLogin prop 추가 (optional)
}

const AuthModal = ({ isOpen, onClose, onGuestLogin }: AuthModalProps) => {
  const [activeTab, setActiveTab] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const { loginAsGuest } = useGuest(); // useGuest 훅 사용

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (activeTab === 'login') {
      toast.info('This is a demo. Connect to Supabase for real authentication.');
      // 실제 로그인 로직 추가
      // 예: const { error } = await supabase.auth.signInWithPassword({ email, password });
      // if (error) toast.error(error.message);
      // else onClose();
    } else {
      toast.info('This is a demo. Connect to Supabase for real registration.');
      // 실제 회원가입 로직 추가
      // 예: const { error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: name } } });
      // if (error) toast.error(error.message);
      // else { toast.success('Check your email for verification!'); onClose(); }
    }
  };

  const handleGuestLoginClick = () => {
    const guestIdentifier = `guest_user_${Date.now()}`;
    loginAsGuest(guestIdentifier); // 전역 상태 업데이트
    toast.success('Guest로 로그인되었습니다.');
    if (onGuestLogin) {
      onGuestLogin(); // 전달받은 onGuestLogin 함수 호출
    }
    onClose(); // 모달 닫기
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-semibold text-center">
            Nota에 오신 것을 환영합니다
          </DialogTitle>
          <DialogDescription className="text-center">
            AI 기반 학습 도우미
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="login" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-2 mb-6">
            <TabsTrigger value="login">로그인</TabsTrigger>
            <TabsTrigger value="register">회원가입</TabsTrigger>
          </TabsList>

          <TabsContent value="login">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">이메일</Label>
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="you@example.com" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">비밀번호</Label>
                  <button 
                    type="button"
                    className="text-xs text-primary hover:underline"
                  >
                    비밀번호를 잊으셨나요?
                  </button>
                </div>
                <Input 
                  id="password" 
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full">로그인</Button>
            </form>
          </TabsContent>

          <TabsContent value="register">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">이름</Label>
                <Input 
                  id="name" 
                  placeholder="John Doe" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="register-email">이메일</Label>
                <Input 
                  id="register-email" 
                  type="email" 
                  placeholder="you@example.com" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="register-password">비밀번호</Label>
                <Input 
                  id="register-password" 
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full">회원가입</Button>
            </form>
          </TabsContent>
        </Tabs>

        <div className="my-4">
          <Button variant="outline" className="w-full" onClick={handleGuestLoginClick}>
            Guest로 계속하기
          </Button>
        </div>

        <div className="mt-4 text-center text-sm text-muted-foreground">
          계속 진행하면 Nota의 서비스 약관 및 개인정보 보호정책에 동의하는 것으로 간주됩니다.
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AuthModal;
