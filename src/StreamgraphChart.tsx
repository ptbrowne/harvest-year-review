import React, {
  useRef,
  useMemo,
  useState,
  useEffect,
  HTMLProps,
  useCallback,
} from "react";
import * as d3 from "d3";
import useStore from "./store";
import { Row } from "./domain";
import { mkSimplexNoise } from "@spissvinkel/simplex-noise";
import { color as d3Color } from "d3";
import clsx from "clsx";
import { Text } from "@visx/text";

type Datum = { project: string; hours: number; date: Date };

const noise = mkSimplexNoise(Math.random);

function roundToMonday(inputDate: Date): Date {
  const date = new Date(inputDate);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1); // Adjust when the day is Sunday

  date.setDate(diff);
  date.setHours(0, 0, 0, 0);

  return date;
}

const palette = [
  "#19A3D1",
  "#31DEF3",
  "#3B48B2",
  "#B24F67",
  "#E54F82",
  "#FB993D",
  "#FD89B9",
  "#FEE9A9",
  "#3DFB94",
  "#0F713C",
].sort((x) => Math.random() - 0.5);

const getProject = (d: Row) => (d.project === "Team" ? d.task : d.project);

const GradientDef = ({ color }: { color: string }) => {
  // Generate unique ID for the gradient
  const gradientId = `gradient-${color}`;

  const c = d3Color(color);
  if (!c) {
    return null;
  }
  // Darken the color
  const color1 = c?.brighter(0.5).formatRgb();
  const hslC = d3.hsl(c);
  hslC.h += 30;
  const color2 = hslC.formatRgb();

  return (
    <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style={{ stopColor: color1, stopOpacity: 1 }} />
      <stop offset="50%" style={{ stopColor: color2, stopOpacity: 1 }} />
      <stop offset="100%" style={{ stopColor: color1, stopOpacity: 1 }} />
    </linearGradient>
  );
};

const ScrollToDiv = ({
  scrollTo,
  ...props
}: HTMLProps<HTMLDivElement> & { scrollTo: boolean }) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollTo && ref.current) {
      ref.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [scrollTo]);
  return <div {...props} ref={ref} />;
};

const tau = Math.PI * 2;

