import { useEffect } from "react";
import { useDragLayer } from "react-dnd";
import InstNode from "./instnode";
import TmplNode from "./tmplnode";

const DraggingPreview = () => {
    const { type, item, offset } = useDragLayer(monitor => ({
        type: monitor.getItemType(),
        item: monitor.getItem(),
        offset: monitor.getDifferenceFromInitialOffset(),
    }));

    useEffect(() => console.dir({ type, item, offset }), [type, item, offset]);

    return <div style={{ position: "absolute", left: 0, top: 0, width: "100%", height: "100%", pointerEvents: "none" }}>
        <div style={{ width: "min-content", ...(!offset ? {} : { transform: `translate(${offset.x}px,${offset.y}px)` }) }}>
            {({
                "InstNode": <InstNode {...item} preview />,
                "TmplNode": <TmplNode {...item} preview />,
            } as any)[type!]}
        </div>
    </div>;
};

export default DraggingPreview;
