import { Children, cloneElement, Dispatch, FunctionComponent, isValidElement, PropsWithChildren, ReactElement, SetStateAction, useCallback, useRef, useState } from "react";

export const clamp = (num: number, min: number, max: number) => Math.min(Math.max(num, min), max);

type Style = {
    left?: string;
    top?: string;
    position: string;
    userSelect: string;
};

const Draggable: FunctionComponent<PropsWithChildren<{
    dontcramp?: boolean;
    dragstart?: (e: HTMLElement, x: number, y: number) => void;
    dragend?: (e: HTMLElement, x: number, y: number, setStyle: Dispatch<SetStateAction<Style>>) => void;
}>> = ({ dontcramp, dragstart: dragstart = () => { }, dragend: dragend = () => { }, children }) => {
    const [style, setStyle] = useState<Style>({
        // left: "0px",
        // top: "0px",
        position: "absolute",
        userSelect: "none",  // don't select text on dragging!
    });
    const dragendref = useRef(dragend); // poor initval...
    dragendref.current = dragend;

    const onMouseDown = useCallback((e: MouseEvent | TouchEvent) => {
        const target: HTMLElement = e.currentTarget! as HTMLElement;
        const posT = target.getBoundingClientRect();
        const posP = target.parentElement!.getBoundingClientRect();
        const cxy = "touches" in e ? e.touches[0] : e;
        const shiftX = cxy.clientX - posT.x;  // this should not offset(parent-relative) but client-pos(client-relative)
        const shiftY = cxy.clientY - posT.y;  // ditto
        let lasttouch = cxy;

        const pointer2tl = (cx: number, cy: number) => {
            const rawx = Math.round(cx - shiftX - posP.x);
            const rawy = Math.round(cy - shiftY - posP.y);
            const x = dontcramp ? rawx : clamp(rawx, 0, posP.width - posT.width);
            const y = dontcramp ? rawy : clamp(rawy, 0, posP.height - posT.height);
            return { x, y };
        };

        const onmousemove = (e: MouseEvent | TouchEvent) => {
            const cxy = "touches" in e ? e.touches[0] : e;
            lasttouch = cxy;
            const { x, y } = pointer2tl(cxy.clientX, cxy.clientY);

            setStyle({
                ...style,
                left: `${x}px`,
                top: `${y}px`,
            });
        };

        const onmouseup = (e: MouseEvent | TouchEvent) => {
            document.removeEventListener("mousemove", onmousemove);
            document.removeEventListener("touchmove", onmousemove);
            document.removeEventListener("mouseup", onmouseup);
            document.removeEventListener("touchend", onmouseup);

            const cxy = "touches" in e ? /* e.touches[0] already removed */lasttouch : e;
            const { x, y } = pointer2tl(cxy.clientX, cxy.clientY);
            dragendref.current(e.currentTarget! as HTMLElement, x, y, setStyle);
        };

        document.addEventListener("mousemove", onmousemove);
        document.addEventListener("touchmove", onmousemove);
        document.addEventListener("mouseup", onmouseup);
        document.addEventListener("touchend", onmouseup);

        const { x, y } = pointer2tl(cxy.clientX, cxy.clientY);
        dragstart(target, x, y);

        e.stopPropagation();
    }, [dragstart, dragendref, dontcramp, style]);

    const child = Children.only(children);
    return <>
        {!isValidElement(child) ? child : cloneElement(child as ReactElement/* FIXME */, {
            onMouseDown,
            onTouchStart: onMouseDown,
            style: { ...child.props?.style, ...style },
        })}
    </>;
};

export default Draggable;
