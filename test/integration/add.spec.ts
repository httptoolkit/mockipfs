/*
 * SPDX-FileCopyrightText: 2022 Tim Perry <tim@httptoolkit.tech>
 * SPDX-License-Identifier: Apache-2.0
 */

import {
    expect,
    MockIPFS,
    IPFS,
    delay,
    itAll
} from '../test-setup';

describe("IPFS add mocking", () => {

    const mockNode = MockIPFS.getLocal();

    beforeEach(() => mockNode.start());
    afterEach(() => mockNode.stop());

    it("accepts all content additions by default", async () => {
        const ipfsClient = IPFS.create(mockNode.ipfsOptions);

        const result = await ipfsClient.add("test content");

        expect(result.path).to.include('mockXipfsXcid');
        expect(result.cid.toString()).to.include('mockXipfsXcid');
    });

    it("accepts all content additions wtih explicit paths by default", async () => {
        const ipfsClient = IPFS.create(mockNode.ipfsOptions);

        const result = await ipfsClient.add({ path: 'test-path', content: 'test content' });

        expect(result.path).to.include('test-path'); // <-- Uses the given path correctly
        expect(result.cid.toString()).to.include('mockXipfsXcid');
    });

    it("can explicitly accept content addition", async () => {
        await mockNode.forAdd().thenAcceptPublish();

        await mockNode.forAdd().thenCloseConnection();
        // ^-- We add this to make sure the rule is applied, not default behaviour

        const ipfsClient = IPFS.create(mockNode.ipfsOptions);

        const result = await ipfsClient.add('test content');

        expect(result.path).to.include('mockXipfsXcid');
        expect(result.cid.toString()).to.include('mockXipfsXcid');
    });

    it("can explicitly accept content addition with custom hash", async () => {
        await mockNode.forAdd().thenAcceptPublishAs(MockIPFS.mockCid('injectedXipfsXhash'));

        const ipfsClient = IPFS.create(mockNode.ipfsOptions);

        const result = await ipfsClient.add('test content');

        expect(result.path).to.include('injectedXipfsXhash');
        expect(result.cid.toString()).to.include('injectedXipfsXhash');
    });

    it("can explicitly accept content addition with custom names", async () => {
        await mockNode.forAdd().thenAcceptPublishAs([
            { Name: 'test1', Hash: MockIPFS.mockCid('injectedXipfsXhash') },
            { Name: 'test2', Hash: MockIPFS.mockCid('anotherXipfsXhash') },
        ]);

        const ipfsClient = IPFS.create(mockNode.ipfsOptions);

        const results = await itAll(ipfsClient.addAll([
            'test content1',
            'test content2',
        ]));

        expect(results.length).to.equal(2);

        expect(results[0].path).to.equal('test1');
        expect(results[0].cid.toString()).to.include('injectedXipfsXhash');
        expect(results[1].path).to.equal('test2');
        expect(results[1].cid.toString()).to.include('anotherXipfsXhash');
    });

    it("can timeout content addition", async () => {
        await mockNode.forAdd().thenTimeout();

        const ipfsClient = IPFS.create(mockNode.ipfsOptions);

        const publish = ipfsClient.add('test content');

        expect(await Promise.race([
            publish,
            delay(500).then(() => 'timeout')
        ])).to.equal('timeout');
    });

    it("can match specific content addition", async () => {
        await mockNode.forAdd('matching content')
            .thenAcceptPublishAs(MockIPFS.mockCid('matched'));

        const ipfsClient = IPFS.create(mockNode.ipfsOptions);

        const matchingResult = await ipfsClient.add('matching content');
        const otherResult = await ipfsClient.add('other content');

        expect(matchingResult.path).to.include('matched');
        expect(matchingResult.cid.toString()).to.include('matched');
        expect(otherResult.path).to.include('mockXipfsXcid');
        expect(otherResult.cid.toString()).to.include('mockXipfsXcid');
    });

    it("can match specific path addition", async () => {
        await mockNode.forAdd({ path: 'test/doc.txt' })
            .thenAcceptPublishAs(MockIPFS.mockCid('matched'));

        const ipfsClient = IPFS.create(mockNode.ipfsOptions);

        const matchingResult = await ipfsClient.add({ path: 'test/doc.txt' });
        const otherResult = await ipfsClient.add('other content');

        expect(matchingResult.path).to.include('test/doc.txt');
        expect(matchingResult.cid.toString()).to.include('matched');
        expect(otherResult.path).to.include('mockXipfsXcid');
        expect(otherResult.cid.toString()).to.include('mockXipfsXcid');
    });

    it("can match specific path & content addition", async () => {
        await mockNode.forAdd({ path: 'matching.txt', content: 'matching' })
            .thenAcceptPublishAs(MockIPFS.mockCid('matched'));

        const ipfsClient = IPFS.create(mockNode.ipfsOptions);

        const matchingResult = await ipfsClient.add({ path: 'matching.txt', content: 'matching' });
        const otherContentResult = await ipfsClient.add({ path: 'matching.txt', content: 'other' });
        const otherPathResult = await ipfsClient.add({ path: 'other', content: 'matching' });

        expect(matchingResult.path).to.include('matching.txt');
        expect(matchingResult.cid.toString()).to.include('matched');

        expect(otherContentResult.cid.toString()).to.include('mockXipfsXcid');
        expect(otherPathResult.cid.toString()).to.include('mockXipfsXcid');
    });

    it("can record content addition", async () => {
        const ipfsClient = IPFS.create(mockNode.ipfsOptions);

        await ipfsClient.add("bare content a");
        await itAll(ipfsClient.addAll([
            { path: 'dir/a.txt', content: "file a" },
            { path: 'dir/b.txt', content: "file b" },
            "bare content b"
        ]));

        const addedContent = await mockNode.getAddedContent();

        expect(addedContent.length).to.equal(4);

        expect(addedContent.map(({ path, content }) => ({
            path,
            content: content?.toString()
        }))).to.deep.equal([
            { path: undefined, content: 'bare content a' },
            { path: 'dir/a.txt', content: 'file a' },
            { path: 'dir/b.txt', content: 'file b' },
            { path: undefined, content: 'bare content b' },
        ]);
    });

});