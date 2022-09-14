import { Dispatch, FunctionComponent, PropsWithChildren, SetStateAction } from "react";
import Draggable from "./dragable";
import style from "./node.module.css";
import Plug, { PlugHandlers, PlugState } from "./plug";

const Node: FunctionComponent<PropsWithChildren<{
    inputs: (string | null | undefined)[];
    outputs: (string | null | undefined)[];
    x: string;
    y: string;
    plugHandlers: PlugHandlers;
    plugStateTuple: [PlugState, Dispatch<SetStateAction<PlugState>>];
}>> = ({ inputs, outputs, x, y, plugHandlers, plugStateTuple, children }) => {
    return <Draggable><div className={style.dragger} style={{ left: x, top: y }}>
        <div className={`${style.plugs} ${style.inputside}`}>
            {inputs.map((id, i) => <Plug key={id || i} id={id || undefined} handlers={plugHandlers} stateTuple={plugStateTuple} />)}
        </div>
        {children}
        <div className={`${style.plugs} ${style.outputside}`}>
            {outputs.map((id, i) => <Plug key={id || i} id={id || undefined} handlers={plugHandlers} stateTuple={plugStateTuple} />)}
        </div>
    </div></Draggable>;
};

export default Node;
