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
        await mockNode.forName('ipfs.io').thenResolveTo("/ipfs/mock-address");

        const ipfsClient = IPFS.create(mockNode.ipfsOptions);

        const result: string = await itValue(ipfsClient.name.resolve('ipfs.io'))
            .catch(e => e);

        expect(result).to.equal("/ipfs/mock-address");
    });

    it("can overide all name resolution", async () => {
        await mockNode.forName().thenResolveTo("/ipfs/mock-address");

        const ipfsClient = IPFS.create(mockNode.ipfsOptions);

        const result: string = await itValue(ipfsClient.name.resolve('any-name.test'))
            .catch(e => e);

        expect(result).to.equal("/ipfs/mock-address");
    });

    it("can change name resolution", async () => {
        await mockNode.forName('ipfs.io').thenResolveTo("/ipfs/initial-mock-address");
        await mockNode.forName('ipfs.io').thenResolveTo("/ipfs/subsequent-mock-address");

        const ipfsClient = IPFS.create(mockNode.ipfsOptions);

        let result: string;

        result = await itValue(ipfsClient.name.resolve('ipfs.io'))
            .catch(e => e);
        expect(result).to.equal("/ipfs/initial-mock-address");

        result = await itValue(ipfsClient.name.resolve('ipfs.io'))
            .catch(e => e);
        expect(result).to.equal("/ipfs/subsequent-mock-address");
    });

    it("can timeout request resolution", async () => {
        await mockNode.forName('ipfs.io').thenTimeout();

        const ipfsClient = IPFS.create(mockNode.ipfsOptions);

        const lookup = itValue(ipfsClient.name.resolve('ipfs.io'));

        expect(await Promise.race([
            lookup,
            delay(500).then(() => 'timeout')
        ])).to.equal('timeout');
    });

    it("accepts all name publications by default", async () => {
        const ipfsClient = IPFS.create(mockNode.ipfsOptions);

        const result = await ipfsClient.name.publish('/ipfs/content', { key: 'ipns-key' });

        expect(result).to.deep.equal({ name: 'ipns-key', value: '/ipfs/content' });
    });

    it("can record name resolutions", async () => {
        await mockNode.forName('ipfs.io')
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