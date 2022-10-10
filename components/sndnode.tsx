import { FunctionComponent, HTMLAttributes, useRef } from "react";
import { useDrop } from "react-dnd";
import { NativeTypes } from "react-dnd-html5-backend";
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
                    : <input type={pin.type === "param" ? "number" : "text"} value={value} onChange={e => onChange(e.target.value)} />
            }{pin.unit}</label>
        </div>;

const sibytes = (nbytes: number) =>
    nbytes < 1000
        ? `${nbytes}B`
        : nbytes < 1000000
            ? `${(nbytes / 1000).toFixed(2)}KB`
            : `${(nbytes / 1000000).toFixed(2)}MB`;

const SoundNode: FunctionComponent<Partial<Pick<HTMLAttributes<HTMLElement>, "className" | "style">> & {
    index: number;
    state: NodeState;
    plugHandlers: Parameters<typeof Plug>[0]["handlers"];
    plugStateTuple: Parameters<typeof Plug>[0]["stateTuple"];
    onChange: (target: { state: NodeState, nodeNo: number, inNo: number; }, value: string) => void;
    onRemove?: (target: number) => void;
    onLoadBuffer?: (index: number, state: { loading: true; } | { error: unknown; } | { buffer: ArrayBuffer; }) => void;
}> = ({ className, style, index, state, plugHandlers, plugStateTuple, onChange, onRemove, onLoadBuffer }) => {
    const type = NodeTypes[state.type];
    const urlref = useRef<HTMLInputElement>(null);
    // XXX: we need to explicit type useDrop??
    const [{ isOver }, dropref] = useDrop<{ files?: File[], items?: DataTransferItemList, urls?: string[]; }, void, { isOver: boolean; }>({
        accept: [NativeTypes.FILE, NativeTypes.URL],
        collect: (monitor) => ({
            isOver: monitor.isOver(),
        }),
        drop: (item, monitor) => {
            if (item.files && onLoadBuffer) {
                const file = item.files[0];
                (async () => {
                    onLoadBuffer(index, { loading: true });
                    try {
                        const buffer = await file.arrayBuffer();
                        onLoadBuffer(index, { buffer });
                    } catch (error) {
                        onLoadBuffer(index, { error });
                    }
                })();
            }
            if (item.urls) {
                urlref.current!.value = item.urls[0];
            }
        }
    }, []);

    return <div ref={dropref} className={`${styles.base} ${state.invalid ? styles.error : ""} ${isOver ? styles.dropping : ""} ${className || ""}`} style={style}>
        <div className={styles.title}>{state.type}</div>
        {type.inputs.map((pin, i) =>
            <div key={i} className={`${styles.slot} ${styles.input}`}>
                {pin.type === "scalar" ? null : <Plug id={genPlugId(index, INPUT, i, type.inputs[i].type)} className={`${styles.plug} ${genShortTy(type.inputs[i].type) === "b" ? styles.plugb : styles.plugc}`} handlers={plugHandlers} stateTuple={plugStateTuple} />}
                {pin.type === "channels" || pin.type === "buffer"
                    ? <ConnectSlot pin={pin} />
                    : <ParamSlot pin={pin} value={state.inputs[i].value || ""} onChange={v => onChange({ state, nodeNo: index, inNo: i }, v)} />}
            </div>)}
        {state.type !== "buffer" ? null :
            <div style={{ padding: "5px 5px" }}>
                <input ref={urlref} style={{ width: "8em" }} type="text" placeholder="URL..." />
                <button onClick={() => {
                    if (!onLoadBuffer) {
                        return;
                    }
                    (async () => {
                        onLoadBuffer(index, { loading: true });
                        try {
                            const res = await fetch(urlref.current!.value);
                            const buffer = await res.arrayBuffer();
                            onLoadBuffer(index, { buffer });
                        } catch (error) {
                            onLoadBuffer(index, { error });
                        }
                    })();
                }} >Load</button>
            </div>}
        {!state.lasterror ? null : <div style={{ padding: "5px 5px", color: "red" }}>
            {state.lasterror}
        </div>}
        {state.type !== "buffer" ? null : <div style={{ padding: "5px 5px" }}>
            {!state.abuffer ? "empty" : <>{state.abuffer.duration.toFixed(2)} sec ({sibytes(state.bbuffer!.byteLength)})</>}
        </div>}
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
