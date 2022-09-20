import { useEffect } from "react";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { TouchBackend } from "react-dnd-touch-backend";
import style from "./app.module.css";
import Desk from "./desk";
import DraggingPreview from "./dragpreview";
import TmplNode from "./tmplnode";

const App = () => {

    useEffect(() => {
        const context = new AudioContext({ sampleRate: 44010 });
        return () => { context.close(); };
    }, []);

    return <div id="app">
        <DndProvider backend={HTML5Backend}>
            <Desk />
            <div style={{ position: "absolute", left: 0, top: 0, width: "100%", border: "1px solid #ccc", background: "#444c", overflow: "visible" }}>
                <TmplNode inputs={[null]} outputs={[]}>
                    <div className={style.nodecontainer}>
                        <div className={style.node}>output</div>
                    </div>
                </TmplNode>
            </div>
            <DraggingPreview />
        </DndProvider>
    </div >;
};

export default App;
