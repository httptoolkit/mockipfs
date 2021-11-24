import * as mockttp from 'mockttp';
import { MockIpfsNode } from './mockipfs-node';

export function getLocal() {
    return new MockIpfsNode(mockttp.getLocal());
}

export function getRemote() {
    return new MockIpfsNode(mockttp.getLocal());
}

export function getStandalone() {
    return mockttp.getStandalone();
}