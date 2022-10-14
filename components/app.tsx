import { useEffect, useState } from "react";
import { DndProvider, XYCoord } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { TouchBackend } from "react-dnd-touch-backend";
import style from "./app.module.css";
import Desk from "./desk";
import DraggingPreview from "./dragpreview";
import { newState, NodeState, NodeTypes } from "./state";
import TmplNode from "./tmplnode";
import { clonemap, cloneset, clonesplice1, cloneunset } from "./util";
import { openDB } from "idb";

type SavedNodeState = Omit<NodeState, "type" | "loading" | "abuffer" | "lasterror" | "invalid"> & { type: string; };
type SavedNode = { node: SavedNodeState, nodepos: XYCoord; };
type Save = { nodes: SavedNode[]; };

const opendb = async () => await openDB<{
    save: {
        key: "save" /* out-of-line key: "save" */;
        value: Save;
    };
    samples: {
        key: string /* name */;
        value: {
            name: string;
            buffer: ArrayBuffer;
        };
    };
}>("app", 1, {
    upgrade: (db, from, to, txn) => {
        db.createObjectStore("save", {/* out-of-line key */ });
        db.createObjectStore("samples", { keyPath: "name" });
    }
});

const App = () => {
    const [width, setWidth] = useState(800);
    const [nodes, setNodes] = useState<NodeState[] | null>(null);
    const [nodeposs, setNodeposs] = useState<XYCoord[] | null>(null);
    const [showTemplates, setShowTemplates] = useState(true);
    const [showExport, setShowExport] = useState(false);
    const [showImport, setShowImport] = useState(false);
    const [portText, setPortText] = useState("");
    const [portValid, setPortValid] = useState(true);

    useEffect(() => {
        setWidth(window.innerWidth);
        const onResize = (e: Event) => setWidth(window.innerWidth);
        window.addEventListener("resize", onResize);
        return () => window.removeEventListener("resize", onResize);
    }, []);

    // initial load
    useEffect(() => {
        (async () => {
            try {
                const save = await (async (): Promise<Save> => {
                    const db = await opendb();
                    const save = await db.get("save", "save");
                    db.close();
                    if (save) {
                        return save;
                    }

                    // default
                    return {
                        nodes: [
                            {
                                node: {
                                    type: "oscillator",
                                    inputs: [
                                        { connectFrom: null, value: "440" },
                                        { connectFrom: null, value: "sine" },
                                    ],
                                    bbuffer: null,
                                },
                                nodepos: { x: 30, y: 230 },
                            },
                            {
                                node: {
                                    type: "gain",
                                    inputs: [
                                        { connectFrom: { nodeNo: 0, pinNo: 0 }, value: null },
                                        { connectFrom: null, value: "0.2" },
                                    ],
                                    bbuffer: null,
                                },
                                nodepos: { x: 190, y: 240 },
                            },
                            {
                                node: {
                                    type: "output",
                                    inputs: [
                                        { connectFrom: { nodeNo: 1, pinNo: 0 }, value: null },
                                    ],
                                    bbuffer: null,
                                },
                                nodepos: { x: 330, y: 250 },
                            },
                        ]
                    };
                })();
                setNodes(save.nodes.map(e => ({ ...e.node, loading: false, abuffer: null, lasterror: null, invalid: false })));
                setNodeposs(save.nodes.map(e => e.nodepos));
            } catch (e) {
                // ignore
                console.log("save broken; ignored");
            }
        })();
    }, []);

    // save on change
    useEffect(() => {
        if (!nodes) {
            return;
        }
        (async () => {
            const save: Save = {
                nodes: nodes.map((node, i) => ({
                    node: cloneunset(node, ["loading", "abuffer", "lasterror", "invalid"]),
                    nodepos: nodeposs![i],
                })),
            };
            const db = await opendb();
            await db.put("save", save, "save");
            db.close();
        })();
    }, [nodes, nodeposs]);

    useEffect(() => {
        if (!nodes) { return; }
        const context = new AudioContext({ sampleRate: 44010 });

        (async () => {
            // TODO: wrap each make() with try{} and update invalid/lasterror.
            const wanodes = await Promise.all(nodes.map(node => NodeTypes[node.type].make(context, node)));
            if (new Array(nodes.length).fill(0).some((_, i) => nodes[i].type === "buffer" && wanodes[i] && !nodes[i].abuffer)) {
                // update cache TODO: only if succeed
                setNodes(nodes => nodes!.map((node, i) => ({ ...node, abuffer: node.type === "buffer" ? wanodes[i] as AudioBuffer : null })));
            }
            nodes.forEach((node, inode) => {
                if (node.invalid) {
                    return;
                }
                try {
                    const watarget = wanodes[inode];
                    NodeTypes[node.type].inputs.forEach((inty, iinput) => {
                        const nin = node.inputs[iinput];
                        const cfrom = nin.connectFrom;
                        if (cfrom) {
                            // const out = nodes[cfrom.nodeNo].type.outputs[cfrom.pinNo];
                            // TODO: output other than node itself? ChannelSplitter or AudioWorklet
                            // following code confuses overload of connect()
                            // const inap = inty.type === "channels" ? wain : ((wain as any)[inty.param || inty.name] as AudioParam | undefined);
                            // if (inap) {
                            //     wanodes[cfrom.nodeNo].connect(inap);
                            // }
                            if (inty.type === "channels") {
                                (wanodes[cfrom.nodeNo] as AudioNode).connect(watarget as AudioNode);
                            } else if (inty.type === "buffer") {
                                (watarget as /* AudioNode */any)[inty.param || inty.name] = wanodes[cfrom.nodeNo] as AudioBuffer;
                            } else if (inty.type === "param") {
                                const inap = (watarget as any)[inty.param || inty.name] as AudioParam | undefined;
                                if (inap) {
                                    (wanodes[cfrom.nodeNo] as AudioNode).connect(inap);
                                }
                            }
                        }

                        // set value even if it is connected.
                        if (inty.type === "param" || inty.type === "scalar") {
                            const inslot = (watarget as any)[inty.param || inty.name];
                            if (inslot instanceof AudioParam) {
                                inslot.value = (inty.toScalar || (v => parseFloat(v)))(nin.value!);
                            } else if (inslot !== undefined) {
                                (watarget as any)[inty.param || inty.name] = inty.toScalar ? inty.toScalar(nin.value!) : nin.value!;
                            }
                        }
                    });
                } catch (e) {
                    setNodes(nodes => cloneset(nodes, [inode, "invalid"], true));
                }
            });

            nodes!.forEach((node, inode) => {
                if (node.type === "oscillator" || node.type === "sampler" || node.type === "constant") {
                    (wanodes[inode] as AudioScheduledSourceNode).start();
                }
            });
        })();

        return () => { context.close(); };
    }, [nodes]);

    return <div id="app">
        <DndProvider backend={width < 800 ? TouchBackend : HTML5Backend}>
            <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "row" }}>
                <div className={style.menu} style={{ height: "100%", background: "#eee", display: "flex", flexDirection: "column" }}>
                    <a onClick={e => setShowTemplates(!showTemplates)}>{showTemplates ? "↓" : "↑"}Templates{showTemplates ? "↓" : "↑"}</a>
                    <a onClick={e => {
                        setShowExport(true);

                        const b64encode = (v: ArrayBuffer) => btoa(String.fromCharCode.apply(null, new Uint8Array(v) as any)); // TODO: slow.
                        const save: Save = {
                            nodes: nodes!.map((node, i) => ({
                                node: clonemap(cloneunset(node,
                                    ["loading", "abuffer", "lasterror", "invalid"]),
                                    ["bbuffer"], (v: ArrayBuffer | null) => v === null ? v : b64encode(v)),
                                nodepos: nodeposs![i],
                            })),
                        };

                        setPortText(JSON.stringify(save, null, 2));
                    }}>Export</a>
                    <a onClick={e => {
                        setShowImport(true);
                        setPortText("");
                    }}>Import</a>
                </div>
                <div style={{ flex: 1, height: "100%", position: "relative" }}>
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
                            setNodes(cloneset(nodes, [to.nodeNo, "inputs", to.pinNo, "connectFrom"], from));
                        }}
                        onchange={(nodeno, inno, value) => {
                            setNodes(cloneset(cloneset(nodes,
                                [nodeno, "inputs", inno, "value"], value),
                                [nodeno, "invalid"], false));
                        }}
                        onnoderemove={(i) => {
                            setNodes(clonesplice1(nodes, i).map(node => ({
                                ...node,
                                inputs: node.inputs.map(inp => ({
                                    ...inp, connectFrom: !inp.connectFrom
                                        ? null
                                        : inp.connectFrom.nodeNo === i
                                            ? null
                                            : {
                                                ...inp.connectFrom,
                                                nodeNo: inp.connectFrom.nodeNo - (i <= inp.connectFrom.nodeNo ? 1 : 0),
                                            }
                                }))
                            })));
                            setNodeposs(clonesplice1(nodeposs, i));
                        }}
                        onloadbuffer={(i, state) => {
                            if ("loading" in state) {
                                setNodes(
                                    cloneset(cloneset(nodes,
                                        [i, "loading"], true),
                                        [i, "lasterror"], null));
                                return;
                            }
                            if ("error" in state) {
                                setNodes(
                                    cloneset(cloneset(nodes,
                                        [i, "loading"], false),
                                        [i, "lasterror"], String(state.error)));
                                return;
                            }
                            if ("buffer" in state) {
                                setNodes(
                                    cloneset(cloneset(cloneset(nodes,
                                        [i, "loading"], false),
                                        [i, "bbuffer"], state.buffer),
                                        [i, "abuffer"], null));
                                return;
                            }
                            throw new Error(`unknown loadbuffer state ${JSON.stringify(state)}`);
                        }} />
                        {!showTemplates ? null : <div style={{
                            position: "absolute",
                            left: 0,
                            top: 0,
                            width: "100%",
                            border: "1px solid #ccc",
                            background: "#444c",
                            overflowX: "auto",
                            display: "flex",
                            flexDirection: "row",
                        }}>
                            {Object.entries(NodeTypes).filter(([k, v]) => k !== "output").map(([k, v]) =>
                                <div key={k} className={style.tmplmarginer}>
                                    <TmplNode state={newState(k)} />
                                </div>
                            )}
                        </div>}
                        <DraggingPreview /></>}
                </div>
            </div>
            {!(showExport || showImport) ? null : <div style={{ position: "absolute", left: 0, top: 0, width: "100%", height: "100%", display: "flex", background: "#444c" }}>
                <div style={{ margin: "auto", width: "60%", height: "60%", padding: "10px", display: "flex", flexDirection: "column", position: "relative", background: "#fff", borderRadius: "10px", boxShadow: "0 10px 10px black" }}>
                    <h1 style={{ fontSize: "2em", margin: "5px" }}>{showExport ? "Export" : showImport ? "Import" : null}</h1>
                    <textarea style={{ width: "100%", flex: 1, background: portValid ? "white" : "#fdd", color: showExport ? "gray" : "black" }} readOnly={showExport} value={portText} onChange={e => {
                        if (showImport) {
                            const text = e.target.value;
                            setPortValid(true);
                            if (text) {
                                try {
                                    const save = JSON.parse(text) as Save;
                                    const b64decode = (str: string): ArrayBuffer | null => new Uint8Array(Array.prototype.map.call(atob(str), e => e.charCodeAt(0)) as number[]).buffer;
                                    setNodes(save.nodes.map(e => ({
                                        ...cloneunset(e.node, ["nodepos"]),
                                        loading: false,
                                        bbuffer: e.node.bbuffer ? b64decode(e.node.bbuffer as unknown as string) : null,
                                        abuffer: null,
                                        lasterror: null,
                                        invalid: false,
                                    })));
                                    setNodeposs(save.nodes.map(e => e.nodepos));
                                } catch (e) {
                                    setPortValid(false);
                                }
                            }
                            setPortText(text);
                        }

                    }} onClick={e => {
                        e.currentTarget.select();
                    }} />
                    <div className={style.remove} onClick={e => { setShowExport(false); setShowImport(false); }} />
                </div>
            </div>}
        </DndProvider>
    </div >;
};

export default App;
