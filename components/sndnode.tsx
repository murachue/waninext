import { FunctionComponent } from "react";
import style from "./sndnode.module.css";
import Plug from "./plug";
import { NodeState } from "./state";

const SoundNode: FunctionComponent<{
    state: NodeState;
    plugHandlers: Parameters<typeof Plug>[0]["handlers"];
    plugStateTuple: Parameters<typeof Plug>[0]["stateTuple"];
}> = ({ state, plugHandlers, plugStateTuple }) => {
    return <div className={style.base}>
        <div className={style.title}>{state.type.type}</div>
        {state.type.inputs.map((pin, i) =>
            <div key={i} className={style.input}>
                <Plug /* id={i} */ className={style.plug} handlers={plugHandlers} stateTuple={plugStateTuple} />
                <div className={style.label}>
                    {pin.name}
                </div>
                {/* <input type="text" /> */}
            </div>)}
        <div style={{ padding: "5px 5px" }}>test</div>
        {state.type.outputs.map((pin, i) =>
            <div key={i} className={style.output}>
                <div className={style.label}>
                    {pin.name}
                </div>
                <Plug /* id={i} */ className={style.plug} handlers={plugHandlers} stateTuple={plugStateTuple} />
            </div>)}
    </div>;
};

export default SoundNode;
