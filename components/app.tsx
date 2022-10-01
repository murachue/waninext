import { useEffect, useState } from "react";
import { DndProvider, XYCoord } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { TouchBackend } from "react-dnd-touch-backend";
import style from "./app.module.css";
import Desk from "./desk";
import DraggingPreview from "./dragpreview";
import { newState, NodeState, NodeTypes } from "./state";
import TmplNode from "./tmplnode";

const clonesplice1 = <T,>(target: T[], i: number) => [...target.slice(0, i), ...target.slice(i + 1)];

const cloneset = <T/* extends array|object */,>(target: T, path: (number | string)[], value: unknown): T => {
    if (path.length < 1) {
        throw new Error(`empty path: ${JSON.stringify(path)}`);
    }
    const [path0, ...pathr] = path;
    if (pathr.length < 1) {
        if (Array.isArray(target)) {
            if (typeof path0 !== "number") {
                throw new Error(`path must be number: ${path0}`);
            }
            return [...target.slice(0, path0), value, ...target.slice(path0 + 1)] as T;
        } else {
            return { ...target, [path0]: value } as T;
        }
    }
    if (Array.isArray(target)) {
        if (typeof path0 !== "number") {
            throw new Error(`path must be number: ${path0}`);
        }
        return [...target.slice(0, path0), cloneset(target[path0], pathr, value), ...target.slice(path0 + 1)] as T;
    } else {
        return { ...target, [path0]: cloneset((target as any)[path0], pathr, value) } as T;
    }
};

const App = () => {
    const [width, setWidth] = useState(800);
    const [nodes, setNodes] = useState<NodeState[]>([
        {
            type: NodeTypes.find(t => t.type === "oscillator")!,
            inputs: [
                { connectFrom: null, value: 440 },
                { connectFrom: null, value: "sin" },
            ],
        },
        {
            type: NodeTypes.find(t => t.type === "gain")!,
            inputs: [
                { connectFrom: { nodeNo: 0, outNo: 0 }, value: null },
                { connectFrom: null, value: "0.2" },
            ],
        },
        {
            type: NodeTypes.find(t => t.type === "output")!,
            inputs: [
                { connectFrom: { nodeNo: 1, outNo: 0 }, value: null },
            ],
        },
    ]);
    const [nodeposs, setNodeposs] = useState<XYCoord[]>([
        { x: 30, y: 230 },
        { x: 190, y: 240 },
        { x: 330, y: 250 },
    ]);

    useEffect(() => {
        setWidth(window.innerWidth);
        const onResize = (e: Event) => setWidth(window.innerWidth);
        window.addEventListener("resize", onResize);
        return () => window.removeEventListener("resize", onResize);
    }, []);

    useEffect(() => {
        const context = new AudioContext({ sampleRate: 44010 });

        const wanodes = nodes.map(node => node.type.make(context));
        nodes.forEach((node, inode) => {
            node.type.inputs.forEach((inty, iinput) => {
                const nin = node.inputs[iinput];
                const cfrom = nin.connectFrom;
                if (!cfrom) {
                    return;
                }
                const wain = wanodes[inode];
                // const out = nodes[cfrom.nodeNo].type.outputs[cfrom.outNo];
                // TODO: output other than node itself? ChannelSplitter or AudioWorklet
                // following code confuses overload of connect()
                // const inap = inty.type === "channels" ? wain : ((wain as any)[inty.param || inty.name] as AudioParam | undefined);
                // if (inap) {
                //     wanodes[cfrom.nodeNo].connect(inap);
                // }
                if (inty.type === "channels") {
                    wanodes[cfrom.nodeNo].connect(wain);
                } else {
                    const inap = (wain as any)[inty.param || inty.name] as AudioParam | undefined;
                    wanodes[cfrom.nodeNo].connect(wain);
                }
            });
        });

        nodes.forEach((node, inode) => {
            if (node.type.type === "oscillator") {
                (wanodes[inode] as AudioScheduledSourceNode).start();
            }
        });

        return () => { context.close(); };
    }, [nodes]);

    return <div id="app">
        <DndProvider backend={width < 800 ? TouchBackend : HTML5Backend}>
            <Desk
                nodes={nodes}
                nodeposs={nodeposs}
                onnodeadd={(node, xy) => {
                    setNodes([...nodes, node]);
                    setNodeposs([...nodeposs, xy]);
                }}
                onnodemove={(i, x, y) => {
                    setNodeposs(cloneset(nodeposs, [i], { x, y }));
                }}
                onrewire={(from, to) => {
                    setNodes(cloneset(nodes, [to.nodeNo, "inputs", to.outNo, "connectFrom"], from));
                }}
                onnoderemove={(i) => {
                    setNodes(clonesplice1(nodes, i));
                    setNodeposs(clonesplice1(nodeposs, i));
                }}
                onchange={(nodeno, inno, value) => {
                    setNodes(cloneset(nodes, [nodeno, "inputs", inno, "value"], value));
                }} />
            <div style={{
                position: "absolute",
                left: 0,
                top: 0,
                width: "100%",
                border: "1px solid #ccc",
                background: "#444c",
                overflow: "visible",
                display: "flex",
                flexDirection: "row",
            }}>
                <div className={style.tmplmarginer}>
                    <TmplNode state={newState("output")} />
                </div>
                <div className={style.tmplmarginer}>
                    <TmplNode state={newState("oscillator")} />
                </div>
                <div className={style.tmplmarginer}>
                    <TmplNode state={newState("biquad")} />
                </div>
            </div>
            <DraggingPreview />
        </DndProvider>
    </div >;
};

export default App;
