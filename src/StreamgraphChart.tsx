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

const paletteSpecs = {
  "#19A3D1": [],
  "#31DEF3": [],
  "#C0A3FF": [],
  "#E54F82": [],
  "#FD89B9": [],
  "#FB993D": ["Personal Vacation", "Company Vacation"],
  // "#FEE9A9": [],
  "#3DFB94": ["Management", "Coordination", "Hackdays", "Education"],
};
const palette = Object.keys(paletteSpecs);

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

const makeScaleOrdinal = (specs: Record<string, string[]>) => {
  const known = new Map<string, string>();
  let i = 0;
  const range = Object.keys(specs);
  for (let k of range) {
    for (let j = 0; j < specs[k].length; j++) {
      known.set(specs[k][j], k);
    }
  }

  return {
    set: (key: string, value: string) => {
      known.set(key, value);
    },
    encode: (key: string) => {
      const already = known.get(key);
      if (already) {
        return already;
      } else {
        while (specs[range[i]].length) {
          i = (i + 1) % range.length;
        }
        const newValue = range[i];
        i = (i + 1) % range.length;
        known.set(key, newValue);
        return newValue;
      }
    },
  };
};

const StreamGraphChart = ({ data }: { data: Row[] }) => {
  const [hovered, setHovered] = useState<string | null>(null);

  const viewBoxWidth = 1800;
  const viewBoxHeight = 1000;

  const {
    series,
    color,
    area,
    label,
    sumByProject,
    totalSum,
    dateExtent,
    totalProjects,
    projectToClient,
    ticks,
  } = useMemo(() => {
    const sortedData = [...data].sort((a, b) => +a.date - +b.date);
    const projectToClient = d3.rollup(
      sortedData,
      (v) => v[0].client,
      (d) => d.project
    );
    const sumByDayByProject = d3.rollup(
      sortedData,
      (v) => d3.sum(v.map((x) => x.hours) ?? 0),
      (d) => roundToMonday(d.date),
      (d) => getProject(d)
    );

    const totalProjects = d3.sum(
      d3
        .rollup(
          sortedData,
          (v) => 1,
          (d) => getProject(d)
        )
        .values()
    );
    const totalSum = d3.sum(sortedData.map((x) => x.hours));

    const sumByProject = d3.rollup(
      sortedData,
      (v) => d3.sum(v.map((x) => x.hours) ?? 0),
      (d) => getProject(d)
    );

    // Determine the series that need to be stacked.
    const series = d3
      .stack()
      .order((series) => {
        const order = d3.stackOrderAscending(series);
        const indexes = Object.fromEntries(series.map((s, i) => [s.key, i]));
        console.log(indexes);
        order.sort((a, b) => {
          if (a === indexes["Coordination"]) {
            return 1;
          }
          return 0;
        });
        console.log(order);
        return order;
      })
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
      .range([0, viewBoxWidth - 40]);

    const donutHeight = viewBoxHeight / 1.7;
    const yExtent = d3.extent(series.flat(2));
    if (yExtent[0] === undefined) {
      throw new Error("Should not happen");
    }

    const donutThickness = donutHeight * 0.5;
    const y = d3
      .scaleLinear()
      .domain(yExtent)
      .rangeRound([donutHeight - donutThickness, donutHeight]);

    const colorScale = makeScaleOrdinal(paletteSpecs);
    const color = colorScale.encode;

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
        (!cur || +date - +cur.date > 1000 * 60 * 60 * 24 * 30)
      ) {
        cur = { project: maxProject, date };
        if (!maxs[maxProject]) {
          maxs[maxProject] = date;
        }
      }
    }

    const label = (key: string) => {
      if (!maxs[key]) {
        return null;
      }
      const angle = a(maxs[key]);
      const radius = donutHeight * 1;
      return [...d3.pointRadial(angle, radius), angle];
    };

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
    const ticks = Array.from({ length: 12 })
      .fill(null)
      .map((x, i) => {
        const angle = a(new Date(dateExtent[0].getFullYear(), i, 15));
        return {
          xy: d3.pointRadial(angle, donutThickness - 30),
          label: months[i],
        };
      });

    return {
      area,
      color,
      a,
      x,
      y,
      series,
      label,
      sumByProject,
      totalProjects,
      totalSum,
      dateExtent,
      ticks,
      projectToClient,
    };
  }, [data]);

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
          viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
          style={{
            gridArea: "chart",
            aspectRatio: "16 / 9",
            width: "100%",
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
                fill="white"
                style={{ opacity: 1 }}
                width={viewBoxWidth * 0.08}
                x={viewBoxWidth / 2}
                y={viewBoxHeight / 2}
                fontSize={"40px"}
              >
                {`${hovered}`}
              </Text>
              <Text
                textAnchor="middle"
                verticalAnchor="middle"
                fill="white"
                fillOpacity={0.8}
                style={{ opacity: 1 }}
                width={viewBoxWidth * 0.08}
                x={viewBoxWidth / 2}
                y={viewBoxHeight / 2 + 100}
                fontSize={"24px"}
              >
                {projectToClient.get(hovered)}
              </Text>
              <Text
                textAnchor="middle"
                verticalAnchor="middle"
                fontSize={"24px"}
                fill="white"
                fillOpacity={0.8}
                style={{ opacity: 1 }}
                x={viewBoxWidth / 2}
                y={viewBoxHeight / 2 + 160}
              >
                {`${sumByProject.get(hovered)?.toFixed(0)} hours`}
              </Text>
            </>
          ) : (
            <>
              <Text
                textAnchor="middle"
                verticalAnchor="middle"
                fontSize={"24px"}
                fill="white"
                style={{ opacity: 1 }}
                x={viewBoxWidth / 2}
                y={viewBoxHeight / 2 + 100}
              >
                {`${totalSum.toFixed(0)} hours`}
              </Text>
              <Text
                textAnchor="middle"
                verticalAnchor="middle"
                fontSize={"24px"}
                fill="white"
                style={{ opacity: 1 }}
                x={viewBoxWidth / 2}
                y={viewBoxHeight / 2 + 140}
              >
                {`${totalProjects} projects`}
              </Text>
              <Text
                key={hovered}
                textAnchor="middle"
                verticalAnchor="middle"
                fill="white"
                style={{ opacity: 1 }}
                width={viewBoxWidth * 0.1}
                x={viewBoxWidth / 2}
                y={viewBoxHeight / 2}
                fontSize={"70px"}
              >
                {dateExtent[0].getFullYear()}
              </Text>
            </>
          )}

          {/* Append a path for each series */}
          <g
            transform={`translate(${viewBoxWidth / 2}, ${viewBoxHeight / 1.6})`}
          >
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
                    opacity: hovered ? (hovered === d.key ? 0.9 : 0.1) : 0.8,
                  }}
                  fill={`url(#gradient-${color(d.key)})`}
                  fillOpacity={hovered ? (hovered === d.key ? 1 : 0.1) : 1}
                  stroke="rgba(255,255,255,0.2)"
                  strokeWidth="2px"
                />
              );
            })}
            <g>
              {ticks.map(({ xy, label }) => {
                return (
                  <g className="month-tick">
                    <Text
                      textAnchor={"middle"}
                      dominantBaseline="middle"
                      width={100}
                      x={xy[0]}
                      y={xy[1]}
                      fontSize={"14px"}
                      fill={"white"}
                    >
                      {label}
                    </Text>
                  </g>
                );
              })}
            </g>

            {series.map((d) => {
              const l = label(d.key);
              if (l === null) {
                return null;
              }
              const [x, y, angle] = l;
              return (
                <Text
                  textAnchor={x > viewBoxWidth / 6 ? "start" : "end"}
                  dominantBaseline="middle"
                  width={100}
                  x={x}
                  y={y}
                  fontSize={"20px"}
                  fill={"white"}
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
