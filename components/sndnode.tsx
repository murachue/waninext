import { FunctionComponent, HTMLAttributes, useRef } from "react";
import { useDrop } from "react-dnd";
import { NativeTypes } from "react-dnd-html5-backend";
import Plug from "./plug";
import styles from "./sndnode.module.css";
import { genPlugId, genShortTy, INPUT, NodeState, NodeType, NodeTypes, OUTPUT, PinType } from "./state";

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

type OnLoadBufferFunc = (index: number, state: { loading: true; } | { error: unknown; } | { buffer: ArrayBuffer; }) => void;

const loadWrapper = async (index: number, onLoadBuffer: OnLoadBufferFunc | undefined, loader: () => Promise<ArrayBuffer>) => {
    if (!onLoadBuffer) {
        return;
    }

    onLoadBuffer(index, { loading: true });
    try {
        const buffer = await loader();
        onLoadBuffer(index, { buffer });
    } catch (error) {
        onLoadBuffer(index, { error });
    }
};

export type PlugParams = {
    handlers: Parameters<typeof Plug>[0]["handlers"];
    stateTuple: Parameters<typeof Plug>[0]["stateTuple"];
};

const NodePlug = ({ nodeNo, io, pinNo, pin, plugParams }: { nodeNo: number, io: typeof INPUT | typeof OUTPUT, pinNo: number, pin: PinType, plugParams: PlugParams; }) =>
    pin.type === "scalar" || pin.plug === false
        ? null
        : <Plug
            id={genPlugId(nodeNo, io, pinNo, pin.type)}
            className={`${styles.plug} ${genShortTy(pin.type) === "b" ? styles.plugb : styles.plugc}`}
            handlers={plugParams.handlers}
            stateTuple={plugParams.stateTuple} />;

const SoundNode: FunctionComponent<Partial<Pick<HTMLAttributes<HTMLElement>, "className" | "style">> & {
    index: number;
    state: NodeState;
    plugParams: PlugParams;
    onChange: (target: { state: NodeState, nodeNo: number, inNo: number; }, value: string) => void;
    onRemove?: (target: number) => void;
    onLoadBuffer?: (index: number, state: { loading: true; } | { error: unknown; } | { buffer: ArrayBuffer; }) => void;
}> = ({ className, style, index, state, plugParams, onChange, onRemove, onLoadBuffer }) => {
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
                loadWrapper(index, onLoadBuffer, async () => file.arrayBuffer()); // free-run async
            }
            if (item.urls) {
                urlref.current!.value = item.urls[0];
            }
        }
    }, [index, onLoadBuffer, urlref]);

    return <div ref={state.type === "buffer" ? dropref : undefined} className={`${styles.base} ${state.invalid ? styles.error : ""} ${isOver ? styles.dropping : ""} ${className || ""}`} style={style}>
        <div className={styles.title}>{state.type}</div>
        {type.inputs.map((pin, pinNo) =>
            <div key={pinNo} className={`${styles.slot} ${styles.input}`}>
                <NodePlug nodeNo={index} io={INPUT} pinNo={pinNo} pin={pin} plugParams={plugParams} />
                {pin.type === "channels" || pin.type === "buffer"
                    ? <ConnectSlot pin={pin} />
                    : <ParamSlot pin={pin} value={state.inputs[pinNo].value || ""} onChange={v => onChange({ state, nodeNo: index, inNo: pinNo }, v)} />}
            </div>)}
        {state.type !== "buffer" ? null :
            <>
                <div style={{ margin: "5px 5px" }}>
                    <input ref={urlref} style={{ width: "8em" }} type="text" placeholder="URL..." />
                    <button onClick={e => loadWrapper(index, onLoadBuffer, async () => await (await fetch(urlref.current!.value)).arrayBuffer()) /* free-run async */}>Load</button>
                </div>
                <div style={{ margin: "5px 5px" }}>
                    {!state.abuffer ? "empty" : <>{state.abuffer.duration.toFixed(2)} sec ({sibytes(state.bbuffer!.byteLength)})</>}
                </div>
            </>}
        {!state.lasterror ? null : <div style={{ padding: "5px 5px", color: "red" }}>{state.lasterror}</div>}
        {type.outputs.map((pin, pinNo) =>
            <div key={pinNo} className={`${styles.slot} ${styles.output}`}>
                <ConnectSlot pin={pin} />
                <NodePlug nodeNo={index} io={OUTPUT} pinNo={pinNo} pin={pin} plugParams={plugParams} />
            </div>)}
        {onRemove && state.type !== "output" && <div className={styles.remove} onClick={e => onRemove(index)}></div>}
    </div >;
};

export default SoundNode;
