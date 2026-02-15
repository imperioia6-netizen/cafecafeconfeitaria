import { ReactNode, useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

const PageTransition = ({ children }: { children: ReactNode }) => {
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const prevPath = useRef(location.pathname);

  useEffect(() => {
    if (location.pathname !== prevPath.current) {
      prevPath.current = location.pathname;

      // Start loading
      setLoading(true);
      setVisible(true);
      setProgress(0);

      // Quick jump to ~80%
      requestAnimationFrame(() => setProgress(80));

      // Complete to 100%
      const completeTimer = setTimeout(() => {
        setProgress(100);
      }, 250);

      // Fade out
      const fadeTimer = setTimeout(() => {
        setVisible(false);
        setLoading(false);
        setProgress(0);
      }, 450);

      return () => {
        clearTimeout(completeTimer);
        clearTimeout(fadeTimer);
      };
    }
  }, [location.pathname]);

  return (
    <>
      {visible && (
        <div
          className="fixed top-0 left-0 z-50 h-[3px] transition-all ease-out loading-bar-glow"
          style={{
            width: `${progress}%`,
            transitionDuration: progress <= 80 ? '200ms' : '150ms',
            opacity: progress >= 100 ? 0 : 1,
            background: 'linear-gradient(90deg, hsl(36 70% 50%), hsl(36 90% 60%), hsl(36 70% 50%))',
          }}
        />
      )}
      {children}
    </>
  );
};

export default PageTransition;
