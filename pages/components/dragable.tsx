import { cloneElement, Fragment, FunctionComponent, h, isValidElement, VNode } from 'preact';
import { Children } from 'preact/compat';
import { useCallback, useState } from 'preact/hooks';

export const clamp = (num: number, min: number, max: number) => Math.min(Math.max(num, min), max);

const Draggable: FunctionComponent = ({ children }) => {
    const [style, setStyle] = useState<{ left?: string, top?: string, position: string, userSelect: string; }>({
        // left: "0px",
        // top: "0px",
        position: "absolute",
        userSelect: "none",  // don't select text on dragging!
    });

    const onMouseDown = useCallback((e: MouseEvent) => {
        const target: HTMLElement = e.currentTarget! as HTMLElement;
        const posT = target.getBoundingClientRect();
        const posP = target.parentElement!.getBoundingClientRect();
        const shiftX = e.clientX - posT.x;  // this should not offset(parent-relative) but client-pos(client-relative)
        const shiftY = e.clientY - posT.y;  // ditto

        const onmousemove = (e: MouseEvent) => {
            const x = clamp(Math.round(e.clientX - shiftX - posP.x), 0, posP.width - posT.width);
            const y = clamp(Math.round(e.clientY - shiftY - posP.y), 0, posP.height - posT.height);

            setStyle({
                ...style,
                left: `${x}px`,
                top: `${y}px`,
            });
        };

        const onmouseup = () => {
            document.removeEventListener("mousemove", onmousemove);
            document.removeEventListener("mouseup", onmouseup);
        };

        document.addEventListener("mousemove", onmousemove);
        document.addEventListener("mouseup", onmouseup);

        e.stopPropagation();
    }, [children, style]);

    const child = Children.only(children);
    return <>
        {!isValidElement(child) ? child : cloneElement(child, {
            onMouseDown,
            style: { ...(child as VNode<{ style?: object; /* how about string? */ }>).props?.style, ...style },
        })}
    </>;
};

export default Draggable;
