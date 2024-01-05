import { useCallback, useEffect, useState } from "react";

const getWindowDimensions = () => {
  return { width: window.innerWidth, height: window.innerHeight };
};
const useWindowDimensions = () => {
  const [{ width, height }, setDims] = useState(() => getWindowDimensions());
  const handleResize = useCallback(() => {
    setDims(getWindowDimensions());
  }, []);

  useEffect(() => {
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [handleResize]);
  return { width, height };
};