const StreamGraphChart = ({
  data,
  width,
  height,
}: {
  data: Row[];
  width: number;
  height: number;
}) => {
  const marginTop = 10;
  const marginBottom = 30;
  const marginLeft = 40;
  const [hovered, setHovered] = useState<string | null>(null);

  // Create a ref to hold the SVG container
  const chartRef = useRef(null);

  const { x, y, series, color, area, label, sumByProject } = useMemo(() => {
    const sortedData = [...data].sort((a, b) => +a.date - +b.date);
    const sumByDayByProject = d3.rollup(
      sortedData,
      (v) => d3.sum(v.map((x) => x.hours) ?? 0),
      (d) => roundToMonday(d.date),
      (d) => getProject(d)
    );

    const sumByProject = d3.rollup(
      sortedData,
      (v) => d3.sum(v.map((x) => x.hours) ?? 0),
      (d) => getProject(d)
    );

    // Determine the series that need to be stacked.
    const series = d3
      .stack()
      .order(d3.stackOrderAppearance)
      .keys(d3.union(data.map((d) => getProject(d)))) // distinct series keys, in input order
      .value(([, D], key) => D.get(key) ?? 0)(
      // get value for each series key and stack
      sumByDayByProject
    ); // group by stack then series key

    const dateExtent = d3.extent(data, (d) => d.date) as [Date, Date];

    // Prepare the scales for positional and color encodings.

    const angleOffset = (240 + 10) / 360;
    const angleExtent = (240 - 20) / 360;
    const a = d3
      .scaleUtc()
      .domain(dateExtent)
      .range([tau * angleOffset, tau * angleOffset + tau * angleExtent]);

    const x = d3
      .scaleUtc()
      .domain(dateExtent)
      .range([0, width - 40]);

    const donutHeight = height / 1.7;
    const yExtent = d3.extent(series.flat(2));
    if (yExtent[0] === undefined) {
      throw new Error("Should not happen");
    }
    const y = d3
      .scaleLinear()
      .domain(yExtent)
      .rangeRound([donutHeight * 0.5, donutHeight]);

    const color = d3
      .scaleOrdinal()
      .domain(series.map((d) => d.key))
      .range(palette);

    // Construct an area shape.

    const area = d3
      .areaRadial<{ data: [number, number] } & [number, number]>()
      .curve(d3.curveBasis)
      .angle((d) => a(d.data[0]))
      .innerRadius((d) => y(d[0]))
      .outerRadius((d) => y(d[1]));

    const maxs: Record<string, Date> = {};
    let cur: undefined | { project: string; date: Date } = undefined;
    for (let [date, projects] of Array.from(sumByDayByProject.entries())) {
      const projectsEntries = Array.from(projects.entries());
      const maxIndex = d3.maxIndex(projectsEntries.map((x) => x[1]));
      const maxProject = projectsEntries[maxIndex][0];
      if (
        cur?.project !== maxProject &&
        (!cur || +date - +cur.date > 1000 * 60 * 60 * 24 * 7)
      ) {
        cur = { project: maxProject, date };
        if (!maxs[maxProject]) {
          maxs[maxProject] = date;
        }
      }
      // const x = d3.maxIndex(projects);
    }

    const label = (key: string) => {
      if (!maxs[key]) {
        return null;
      }
      const angle = a(maxs[key]);
      const radius = donutHeight * 1;
      return [...d3.pointRadial(angle, radius), angle];
    };

    return { area, color, a, x, y, series, label, sumByProject };
  }, [data]);

  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  return (
    <>
      <ScrollToDiv scrollTo>
        <span />
      </ScrollToDiv>
      <h1 style={{ margin: "1rem", paddingTop: "3rem" }}>
        Your year in review
      </h1>
      <div
        style={{
          gap: "1rem",
          height: "100%",
        }}
      >
        <svg
          viewBox={`0 0 ${width} ${height}`}
          width={width}
          height={height}
          style={{
            gridArea: "chart",
            maxWidth: "100%",
            height: "auto",
            mixBlendMode: "hard-light",
            left: 0,
            bottom: 0,
            right: 0,
            top: 0,
          }}
        >
          <defs>
            {palette.map((p) => {
              return <GradientDef color={p} />;
            })}
          </defs>
          {hovered ? (
            <>
              <Text
                textAnchor="middle"
                verticalAnchor="middle"
                fontSize={"24px"}
                fill="white"
                style={{ opacity: 1 }}
                x={width / 2}
                y={height / 2 + 100}
              >
                {`${sumByProject.get(hovered)?.toFixed(0)} hours in total`}
              </Text>
              <Text
                key={hovered}
                textAnchor="middle"
                verticalAnchor="middle"
                fill="white"
                style={{ opacity: 1 }}
                width={width * 0.1}
                x={width / 2}
                y={height / 2}
                fontSize={"40px"}
              >
                {hovered}
              </Text>
            </>
          ) : null}

          {/* Append a path for each series */}
          <g transform={`translate(${width / 2}, ${height / 1.6})`}>
            {series.map((d) => {
              const serieArea = area(d);
              if (!serieArea) {
                return null;
              }
              return (
                <path
                  key={d.key}
                  onMouseEnter={() => setHovered(d.key)}
                  onMouseLeave={() => setHovered(null)}
                  className={"series-area"}
                  d={serieArea}
                  style={{
                    opacity: hovered ? (hovered === d.key ? 0.9 : 0.5) : 0.8,
                  }}
                  fill={`url(#gradient-${color(d.key)})`}
                  stroke="rgba(255,255,255,0.2)"
                  strokeWidth="2px"
                />
              );
            })}

            {series.map((d) => {
              const l = label(d.key);
              if (l === null) {
                return null;
              }
              const [x, y, angle] = l;
              return (
                <Text
                  textAnchor={x > width / 6 ? "start" : "end"}
                  dominantBaseline="middle"
                  width={200}
                  x={x}
                  y={y}
                  fontSize={"20px"}
                  fill={hovered === d.key ? "white" : "white"}
                  style={{ opacity: hovered === d.key ? 0.9 : undefined }}
                >
                  {d.key}
                </Text>
              );
            })}
          </g>
        </svg>
      </div>
    </>
  );
};

const textAnchorSpecs = [
  [[0, (tau * 1) / 3], "start"],
  [[(tau * 1) / 3, (tau * 2) / 3], "middle"],
  [[(tau * 2) / 3, (tau * 4) / 3], "end"],
  [[(tau * 4) / 3, tau], "start"],
] satisfies [[number, number], string][];

const intervalMatch = <T,>(specs: [[number, number], T][]) => {
  return (n: number): T | undefined => {
    for (let i = 0; i < specs.length; i++) {
      const [[min, max], ret] = specs[i];
      if (n >= min && n < max) {
        return ret;
      }
    }
    return undefined;
  };
};

const angleToTextAnchor = intervalMatch(textAnchorSpecs);

export default StreamGraphChart;
