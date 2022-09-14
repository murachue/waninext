import { FunctionComponent, h } from "preact";
import { StateUpdater } from "preact/hooks";
import Draggable from "./dragable";
import style from "./node.css";
import Plug, { PlugHandlers, PlugState } from "./plug";

const Node: FunctionComponent<{
    inputs: (string | null | undefined)[];
    outputs: (string | null | undefined)[];
    x: string;
    y: string;
    plugHandlers: PlugHandlers;
    plugStateTuple: [PlugState, StateUpdater<PlugState>];
}> = ({ inputs, outputs, x, y, plugHandlers, plugStateTuple, children }) => {
    return <Draggable><div class={style.dragger} style={{ left: x, top: y }}>
        <div class={`${style.plugs} ${style.inputside}`}>
            {inputs.map((id, i) => <Plug key={id || i} id={id || undefined} handlers={plugHandlers} stateTuple={plugStateTuple} />)}
        </div>
        {children}
        <div class={`${style.plugs} ${style.outputside}`}>
            {outputs.map((id, i) => <Plug key={id || i} id={id || undefined} handlers={plugHandlers} stateTuple={plugStateTuple} />)}
        </div>
    </div></Draggable>;
};

export default Node;
