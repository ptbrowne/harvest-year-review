export const Background = () => {
  return (
    <svg
      className="bg"
      xmlns="http://www.w3.org/2000/svg"
      version="1.1"
      viewBox="0 0 700 700"
      id="gggrain"
    >
      <defs>
        <linearGradient
          gradientTransform="rotate(-150, 0.5, 0.5)"
          x1="50%"
          y1="0%"
          x2="50%"
          y2="100%"
          id="gggrain-gradient2"
        >
          <stop stop-color="#00273E" stop-opacity="1" offset="-0%"></stop>
          <stop
            stop-color="rgba(255,255,255,0)"
            stop-opacity="0"
            offset="100%"
          ></stop>
        </linearGradient>
        <linearGradient
          gradientTransform="rotate(150, 0.5, 0.5)"
          x1="50%"
          y1="0%"
          x2="50%"
          y2="100%"
          id="gggrain-gradient3"
        >
          <stop stop-color="#00273E" stop-opacity="1"></stop>
          <stop
            stop-color="rgba(255,255,255,0)"
            stop-opacity="0"
            offset="100%"
          ></stop>
        </linearGradient>
        <filter
          id="gggrain-filter"
          x="-20%"
          y="-20%"
          width="140%"
          height="140%"
          filterUnits="objectBoundingBox"
          primitiveUnits="userSpaceOnUse"
          color-interpolation-filters="sRGB"
        >
          <feTurbulence
            type="fractalNoise"
            baseFrequency="1.05"
            numOctaves="2"
            seed="137"
            stitchTiles="stitch"
            x="0%"
            y="0%"
            width="100%"
            height="100%"
            result="turbulence"
          ></feTurbulence>
          <feColorMatrix
            type="saturate"
            values="0"
            x="0%"
            y="0%"
            width="100%"
            height="100%"
            in="turbulence"
            result="colormatrix"
          ></feColorMatrix>
          <feComponentTransfer
            x="0%"
            y="0%"
            width="100%"
            height="100%"
            in="colormatrix"
            result="componentTransfer"
          >
            <feFuncR type="linear" slope="3"></feFuncR>
            <feFuncG type="linear" slope="3"></feFuncG>
            <feFuncB type="linear" slope="3"></feFuncB>
          </feComponentTransfer>
          <feColorMatrix
            x="0%"
            y="0%"
            width="100%"
            height="100%"
            in="componentTransfer"
            result="colormatrix2"
            type="matrix"
            values="1 0 0 0 0
          0 1 0 0 0
          0 0 1 0 0
          0 0 0 21 -13"
          ></feColorMatrix>
        </filter>
      </defs>
      <g>
        <rect width="100%" height="100%" fill="#00273E"></rect>
        {/* <rect width="100%" height="100%" fill="url(#gggrain-gradient3)"></rect> */}
        <rect
          width="100%"
          height="100%"
          opacity="0.2"
          fill="url(#gggrain-gradient2)"
        ></rect>
        <rect
          width="100%"
          height="100%"
          fill="transparent"
          filter="url(#gggrain-filter)"
          opacity="0.2"
          style={{ mixBlendMode: "soft-light" }}
        ></rect>
      </g>
    </svg>
  );
};
