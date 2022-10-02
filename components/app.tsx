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

type SavedNodeState = Omit<NodeState, "type" | "invalid"> & { type: string; };
type SavedNode = { node: SavedNodeState, nodepos: XYCoord; };
type Save = { nodes: SavedNode[]; };

const App = () => {
    const [width, setWidth] = useState(800);
    const [nodes, setNodes] = useState<NodeState[] | null>(null);
    const [nodeposs, setNodeposs] = useState<XYCoord[] | null>(null);

    useEffect(() => {
        setWidth(window.innerWidth);
        const onResize = (e: Event) => setWidth(window.innerWidth);
        window.addEventListener("resize", onResize);
        return () => window.removeEventListener("resize", onResize);
    }, []);

    // initial load
    useEffect(() => {
        try {
            const save = ((): Save => {
                const save = localStorage.getItem("save");
                if (save) {
                    return JSON.parse(save) as Save;
                }
                // default
                return {
                    nodes: [
                        {
                            node: {
                                type: "oscillator",
                                inputs: [
                                    { connectFrom: null, value: 440 },
                                    { connectFrom: null, value: "sin" },
                                ],
                            },
                            nodepos: { x: 30, y: 230 },
                        },
                        {
                            node: {
                                type: "gain",
                                inputs: [
                                    { connectFrom: { nodeNo: 0, outNo: 0 }, value: null },
                                    { connectFrom: null, value: "0.2" },
                                ],
                            },
                            nodepos: { x: 190, y: 240 },
                        },
                        {
                            node: {
                                type: "output",
                                inputs: [
                                    { connectFrom: { nodeNo: 1, outNo: 0 }, value: null },
                                ],
                            },
                            nodepos: { x: 330, y: 250 },
                        },
                    ]
                };
            })();
            setNodes(save.nodes.map(e => ({ ...e.node, type: NodeTypes.find(ty => ty.type === e.node.type)!, invalid: false })));
            setNodeposs(save.nodes.map(e => e.nodepos));
        } catch (e) {
            // ignore
            console.log("save broken; ignored");
        }
    }, []);

    // save on change
    useEffect(() => {
        if (!nodes) {
            return;
        }
        const save: Save = {
            nodes: nodes.map((node, i) => ({ node: { ...node, type: node.type.type }, nodepos: nodeposs![i] })),
        };
        localStorage.setItem("save", JSON.stringify(save));
    }, [nodes, nodeposs]);

    useEffect(() => {
        if (!nodes) { return; }
        const context = new AudioContext({ sampleRate: 44010 });

        const wanodes = nodes.map(node => node.type.make(context));
        nodes.forEach((node, inode) => {
            if (node.invalid) {
                return;
            }
            try {
                node.type.inputs.forEach((inty, iinput) => {
                    const nin = node.inputs[iinput];
                    const cfrom = nin.connectFrom;
                    const wain = wanodes[inode];
                    if (cfrom) {
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
                            if (inap) {
                                wanodes[cfrom.nodeNo].connect(inap);
                            }
                        }
                    }

                    // set value even if it is connected.
                    const inslot = (wain as any)[inty.param || inty.name];
                    if (inslot instanceof AudioParam) {
                        inslot.value = parseFloat(nin.value!.toString());
                    } else if (inslot) {
                        (wain as any)[inty.param || inty.name] = nin.value!;
                    }
                });
            } catch (e) {
                setNodes(nodes => cloneset(nodes, [inode, "invalid"], true));
            }
        });

        nodes!.forEach((node, inode) => {
            if (node.type.type === "oscillator") {
                (wanodes[inode] as AudioScheduledSourceNode).start();
            }
        });

        return () => { context.close(); };
    }, [nodes]);

    return <div id="app">
        <DndProvider backend={width < 800 ? TouchBackend : HTML5Backend}>
            {!nodes || !nodeposs ? <></> : <><Desk
                nodes={nodes!}
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
                    setNodes(cloneset(cloneset(nodes,
                        [nodeno, "inputs", inno, "value"], value),
                        [nodeno, "invalid"], false));
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
                    {NodeTypes.map(ty =>
                        <div key={ty.type} className={style.tmplmarginer}>
                            <TmplNode state={newState(ty.type)} />
                        </div>
                    )}
                </div>
                <DraggingPreview /></>}
        </DndProvider>
    </div >;
};

export default App;
