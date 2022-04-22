/*
 * SPDX-FileCopyrightText: 2022 Tim Perry <tim@httptoolkit.tech>
 * SPDX-License-Identifier: Apache-2.0
 */

import * as Mockttp from "mockttp";

import { CatRuleBuilder } from "./cat-rule-builder";
import { IPNSRuleBuilder } from "./ipns/ipns-rule-builder";
import { IPNSMock } from "./ipns/ipns-mock";

export class MockIPFSNode {

    private ipnsMock: IPNSMock;

    private seenRequests: Mockttp.Request[] = []

    constructor(
        private mockttpServer: Mockttp.Mockttp,
    ) {
        // Can't initialize this in the field or it breaks in ESBuild's browser output
        this.ipnsMock = new IPNSMock(this.mockttpServer);
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
        this.seenRequests = [];
    }

    get ipfsOptions() {
        return {
            protocol: 'http',
            host: 'localhost',
            port: this.mockttpServer.port
        };
    }

    private async addBaseRules() {
        await this.mockttpServer.on('request-initiated', this.onRequestInitiated);

        this.ipnsMock.addMockttpFallbackRules();

        // The real default IPFS cat behaviour seems to be just timing out:
        this.mockttpServer.forPost('/api/v0/cat')
            .asPriority(Mockttp.RulePriority.FALLBACK)
            .thenTimeout();
    }

    private onRequestInitiated = (request: Mockttp.InitiatedRequest) => {
        if (request.path.startsWith('/api/v0')) {
            this.seenRequests.push(request);
        }
    }

    forCat(cid?: string) {
        let catRuleBuilder = this.mockttpServer.forPost('/api/v0/cat');

        if (cid !== undefined) {
            catRuleBuilder = catRuleBuilder.withQuery({ arg: cid });
        }

        return new CatRuleBuilder(catRuleBuilder);
    }

    forName(name?: string) {
        return new IPNSRuleBuilder(
            name,
            this.ipnsMock.addResolveRule
        );
    }

    async getIPNSQueries(): Promise<Array<{ name: string | null }>> {
        return this.ipnsMock.getIPNSQueries(this.seenRequests);
    }

    async getIPNSPublications(): Promise<Array<{ name: string | null, value: string }>> {
        return this.ipnsMock.getIPNSPublications(this.seenRequests);
    }
}