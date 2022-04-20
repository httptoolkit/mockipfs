import {
    expect,
    MockIPFS,
    IPFS,
    HTTPError,
    itValue,
    delay
} from '../test-setup';

describe("IPFS cat mocking", () => {

    const mockNode = MockIPFS.getLocal({ debug: true });

    beforeEach(() => mockNode.start());
    afterEach(() => mockNode.stop());

    it("should time out for all content by default", async () => {
        const ipfsClient = IPFS.create(mockNode.ipfsOptions);

        const result = itValue(ipfsClient.cat('ipfs.io'));

        expect(await Promise.race([
            result,
            delay(200).then(() => 'timeout')
        ])).to.equal('timeout');
    });

    it("should return mocked content for a given id", async () => {
        await mockNode.forCat('mock-id').thenReturn('mock-response');

        const ipfsClient = IPFS.create(mockNode.ipfsOptions);

        const result = await itValue(ipfsClient.cat('mock-id'));

        expect(Buffer.from(result).toString()).to.equal('mock-response');
    });

    it("should not return mocked content for the wrong id", async () => {
        await mockNode.forCat('mock-id').thenReturn('mock-response');

        const ipfsClient = IPFS.create(mockNode.ipfsOptions);

        const result = itValue(ipfsClient.cat('wrong-id'));

        expect(await Promise.race([
            result,
            delay(200).then(() => 'timeout')
        ])).to.equal('timeout');
    });

});