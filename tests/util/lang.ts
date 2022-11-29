export const times = (n: number) => <T>(fn: (i: number) => T) => {
    const result = [];
    for (let i = 0; i < n; i++) {
        result.push(fn(i));
    }
    return result;
}