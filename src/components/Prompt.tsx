import { MIXPANEL_TOKEN } from "../main";
import { Row, Center, Column } from "../utils/chakra";
import { getFluxNodeTypeColor, getFluxNodeTypeDarkColor } from "../utils/color";
import { displayNameFromFluxNodeType, getMessageLineage, setFluxNodeStreamId } from "../utils/fluxNode";
import { FluxNodeData, FluxNodeType, Settings } from "../utils/types";
import { BigButton } from "./utils/BigButton";
import { LabeledSlider, LabeledSelect } from "./utils/LabeledInputs";
import { Markdown } from "./utils/Markdown";
import { EditIcon, ViewIcon, NotAllowedIcon } from "@chakra-ui/icons";
import {
  Box,
  Spinner,
  Text,
  Button,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon,
} from '@chakra-ui/react';
import mixpanel from "mixpanel-browser";
import { useState, useEffect, useRef } from "react";
import TextareaAutosize from "react-textarea-autosize";
import { Node, useReactFlow } from "reactflow";
import { getPlatformModifierKeyText } from "../utils/platform";
import { Whisper } from "./utils/Whisper";


function NodeInfo(
  {
    hover, 
    onClick, 
    isStreaming, 
    isEditing, 
    fluxNodeType
  }: {
    hover: boolean, 
    onClick: () => void, 
    isEditing: boolean, 
    isStreaming: boolean, 
    fluxNodeType: FluxNodeType
}) {
  return (<>
    <Button
      display={
        hover
          ? "block"
          : "none"
      }
      onClick={onClick}
      position="absolute"
      top={1}
      right={1}
      zIndex={10}
      variant="outline"
      border="0px"
      p={1}
      _hover={{ background: "none" }}
    >
      {isStreaming ? (
        <NotAllowedIcon boxSize={4} />
      ) : isEditing ? (
        <ViewIcon boxSize={4} />
      ) : (
        <EditIcon boxSize={4} />
      )}
    </Button>
    <Text fontWeight="bold" width="auto" whiteSpace="nowrap">
      {displayNameFromFluxNodeType(fluxNodeType)}
      :&nbsp;
    </Text>
  </>);
}

