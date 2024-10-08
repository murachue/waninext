import { Dispatch, FunctionComponent, SetStateAction, MouseEvent as RMouseEvent, TouchEvent as RTouchEvent, useCallback, useMemo, useRef, HTMLAttributes } from "react";

export type Linking = {
    from: string;
    to: string;
};

export type PlugHandlers = {
    dragstart: (from: string, x: number, y: number) => string | undefined | void; // and potentially unlink
    dragmove: (x: number, y: number) => void;
    dragend: (link?: Linking) => void; // and potentially link
    linkpreview: (from: string, to: string) => void;
    unlinkpreview: (from: string, to: string) => void;
};

export type PlugState = {
    from: string | null;
    to: string | null;
};

const defaultState = {
    from: null,
    to: null,
};
export const defaultPlugState = () => ({ ...defaultState });

const Plug: FunctionComponent<Pick<HTMLAttributes<HTMLElement>, "id" | "className" | "style"> & {
    handlers: Partial<PlugHandlers>;
    stateTuple: [PlugState, Dispatch<SetStateAction<PlugState>>]; // XXX: how to using typeof useState without undefined?
}> = ({ id, className, style, handlers: partialHandlers, stateTuple: [state, setState] }) => {
    // this should be useState but native DOM event handler must break closure (which is counterpart of pure immutable)...
    const ctxref = useRef<PlugState>(state); // poor default value...
    ctxref.current = state; // every component update updates current.

    const handlers: PlugHandlers = useMemo(() => ({
        dragstart: partialHandlers.dragstart ?? ((from, x, y) => undefined),
        dragmove: partialHandlers.dragmove ?? ((x, y) => undefined),
        dragend: partialHandlers.dragend ?? ((linking) => undefined),
        linkpreview: partialHandlers.linkpreview ?? ((from, to) => undefined),
        unlinkpreview: partialHandlers.unlinkpreview ?? ((from, to) => undefined),
    }), [partialHandlers]);
    // ditto breaking closure
    const hdlrref = useRef<PlugHandlers>(handlers); // poor default value...
    hdlrref.current = handlers; // every component update updates current.

    const onMouseEnter = useCallback((e: RMouseEvent) => {
        const context = { ...state };
        do {
            if (!context.from) {
                break;
            }
            context.to = (e.currentTarget as HTMLElement).id || null;
            if (context.from && context.to && context.from !== context.to) {
                handlers.linkpreview(context.from, context.to);
            }
            setState(context);
        } while (false);
        e.stopPropagation();
    }, [state, setState, handlers]);
    const onMouseLeave = useCallback((e: RMouseEvent) => {
        const context = { ...state };
        do {
            if (!context.from) {
                break;
            }
            if (context.from && context.to && context.from !== context.to) {
                handlers.unlinkpreview(context.from, context.to);
            }
            context.to = null;
            setState(context);
        } while (false);
        e.stopPropagation();
    }, [state, setState, handlers]);
    const onMouseDown = useCallback((e: RMouseEvent | RTouchEvent) => {
        const context = { ...state };
        const cxy = ("touches" in e ? e.touches[0] : e);
        do {
            context.from = (e.currentTarget as HTMLElement).id || null; // or just props.id
            context.to = null;
            if (!context.from) {
                break;
            }

            context.from = handlers.dragstart(context.from, cxy.clientX, cxy.clientY) ?? context.from;
            // undefined(void) -> default from, "" -> prohibit dragging, other -> override from
            if (!context.from) {
                break;
            }
            // TODO: if from is overriden, we must test mouseEnter.
            const onMouseMove = (e: MouseEvent | TouchEvent) => {
                const cxy = ("touches" in e ? e.touches[0] : e);
                hdlrref.current.dragmove(cxy.clientX, cxy.clientY);

                if ("touches" in e) {
                    // enter/leave emulation
                    const el = document.elementFromPoint(cxy.clientX, cxy.clientY);
                    // TODO
                }

                e.stopPropagation();
            };
            const onMouseUp = (e: Event) => {
                const context = { ...ctxref.current };
                hdlrref.current.dragend(
                    (context.from && context.to && context.from !== context.to)
                        ? { from: context.from, to: context.to }
                        : undefined);
                context.from = null;
                context.to = null;
                document.removeEventListener("mousemove", onMouseMove);
                document.removeEventListener("touchmove", onMouseMove);
                document.removeEventListener("mouseup", onMouseUp);
                document.removeEventListener("touchend", onMouseUp);
                setState(context);
                e.stopPropagation();
            };
            document.addEventListener("mousemove", onMouseMove);
            document.addEventListener("touchmove", onMouseMove);
            document.addEventListener("mouseup", onMouseUp);
            document.addEventListener("touchend", onMouseUp);
        } while (false);
        setState(context);
        e.stopPropagation();
    }, [state, setState, handlers]);

    return <div
        id={id}
        className={className}
        style={style}
        onMouseDown={onMouseDown}
        onTouchStart={onMouseDown}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave} />;
};

export default Plug;
