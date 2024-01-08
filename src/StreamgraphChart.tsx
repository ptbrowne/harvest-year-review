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
import dayjs from "dayjs";
import useMediaQuery from "./useMediaQuery";

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

const longMonths = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const StreamGraphChart = ({ data }: { data: Row[] }) => {
  const [hovered, setHovered] = useState<string | null>(null);
  const [hoveredMonth, setHoveredMonth] = useState<string | null>(null);

  const isMobile = useMediaQuery("(max-width: 768px)");

  const viewBoxWidth = 1800;
  const viewBoxHeight = 1000;

  const margins = {
    top: 200,
    innerTicks: 30,
  };

  const fontSizes = {
    ticks: 20,
    h1: 70,
    h2: 40,
    h3: 24,
    body1: 20,
    body2: 14,
  };

  if (isMobile) {
    for (let k_ of Object.keys(fontSizes)) {
      const k = k_ as keyof typeof fontSizes;
      fontSizes[k] = fontSizes[k] * 1.8;
    }
    margins.top = margins.top * 1.2;
    margins.innerTicks = margins.innerTicks * 1.4;
  }

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
    projectsByMonth,
    hoursByMonth,
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

    const hoursByMonth = d3.rollup(
      sortedData,
      (v) => d3.sum(v.map((x) => x.hours) ?? 0),
      (d) => `${d.date.toISOString().slice(0, 7)}`
    );

    const projectsByMonth = d3.rollup(
      sortedData,
      (v) => new Set(v.map((x) => x.project)).size,
      (d) => `${d.date.toISOString().slice(0, 7)}`
    );

    // Determine the series that need to be stacked.
    const series = d3
      .stack()
      .order((series) => {
        const order = d3.stackOrderAscending(series);
        const indexes = Object.fromEntries(series.map((s, i) => [s.key, i]));
        order.sort((a, b) => {
          if (a === indexes["Coordination"]) {
            return 1;
          }
          if (b === indexes["Coordination"]) {
            return -1;
          }
          return 0;
        });
        return order;
      })
      .keys(d3.union(data.map((d) => getProject(d)))) // distinct series keys, in input order
      .value(([, D], key) => D.get(key) ?? 0)(
      // get value for each series key and stack
      sumByDayByProject
    ); // group by stack then series key

    let dateExtent = d3.extent(data, (d) => d.date);
    if (!(dateExtent[0] instanceof Date)) {
      throw new Error("Invalid data, could not compute dateExtent");
    }
    dateExtent = [
      dayjs(dateExtent[0]).startOf("year").toDate(),
      dayjs(dateExtent[1]).endOf("year").toDate(),
    ];

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

    const ticks = Array.from({ length: 12 })
      .fill(null)
      .map((x, i) => {
        const d = new Date(dateExtent[0].getFullYear(), i, 15);
        const angle = a(d);
        return {
          xy: d3.pointRadial(angle, donutThickness - margins.innerTicks),
          label: months[i],
          monthId: d.toISOString().slice(0, 7),
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
      hoursByMonth,
      projectsByMonth,
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
          <g
            transform={`translate(${viewBoxWidth / 2}, ${
              viewBoxHeight / 2 + margins.top
            })`}
          >
            {hovered ? (
              <>
                <Text
                  textAnchor="middle"
                  verticalAnchor="middle"
                  fill="white"
                  width={viewBoxWidth * 0.08}
                  y={-100}
                  fontSize={fontSizes.h2}
                  style={{ opacity: 0.9 }}
                >
                  {`${hovered}`}
                </Text>
                <Text
                  textAnchor="middle"
                  verticalAnchor="middle"
                  fill="white"
                  fillOpacity={0.8}
                  width={viewBoxWidth * 0.08}
                  y={0}
                  fontSize={fontSizes.h3}
                >
                  {projectToClient.get(hovered)}
                </Text>
                <Text
                  textAnchor="middle"
                  verticalAnchor="middle"
                  fontSize={fontSizes.h3}
                  fill="white"
                  fillOpacity={0.8}
                  y={60}
                >
                  {`${sumByProject.get(hovered)?.toFixed(0)} hours`}
                </Text>
              </>
            ) : hoveredMonth ? (
              <>
                <Text
                  key={hovered}
                  textAnchor="middle"
                  verticalAnchor="middle"
                  fill="white"
                  width={viewBoxWidth * 0.1}
                  y={-100}
                  fontSize={fontSizes.h1}
                  style={{ opacity: 0.9 }}
                >
                  {longMonths[Number(hoveredMonth.slice(5, 7)) - 1]}
                </Text>
                <Text
                  textAnchor="middle"
                  verticalAnchor="middle"
                  fontSize={fontSizes.h3}
                  fill="white"
                  y={0}
                >
                  {`${projectsByMonth.get(hoveredMonth)} projects`}
                </Text>
                <Text
                  textAnchor="middle"
                  verticalAnchor="middle"
                  fontSize={fontSizes.h3}
                  fill="white"
                  y={60}
                >
                  {`${hoursByMonth.get(hoveredMonth)?.toFixed(0)} hours`}
                </Text>
              </>
            ) : (
              <>
                <Text
                  key={hovered}
                  textAnchor="middle"
                  verticalAnchor="middle"
                  fill="white"
                  width={viewBoxWidth * 0.1}
                  y={-100}
                  fontSize={fontSizes.h1}
                  style={{ opacity: 0.9 }}
                >
                  {dateExtent[0].getFullYear()}
                </Text>
                <Text
                  textAnchor="middle"
                  verticalAnchor="middle"
                  fontSize={fontSizes.h3}
                  fill="white"
                  y={0}
                >
                  {`${totalProjects} projects`}
                </Text>
                <Text
                  textAnchor="middle"
                  verticalAnchor="middle"
                  fontSize={fontSizes.h3}
                  fill="white"
                  y={60}
                >
                  {`${totalSum.toFixed(0)} hours`}
                </Text>
              </>
            )}
          </g>

          {/* Paths */}
          <g
            transform={`translate(${viewBoxWidth / 2}, ${
              viewBoxHeight / 2 + margins.top
            })`}
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

            {/* Month ticks */}
            <g>
              {ticks.map(({ xy, label, monthId }) => {
                return (
                  <g className="month-tick">
                    <Text
                      textAnchor={"middle"}
                      dominantBaseline="middle"
                      width={100}
                      x={xy[0]}
                      y={xy[1]}
                      onMouseEnter={() => setHoveredMonth(monthId)}
                      onMouseLeave={() => setHoveredMonth(null)}
                      fontSize={fontSizes.body2}
                      fill={"white"}
                      style={{
                        opacity: hoveredMonth === monthId ? 1 : undefined,
                      }}
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
              const viewBoxX = x + viewBoxWidth / 2;
              return (
                <Text
                  textAnchor={
                    viewBoxX < viewBoxWidth / 3
                      ? "end"
                      : viewBoxX < (viewBoxWidth / 3) * 2
                      ? "middle"
                      : "start"
                  }
                  verticalAnchor="end"
                  dominantBaseline="middle"
                  onMouseEnter={() => setHovered(d.key)}
                  onMouseLeave={() => setHovered(null)}
                  width={100}
                  x={x}
                  y={y}
                  fontSize={fontSizes.body1}
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

export default StreamGraphChart;