function PromptNode ({
  isLast,
  data,
  nodeId,
  apiKey,
  onType,
  selectNode,
}: {
  isLast: boolean,
  data: FluxNodeData,
  nodeId: string,
  apiKey: string | null,
  onType: (text: string) => void,
  selectNode: (id: string) => void,
}) {

  const [hovered, setHovered] = useState<boolean>(false);
  const [isEditing, setIsEditing] = useState(
    isLast && [FluxNodeType.User, FluxNodeType.System].includes(data.fluxNodeType)
  );
  const { setNodes } = useReactFlow();
  const textOffsetRef = useRef<number>(-1);
  const width = innerWidth * 0.5 - 200;
  const middle = width / 2;

  const stopGenerating = () => {
    // Reset the stream id.
    setNodes((nodes) =>
      setFluxNodeStreamId(nodes, { id: nodeId, streamId: undefined })
    );

    if (MIXPANEL_TOKEN) mixpanel.track("Stopped generating response");
  };
  // Focus the textbox when the user changes into edit mode.
  useEffect(() => {
    // If the user clicked on the node, we assume they want to edit it.
    // Otherwise, we only put them in edit mode if its a user or system node.
    setIsEditing(
      isLast && 
      (textOffsetRef.current !== -1 || [FluxNodeType.User, FluxNodeType.System].includes(data.fluxNodeType))
    );
  }, [nodeId]);
  useEffect(() => {
    if (isEditing) {
      const promptBox = window.document.getElementById(
        "promptBox"
      ) as HTMLTextAreaElement | null;

      // Focus the text box and move the cursor to chosen offset (defaults to end).
      promptBox?.setSelectionRange(textOffsetRef.current, textOffsetRef.current);
      promptBox?.focus();

      // Default to moving to the end of the text.
      textOffsetRef.current = -1;
    }
  }, [nodeId, isEditing]);

  return <Column
    width="100%"
    whiteSpace="pre-wrap" // Preserve newlines.
    mainAxisAlignment="flex-start"
    crossAxisAlignment="flex-start"
    borderRadius="6px"
    borderLeftWidth={isLast ? "4px" : "0px"}
    margin={'0 15px'}
    _hover={{
      boxShadow: isLast ? "none" : "0 0 0 0.5px #1a192b",
    }}
    borderColor={getFluxNodeTypeDarkColor(data.fluxNodeType)}
    position="relative"
    onMouseEnter={() => setHovered(true)}
    onMouseLeave={() => setHovered(false)}
    bg={getFluxNodeTypeColor(data.fluxNodeType)}
    onClick={() => {
      const selection = window.getSelection();

      // We don't want to trigger the selection
      // if they're just selecting/copying text.
      if (selection?.isCollapsed) {
        if (isLast) {
          if (data.streamId) {
            stopGenerating();
            setIsEditing(true);
          } else if (!isEditing) setIsEditing(true);
        } else {
          // TODO: Note this is basically broken because of codeblocks.
          textOffsetRef.current = selection.anchorOffset ?? 0;

          selectNode(nodeId);
          setIsEditing(true);
        }
      }
    }}
    cursor={isLast && isEditing ? "text" : "pointer"}
  >
    
    {data.handles?.map((handle, i) => (
        <div 
          key={i}
          id={handle.id}
          style={{left: (width * i + middle) / (data.handles?.length || 1), position: 'absolute'}}
        ><div style={{
            fontSize: 10,
            position: 'relative',
            top: -20,
            display: 'inline-block',
        }}>{handle.id}</div></div>
    ))}
    <Row
      width="100%"
      mainAxisAlignment="flex-start"
      crossAxisAlignment="flex-start"
      margin={3}
      borderRadius="6px"
    >
      {data.streamId && data.text === "" ? (
        <Center expand>
          <Spinner />
        </Center>
      ) : (
        <>
          <NodeInfo
            hover={hovered}
            onClick={() => data.streamId ? stopGenerating() : setIsEditing(!isEditing)}
            isEditing={isEditing}
            isStreaming={!isEditing && !!data.streamId}
            fluxNodeType={data.fluxNodeType}
          />
          <Column
            width="100%"
            marginRight="30px"
            whiteSpace="pre-wrap" // Preserve newlines.
            mainAxisAlignment="flex-start"
            crossAxisAlignment="flex-start"
            borderRadius="6px"
            wordBreak="break-word"
            minHeight={
              data.fluxNodeType === FluxNodeType.User && isLast && isEditing
                ? "75px"
                : "0px"
            }
          >
            {isLast && isEditing ? (
              <>
                <TextareaAutosize
                  id="promptBox"
                  style={{
                    width: "100%",
                    backgroundColor: "transparent",
                    outline: "none",
                  }}
                  minRows={data.fluxNodeType === FluxNodeType.User ? 3 : 1}
                  value={data.text ?? ""}
                  onChange={(e) => onType(e.target.value)}
                  placeholder={
                    data.fluxNodeType === FluxNodeType.User
                      ? "Write a poem about..."
                      : data.fluxNodeType === FluxNodeType.System
                      ? "You are ChatGPT..."
                      : undefined
                  }
                />
                {data.fluxNodeType === FluxNodeType.User && (
                  <Whisper
                    onConvertedText={(text: string) =>
                      onType(`${data.text}${data.text ? " " : ""}${text}`)
                    }
                    apiKey={apiKey}
                  />
                )}
              </>
            ) : (
              <Markdown text={data.text} />
            )}
          </Column>
        </>
      )}
    </Row>
  </Column>
}

