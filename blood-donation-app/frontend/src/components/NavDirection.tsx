import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';

// Depth ordering for routes — higher = deeper in the hierarchy
const ROUTE_DEPTH: Record<string, number> = {
  '/': 0,
  '/top-donors': 1,
  '/profile': 1,
  '/past-requests': 1,
  '/donate': 2,
  '/past-donations': 2,
  '/hospitals': 3,
};

function getDepth(pathname: string): number {
  if (pathname.startsWith('/request/')) return 3;
  return ROUTE_DEPTH[pathname] ?? 1;
}

type Direction = 'forward' | 'back' | 'none';

const NavDirectionContext = createContext<Direction>('none');

export function NavDirectionProvider({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const prevPath = useRef(location.pathname);
  const [direction, setDirection] = useState<Direction>('none');

  useEffect(() => {
    const prev = prevPath.current;
    const next = location.pathname;
    if (prev === next) return;
    const prevDepth = getDepth(prev);
    const nextDepth = getDepth(next);
    setDirection(nextDepth >= prevDepth ? 'forward' : 'back');
    prevPath.current = next;
  }, [location.pathname]);

  return (
    <NavDirectionContext.Provider value={direction}>
      {children}
    </NavDirectionContext.Provider>
  );
}

export function useNavDirection() {
  return useContext(NavDirectionContext);
}
