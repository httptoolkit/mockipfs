/*
 * SPDX-FileCopyrightText: 2022 Tim Perry <tim@httptoolkit.tech>
 * SPDX-License-Identifier: Apache-2.0
 */

import {
    expect,
    MockIPFS,
    IPFS,
    HTTPError,
    itValue,
    delay
} from '../test-setup';

describe("IPNS mocking", () => {

    const mockNode = MockIPFS.getLocal();

    beforeEach(() => mockNode.start());
    afterEach(() => mockNode.stop());

    it("refuses to resolve all names by default", async () => {
        const ipfsClient = IPFS.create(mockNode.ipfsOptions);

        const result: HTTPError = await itValue(ipfsClient.name.resolve('ipfs.io'))
            .catch(e => e);

        expect(result).to.be.instanceOf(HTTPError);
        expect(result.response.status).to.equal(500);
        expect(result.message).to.equal("queryTxt ENOTFOUND _dnslink.ipfs.io");
    });

    it("can resolve names when requested", async () => {
        await mockNode.forNameResolve('ipfs.io').thenResolveTo("/ipfs/mock-address");

        const ipfsClient = IPFS.create(mockNode.ipfsOptions);

        const result: string = await itValue(ipfsClient.name.resolve('ipfs.io'))
            .catch(e => e);

        expect(result).to.equal("/ipfs/mock-address");
    });

    it("can overide all name resolution", async () => {
        await mockNode.forNameResolve().thenResolveTo("/ipfs/mock-address");

        const ipfsClient = IPFS.create(mockNode.ipfsOptions);

        const result: string = await itValue(ipfsClient.name.resolve('any-name.test'))
            .catch(e => e);

        expect(result).to.equal("/ipfs/mock-address");
    });

    it("can change name resolution", async () => {
        await mockNode.forNameResolve('ipfs.io').thenResolveTo("/ipfs/initial-mock-address");
        await mockNode.forNameResolve('ipfs.io').thenResolveTo("/ipfs/subsequent-mock-address");

        const ipfsClient = IPFS.create(mockNode.ipfsOptions);

        let result: string;

        result = await itValue(ipfsClient.name.resolve('ipfs.io'))
            .catch(e => e);
        expect(result).to.equal("/ipfs/initial-mock-address");

        result = await itValue(ipfsClient.name.resolve('ipfs.io'))
            .catch(e => e);
        expect(result).to.equal("/ipfs/subsequent-mock-address");
    });

    it("can timeout name resolution", async () => {
        await mockNode.forNameResolve('ipfs.io').thenTimeout();

        const ipfsClient = IPFS.create(mockNode.ipfsOptions);

        const lookup = itValue(ipfsClient.name.resolve('ipfs.io'));

        expect(await Promise.race([
            lookup,
            delay(500).then(() => 'timeout')
        ])).to.equal('timeout');
    });

    it("accepts all name publications by default", async () => {
        const ipfsClient = IPFS.create(mockNode.ipfsOptions);

        const result = await ipfsClient.name.publish('/ipfs/content', { key: 'mock-ipns-name' });

        expect(result).to.deep.equal({ name: 'mock-ipns-name', value: '/ipfs/content' });
    });

    it("can timeout name publications", async () => {
        await mockNode.forNamePublish('mykey').thenTimeout();

        const ipfsClient = IPFS.create(mockNode.ipfsOptions);

        const publish = ipfsClient.name.publish('/ipfs/content', { key: 'mykey' });

        expect(await Promise.race([
            publish,
            delay(500).then(() => 'timeout')
        ])).to.equal('timeout');
    });

    it("can explicitly accept name publications", async () => {
        await mockNode.forNamePublish('mykey').thenAcceptPublish();
        await mockNode.forNamePublish().thenTimeout();

        const ipfsClient = IPFS.create(mockNode.ipfsOptions);

        const result = await ipfsClient.name.publish('/ipfs/content', { key: 'mykey' });

        expect(result).to.deep.equal({ name: 'mock-ipns-name', value: '/ipfs/content' });
    });

    it("can accept name publications with an explicit resulting name", async () => {
        await mockNode.forNamePublish('mykey').thenAcceptPublishAs("ipns-hash");

        const ipfsClient = IPFS.create(mockNode.ipfsOptions);

        const result = await ipfsClient.name.publish('/ipfs/content', { key: 'mykey' });

        expect(result).to.deep.equal({ name: 'ipns-hash', value: '/ipfs/content' });
    });

    it("can match 'self' name publication", async () => {
        await mockNode.forNamePublish('self').thenAcceptPublishAs('self-name');

        const ipfsClient = IPFS.create(mockNode.ipfsOptions);

        const defaultResult = await ipfsClient.name.publish('/ipfs/content'); // Self is the default
        expect(defaultResult).to.deep.equal({ name: 'self-name', value: '/ipfs/content' });

        const explicitResult = await ipfsClient.name.publish('/ipfs/content', { key: 'self' }); // Can be explicit
        expect(explicitResult).to.deep.equal({ name: 'self-name', value: '/ipfs/content' });
    });

    it("can record name resolutions", async () => {
        await mockNode.forNameResolve('ipfs.io')
            .thenResolveTo("/ipfs/mock-address");

        const ipfsClient = IPFS.create(mockNode.ipfsOptions);

        await itValue(ipfsClient.name.resolve('ipfs.io'));
        await itValue(ipfsClient.name.resolve('does-not-exist')).catch(() => {});

        expect(await mockNode.getIPNSQueries()).to.deep.equal([
            { name: "ipfs.io" },
            { name: "does-not-exist" },
        ]);
    });

    it("can record name publication", async () => {
        const ipfsClient = IPFS.create(mockNode.ipfsOptions);

        await ipfsClient.name.publish('/ipfs/content-hash');
        await ipfsClient.name.publish('/ipfs/named-content-hash', { key: 'custom-key' });

        expect(await mockNode.getIPNSPublications()).to.deep.equal([
            { name: null, value: '/ipfs/content-hash' },
            { name: 'custom-key', value: '/ipfs/named-content-hash' }
        ]);
    });

});