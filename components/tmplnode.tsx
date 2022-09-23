// Node in the Template
import { FunctionComponent, PropsWithChildren, useEffect, useState } from "react";
import { useDrag } from "react-dnd";
import { getEmptyImage } from "react-dnd-html5-backend";
import Node from "./node";
import { defaultPlugState, PlugState } from "./plug";

const TmplNode: FunctionComponent<PropsWithChildren<{
    inputs: (string | null | undefined)[];
    outputs: (string | null | undefined)[];
    preview?: boolean;
}>> = ({ inputs, outputs, children, preview }) => {
    const dummyPlug = useState<PlugState>(defaultPlugState());
    const [{ isDragging }, dragref, dragpreview] = useDrag({
        type: "TmplNode",
        // options: { dropEffect: "copy" },  // if we specify options, draggable become false and never returned to true... react-dnd@16
        item: { inputs, outputs, plugHandlers: { dragstart: () => "" }, plugStateTuple: dummyPlug, children },
        collect: monitor => ({
            isDragging: !!monitor.isDragging(),
        }),
    });
    useEffect(() => {
        dragpreview(getEmptyImage(), { captureDraggingState: true }); // TODO: how if touch backend?
    }, [dragpreview]);

    return <div ref={dragref} style={{ opacity: isDragging ? 0.5 : 1 }}>
        <Node inputs={inputs} outputs={outputs} plugHandlers={{ dragstart: () => "" }} plugStateTuple={dummyPlug}>
            <div style={preview ? { boxShadow: "0 5px 5px black" } : {}}>
                {children}
            </div>
        </Node>
    </div>;
};

export default TmplNode;
