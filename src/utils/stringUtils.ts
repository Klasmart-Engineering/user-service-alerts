/**
 * A deterministic version of JSON.stringify() that ignores the order of properties.
 */
 export function objectToKey<T extends Record<string, unknown>>(obj: T) {
    return JSON.stringify(obj, Object.keys(obj).sort())
}