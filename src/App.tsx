import "./styles.css";
import Dropzone from "./Dropzone";
import StreamgraphChart, { Mode } from "./StreamgraphChart";
import { array } from "zod";
import { useState } from "react";
import { Row, Rows } from "./domain";
import { Background } from "./Background";

export default function App() {
  const [data, setData] = useState<Row[] | null>(null);
  const [mode, setMode] = useState<Mode>("auto");
  return (
    <div className="App">
      <Background />
      <Dropzone onChange={(data) => setData(data)} schema={Rows} />
      {data ? <StreamgraphChart key={mode} data={data} mode={mode} /> : null}
      <h4>Mode</h4>
      <div>
        <input
          type="radio"
          id="task"
          name="mode"
          value="task"
          checked={mode === "task"}
          onChange={() => setMode("task")}
        />
        <label htmlFor="task">Task</label>
      </div>
      <div>
        <input
          type="radio"
          id="project"
          name="mode"
          value="project"
          checked={mode === "project"}
          onChange={() => setMode("project")}
        />
        <label htmlFor="project">Project</label>
      </div>
      <div>
        <input
          type="radio"
          id="auto"
          name="mode"
          value="auto"
          checked={mode === "auto"}
          onChange={() => setMode("auto")}
        />
        <label htmlFor="auto">Auto</label>
      </div>
    </div>
  );
}
