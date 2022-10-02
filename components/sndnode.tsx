import { FunctionComponent, HTMLAttributes } from "react";
import styles from "./sndnode.module.css";
import Plug from "./plug";
import { NodeState, PinType } from "./state";

const ConnectSlot: FunctionComponent<{ pin: PinType; }> = ({ pin }) => <div className={styles.label}>{pin.name}</div>;

const ConstSlot: FunctionComponent<{
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
    return <div className={`${styles.base} ${state.invalid ? styles.error : ""} ${className || ""}`} style={style}>
        <div className={styles.title}>{state.type.type}</div>
        {state.type.inputs.map((pin, i) =>
            <div key={pin.name} className={styles.input}>
                <Plug id={`n${index}i${i}`} className={styles.plug} handlers={plugHandlers} stateTuple={plugStateTuple} />
                {pin.type === "channels"
                    ? <ConnectSlot pin={pin} />
                    : <ConstSlot pin={pin} value={state.inputs[i].value || ""} onChange={v => onChange({ state, nodeNo: index, inNo: i }, v)} />}
            </div>)}
        {/* <div style={{ padding: "5px 5px" }}>test</div> */}
        {state.type.outputs.map((pin, i) =>
            <div key={pin.name} className={styles.output}>
                <div className={styles.label}>
                    {pin.name}
                </div>
                <Plug id={`n${index}o${i}`} className={styles.plug} handlers={plugHandlers} stateTuple={plugStateTuple} />
            </div>)}
        {onRemove && <div className={styles.remove} onClick={e => onRemove(index)}></div>}
    </div >;
};

export default SoundNode;
