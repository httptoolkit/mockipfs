/*
 * SPDX-FileCopyrightText: 2022 Tim Perry <tim@httptoolkit.tech>
 * SPDX-License-Identifier: Apache-2.0
 */

import { Mockttp, RulePriority } from "mockttp";

import { IPNSActionBuilder } from "./ipns/ipns-rule-builder";
import { IPNSMock } from "./ipns/ipns-mock";

import { CatRuleBuilder } from "./cat-rule-builder";

export class MockIPFSNode {

    private ipnsMock: IPNSMock;

    constructor(
        private mockttpServer: Mockttp,
    ) {
        // Can't initialize this in the field or it breaks in ESBuild's browser output
        this.ipnsMock = new IPNSMock(this.mockttpServer)
    }

    async start() {
        this.reset();
        await this.mockttpServer.start();
        await this.addBaseRules();
    }

    async stop() {
        await this.mockttpServer.stop();
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

    private async addBaseRules() {
        this.ipnsMock.addMockttpFallbackRules();

        // The real default IPFS cat behaviour seems to be just timing out:
        this.mockttpServer.forPost('/api/v0/cat')
            .asPriority(RulePriority.FALLBACK)
            .thenTimeout();
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