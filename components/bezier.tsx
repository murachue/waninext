import { FunctionComponent, PropsWithChildren, useCallback, useEffect, useRef, useState } from "react";
import style from "./bezier.module.css";

const clamp = (num: number, min: number, max: number) => Math.min(Math.max(num, min), max);

const dcode = [0, -1, 0, 1, 0] as const;
export const TOP = 0, LEFT = 1, BOTTOM = 2, RIGHT = 3;
export type Direction = typeof TOP | typeof LEFT | typeof BOTTOM | typeof RIGHT;
const dir2dxy = (code: Direction): [number, number] => dcode.slice(code, code + 2) as [number, number];
const nametodcode = { top: TOP, left: LEFT, bottom: BOTTOM, right: RIGHT } as const;
type DirName = keyof typeof nametodcode;
const name2dir = (name: DirName) => (nametodcode[name] ?? (() => { throw new Error(`unexpected direction ${name}`); })());

const endXY = (el: HTMLElement, container: HTMLElement, direction: Direction, offset?: number) => {
    const rect = el.getBoundingClientRect();
    const pRect = container.getBoundingClientRect();

    const offsetX = rect.width / 2 + (offset || 0);
    const offsetY = rect.height / 2 + (offset || 0);

    const x = rect.x - pRect.x;
    const y = rect.y - pRect.y;

    const [dx, dy] = dir2dxy(direction);
    const horizontal = direction & 1;
    return {
        x: x + (horizontal ? 0 : offsetX) + Math.max(dx, 0) * rect.width,
        y: y + (horizontal ? offsetY : 0) + Math.max(dy, 0) * rect.height,
    };
};

export type ConnectionSetting = {
    side: DirName;
    offset?: number;
};

export type Setting = {
    from: string;
    to: string;
    positions: {
        start: ConnectionSetting;
        end: ConnectionSetting;
    };
    class?: string;
};

const getLine = (setting: Setting, container: HTMLElement | null) => {
    const a = document.getElementById(setting.from);
    const b = document.getElementById(setting.to);

    if (!a || !b || !container) {
        // throw new Error(`items not found: ${JSON.stringify(setting)}`);
        return {
            cord0: { x: 0, y: 0 },
            cord1: { x: 0, y: 0 },
            cord2: { x: 0, y: 0 },
            cord3: { x: 0, y: 0 },
            class: setting.class,
        };
    }

    const cord0 = endXY(a, container, name2dir(setting.positions.start.side), setting.positions.start.offset);
    const cord3 = endXY(b, container, name2dir(setting.positions.end.side), setting.positions.end.offset);

    const halfX = Math.abs(cord3.x - cord0.x) / 2;
    const halfY = Math.abs(cord3.y - cord0.y) / 2;
    const clampX = clamp(halfX, 30, 100);
    const clampY = clamp(halfY, 30, 100);

    const [sdx, sdy] = dir2dxy(name2dir(setting.positions.start.side));
    const [edx, edy] = dir2dxy(name2dir(setting.positions.end.side));

    return {
        cord0,
        cord1: {
            x: cord0.x + sdx * clampX,
            y: cord0.y + sdy * clampY,
        },
        cord2: {
            x: cord3.x + edx * clampX,
            y: cord3.y + edy * clampY,
        },
        cord3,
        class: setting.class,
    };
};

type Line = ReturnType<typeof getLine>;

export const Bezier: FunctionComponent<PropsWithChildren<{ settings: Setting[]; }>> = ({ settings, children }) => {
    const container = useRef<HTMLDivElement>(null);
    // Be Object to be fast partial updatable array.
    const [lines, setLines] = useState<Record<string, Line>>({});
    const [id2settings, setId2settings] = useState<Record<string, Setting[]>>({});

    // bezier-line updater
    const updateLinesObj = useCallback((partofSettings: Setting[], oldLinesObj: typeof lines = {}) => {
        const newLinesObj = partofSettings.reduce<typeof lines>((results, v) => {
            return {
                ...results,
                [`${v.from};${v.to}`]: { ...getLine(v, container.current) },
            };
        }, {});

        setLines({ ...oldLinesObj, ...newLinesObj });
    }, [setLines]);

    // initialize/update-settings updates
    useEffect(() => {
        updateLinesObj(settings); // reset
        setId2settings(settings.reduce<typeof id2settings>((group, v) => ({
            ...group,
            [v.from]: [...(group[v.from] || []), v],
            [v.to]: [...(group[v.to] || []), v],
        }), {}));
    }, [updateLinesObj, settings]);

    // out-of-preact mutation observer (and updates lines)
    useEffect(() => {
        if (!container.current) return;

        const observer = new MutationObserver((data) => {
            let setList = new Set<Setting>();

            for (const v of data) {
                const target = v.target as HTMLElement;
                // if it is connected, update it.
                if (id2settings[target.id]) {
                    id2settings[target.id].forEach(e => setList.add(e));
                } else {
                    const html = target.innerHTML;
                    if (!html) {
                        continue;
                    }
                    // update if it contains connected, roughly.
                    const matchAll = html.matchAll(/id=['"`](.+?)['"`]/g);
                    const ids = Array.from(matchAll).map(match => match[1]);
                    for (const id of ids) {
                        if (id2settings[id]) {
                            id2settings[id].forEach(e => setList.add(e));
                        }
                    }
                }
            }
            const settings = Array.from(setList); // dedupe
            if (settings.length) {
                window.requestAnimationFrame(() => updateLinesObj(settings, lines));
            }
        });

        observer.observe(container.current, {
            attributes: true,
            characterData: true,
            subtree: true,
            childList: true,
        });
        return () => {
            observer.disconnect();
        };
    }, [id2settings, lines, updateLinesObj]);

    return (
        <div ref={container} className={style.container}>
            <svg className={style.bezierLine}>
                {Object.entries(lines).map(([id, line]) =>
                    <path key={id} className={line.class} d={
                        `M${line.cord0.x} ${line.cord0.y}` +
                        `C${line.cord1.x} ${line.cord1.y}` +
                        `,${line.cord2.x} ${line.cord2.y}` +
                        `,${line.cord3.x} ${line.cord3.y}`} />
                )}
            </svg>

            {children}
        </div>
    );
};

export default Bezier;
