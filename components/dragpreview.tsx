import { useDragLayer, XYCoord } from "react-dnd";
import InstNode from "./instnode";
import TmplNode from "./tmplnode";

const plusxy = (a: XYCoord, b: XYCoord) => ({ x: a.x + b.x, y: a.y + b.y });

const DraggingPreview = () => {
    const { type, item, offset } = useDragLayer(monitor => ({
        type: monitor.getItemType(),
        item: monitor.getItem(),
        offset: plusxy(
            monitor.getInitialSourceClientOffset() || { x: 0, y: 0 },
            monitor.getDifferenceFromInitialOffset() || { x: 0, y: 0 }),
    }));

    return <div style={{ position: "absolute", left: 0, top: 0, width: "100%", height: "100%", pointerEvents: "none" }}>
        <div style={{ width: "min-content", transform: `translate(${offset.x}px,${offset.y}px)` }}>
            {({
                // "InstNode": <InstNode {...item} preview />,
                "TmplNode": <TmplNode {...item} plugHandlers={{ dragstart: () => "" }} plugStateTuple={[{}, () => { }]} preview />,
            } as any)[type!]}
        </div>
    </div>;
};

export default DraggingPreview;
