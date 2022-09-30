import { CSSProperties, useCallback, useMemo, useState } from "react";
import { useDrop } from "react-dnd";
import style from "./app.module.css";
import Bezier, { Setting } from './bezier';
import InstNode from "./instnode";
import { defaultPlugState, Linking, PlugHandlers, PlugState } from './plug';
import { genPlugId, NodeState, NodeTypes, parseInputPlugId, parseOutputPlugId, stateToBezierLinks } from "./state";

type GuiNodeState = {
    x: number;
    y: number;
    state: NodeState;
};

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

const Desk = () => {
    const [nodes, setNodes] = useState<GuiNodeState[]>([
        {
            x: 30,
            y: 180,
            state: {
                type: NodeTypes.find(t => t.type === "oscillator")!,
                inputs: [
                    { connectFrom: null, value: 440 },
                    { connectFrom: null, value: "sin" },
                ],
            },
        },
        {
            x: 190,
            y: 190,
            state: {
                type: NodeTypes.find(t => t.type === "output")!,
                inputs: [
                    { connectFrom: { nodeNo: 0, outNo: 0 }, value: null },
                ],
            },
        },
    ]);
    const [previewLink, setPreviewLink] = useState<Setting[]>([]);
    const allLinks = [
        ...useMemo(() => stateToBezierLinks(nodes.map(e => e.state)).map(e => ({ ...e, class: style.blueLine })), [nodes]),
        ...previewLink,
    ];

    const [draggingStyle, setDraggingStyle] = useState<Partial<Pick<CSSProperties, "left" | "top" | "display" | "position">>>({
        position: "absolute",
        display: "none",
    });
    const plugStateTuple = useState<PlugState>(defaultPlugState());
    const previewid = "preview";

    const dragstart = useCallback<PlugHandlers["dragstart"]>((from: string, x: number, y: number) => {
        let overridelink: string | undefined = undefined;
        const ink = parseInputPlugId(from);
        if (ink) {
            const connFrom = nodes[ink.nodeNo].state.inputs[ink.outNo].connectFrom;
            if (!connFrom) {
                // not connected input: abort, do nothing.
                return "";
            }

            // unlink and takeover that output
            setNodes(cloneset(nodes, [ink.nodeNo, "state", "inputs", ink.outNo, "connectFrom"], null));
            overridelink = genPlugId(connFrom.nodeNo, "o", connFrom.outNo);
        }
        setDraggingStyle(draggingStyle => ({ ...draggingStyle, display: "block", left: `${x}px`, top: `${y}px` }));
        setPreviewLink([{
            from: overridelink || from,
            to: previewid,
            positions: { start: { side: "right" }, end: { side: "left" } },
            class: `${style.blueLine} ${style.dash}`,
        }]);
        return overridelink;
    }, [nodes]);
    const dragmove = useCallback((x: number, y: number): void => {
        setDraggingStyle(draggingStyle => ({ ...draggingStyle, left: `${x}px`, top: `${y}px` }));
    }, []);
    const dragend = useCallback((linking?: Linking) => {
        setDraggingStyle(draggingStyle => ({ ...draggingStyle, display: "none" }));
        setPreviewLink([]);

        if (!linking) {
            return;
        }
        const flink = parseOutputPlugId(linking.from);
        if (!flink) {
            return;
        }
        const tlink = parseInputPlugId(linking.to);
        if (!tlink) {
            return;
        }

        setNodes(cloneset(
            nodes,
            [tlink.nodeNo, "state", "inputs", tlink.outNo, "connectFrom"],
            { nodeNo: flink.nodeNo, outNo: flink.outNo }));
    }, [nodes]);
    const linkpreview = useCallback((from: string, to: string): void => {
        if (!parseInputPlugId(to)) {
            return;
        }
        setPreviewLink([{
            from,
            to,
            positions: { start: { side: "right" }, end: { side: "left" } },
            class: `${style.blueLine}`,
        }]);
    }, []);
    const unlinkpreview = useCallback((from: string, to: string): void => {
        if (!parseInputPlugId(to)) {
            return;
        }
        setPreviewLink([{
            from,
            to: previewid,
            positions: { start: { side: "right" }, end: { side: "left" } },
            class: `${style.blueLine} ${style.dash}`,
        }]);
    }, []);
    const plugHandlers: PlugHandlers = useMemo(() => ({
        dragstart,
        dragmove,
        dragend,
        linkpreview,
        unlinkpreview,
    }), [dragstart, dragmove, dragend, linkpreview, unlinkpreview]);

    const [, dropref] = useDrop({
        accept: [/* "InstNode", */ "TmplNode"],
        drop: (item: { state: NodeState; }, monitor) => {
            const { x, y } = monitor.getSourceClientOffset()!;
            setNodes([...nodes, { state: item.state, x, y }]);
        }
    }, [nodes]);

    return <div ref={dropref} style={{ width: "100%", height: "100%" }}>
        <Bezier settings={allLinks}>
            {nodes.map((n, i) =>
                // <div key={i}>
                <InstNode key={i} index={i} x={n.x} y={n.y} state={n.state} plugHandlers={plugHandlers} plugStateTuple={plugStateTuple} />
                // </div>
            )}
            <div id={previewid} style={draggingStyle} />
        </Bezier>
    </div>;
};

export default Desk;
