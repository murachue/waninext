// Node in the Template
import { FunctionComponent, HTMLAttributes, PropsWithChildren, useEffect, useState } from "react";
import { useDrag } from "react-dnd";
import { getEmptyImage } from "react-dnd-html5-backend";
import { defaultPlugState, PlugState } from "./plug";
import SoundNode from "./sndnode";
import { NodeState } from "./state";

const TmplNode: FunctionComponent<Partial<Pick<HTMLAttributes<HTMLElement>, "className" | "style">> & {
    state: NodeState;
    preview?: boolean;
}> = ({ className, style, state, preview }) => {
    const dummyPlug = useState<PlugState>(defaultPlugState());
    const [{ isDragging }, dragref, dragpreview] = useDrag({
        type: "TmplNode",
        // options: { dropEffect: "copy" },  // if we specify options, draggable become false and never returned to true... react-dnd@16
        item: { state },
        collect: monitor => ({
            isDragging: !!monitor.isDragging(),
        }),
    });
    useEffect(() => {
        dragpreview(getEmptyImage(), { captureDraggingState: true }); // TODO: how if touch backend?
    }, [dragpreview]);

    return <div ref={dragref} style={{ opacity: isDragging ? 0.5 : 1 }}>
        <SoundNode
            className={className}
            style={{ ...(style || {}), boxShadow: preview ? "0 5px 5px black" : undefined }}
            index={"x" /* dummy */}
            state={state}
            plugHandlers={{ dragstart: () => "" }}
            plugStateTuple={[{ from: null, to: null }, () => { }]} />
    </div>;
};

export default TmplNode;
