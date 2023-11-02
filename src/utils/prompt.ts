import { FluxNodeData, FluxNodeType, Settings } from "./types";
import { ChatCompletionRequestMessage } from "openai-streams";
import { MAX_AUTOLABEL_CHARS } from "./constants";
import { Node, Edge } from "reactflow";
import { defaultNodeHandleId } from "../components/nodes/TemplateNode";
import { getMessageLineage } from "./fluxNode";

function messageFromNode(node: Node<FluxNodeData>, isFirst:  boolean, defaultPreamble: string): ChatCompletionRequestMessage[] {
  const messages = [];
  if (node.data.fluxNodeType === FluxNodeType.System) {
    messages.push({
      role: "system",
      content: node.data.text,
    });
  } else if (isFirst) {
    // If this is the first node and it's
    // not a system node, we'll push the
    // default preamble on there.
    messages.push({
      role: "system",
      content: defaultPreamble,
    });
  }

  if (node.data.fluxNodeType === FluxNodeType.User) {
    messages.push({
      role: "user",
      content: node.data.text,
    });
  } else if (
    node.data.fluxNodeType === FluxNodeType.TweakedGPT ||
    node.data.fluxNodeType === FluxNodeType.GPT
  ) {
    messages.push({
      role: "assistant",
      content: node.data.text,
    });
  }
  return messages;
}

export function computeTemplateToMessage(
  rootNode: Node<FluxNodeData>,
  existingEdges: Array<Edge>,
  parentLineage: Array<Node<FluxNodeData>[]>,
): Node<FluxNodeData> {
  const params = rootNode.data.text.split('{').slice(1).map(p => p.split('}')[0]);
  const paramValues = params.map(p => {
    const newNode = (
      parentLineage[0]
      .find(n => existingEdges.some(e => e.source === n.id && e.target === rootNode.id && e.targetHandle === p))
    );
    if (!newNode) throw Error("No node found for parameter: " + p);
    return computeTemplateToMessage(newNode, existingEdges, parentLineage.slice(1))
  });
  const textPieces = rootNode.data.text.split('}').map(p => p.split('{')[0]);
  let text = '';
  for (let i = 0; i < textPieces.length + params.length; i++) {
    if (i % 2 == 0) text += textPieces[Math.floor(i / 2)];
    if (i % 2 == 1) text += paramValues[Math.floor(i / 2)].data.text;
  }
  const computedNode = {...rootNode, data: {...rootNode.data, text}};
  return computedNode;
}

export function messagesFromLineage(
  lineage: Array<Node<FluxNodeData>[]>,
  existingEdges: Array<Edge>,
  settings: Settings
): ChatCompletionRequestMessage[] {
  const messageLineage = getMessageLineage(lineage, existingEdges);
  const messages: ChatCompletionRequestMessage[] = (
    messageLineage
    .reduce((previousNodes: ChatCompletionRequestMessage[], node, i) => {
      const computedNode = node.data.fluxNodeType === FluxNodeType.User ? computeTemplateToMessage(node, existingEdges, lineage.slice(i + 1)) : node;
      console.log("hej", computedNode.data.text);
      const newMessages = messageFromNode(computedNode, i === lineage.length - 1, settings.defaultPreamble);
      return [...newMessages, ...previousNodes];
    }, [])
  );
  console.table(messages);

  return messages;
}

export function promptFromLineage(
  lineage: Array<Node<FluxNodeData>[]>,
  existingEdges: Array<Edge>,
  settings: Settings,
  endWithNewlines: boolean = false
): string {
  const messages = messagesFromLineage(lineage, existingEdges, settings);

  let prompt = "";

  messages.forEach((message, i) => {
    prompt += `${message.role}: ${message.content}`;

    if (endWithNewlines ? true : i !== messages.length - 1) {
      prompt += "\n\n";
    }
  });

  return prompt;
}

export function formatAutoLabel(text: string) {
  const formattedText = removeInvalidChars(text);

  return formattedText.length > MAX_AUTOLABEL_CHARS
    ? formattedText.slice(0, MAX_AUTOLABEL_CHARS).split(" ").slice(0, -1).join(" ") +
        " ..."
    : formattedText;
}

function removeInvalidChars(text: string) {
  // The regular expression pattern:
  // ^: not
  // a-zA-Z0-9: letters and numbers
  // .,?!: common punctuation marks
  // \s: whitespace characters (space, tab, newline, etc.)
  const regex = /[^a-zA-Z0-9.,'?!-\s]+/g;

  // Replace `\n` with spaces and remove invalid characters
  const cleanedStr = text.replaceAll("\n", " ").replace(regex, "");

  return cleanedStr;
}
