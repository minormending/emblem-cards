import type { Card } from "@cards/shared";
import { getCardIcon, type IconShape } from "@cards/shared";

function renderShape(shape: IconShape, key: number) {
  const fill = shape.kind !== "line" ? (shape.fill ?? "white") : undefined;
  const stroke =
    "strokeOpacity" in shape || ("stroke" in shape && shape.stroke)
      ? (shape.stroke ?? "white")
      : undefined;

  switch (shape.kind) {
    case "path":
      return (
        <path
          key={key}
          d={shape.d}
          fill={fill}
          fillOpacity={shape.fillOpacity}
          stroke={stroke}
          strokeOpacity={shape.strokeOpacity}
          strokeWidth={shape.strokeWidth}
        />
      );
    case "rect":
      return (
        <rect
          key={key}
          x={shape.x}
          y={shape.y}
          width={shape.width}
          height={shape.height}
          rx={shape.rx}
          fill={fill}
          fillOpacity={shape.fillOpacity}
        />
      );
    case "circle":
      return (
        <circle
          key={key}
          cx={shape.cx}
          cy={shape.cy}
          r={shape.r}
          fill={fill}
          fillOpacity={shape.fillOpacity}
          stroke={stroke}
          strokeOpacity={shape.strokeOpacity}
          strokeWidth={shape.strokeWidth}
          strokeDasharray={shape.strokeDasharray}
        />
      );
    case "line":
      return (
        <line
          key={key}
          x1={shape.x1}
          y1={shape.y1}
          x2={shape.x2}
          y2={shape.y2}
          stroke={shape.stroke ?? "white"}
          strokeOpacity={shape.strokeOpacity}
          strokeWidth={shape.strokeWidth}
        />
      );
    case "polygon":
      return (
        <polygon
          key={key}
          points={shape.points}
          fill={fill}
          fillOpacity={shape.fillOpacity}
        />
      );
    case "ellipse":
      return (
        <ellipse
          key={key}
          cx={shape.cx}
          cy={shape.cy}
          rx={shape.rx}
          ry={shape.ry}
          fill={fill}
          fillOpacity={shape.fillOpacity}
        />
      );
  }
}

export function CardIconSvg({ card }: { card: Card }) {
  const icon = getCardIcon(card);
  const { x, y, scale } = icon.transform;
  return (
    <g transform={`translate(${x}, ${y}) scale(${scale})`}>
      {icon.shapes.map(renderShape)}
    </g>
  );
}
