import { Mockttp, RulePriority } from "mockttp";

import { IPNSActionBuilder } from "./ipns/ipns-rule-builder";
import { IPNSMock } from "./ipns/ipns-mock";

import { CatRuleBuilder } from "./cat-rule-builder";

export class MockIPFSNode {

    constructor(
        private mockttpServer: Mockttp,
    ) {}

    async start() {
        this.reset();
        await this.mockttpServer.start();
        await this.addBaseRules();
    }

    stop() {
        this.mockttpServer.stop();
    }

    reset() {
        this.mockttpServer.reset();
        this.ipnsMock.reset();
    };

    get ipfsOptions() {
        return {
            protocol: 'http',
            host: 'localhost',
            port: this.mockttpServer.port
        };
    }

    private ipnsMock = new IPNSMock(this.mockttpServer);

    private async addBaseRules() {
        this.ipnsMock.addMockttpFallbackRules();

    }

    forName(name?: string) {
        return new IPNSActionBuilder(
            name,
            this.ipnsMock.addResolveAction
        );
    }

    forCat(ipfsPath?: string) {
        let catRuleBuilder = this.mockttpServer.forPost('/api/v0/cat');

        if (ipfsPath !== undefined) {
            catRuleBuilder = catRuleBuilder.withQuery({ arg: ipfsPath });
        }

        return new CatRuleBuilder(catRuleBuilder);
    }

    async getIPNSQueries(): Promise<Array<{ name: string | null }>> {
        return this.ipnsMock.getIPNSQueries();
    }

    async getIPNSPublications(): Promise<Array<{ name: string | null, value: string }>> {
        return this.ipnsMock.getIPNSPublications();
    }
}