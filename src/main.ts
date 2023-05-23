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

// Export various internal types:
export type { AddRuleBuilder, ContentDefinition } from './add/add-rule-builder';
export type { CatRuleBuilder } from './cat/cat-rule-builder';
export type { NamePublishRuleBuilder } from './ipns/name-publish-rule-builder';
export type { NameResolveRuleBuilder } from './ipns/name-resolve-rule-builder';
export type { PinAddRuleBuilder } from './pinning/pin-add-rule-builder';
export type { PinLsRuleBuilder } from './pinning/pin-ls-rule-builder';
export type { PinRemoteLsRuleBuilder } from './pinning/pin-remote-ls-rule-builder';
export type { PinRmRuleBuilder } from './pinning/pin-rm-rule-builder';

export type { MockedIPFSEndpoint } from './mocked-endpoint';