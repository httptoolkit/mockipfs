/*
 * SPDX-FileCopyrightText: 2022 Tim Perry <tim@httptoolkit.tech>
 * SPDX-License-Identifier: Apache-2.0
 */

declare const WorkerGlobalScope: Function | undefined;
export const isWorker = typeof WorkerGlobalScope !== 'undefined' && self instanceof WorkerGlobalScope;
export const isWeb = typeof Window !== 'undefined' && self instanceof Window;
export const isNode = !isWorker && !isWeb && typeof process === 'object' && process.version;

// Get the length of the given data in bytes, not characters.
// If that's a buffer, the length is used raw, but if it's a string
// it returns the length when encoded as UTF8.
export function byteLength(input: string | Uint8Array | Buffer) {
    if (typeof input === 'string') {
        return isNode
            ? Buffer.from(input, 'utf8').byteLength
            : new Blob([input]).size;
    } else {
        return input.length;
    }
}