import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface GuestState {
  isGuest: boolean;
  guestId: string | null;
}

interface GuestContextType extends GuestState {
  loginAsGuest: (guestToken: string) => void;
  logoutGuest: () => void;
}

const GuestContext = createContext<GuestContextType | undefined>(undefined);

export const GuestProvider = ({ children }: { children: ReactNode }) => {
  const [guestState, setGuestState] = useState<GuestState>({
    isGuest: false,
    guestId: null,
  });

  useEffect(() => {
    const storedGuestToken = localStorage.getItem('guestToken');
    if (storedGuestToken) {
      setGuestState({ isGuest: true, guestId: storedGuestToken });
    }
  }, []);

  const loginAsGuest = (guestToken: string) => {
    localStorage.setItem('guestToken', guestToken);
    setGuestState({ isGuest: true, guestId: guestToken });
  };

  const logoutGuest = () => {
    localStorage.removeItem('guestToken');
    setGuestState({ isGuest: false, guestId: null });
  };

  return (
    <GuestContext.Provider value={{ ...guestState, loginAsGuest, logoutGuest }}>
      {children}
    </GuestContext.Provider>
  );
};

export const useGuest = (): GuestContextType => {
  const context = useContext(GuestContext);
  if (context === undefined) {
    throw new Error('useGuest must be used within a GuestProvider');
  }
  return context;
};