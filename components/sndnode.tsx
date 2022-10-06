import { FunctionComponent, HTMLAttributes } from "react";
import Plug from "./plug";
import styles from "./sndnode.module.css";
import { genPlugId, genShortTy, INPUT, NodeState, NodeTypes, OUTPUT, PinType } from "./state";

const ConnectSlot: FunctionComponent<{ pin: PinType; }> = ({ pin }) => <div className={styles.label}>{pin.name}</div>;

const ParamSlot: FunctionComponent<{
    pin: PinType;
    value: string | number;
    onChange: (value: string) => void;
}> = ({ pin, value, onChange }) =>
        <div className={styles.inputbox}>
            <label>{pin.name}: {
                pin.choice
                    ? <select value={value} onChange={e => onChange(e.target.value)}>{pin.choice.map(c => <option key={c} label={c} value={c} />)}</select>
                    : <input type={pin.type === "param" ? "number" : ""} value={value} onChange={e => onChange(e.target.value)} />
            }{pin.unit}</label>
        </div>;

const SoundNode: FunctionComponent<Partial<Pick<HTMLAttributes<HTMLElement>, "className" | "style">> & {
    index: number;
    state: NodeState;
    plugHandlers: Parameters<typeof Plug>[0]["handlers"];
    plugStateTuple: Parameters<typeof Plug>[0]["stateTuple"];
    onChange: (target: { state: NodeState, nodeNo: number, inNo: number; }, value: string) => void;
    onRemove?: (target: number) => void;
}> = ({ className, style, index, state, plugHandlers, plugStateTuple, onChange, onRemove }) => {
    const type = NodeTypes[state.type];
    return <div className={`${styles.base} ${state.invalid ? styles.error : ""} ${className || ""}`} style={style}>
        <div className={styles.title}>{state.type}</div>
        {type.inputs.map((pin, i) =>
            <div key={i} className={`${styles.slot} ${styles.input}`}>
                {pin.type === "scalar" ? null : <Plug id={genPlugId(index, INPUT, i, type.inputs[i].type)} className={`${styles.plug} ${genShortTy(type.inputs[i].type) === "b" ? styles.plugb : styles.plugc}`} handlers={plugHandlers} stateTuple={plugStateTuple} />}
                {pin.type === "channels" || pin.type === "buffer"
                    ? <ConnectSlot pin={pin} />
                    : <ParamSlot pin={pin} value={state.inputs[i].value || ""} onChange={v => onChange({ state, nodeNo: index, inNo: i }, v)} />}
            </div>)}
        {/* <div style={{ padding: "5px 5px" }}>test</div> */}
        {type.outputs.map((pin, i) =>
            <div key={i} className={`${styles.slot} ${styles.output}`}>
                <div className={styles.label}>
                    {pin.name}
                </div>
                <Plug id={genPlugId(index, OUTPUT, i, type.outputs[i].type)} className={`${styles.plug} ${genShortTy(type.outputs[i].type) === "b" ? styles.plugb : styles.plugc}`} handlers={plugHandlers} stateTuple={plugStateTuple} />
            </div>)}
        {onRemove && state.type !== "output" && <div className={styles.remove} onClick={e => onRemove(index)}></div>}
    </div >;
};

export default SoundNode;
