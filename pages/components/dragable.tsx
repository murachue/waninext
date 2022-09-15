import { Children, cloneElement, Dispatch, FunctionComponent, isValidElement, MouseEvent as RMouseEvent, PropsWithChildren, SetStateAction, useCallback, useRef, useState } from "react";

export const clamp = (num: number, min: number, max: number) => Math.min(Math.max(num, min), max);

const Draggable: FunctionComponent<PropsWithChildren<{
    dontcramp?: boolean;
    dragstart?: (e: HTMLElement, x: number, y: number) => void;
    dragend?: (e: HTMLElement, x: number, y: number, setStyle: Dispatch<SetStateAction<any>>) => void;
}>> = ({ dontcramp, dragstart, dragend, children }) => {
    const [style, setStyle] = useState<{ left?: string, top?: string, position: string, userSelect: string; }>({
        // left: "0px",
        // top: "0px",
        position: "absolute",
        userSelect: "none",  // don't select text on dragging!
    });
    const dragendref = useRef(dragend); // poor initval...
    dragendref.current = dragend;

    const onMouseDown = useCallback((e: RMouseEvent) => {
        const target: HTMLElement = e.currentTarget! as HTMLElement;
        const posT = target.getBoundingClientRect();
        const posP = target.parentElement!.getBoundingClientRect();
        const shiftX = e.clientX - posT.x;  // this should not offset(parent-relative) but client-pos(client-relative)
        const shiftY = e.clientY - posT.y;  // ditto

        const onmousemove = (e: MouseEvent) => {
            const rawx = Math.round(e.clientX - shiftX - posP.x);
            const rawy = Math.round(e.clientY - shiftY - posP.y);
            const x = dontcramp ? rawx : clamp(rawx, 0, posP.width - posT.width);
            const y = dontcramp ? rawy : clamp(rawy, 0, posP.height - posT.height);

            setStyle({
                ...style,
                left: `${x}px`,
                top: `${y}px`,
            });
        };

        const onmouseup = (e: MouseEvent) => {
            document.removeEventListener("mousemove", onmousemove);
            document.removeEventListener("mouseup", onmouseup);

            dragendref.current && dragendref.current(e.currentTarget! as HTMLElement, e.clientX, e.clientY, setStyle);
        };

        document.addEventListener("mousemove", onmousemove);
        document.addEventListener("mouseup", onmouseup);

        dragstart && dragstart(target, e.clientX, e.clientY);

        e.stopPropagation();
    }, [dragstart, dragendref, dontcramp, style]);

    const child = Children.only(children);
    return <>
        {!isValidElement(child) ? child : cloneElement(child as any/* FIXME */, {
            onMouseDown,
            style: { ...child.props?.style, ...style },
        })}
    </>;
};

export default Draggable;
