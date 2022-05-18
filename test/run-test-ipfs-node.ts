/*
 * SPDX-FileCopyrightText: 2022 Tim Perry <tim@httptoolkit.tech>
 * SPDX-License-Identifier: Apache-2.0
 */

import * as Ipfs from 'ipfs';
import * as IpfsHttpServer from 'ipfs-http-server';

export const ipfsNodePromise: Promise<{
    node: Ipfs.IPFS,
    multiaddr: string,
    httpUrl: string,
    shutdown: () => Promise<void>
}> = Ipfs.create({
    config: {
        API: {
            HTTPHeaders: { 'Access-Control-Allow-Origin': ['*'] }
        }
    }
}).then(async (ipfsNode: Ipfs.IPFS) => {
    const ipfsApi = new IpfsHttpServer.HttpApi(ipfsNode);
    await ipfsApi.start();

    const multiaddr = (await ipfsNode.config.getAll())
        .Addresses!.API!

    const [ , , ip, , port] = multiaddr!.split('/');
    const httpUrl = `http://${ip}:${port}`;

    return {
        node: ipfsNode,
        multiaddr,
        httpUrl,
        shutdown: () => Promise.all([ipfsNode.stop(), ipfsApi.stop()])
    };
});