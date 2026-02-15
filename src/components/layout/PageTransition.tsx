import { ReactNode, useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

type Phase = 'idle' | 'exiting' | 'loading';

const SkeletonLoader = () => (
  <div className="space-y-6 py-2 animate-fade-in" style={{ animationDuration: '150ms' }}>
    <div className="h-8 w-48 rounded-lg bg-muted animate-pulse" />
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="h-32 rounded-xl bg-muted animate-pulse" />
      <div className="h-32 rounded-xl bg-muted animate-pulse" style={{ animationDelay: '75ms' }} />
    </div>
    <div className="h-48 rounded-xl bg-muted animate-pulse" style={{ animationDelay: '150ms' }} />
  </div>
);

const PageTransition = ({ children }: { children: ReactNode }) => {
  const location = useLocation();
  const [phase, setPhase] = useState<Phase>('idle');
  const [displayChildren, setDisplayChildren] = useState(children);
  const prevPath = useRef(location.pathname);

  useEffect(() => {
    if (location.pathname !== prevPath.current) {
      prevPath.current = location.pathname;
      setPhase('exiting');

      const exitTimer = setTimeout(() => {
        setPhase('loading');

        const loadTimer = setTimeout(() => {
          setDisplayChildren(children);
          setPhase('idle');
        }, 250);

        return () => clearTimeout(loadTimer);
      }, 150);

      return () => clearTimeout(exitTimer);
    } else {
      setDisplayChildren(children);
    }
  }, [location.pathname, children]);

  if (phase === 'loading') {
    return <SkeletonLoader />;
  }

  return (
    <div
      className={`transition-all duration-200 ease-out ${
        phase === 'exiting'
          ? 'opacity-0 scale-[0.99]'
          : 'opacity-100 scale-100'
      }`}
    >
      {displayChildren}
    </div>
  );
};

export default PageTransition;
