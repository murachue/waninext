import { useEffect } from "react";
import { useDragLayer } from "react-dnd";
import InstNode from "./instnode";
import TmplNode from "./tmplnode";

const DraggingPreview = () => {
    const { type, item, offset } = useDragLayer(monitor => ({
        type: monitor.getItemType(),
        item: monitor.getItem(),
        offset: monitor.getClientOffset(),
    }));

    useEffect(() => console.log({ type, item, offset }), [type, item, offset]);

    return <div style={!offset ? { display: "none" } : { position: "absolute", left: 0, top: 0, width: "100%", height: "100%", pointerEvents: "none" }}>
        <div style={!offset ? {} : { transform: `translate(${offset.x},${offset.y})` }}>
            {({ "InstNode": <InstNode {...item} />, "TmplNode": <TmplNode {...item} /> } as any)[type!]}
        </div>
    </div>;
};

export default DraggingPreview;
