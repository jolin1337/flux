import { MIXPANEL_TOKEN } from "../../main";
import { Row } from "../../utils/chakra";
import { getFluxNodeTypeColor } from "../../utils/color";
import { modifyFluxNodeLabel, modifyReactFlowNodeProperties } from "../../utils/fluxNode";
import { FluxNodeData, FluxNodeType } from "../../utils/types";
import { Box, Input, Tooltip, position } from "@chakra-ui/react";
import mixpanel from "mixpanel-browser";
import { useEffect, useState } from "react";
import { Handle, Position, useReactFlow } from "reactflow";

export const defaultNodeHandleId = 'message';
export function TemplateNode({
  id,
  data,
  isConnectable,
}: {
  id: string;
  data: FluxNodeData;
  isConnectable: boolean;
}) {
  const handles = [{id: defaultNodeHandleId}].concat(data.handles && data.handles.length > 0 ? data.handles : []).filter((_) => data.fluxNodeType !== FluxNodeType.System);
  const width = 150;
  const middle = width / 2;

  return (
    <div className="react-flow__node-default" style={{background: getFluxNodeTypeColor(data.fluxNodeType), border: 'none', borderRadius: 6}}>
        {handles.map((handle, i) => (
            <Handle 
              type="target"
              id={handle.id}
              key={i}
              position={Position.Top}
              style={{left: (width * i + middle) / handles.length, backgroundColor: handle.id === defaultNodeHandleId ? 'black' : 'blue', border: 'none'}}
              isConnectable={isConnectable} 
            ><div style={{
                fontSize: 10,
                position: 'relative',
                top: -20,
                display: 'inline-block',
            }}>{handle.id === defaultNodeHandleId ? '' : handle.id}</div></Handle>
        ))}
        {data.label}
        <Handle type="source" position={Position.Bottom} isConnectable={isConnectable} />
    </div>
  );
}
