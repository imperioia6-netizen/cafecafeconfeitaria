import { ReactNode, useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

const PageTransition = ({ children }: { children: ReactNode }) => {
  const location = useLocation();
  const [transitioning, setTransitioning] = useState(false);
  const [displayChildren, setDisplayChildren] = useState(children);
  const prevPath = useRef(location.pathname);

  useEffect(() => {
    if (location.pathname !== prevPath.current) {
      prevPath.current = location.pathname;
      setTransitioning(true);

      const timer = setTimeout(() => {
        setDisplayChildren(children);
        setTransitioning(false);
      }, 120);

      return () => clearTimeout(timer);
    } else {
      setDisplayChildren(children);
    }
  }, [location.pathname, children]);

  return (
    <div
      className={`transition-all duration-200 ease-out ${
        transitioning
          ? 'opacity-0 translate-y-1'
          : 'opacity-100 translate-y-0'
      }`}
    >
      {displayChildren}
    </div>
  );
};

export default PageTransition;
