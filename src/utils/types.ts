import { Node, Edge, HandleType } from "reactflow";

import { ChatCompletionResponseMessage } from "openai-streams";

export type FluxHandleType = {
  id: string
};

export type FluxNodeData = {
  label: string;
  fluxNodeType: FluxNodeType;
  text: string;
  model?: string;
  streamId?: string;
  hasCustomlabel?: boolean;
  handles?: Array<FluxHandleType>;
};

export enum FluxNodeType {
  System = "System",
  User = "User",
  GPT = "GPT",
  TweakedGPT = "GPT (tweaked)",
};

export type OpenAISettings = {
  modelSource: string,
  temperature: number,
  n: number,
  apiKey: string,
  model: string
};
export type HFInferenceSettings = {
  modelSource: string,
  temperature: number,
  max_new_tokens: number,
  baseUrl: string,
  apiKey: string,
  model: string,
};

export type Settings = {
  defaultPreamble: string;
  autoZoom: boolean;
  models: Array<OpenAISettings | HFInferenceSettings>;
};

export enum ReactFlowNodeTypes {
  LabelUpdater = "LabelUpdater",
  Template = "Template",
}

// The stream response is weird and has a delta instead of message field.
export interface CreateChatCompletionStreamResponseChoicesInner {
  index?: number;
  delta?: ChatCompletionResponseMessage;
  finish_reason?: string;
}

export type HistoryItem = {
  nodes: Node[];
  edges: Edge[];
  selectedNodeId: string | null;
  lastSelectedNodeId: string | null;
};
