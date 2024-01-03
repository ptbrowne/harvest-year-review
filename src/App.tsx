import "./styles.css";
import Dropzone from "./Dropzone";
import StreamgraphChart from "./StreamgraphChart";
import { array } from "zod";
import { useCallback, useEffect, useState } from "react";
import { Row, Rows } from "./domain";
import { Background } from "./Background";

const getChartDims = () => {
  return { width: window.innerWidth - 40, height: window.innerHeight - 40 };
};

export default function App() {
  const [data, setData] = useState<Row[] | null>(null);
  const [{ width, height }, setDims] = useState(() => {
    return getChartDims();
  });
  const handleResize = useCallback(() => {
    setDims(getChartDims());
  }, []);

  useEffect(() => {
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [handleResize]);

  return (
    <div className="App">
      <Background />

      <Dropzone onChange={(data) => setData(data)} schema={Rows} />
      {data ? (
        <StreamgraphChart data={data} width={width} height={height} />
      ) : null}
    </div>
  );
}
