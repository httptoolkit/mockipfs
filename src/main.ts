/*
 * SPDX-FileCopyrightText: 2022 Tim Perry <tim@httptoolkit.tech>
 * SPDX-License-Identifier: Apache-2.0
 */

import * as mockttp from 'mockttp';
import {
    MockIPFSNode,
    MockIPFSOptions
} from './mockipfs-node';

export function getLocal(options?: mockttp.MockttpOptions & MockIPFSOptions) {
    return new MockIPFSNode(mockttp.getLocal(options), options);
}

export function getRemote(options?: mockttp.MockttpClientOptions & MockIPFSOptions) {
    return new MockIPFSNode(mockttp.getRemote(options), options);
}

export function getAdminServer(options?: mockttp.MockttpAdminServerOptions) {
    return mockttp.getAdminServer(options);
}

export { mockCid } from './utils/ipfs';

export type {
    MockIPFSNode,
    MockIPFSOptions
};