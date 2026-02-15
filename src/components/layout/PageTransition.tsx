import { ReactNode, useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

const PageTransition = ({ children }: { children: ReactNode }) => {
  const location = useLocation();
  const [entering, setEntering] = useState(false);
  const prevPath = useRef(location.pathname);

  useEffect(() => {
    if (location.pathname !== prevPath.current) {
      prevPath.current = location.pathname;
      setEntering(true);
      const timer = setTimeout(() => setEntering(false), 350);
      return () => clearTimeout(timer);
    }
  }, [location.pathname]);

  return (
    <div
      className={entering ? 'animate-fade-in' : ''}
      style={entering ? { animationDuration: '300ms' } : undefined}
    >
      {children}
    </div>
  );
};

export default PageTransition;
