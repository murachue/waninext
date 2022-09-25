import { FunctionComponent, HTMLAttributes } from "react";
import styles from "./sndnode.module.css";
import Plug from "./plug";
import { NodeState } from "./state";

const SoundNode: FunctionComponent<Partial<Pick<HTMLAttributes<HTMLElement>, "className" | "style">> & {
    index: number | string;
    state: NodeState;
    plugHandlers: Parameters<typeof Plug>[0]["handlers"];
    plugStateTuple: Parameters<typeof Plug>[0]["stateTuple"];
}> = ({ className, style, index, state, plugHandlers, plugStateTuple }) => {
    return <div className={`${styles.base} ${className}`} style={style}>
        <div className={styles.title}>{state.type.type}</div>
        {state.type.inputs.map((pin, i) =>
            <div key={pin.name} className={styles.input}>
                <Plug id={`n${index}i${i}`} className={styles.plug} handlers={plugHandlers} stateTuple={plugStateTuple} />
                <div className={styles.label}>
                    {pin.name}
                </div>
                {/* <input type="text" /> */}
            </div>)}
        {/* <div style={{ padding: "5px 5px" }}>test</div> */}
        {state.type.outputs.map((pin, i) =>
            <div key={pin.name} className={styles.output}>
                <div className={styles.label}>
                    {pin.name}
                </div>
                <Plug id={`n${index}o${i}`} className={styles.plug} handlers={plugHandlers} stateTuple={plugStateTuple} />
            </div>)}
    </div>;
};

export default SoundNode;
