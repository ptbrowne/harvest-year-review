import "./styles.css";
import Dropzone from "./Dropzone";
import StreamgraphChart from "./StreamgraphChart";
import { array } from "zod";
import { useState } from "react";
import { Row, Rows } from "./domain";
import { Background } from "./Background";

export default function App() {
  const [data, setData] = useState<Row[] | null>(null);

  return (
    <div className="App">
      <Background />

      <Dropzone onChange={(data) => setData(data)} schema={Rows} />
      {data ? <StreamgraphChart data={data} /> : null}
    </div>
  );
}
