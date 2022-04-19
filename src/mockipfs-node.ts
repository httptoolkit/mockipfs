import { Mockttp, matchers as mockttpMatchers } from "mockttp";

import { IPNSActionBuilder } from "./ipns/ipns-action-builder";
import { IPNSMock } from "./ipns/ipns-mock";

import { RuleBuilder } from "./rule-builder";

export interface MockIPFSOptions {
    /**
     * The hostname that will be used for the IPFS node. This can be any
     * DNS or IP address that resolves to this node.
     *
     * If set, this hostname will be returned in ipfsOptions() and the
     * mock IPFS behaviour will apply only to requests explicitly sent
     * to this hostname.
     *
     * This can be useful when accessing the IPFS mock node remotely, or
     * when using this alongside Mockttp, to ensure that IPFS mocks do
     * not interfere with other HTTP traffic mocked elsewhere.
     */
    nodeHostname?: string;
};

export class MockIPFSNode {

    private readonly hostname: string | undefined;

    constructor(
        private mockttpServer: Mockttp,
        options: MockIPFSOptions = {}
    ) {
        this.hostname = options.nodeHostname;

        this.addBaseRules();
    }

    start() {
        this.reset();
        return this.mockttpServer.start();
    }

    stop() {
        this.mockttpServer.stop();
    }

    reset() {
        this.mockttpServer.reset();
        this.ipnsMock.reset();

        this.addBaseRules();
    };

    get ipfsOptions() {
        return {
            protocol: 'http',
            host: this.hostname,
            port: this.mockttpServer.port
        };
    }

    private ipnsMock = new IPNSMock();

    private addBaseRules() {
        const ipnsRules = this.ipnsMock.buildMockttpRules();

        if (this.hostname) {
            ipnsRules.forEach(r => r.matchers.push(new mockttpMatchers.HostnameMatcher(this.hostname!)));
        }

        this.mockttpServer.addRequestRules(...ipnsRules);
    }

    forName(name: string) {
        return new IPNSActionBuilder(this.ipnsMock.addAction.bind(this.ipnsMock, name));
    }

    forCat(ipfsPath?: string) {
        let catRuleBuilder = this.mockttpServer.forPost('/api/v0/cat')

        if (this.hostname) {
            catRuleBuilder = catRuleBuilder.forHostname(this.hostname);
        }

        if (ipfsPath !== undefined) {
            catRuleBuilder = catRuleBuilder.withQuery({ arg: ipfsPath });
        }

        return new RuleBuilder(catRuleBuilder);
    }

    async getIPNSQueries(): Promise<Array<{ name: string | null }>> {
        return this.ipnsMock.getIPNSQueries();
    }

    async getIPNSPublications(): Promise<Array<{ name: string | null, value: string }>> {
        return this.ipnsMock.getIPNSPublications();
    }
}