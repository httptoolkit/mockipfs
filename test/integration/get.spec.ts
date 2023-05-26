/*
 * SPDX-FileCopyrightText: 2022 Tim Perry <tim@httptoolkit.tech>
 * SPDX-License-Identifier: Apache-2.0
 */

import {
    expect,
    MockIPFS,
    IpfsClient,
    itValue,
    delay
} from '../test-setup';

describe("IPFS get mocking", () => {

    const mockNode = MockIPFS.getLocal();

    beforeEach(() => mockNode.start());
    afterEach(() => mockNode.stop());

    it("should time out for all content by default", async () => {
        const ipfsClient = IpfsClient.create(mockNode.ipfsOptions);

        const result = itValue(ipfsClient.get('ipfs.io'));

        expect(await Promise.race([
            result,
            delay(200).then(() => 'timeout')
        ])).to.equal('timeout');
    });

    it("should return mocked content for a given id", async () => {
        await mockNode.forGet('mock-id').thenReturn('mock-response');

        const ipfsClient = IpfsClient.create(mockNode.ipfsOptions);

        const result = await itValue(ipfsClient.get('mock-id'));

        expect(Buffer.from(result).toString()).to.equal('mock-response');
    });

    it("should not return mocked content for the wrong id", async () => {
        await mockNode.forGet('mock-id').thenReturn('mock-response');

        const ipfsClient = IpfsClient.create(mockNode.ipfsOptions);

        const result = itValue(ipfsClient.get('wrong-id'));

        expect(await Promise.race([
            result,
            delay(200).then(() => 'timeout')
        ])).to.equal('timeout');
    });

    it("should record get queries", async () => {
        await mockNode.forGet().thenReturn('mock-response');

        const ipfsClient = IpfsClient.create(mockNode.ipfsOptions);

        await itValue(ipfsClient.get('an-IPFS-id')).catch(() => {});
        await itValue(ipfsClient.get('another-id')).catch(() => {});

        expect(await mockNode.getQueriedContent()).to.deep.equal([
            { path: 'an-IPFS-id' },
            { path: 'another-id' }
        ]);
    });

});