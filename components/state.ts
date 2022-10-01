import { Setting } from "./bezier";

export type PinType = {
    name: string;
    param?: string | null;
    unit?: string;
    type: "channels" | "param" | "string";
    choice?: string[];
    default?: string;
};

export type NodeType = {
    type: string;
    inputs: PinType[];
    outputs: PinType[];
    make: (ctx: AudioContext) => AudioNode;
};
export const NodeTypes: NodeType[] = [
    {
        type: "output",
        inputs: [{ name: "sound", param: null, type: "channels" }],
        outputs: [],
        make: (ctx) => ctx.destination,
    },
    {
        type: "oscillator",
        inputs: [
            { name: "freq", param: "frequency", type: "param", default: "440", unit: "Hz" },
            { name: "type", type: "string", choice: ["sine", "square", "sawtooth", "triangle", "custom"] },
        ],
        outputs: [
            { name: "sound", param: null, type: "channels" },
        ],
        make: (ctx) => new OscillatorNode(ctx),
    },
    {
        type: "gain",
        inputs: [
            { name: "sound", type: "channels" },
            { name: "gain", type: "param", default: "1" },
        ],
        outputs: [
            { name: "sound", param: null, type: "channels" },
        ],
        make: (ctx) => new GainNode(ctx),
    },
    {
        type: "biquad",
        inputs: [
            { name: "sound", type: "channels" },
            { name: "freq", param: "frequency", type: "param", default: "8000", unit: "Hz" },
            { name: "q", param: "Q", type: "param", default: "0" },
            { name: "gain", type: "param", default: "1" },
            { name: "type", type: "string", choice: ["lowpass", "highpass", "bandpass", "lowshelf", "highshelf", "peaking", "notch", "allpass"] },
        ],
        outputs: [
            { name: "sound", param: null, type: "channels" },
        ],
        make: (ctx) => new BiquadFilterNode(ctx),
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
export const parseInputPlugId = (id: string) => {
    const match = /^n([0-9]+)i([0-9]+)$/.exec(id);
    if (!match) {
        return null;
    }

    return { nodeNo: parseInt(match[1]), outNo: parseInt(match[2]) };
};
export const parseOutputPlugId = (id: string) => {
    const match = /^n([0-9]+)o([0-9]+)$/.exec(id);
    if (!match) {
        return null;
    }

    return { nodeNo: parseInt(match[1]), outNo: parseInt(match[2]) };
};

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
                    ? { connectFrom: null, value: e.default ?? e.choice[0] }
                    : e.type === "param"
                        ? { connectFrom: null, value: e.default ?? null }
                        : e.type === "string"
                            ? { connectFrom: null, value: e.default ?? null }
                            : { connectFrom: null, value: null }),
    };
};
