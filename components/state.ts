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
        outputs: [
            { name: "sound", type: "channels" },
        ],
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

export type Input = {
    connectFrom: InConnection | null /* null: not connected */;
    value: number | string | null /* null is only for connect-only */;
};

type ConnectedInput = Input & { connectFrom: NonNullable<Input["connectFrom"]>; };

export type NodeState = {
    type: NodeType;  /* referencing shared NodeTypes[number] */
    inputs: Input[];
};

export const INPUT = "i", OUTPUT = "o";
export const genPlugId = (nodeNo: number, io: typeof INPUT | typeof OUTPUT, pinNo: number) => `n${nodeNo}${io}${pinNo}`;

export const stateToBezierLinks: (state: NodeState[]) => Setting[] =
    state => state.flatMap(
        (node, inode) => node.inputs
            .map((c, i): [Input, number] => [c, i])
            .filter((ci): ci is [ConnectedInput, number] => !!ci[0].connectFrom)
            .map/* <Setting> */(
                ([input, iinput]) => ({
                    from: genPlugId(input.connectFrom.nodeNo, OUTPUT, input.connectFrom.outNo),
                    to: genPlugId(inode, INPUT, iinput),
                    positions: {
                        start: { side: "right" },
                        end: { side: "left" },
                    },
                })));

export const newState: (typename: string) => NodeState = typename => {
    const type = NodeTypes.find(e => e.type === typename);
    if (!type) {
        throw new Error(`unknown NodeType ${typename}`);
    }
    return {
        type,
        inputs: type.inputs.map(e =>
            e.type === "channels"
                ? { connectFrom: null, value: null }
                : e.choice
                    ? { connectFrom: null, value: e.choice[0] }
                    : e.type === "param"
                        ? { connectFrom: null, value: 0 }
                        : e.type === "string"
                            ? { connectFrom: null, value: "" }
                            : { connectFrom: null, value: null }),
    };
};
