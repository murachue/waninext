import { Setting } from "./bezier";

export type PinType = {
    name: string;
    type: "channels" | "param" | "string";
    choice?: string[];
};

export type NodeType = {
    type: string;
    inputs: PinType[];
    outputs: PinType[];
};
export const NodeTypes: NodeType[] = [
    {
        type: "output",
        inputs: [{ name: "sound", type: "channels" }],
        outputs: [],
    },
    {
        type: "oscillator",
        inputs: [
            { name: "frequency", type: "param" },
            { name: "type", type: "string", choice: ["sine", "square", "sawtooth", "triangle", "custom"] },
        ],
        outputs: [],
    },
    {
        type: "biquad",
        inputs: [
            { name: "sound", type: "channels" },
            { name: "frequency", type: "param" },
            { name: "q", type: "param" },
            { name: "gain", type: "param" },
            { name: "type", type: "string", choice: ["lowpass", "highpass", "bandpass", "lowshelf", "highshelf", "peaking", "notch", "allpass"] },
        ],
        outputs: [
            { name: "sound", type: "channels" },
        ],
    },
];

export type InConnection = {
    nodeNo: number;
    outNo: number;
};

export type ConnInput = {
    connectFrom: InConnection;
};

export type ConstInput = {
    value: number;
};

export type Input = ConnInput | ConstInput;

export type NodeState = {
    type: NodeType;  /* referencing shared NodeTypes[number] */
    inputs: Input[];
};

export const INPUT = "i", OUTPUT = "o";
export const genPlugId = (nodeNo: number, io: typeof INPUT | typeof OUTPUT, pinNo: number) => `${nodeNo}${io}${pinNo}`;

export const stateToBezierLinks: (state: NodeState[]) => Setting[] =
    state => state.flatMap(
        (node, inode) => node.inputs
            .map((c, i): [Input, number] => [c, i])
            .filter((ci): ci is [ConnInput, number] => "connectFrom" in ci[0])
            .map/* <Setting> */(
                ([input, iinput]) => ({
                    from: genPlugId(input.connectFrom.nodeNo, OUTPUT, input.connectFrom.outNo),
                    to: genPlugId(inode, INPUT, iinput),
                    positions: {
                        start: { side: "right" },
                        end: { side: "left" },
                    },
                })));
