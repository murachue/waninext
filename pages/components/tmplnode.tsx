// Node in the Template
import { FunctionComponent, PropsWithChildren, useEffect, useState } from "react";
import { useDrag } from "react-dnd";
import { getEmptyImage } from "react-dnd-html5-backend";
import Node from "./node";
import { defaultPlugState, PlugState } from "./plug";
import style from "./tmplnode.module.css";

const TmplNode: FunctionComponent<PropsWithChildren<{
    inputs: (string | null | undefined)[];
    outputs: (string | null | undefined)[];
}>> = ({ inputs, outputs, children }) => {
    const dummyPlug = useState<PlugState>(defaultPlugState());
    const [{ isDragging }, dragref, preview] = useDrag({
        type: "TmplNode",
        options: { dropEffect: "move" },
        item: { inputs, outputs, plugHandlers: { dragstart: () => "" }, plugStateTuple: dummyPlug, children },
        collect: monitor => ({
            isDragging: !!monitor.isDragging(),
        }),
    });
    useEffect(() => {
        // preview(getEmptyImage(), { captureDraggingState: true }); // TODO: how if touch backend?
    }, [preview]);

    return <div className={style.marginer}>
        <div ref={dragref} style={{ opacity: isDragging ? 0.8 : 1 }}>
            <Node inputs={inputs} outputs={outputs} plugHandlers={{ dragstart: () => "" }} plugStateTuple={dummyPlug}>
                {children}
            </Node>
        </div>
    </div>;
};

export default TmplNode;
