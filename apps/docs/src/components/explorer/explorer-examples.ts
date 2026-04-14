import type { ExplorerExample } from "./explorer-view";

export const explorerExamplesEn = [
  {
    description:
      "A first scene for showing fan-out and join: one request splits into parallel branches, then converges into a single result.",
    id: "fan-out",
    title: "Fan-out pipeline",
  },
  {
    description:
      "A race scene for presenting early completion: several branches start together, but the first useful answer can resolve the whole frame.",
    id: "race",
    title: "First-result race",
  },
  {
    description:
      "A layered scene for comparing tasks with different durations, useful when we want the stage to show overlap without turning into noise.",
    id: "staggered",
    title: "Staggered completion",
  },
] satisfies ExplorerExample[];

export const explorerExamplesZh = [
  {
    description: "适合展示最基础的分叉与汇合：一个入口任务展开成多个并发分支，再收束成一个结果。",
    id: "fan-out",
    title: "分叉汇合",
  },
  {
    description:
      "适合展示竞争策略：多个分支同时启动，但只要第一个可用结果出现，主流程就可以继续前进。",
    id: "race",
    title: "首个结果胜出",
  },
  {
    description:
      "适合展示不同时长的任务重叠，让页面能表达“有些分支先落定，有些分支继续拖尾”的节奏感。",
    id: "staggered",
    title: "错峰完成",
  },
] satisfies ExplorerExample[];
