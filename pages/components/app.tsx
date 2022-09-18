import { CSSProperties, useCallback, useEffect, useMemo, useState } from "react";
import style from "./app.module.css";
import Bezier, { Setting } from './bezier';
import Draggable from "./dragable";
import Node from './node';
import { defaultPlugState, Linking, PlugHandlers, PlugState } from './plug';

class MapEx<K, V> extends Map<K, V> {
    entriesarr() {
        return Array.from(this.entries());
    }
    valuesarr() {
        return Array.from(this.values());
    }
    filter(pred: ((e: [K, V], i: number, a: [K, V][]) => boolean) | null): MapEx<K, V> {
        if (pred === null) {
            return this;
        }
        return new MapEx(this.entriesarr().filter(pred));
    }
    plus(values: [K, V][] | null): MapEx<K, V> {
        if (values === null) {
            return this;
        }
        // TODO: if we pass same key twice, latter wins?
        return new MapEx([...this.entriesarr(), ...values]);
    }
}

const App = () => {
    const [links, setLinks] = useState<MapEx<string, Setting>>(new MapEx([
        ["ao1bi1", {
            from: "ao1", to: "bi1",
            positions: { start: { side: "right" }, end: { side: "left" } },
            class: style.blueLine
        }],
    ]));
    const [draggingStyle, setDraggingStyle] = useState<Partial<Pick<CSSProperties, "left" | "top" | "display" | "position">>>({
        position: "absolute",
        display: "none",
    });
    const plugStateTuple = useState<PlugState>(defaultPlugState());
    const previewid = "preview";

    const dragstart = useCallback<PlugHandlers["dragstart"]>((from: string, x: number, y: number) => {
        let overridelink: Setting | undefined = undefined;
        if (/[a-z]+i[0-9]+/.exec(from)) {
            overridelink = links.valuesarr().find(e => e.to === from);
            if (!overridelink) {
                // abort
                return "";
            }
        }
        setDraggingStyle(draggingStyle => ({ ...draggingStyle, display: "block", left: `${x}px`, top: `${y}px` }));
        setLinks(_links => links
            .filter(!overridelink ? null : ([k, v]) => v !== overridelink)
            .plus([
                [previewid, {
                    from: overridelink?.from || from,
                    to: previewid,
                    positions: { start: { side: "right" }, end: { side: "left" } },
                    class: `${style.blueLine} ${style.dash}`,
                }],
            ]));
        return overridelink?.from;
    }, [links, draggingStyle]);
    const dragmove = useCallback((x: number, y: number): void => {
        setDraggingStyle(draggingStyle => ({ ...draggingStyle, left: `${x}px`, top: `${y}px` }));
    }, [draggingStyle]);
    const dragend = useCallback((linking?: Linking) => {
        setDraggingStyle(draggingStyle => ({ ...draggingStyle, display: "none" }));

        const overriddenlink = linking && links.valuesarr().find(e => e.from !== linking.from && e.to === linking.to);
        setLinks(_links => links
            .filter(([k, v]) => k !== previewid && v !== overriddenlink)
            .plus(
                !linking || /[a-z]+o[0-9]+/.exec(linking.to) ? [] : [
                    [`${linking.from}${linking.to}`, {
                        from: linking.from,
                        to: linking.to,
                        positions: { start: { side: "right" }, end: { side: "left" } },
                        class: style.blueLine,
                    }],
                ]));
    }, [links, draggingStyle]);
    const linkpreview = useCallback((from: string, to: string): void => {
        if (/[a-z]+o[0-9]+/.exec(to)) {
            return;
        }
        const overriddenlink = links.valuesarr().find(e => e.to === to);
        setLinks(_links => links
            .filter(!overriddenlink ? null : ([k, v]) => v !== overriddenlink)
            .plus(!overriddenlink
                ? null
                : [
                    [`${overriddenlink.from}${overriddenlink.to}`, {
                        ...overriddenlink,
                        class: `${style.blueLine} ${style.dash}`
                    }],
                ])
            .plus([
                [previewid, {
                    from,
                    to,
                    positions: { start: { side: "right" }, end: { side: "left" } },
                    class: `${style.blueLine}`,
                }],
            ]));
    }, [links]);
    const unlinkpreview = useCallback((from: string, to: string): void => {
        if (/[a-z]+o[0-9]+/.exec(to)) {
            return;
        }
        const overriddenlink = links.valuesarr().find(e => e.from !== from && e.to === to);
        setLinks(_links => links
            .filter(!overriddenlink ? null : ([k, v]) => v !== overriddenlink)
            .plus(!overriddenlink
                ? []
                : [
                    [`${overriddenlink.from}${overriddenlink.to}`, {
                        ...overriddenlink,
                        class: style.blueLine
                    }],
                ])
            .plus([
                [previewid, {
                    from,
                    to: previewid,
                    positions: { start: { side: "right" }, end: { side: "left" } },
                    class: `${style.blueLine} ${style.dash}`,
                }],
            ]));
    }, [links]);
    const plugHandlers: PlugHandlers = useMemo(() => ({
        dragstart,
        dragmove,
        dragend,
        linkpreview,
        unlinkpreview,
    }), [dragstart, dragmove, dragend, linkpreview, unlinkpreview]);

    useEffect(() => {
        const context = new AudioContext({ sampleRate: 44010 });
        return () => { context.close(); };
    }, []);

    return <div id="app">
        <div style={{ position: "absolute", left: 0, top: 0, width: "100%", border: "1px solid #ccc", overflow: "visible" }}>
            <div className={style.nodetemplate}>
                <Draggable dontcramp dragend={(e, x, y, setStyle) => { setStyle((style: any) => ({ ...style, left: "0", top: "0" })); }}>
                    <Node inputs={[null]} outputs={[]} plugHandlers={{ dragstart: () => "" }} plugStateTuple={plugStateTuple}>
                        <div className={style.nodecontainer}>
                            <div className={style.node}>output</div>
                        </div>
                    </Node>
                </Draggable>
            </div>
        </div>
        <Bezier settings={links.valuesarr()}>
            <Draggable>
                <div style={{ position: "absolute", left: "30px", top: "130px" }}>
                    <Node inputs={["ai1"]} outputs={["ao1", "ao2", "ao3", "ao4"]} plugHandlers={plugHandlers} plugStateTuple={plugStateTuple}>
                        <div className={style.nodecontainer}>
                            <div className={style.node}>drag me 1</div>
                        </div>
                    </Node>
                    </div>
                </Draggable>
            <Draggable>
                <div style={{ position: "absolute", left: "180px", top: "130px" }}>
                    <Node inputs={["bi1"]} outputs={[]} plugHandlers={plugHandlers} plugStateTuple={plugStateTuple}>
                        <div className={style.nodecontainer}>
                            <div className={style.node}>drag me 2</div>
                        </div>
                    </Node>
                </div>
            </Draggable>
            <Draggable>
                <div style={{ position: "absolute", left: "80px", top: "250px" }}>
                    <Node inputs={["ci1", "ci2"]} outputs={["co1", "co2"]} plugHandlers={plugHandlers} plugStateTuple={plugStateTuple}>
                        <div className={style.nodecontainer}>
                            <div className={style.node}>drag me 3</div>
                        </div>
                    </Node>
                </div>
            </Draggable>
            <div id={previewid} style={draggingStyle} />
        </Bezier>
    </div >;
};

export default App;
