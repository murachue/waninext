// instantiated node
import { FunctionComponent, PropsWithChildren, useEffect } from "react";
import { useDrag } from "react-dnd";
import { getEmptyImage } from "react-dnd-html5-backend";
import Draggable from "./dragable";
import Node from "./node";
import Plug from "./plug";
import SoundNode from "./sndnode";
import { NodeState } from "./state";

const InstNode: FunctionComponent<{
    index: number;
    state: NodeState;
    plugHandlers: Parameters<typeof Plug>[0]["handlers"];
    plugStateTuple: Parameters<typeof Plug>[0]["stateTuple"];
    x: number;
    y: number;
    dragstart?: Parameters<typeof Draggable>[0]["dragstart"];
    dragend?: Parameters<typeof Draggable>[0]["dragend"];
    onChange: Parameters<typeof SoundNode>[0]["onChange"];
    onRemove: Parameters<typeof SoundNode>[0]["onRemove"];
}> = ({ index, state, plugHandlers, plugStateTuple, x, y, dragstart, dragend, onChange, onRemove }) => {
    // const [{ isDragging, offset }, dragref, preview] = useDrag({
    //     type: "InstNode",
    //     options: { dropEffect: "move" },
    //     item: { inputs, outputs, plugHandlers, plugStateTuple, children },
    //     collect: monitor => ({
    //         isDragging: !!monitor.isDragging(),
    //         offset: monitor.getDifferenceFromInitialOffset(),
    //     }),
    // });
    // useEffect(() => {
    //     // preview(getEmptyImage(), { captureDraggingState: true }); // TODO: how if touch backend?
    // }, [preview]);
    // // useEffect(() => { console.log(offset); }, [offset]);

    // return <div ref={dragref} style={{
    //     opacity: isDragging ? 0.5 : 1,
    //     position: "absolute",
    //     transform: `translate(${x + (offset?.x || 0)}px, ${y + (offset?.y || 0)}px)`,
    // }}>
    //     <Node inputs={inputs} outputs={outputs} plugHandlers={plugHandlers} plugStateTuple={plugStateTuple}>
    //         {children}
    //     </Node>
    // </div>;

    return <Draggable dragstart={dragstart} dragend={dragend}>
        <div style={{ left: x, top: y }}>
            <SoundNode
                index={index}
                state={state}
                plugHandlers={plugHandlers}
                plugStateTuple={plugStateTuple}
                onChange={onChange}
                onRemove={onRemove} />
        </div>
    </Draggable>;
};

export default InstNode;
