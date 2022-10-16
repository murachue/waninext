import { CSSProperties, FunctionComponent, useCallback, useMemo, useState } from "react";
import { useDrop, XYCoord } from "react-dnd";
import style from "./app.module.css";
import Bezier, { Setting } from './bezier';
import InstNode from "./instnode";
import { defaultPlugState, Linking, PlugHandlers, PlugState } from './plug';
import { genPlugId, PinLocation, NodeState, NodeTypes, parseInputPlugId, parseOutputPlugId, stateToBezierLinks } from "./state";
import { cloneunset } from "./util";

const Desk: FunctionComponent<{
    nodes: NodeState[];
    nodeposs: XYCoord[];
    onnodeadd: (node: NodeState, xy: XYCoord) => void;
    onnodemove: (i: number, x: number, y: number) => void;
    onrewire: (from: PinLocation | null, to: PinLocation) => void;
    onnoderemove: (i: number) => void;
    onchange: (nodeno: number, inno: number, value: string) => void;
    onloadbuffer: Parameters<typeof InstNode>[0]["onLoadBuffer"];
}> = ({ nodes, nodeposs, onnodeadd, onnodemove, onrewire, onnoderemove, onchange, onloadbuffer }) => {
    const [previewLink, setPreviewLink] = useState<Setting[]>([]);
    const allLinks = [
        ...useMemo(() => stateToBezierLinks(nodes).map(e => ({ ...e, class: style.blueLine })), [nodes]),
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
            const connFrom = nodes[ink.nodeNo].inputs[ink.pinNo].connectFrom;
            if (!connFrom) {
                // not connected input: abort, do nothing.
                return "";
            }

            // unlink and takeover that output
            onrewire(null, ink);
            overridelink = genPlugId(connFrom.nodeNo, "o", connFrom.pinNo, NodeTypes[nodes[connFrom.nodeNo].type].outputs[connFrom.pinNo].type);
        }
        setDraggingStyle(draggingStyle => ({ ...draggingStyle, display: "block", left: `${x}px`, top: `${y}px` }));
        setPreviewLink([{
            from: overridelink || from,
            to: previewid,
            positions: { start: { side: "right" }, end: { side: "left" } },
            class: `${style.blueLine} ${style.dash}`,
        }]);
        return overridelink;
    }, [nodes, onrewire]);
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
        if (flink.type !== tlink.type) {
            return;
        }

        onrewire({ nodeNo: flink.nodeNo, pinNo: flink.pinNo }, tlink);
    }, [onrewire]);
    const linkpreview = useCallback((fromid: string, toid: string): void => {
        const from = parseOutputPlugId(fromid);
        if (!from) {
            return;
        }
        const to = parseInputPlugId(toid);
        if (!to) {
            return;
        }
        if (from.type !== to.type) {
            return;
        }
        setPreviewLink([{
            from: fromid,
            to: toid,
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
            onnodeadd(item.state, monitor.getSourceClientOffset()!);
        }
    }, [onnodeadd]);

    return <div ref={dropref} style={{ width: "100%", height: "100%" }}>
        <Bezier settings={allLinks}>
            {nodes.map((node, i) =>
                // <div key={i}>
                <InstNode
                    key={i}
                    index={i}
                    x={nodeposs[i].x}
                    y={nodeposs[i].y}
                    state={node}
                    plugParams={{ handlers: plugHandlers, stateTuple: plugStateTuple }}
                    dragend={(e, x, y, setStyle) => {
                        setStyle(style => cloneunset(style, ["left", "top"]));
                        onnodemove(i, x, y);
                    }}
                    onChange={({ nodeNo, inNo }, value) => { onchange(nodeNo, inNo, value); }}
                    onRemove={i => { onnoderemove(i); }}
                    onLoadBuffer={onloadbuffer} />
                // </div>
            )}
            <div id={previewid} style={draggingStyle} />
        </Bezier>
    </div>;
};

export default Desk;
