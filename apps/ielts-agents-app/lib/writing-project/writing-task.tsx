import type {ChartConfig} from "~/components/ui/chart";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";

import { Badge } from "~/components/ui/badge";
import { Card, CardContent } from "~/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent
} from "~/components/ui/chart";
import { ScrollArea } from "~/components/ui/scroll-area";
import { Separator } from "~/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";

interface ChartData {
  type: "bar" | "line" | "pie" | "table";
  title: string;
  data: Record<string, string | number>[];
  xKey: string;
  dataKeys: { key: string; label: string }[];
}

interface WritingTaskProps {
  task: {
    taskType: string;
    prompt: string;
    visualDescription: string | null;
    chartData: ChartData | null;
    requirements: { wordCount: number; timeLimit: number };
    difficulty: string;
  };
}

const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

function buildChartConfig(dataKeys: { key: string; label: string }[]): ChartConfig {
  const config: ChartConfig = {};
  for (const [i, dk] of dataKeys.entries()) {
    config[dk.key] = {
      label: dk.label,
      color: CHART_COLORS[i % CHART_COLORS.length],
    };
  }
  return config;
}

function TaskChart({ chartData }: { chartData: ChartData }) {
  const config = buildChartConfig(chartData.dataKeys);

  if (chartData.type === "table") {
    return (
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{chartData.xKey}</TableHead>
              {chartData.dataKeys.map((dk) => (
                <TableHead key={dk.key}>{dk.label}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {chartData.data.map((row, i) => (
              <TableRow key={i}>
                <TableCell className="font-medium">
                  {row[chartData.xKey]}
                </TableCell>
                {chartData.dataKeys.map((dk) => (
                  <TableCell key={dk.key}>{row[dk.key]}</TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  if (chartData.type === "pie") {
    return (
      <ChartContainer className="mx-auto aspect-square max-h-[300px]" config={config}>
        <PieChart>
          <ChartTooltip content={<ChartTooltipContent />} />
          <Pie
            label
            data={chartData.data.map((d) => ({
              name: String(d[chartData.xKey]),
              value: Number(d[chartData.dataKeys[0].key]),
            }))}
            dataKey="value"
            nameKey="name"
          >
            {chartData.data.map((_d, i) => (
              <Cell
                key={i}
                fill={CHART_COLORS[i % CHART_COLORS.length]}
              />
            ))}
          </Pie>
          <Legend />
        </PieChart>
      </ChartContainer>
    );
  }

  if (chartData.type === "line") {
    return (
      <ChartContainer className="max-h-[300px] w-full" config={config}>
        <LineChart data={chartData.data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey={chartData.xKey} fontSize={12} tickLine={false} />
          <YAxis fontSize={12} tickLine={false} />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Legend />
          {chartData.dataKeys.map((dk, i) => (
            <Line
              key={dk.key}
              dataKey={dk.key}
              name={dk.label}
              stroke={CHART_COLORS[i % CHART_COLORS.length]}
              strokeWidth={2}
              type="monotone"
            />
          ))}
        </LineChart>
      </ChartContainer>
    );
  }

  // Default: bar chart
  return (
    <ChartContainer className="max-h-[300px] w-full" config={config}>
      <BarChart data={chartData.data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey={chartData.xKey} fontSize={12} tickLine={false} />
        <YAxis fontSize={12} tickLine={false} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Legend />
        {chartData.dataKeys.map((dk, i) => (
          <Bar
            key={dk.key}
            dataKey={dk.key}
            fill={CHART_COLORS[i % CHART_COLORS.length]}
            name={dk.label}
            radius={[4, 4, 0, 0]}
          />
        ))}
      </BarChart>
    </ChartContainer>
  );
}

export function WritingTask({ task }: WritingTaskProps) {
  const isTask1 = task.taskType === "task-1";

  return (
    <ScrollArea className="h-full">
      <div className="space-y-4 p-4">
        <div className="flex items-center gap-2">
          <Badge variant={isTask1 ? "secondary" : "default"}>
            {isTask1 ? "Task 1" : "Task 2"}
          </Badge>
          <Badge variant="outline">Band {task.difficulty}</Badge>
        </div>

        <Separator />

        <div>
          <h3 className="mb-2 text-sm font-semibold tracking-wide text-muted-foreground uppercase">
            Writing Task Instructions
          </h3>
          <Card>
            <CardContent className="pt-4">
              <p className="text-sm/relaxed whitespace-pre-wrap">
                {task.prompt}
              </p>
            </CardContent>
          </Card>
        </div>

        {isTask1 && task.chartData && (
          <div>
            <h3 className="mb-2 text-sm font-semibold tracking-wide text-muted-foreground uppercase">
              {task.chartData.title}
            </h3>
            <Card>
              <CardContent className="pt-4">
                <TaskChart chartData={task.chartData} />
              </CardContent>
            </Card>
          </div>
        )}

        {isTask1 && !task.chartData && task.visualDescription && (
          <div>
            <h3 className="mb-2 text-sm font-semibold tracking-wide text-muted-foreground uppercase">
              Visual Data
            </h3>
            <Card className="bg-muted/50">
              <CardContent className="pt-4">
                <p className="text-sm/relaxed whitespace-pre-wrap italic">
                  {task.visualDescription}
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        <Separator />

        <div className="flex flex-wrap gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Word count: </span>
            <span className="font-medium">{task.requirements.wordCount}+</span>
          </div>
          <div>
            <span className="text-muted-foreground">Time limit: </span>
            <span className="font-medium">
              {task.requirements.timeLimit} min
            </span>
          </div>
        </div>
      </div>
    </ScrollArea>
  );
}
