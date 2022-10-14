export const clonesplice1 = <T,>(target: T[], i: number) => [...target.slice(0, i), ...target.slice(i + 1)];

export const cloneset = <T/* extends array|object */,>(target: T, path: (number | string)[], value: unknown): T => {
    if (path.length < 1) {
        throw new Error(`empty path: ${JSON.stringify(path)}`);
    }
    const [path0, ...pathr] = path;
    if (pathr.length < 1) {
        if (Array.isArray(target)) {
            if (typeof path0 !== "number") {
                throw new Error(`path must be number: ${path0}`);
            }
            return [...target.slice(0, path0), value, ...target.slice(path0 + 1)] as T;
        } else {
            return { ...target, [path0]: value } as T;
        }
    }
    if (Array.isArray(target)) {
        if (typeof path0 !== "number") {
            throw new Error(`path must be number: ${path0}`);
        }
        return [...target.slice(0, path0), cloneset(target[path0], pathr, value), ...target.slice(path0 + 1)] as T;
    } else {
        return { ...target, [path0]: cloneset((target as any)[path0], pathr, value) } as T;
    }
};

export const clonemap = <T/* extends array|object */,>(target: T, path: (number | string)[], map: (v: any) => unknown): T => {
    if (path.length < 1) {
        throw new Error(`empty path: ${JSON.stringify(path)}`);
    }
    const [path0, ...pathr] = path;
    if (pathr.length < 1) {
        if (Array.isArray(target)) {
            if (typeof path0 !== "number") {
                throw new Error(`path must be number: ${path0}`);
            }
            return [...target.slice(0, path0), map(target[path0]), ...target.slice(path0 + 1)] as T;
        } else {
            return { ...target, [path0]: map((target as any)[path0]) } as T;
        }
    }
    if (Array.isArray(target)) {
        if (typeof path0 !== "number") {
            throw new Error(`path must be number: ${path0}`);
        }
        return [...target.slice(0, path0), cloneset(target[path0], pathr, map), ...target.slice(path0 + 1)] as T;
    } else {
        return { ...target, [path0]: cloneset((target as any)[path0], pathr, map) } as T;
    }
};

export const cloneunset = <K extends string, T extends object>(target: T, dels: K[]): Omit<T, K> => {
    return Object.fromEntries(Object.entries(target).filter(([k, v]) => !dels.includes(k as K))) as Omit<T, K>;
};
