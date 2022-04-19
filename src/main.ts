import * as mockttp from 'mockttp';
import {
    MockIPFSNode
} from './mockipfs-node';

export function getLocal(options?: mockttp.MockttpOptions) {
    return new MockIPFSNode(mockttp.getLocal(options));
}

export function getRemote(options?: mockttp.MockttpClientOptions) {
    return new MockIPFSNode(mockttp.getRemote(options));
}

export function getAdminServer(options?: mockttp.MockttpAdminServerOptions) {
    return mockttp.getAdminServer(options);
}