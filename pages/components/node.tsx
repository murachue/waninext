import { FunctionComponent, PropsWithChildren } from "react";
import style from "./node.module.css";
import Plug from "./plug";

const Node: FunctionComponent<PropsWithChildren<{
    inputs: (string | null | undefined)[];
    outputs: (string | null | undefined)[];
    plugHandlers: Parameters<typeof Plug>[0]["handlers"];
    plugStateTuple: Parameters<typeof Plug>[0]["stateTuple"];
}>> = ({ inputs, outputs, plugHandlers, plugStateTuple, children }) => {
    return <div className={style.outer}>
        <div className={`${style.plugs} ${style.inputside}`}>
            {inputs.map((id, i) => <Plug key={id || i} id={id || undefined} handlers={plugHandlers} stateTuple={plugStateTuple} />)}
        </div>
        {children}
        <div className={`${style.plugs} ${style.outputside}`}>
            {outputs.map((id, i) => <Plug key={id || i} id={id || undefined} handlers={plugHandlers} stateTuple={plugStateTuple} />)}
        </div>
    </div>;
};

export default Node;
