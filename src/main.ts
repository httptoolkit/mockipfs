import * as mockttp from 'mockttp';
import { MockIpfsNode } from './mockipfs-node';

export function getLocal(options?: mockttp.MockttpOptions) {
    return new MockIpfsNode(mockttp.getLocal(options));
}

export function getRemote(options?: mockttp.MockttpClientOptions) {
    return new MockIpfsNode(mockttp.getRemote(options));
}

export function getStandalone(options?: mockttp.StandaloneServerOptions) {
    return mockttp.getStandalone(options);
}