import { Mockttp } from "mockttp";

import { RuleBuilder } from "./rule-builder";

export class MockIpfsNode {
    constructor(
        private mockttpServer: Mockttp
    ) {}

    start = () => this.mockttpServer.start();
    stop = () => this.mockttpServer.stop();

    get ipfsOptions() {
        return {
            protocol: 'http',
            host: '127.0.0.1',
            port: this.mockttpServer.port
        };
    }

    forCat(ipfsPath?: string) {
        let catRuleBuilder = this.mockttpServer.post('/api/v0/cat');

        if (ipfsPath !== undefined) {
            catRuleBuilder = catRuleBuilder.withQuery({ arg: ipfsPath });
        }

        return new RuleBuilder(catRuleBuilder);
    }
}