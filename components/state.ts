import { Setting } from "./bezier";

export type PinType = {
    name: string;
    param?: string | null;
    unit?: string;
    type: "channels" | "param" | "scalar" | "buffer";
    choice?: string[];
    default?: string;
};

export type NodeType = {
    inputs: PinType[];
    outputs: PinType[];
    make: (ctx: AudioContext) => AudioNode;
};
export const NodeTypes: Record<string, NodeType> = {
    "output": {
        inputs: [{ name: "sound", param: null, type: "channels" }],
        outputs: [],
        make: (ctx) => ctx.destination,
    },
    "oscillator": {
        inputs: [
            { name: "freq", param: "frequency", type: "param", default: "440", unit: "Hz" },
            { name: "type", type: "scalar", choice: ["sine", "square", "sawtooth", "triangle", "custom"] },
        ],
        outputs: [{ name: "sound", param: null, type: "channels" },],
        make: (ctx) => new OscillatorNode(ctx),
    },
    /* "buffer": {
        inputs: [
            { name: "freq", param: "frequency", type: "param", default: "440", unit: "Hz" },
        ],
        outputs: [{ name: "buffer", param: null, type: "buffer" },],
        make: (ctx) => new AudioBuffer(),
    },
    "sampler": {
        inputs: [
            { name: "buffer", type: "buffer" },
            { name: "loop", type: "param", default: false, choice: [false, true] },
            { name: "loopStart", type: "param", default: "0", unit: "sec" },
            { name: "loopEnd", type: "param", default: "0", unit: "sec" },
            { name: "rate", param: "playbackRate", type: "param", default: "1" },
        ],
        outputs: [{ name: "sound", param: null, type: "channels" }],
        make: ctx => new AudioBufferSourceNode(ctx),
    }, */
    "gain": {
        inputs: [
            { name: "sound", type: "channels" },
            { name: "gain", type: "param", default: "1" },
        ],
        outputs: [{ name: "sound", param: null, type: "channels" },],
        make: (ctx) => new GainNode(ctx),
    },
    "biquad": {
        inputs: [
            { name: "sound", type: "channels" },
            { name: "freq", param: "frequency", type: "param", default: "8000", unit: "Hz" },
            { name: "q", param: "Q", type: "param", default: "0" },
            { name: "gain", type: "param", default: "1" },
            { name: "type", type: "scalar", choice: ["lowpass", "highpass", "bandpass", "lowshelf", "highshelf", "peaking", "notch", "allpass"] },
        ],
        outputs: [{ name: "sound", param: null, type: "channels" },],
        make: (ctx) => new BiquadFilterNode(ctx),
    },
    "delay": {
        inputs: [
            { name: "sound", type: "channels" },
            { name: "time", param: "delayTime", type: "param", default: "1", unit: "sec" },
        ],
        outputs: [{ name: "sound", param: null, type: "channels" },],
        make: ctx => new DelayNode(ctx),
    },
    "compressor": {
        inputs: [
            { name: "sound", type: "channels" },
            { name: "threshold", type: "param", default: "-24", unit: "dB" },
            { name: "knee", type: "param", default: "30", unit: "dB" },
            { name: "ratio", type: "param", default: "12", unit: "dB" },
            { name: "attack", type: "param", default: "0.003", unit: "sec" },
            { name: "release", type: "param", default: "0.25", unit: "sec" },
        ],
        outputs: [{ name: "sound", param: null, type: "channels" },],
        make: ctx => new DynamicsCompressorNode(ctx),
    },
    "panner": {
        inputs: [
            { name: "sound", type: "channels" },
            { name: "pan", type: "param", default: "0", unit: "right" },
        ],
        outputs: [{ name: "sound", param: null, type: "channels" },],
        make: ctx => new StereoPannerNode(ctx),
    },
    // pseudo WebAudio node for more pure...
    "add": {
        inputs: [
            { name: "sound", type: "channels" },
            { name: "sound", type: "channels" },
        ],
        outputs: [{ name: "sound", param: null, type: "channels" },],
        make: (ctx) => new GainNode(ctx),
    },
};

export type PinLocation = {
    nodeNo: number;
    pinNo: number;
};

export type Input = {
    connectFrom: PinLocation | null /* null: not connected */;
    value: number | string | null /* null is only for connect-only */;
};

type ConnectedInput = Input & { connectFrom: NonNullable<Input["connectFrom"]>; };

export type NodeState = {
    type: string;
    inputs: Input[];
    invalid: boolean;
};

export const INPUT = "i", OUTPUT = "o";
export const genPlugId = (nodeNo: number, io: typeof INPUT | typeof OUTPUT, pinNo: number, type: NodeType["inputs"][number]["type"]) => {
    const ty = type === "buffer" ? "b" : "c"; // no "param"
    return `n${nodeNo}${io}${pinNo}${ty}`;
};
export const parseInputPlugId = (id: string) => {
    const match = /^n([0-9]+)i([0-9]+)([a-z])$/.exec(id);
    if (!match) {
        return null;
    }

    return { nodeNo: parseInt(match[1]), pinNo: parseInt(match[2]), type: match[3] };
};
export const parseOutputPlugId = (id: string) => {
    const match = /^n([0-9]+)o([0-9]+)([a-z])$/.exec(id);
    if (!match) {
        return null;
    }

    return { nodeNo: parseInt(match[1]), pinNo: parseInt(match[2]), type: match[3] };
};

export const stateToBezierLinks: (state: NodeState[]) => Setting[] =
    state => state.flatMap(
        (node, inode) => node.inputs
            .map((c, i): [Input, number] => [c, i])
            .filter((ci): ci is [ConnectedInput, number] => !!ci[0].connectFrom)
            .map/* <Setting> */(
                ([input, iinput]) => ({
                    from: genPlugId(input.connectFrom.nodeNo, OUTPUT, input.connectFrom.pinNo, NodeTypes[state[input.connectFrom.nodeNo].type].outputs[input.connectFrom.pinNo].type),
                    to: genPlugId(inode, INPUT, iinput, NodeTypes[node.type].inputs[iinput].type),
                    positions: {
                        start: { side: "right" },
                        end: { side: "left" },
                    },
                })));

export const newState: (typename: string) => NodeState = typename => {
    const type = NodeTypes[typename];
    if (!type) {
        throw new Error(`unknown NodeType ${typename}`);
    }
    return {
        type: typename,
        inputs: type.inputs.map(e =>
            e.type === "channels"
                ? { connectFrom: null, value: null }
                : e.choice
                    ? { connectFrom: null, value: e.default ?? e.choice[0] }
                    : e.type === "param" || e.type === "scalar"
                        ? { connectFrom: null, value: e.default ?? null }
                        : { connectFrom: null, value: null }),
        invalid: false,
    };
};
