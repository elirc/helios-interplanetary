export function StationDiagram({
  degraded,
  designation,
  stationName,
}: {
  degraded: boolean;
  designation: string;
  stationName: string;
}) {
  return (
    <svg
      className="station-diagram"
      viewBox="0 0 460 250"
      role="img"
      aria-label={`${stationName} schematic. Coolant loop ${degraded ? "degraded" : "nominal"}. ${designation} monitored.`}
    >
      <defs>
        <pattern id="station-grid" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M20 0H0V20" fill="none" stroke="#1e2d3b" strokeWidth=".45" />
        </pattern>
        <pattern id="solar-grid" width="10" height="12" patternUnits="userSpaceOnUse">
          <rect width="10" height="12" fill="#183042" />
          <path d="M10 0H0V12" fill="none" stroke="#31546a" strokeWidth=".6" />
        </pattern>
      </defs>
      <rect x="0" y="0" width="460" height="250" fill="url(#station-grid)" />
      <ellipse
        cx="227"
        cy="123"
        rx="170"
        ry="90"
        fill="none"
        stroke="#334452"
        strokeDasharray="3 7"
        opacity=".6"
      />
      <path d="M40 208h26m-13-13v26M398 39h26m-13-13v26" stroke="#455968" strokeWidth=".8" />
      <g transform="translate(228 128) rotate(-25)">
        <path d="M-148 0H151M-82-65V65M84-65V65" stroke="#566d7a" strokeWidth="5" />
        {[-114, 62].map((offset) => (
          <g key={offset}>
            {[-71, 20].map((dy) => (
              <g key={dy}>
                <rect
                  x={offset}
                  y={dy}
                  width="50"
                  height="51"
                  rx="1"
                  fill="url(#solar-grid)"
                  stroke="#577787"
                  strokeWidth="1"
                />
                <path d={`M${offset + 25} ${dy}v51`} stroke="#70929f" strokeWidth="2" />
              </g>
            ))}
          </g>
        ))}
        <rect x="-69" y="-14" width="138" height="28" rx="8" fill="#2d4251" stroke="#7c949f" />
        <path d="M-50-14v28M-30-14v28M30-14v28M50-14v28" stroke="#6d8794" />
        <rect x="-18" y="-48" width="36" height="96" rx="12" fill="#354c5b" stroke="#9bb1b8" />
        <path d="M-18-29h36M-18 29h36M-9-47v94M9-47v94" stroke="#708b98" />
        <circle r="16" fill="#182c3b" stroke="#a4bac1" strokeWidth="2" />
        <circle r="8" fill="#405f70" stroke="#7599a7" />
        <rect x="-12" y="47" width="24" height="20" rx="5" fill="#263b49" stroke="#7a929c" />
        <path d="M-9 68l9 10 9-10" stroke="#68838f" fill="none" />
        <circle cx="40" cy="0" r="11" fill={degraded ? "#ffa969" : "#73d6bc"} opacity=".13" />
        <circle cx="40" cy="0" r="4" fill={degraded ? "#ffa969" : "#73d6bc"} />
      </g>
      <path
        d="M266 111l47-35h68"
        fill="none"
        stroke={degraded ? "#c88c56" : "#548d82"}
        strokeWidth="1"
      />
      <text x="318" y="66" className="diagram-title">
        {designation.toUpperCase()}
      </text>
      <text x="318" y="91" className="svg-label" fill={degraded ? "#ffb66a" : "#73d6bc"}>
        {degraded ? "ANOMALY DETECTED" : "COOLANT LOOP ACTIVE"}
      </text>
      <text x="20" y="28" className="svg-label">
        EXTERNAL ASSEMBLY / 01
      </text>
      <text x="20" y="232" className="svg-label">
        SCHEMATIC · NOT TO SCALE
      </text>
      <text x="430" y="232" textAnchor="end" className="svg-label">
        N ↗
      </text>
    </svg>
  );
}