export function Prompt({
  lineage,
  existingEdges,
  submitPrompt,
  onType,
  selectNode,
  newConnectedToSelectedNode,
  settings,
  setSettings,
  apiKey,
}: {
  lineage: Array<Node<FluxNodeData>[]>;
  existingEdges: Edge[];
  onType: (text: string) => void;
  onModelChange: (model: string) => void;
  submitPrompt: () => Promise<void>;
  selectNode: (id: string) => void;
  newConnectedToSelectedNode: (type: FluxNodeType) => void;
  settings: Settings;
  setSettings: (settings: Settings) => void;
  apiKey: string | null;
}) {

  const promptNode = lineage[0][0];

  const promptNodeType = promptNode.data.fluxNodeType;

  const onMainButtonClick = () => {
    if (promptNodeType === FluxNodeType.User) {
      submitPrompt();
    } else {
      newConnectedToSelectedNode(FluxNodeType.User);
    }
  };


  /*//////////////////////////////////////////////////////////////
                              STATE
  //////////////////////////////////////////////////////////////*/

  const [model, setModel] = useState<string>(settings.models.find(m => m.selected) || settings.models[0].model);

  /*//////////////////////////////////////////////////////////////
                              EFFECTS
  //////////////////////////////////////////////////////////////*/


  // Scroll to the prompt buttons
  // when the bottom node is swapped.
  useEffect(() => {
    window.document
      .getElementById("promptButtons")
      ?.scrollIntoView(/* { behavior: "smooth" } */);
  }, [promptNode.id]);


  /*//////////////////////////////////////////////////////////////
                              APP
  //////////////////////////////////////////////////////////////*/

  const modifierKeyText = getPlatformModifierKeyText();
  const messageLineage = getMessageLineage(lineage, existingEdges).map(m => [m]);
  const templateLineage = lineage.map(nodes => nodes.filter(n => !messageLineage.some(m => m[0].id !== n.id))).filter(nodes => nodes.length > 0);

  return (<>
    <Tabs isFitted>
      <TabPanels>
          {[messageLineage, templateLineage].filter(l => l.length > 0).map((lin, i) => (
            <TabPanel key={i}>
              {lin
                .slice(1)
                .reverse()
                .map((nodes, j) => {
                  return <Row
                    mb={2}
                    p={3}
                    key={j}
                    mainAxisAlignment="flex-start"
                    crossAxisAlignment="flex-start"
                  >
                    {nodes.map((node, k) => {
                      const data = node.data;
                      return <PromptNode
                        apiKey={apiKey}
                        data={data}
                        isLast={false}
                        nodeId={node.id}
                        onType={onType}
                        selectNode={selectNode}
                        key={k}
                      />;
                    })}
                  </Row>
                })
              }
            </TabPanel>
          ))}
      </TabPanels>
      <TabList >
        <Tab>Chat messages</Tab>
        {templateLineage.length > 0 && <Tab>Templated messages</Tab>}
      </TabList>
    </Tabs>

    <Row
      mb={2}
      p={3}
      mainAxisAlignment="flex-start"
      crossAxisAlignment="flex-start"
    >
      <PromptNode
        apiKey={apiKey}
        data={messageLineage[0][0].data}
        isLast={true}
        nodeId={messageLineage[0][0].id}
        onType={onType}
        selectNode={selectNode}
      />
    </Row>
    {promptNodeType === FluxNodeType.User ? (
      <Accordion>
        <AccordionItem>
          <h2>
            <AccordionButton>
              <Box as="span" flex='1' textAlign='center'>
                Model parameters
              </Box>
              <AccordionIcon />
            </AccordionButton>
          </h2>
          <AccordionPanel pb={4}>
            <Row mainAxisAlignment="flex-start" crossAxisAlignment="flex-start">
              <LabeledSelect
                width="100%"
                label="Model"
                value={model}
                options={settings.models.map(m => m.model).filter(m => !!m)}
                setValue={(newModel) => {
                  const m = settings.models.find(m => m.model === newModel)
                  m.selected = true;
                  setSettings({...settings, models: settings.models});
                  setModel(m.model);
                }}
              />
            </Row>
            <Row mainAxisAlignment="flex-start" crossAxisAlignment="flex-start">
              <LabeledSlider
                mt={3}
                label="Temperature (randomness)"
                value={settings.models.find(m => m.model === model).temperature}
                setValue={(v: number) => {
                  const m = settings.models.find(m => m.model === model);
                  m.temperature = v,
                  setSettings({ ...settings, models: settings.models });

                  if (MIXPANEL_TOKEN) mixpanel.track("Changed temperature inline");
                }}
                color={getFluxNodeTypeDarkColor(FluxNodeType.User)}
                max={1.99}
                min={0}
                step={0.01}
              />
            </Row>
            <Row mainAxisAlignment="flex-start" crossAxisAlignment="flex-start">
              <LabeledSlider
                mt={3}
                label="Number of Responses"
                value={settings.n}
                setValue={(v: number) => {
                  setSettings({ ...settings, n: v });

                  if (MIXPANEL_TOKEN) mixpanel.track("Changed number of responses inline");
                }}
                color={getFluxNodeTypeDarkColor(FluxNodeType.User)}
                max={10}
                min={1}
                step={1}
              />
            </Row>
          </AccordionPanel>
        </AccordionItem>
      </Accordion>) : null}
    <Row
      mainAxisAlignment="center"
      crossAxisAlignment="stretch"
      width="100%"
      height="100px"
      id="promptButtons"
    >
      <BigButton
        tooltip={
          promptNodeType === FluxNodeType.User
            ? `${modifierKeyText}⏎`
            : `${modifierKeyText}P`
        }
        onClick={onMainButtonClick}
        color={getFluxNodeTypeDarkColor(promptNodeType)}
        width="100%"
        height="100%"
        fontSize="lg"
      >
        {promptNodeType === FluxNodeType.User ? "Generate" : "Compose"}
        <Text fontWeight="extrabold">
          &nbsp;
          {promptNodeType === FluxNodeType.User
            ? displayNameFromFluxNodeType(FluxNodeType.GPT)
            : displayNameFromFluxNodeType(FluxNodeType.User)}
          &nbsp;
        </Text>
        response
      </BigButton>
    </Row>

  </>);
}
