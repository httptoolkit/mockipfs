/*
 * SPDX-FileCopyrightText: 2022 Tim Perry <tim@httptoolkit.tech>
 * SPDX-License-Identifier: Apache-2.0
 */

import * as Mockttp from "mockttp";

import { CatRuleBuilder } from "./cat-rule-builder";
import { IPNSRuleBuilder } from "./ipns/ipns-rule-builder";
import { IPNSMock } from "./ipns/ipns-mock";
import { PinningMock } from "./pinning/pinning-mock";
import { PinAddRuleBuilder } from "./pinning/pin-add-rule-builder";
import { PinRmRuleBuilder } from "./pinning/pin-rm-rule-builder";

export class MockIPFSNode {

    private ipnsMock: IPNSMock;
    private pinningMock: PinningMock;

    private seenRequests: Mockttp.Request[] = []

    constructor(
        private mockttpServer: Mockttp.Mockttp,
    ) {
        // Can't initialize this in the field or it breaks in ESBuild's browser output
        this.ipnsMock = new IPNSMock(this.mockttpServer)
        this.pinningMock = new PinningMock(this.mockttpServer);
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
        this.pinningMock.addMockttpFallbackRules();

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

    forPinAdd(cid?: string) {
        return new PinAddRuleBuilder(
            cid,
            this.pinningMock.addPinAddRule
        );
    }

    forPinRm(cid?: string) {
        return new PinRmRuleBuilder(
            cid,
            this.pinningMock.addPinRmRule
        );
    }

    async getIPNSQueries(): Promise<Array<{ name: string | null }>> {
        return this.ipnsMock.getIPNSQueries(this.seenRequests);
    }

    async getIPNSPublications(): Promise<Array<{ name: string | null, value: string }>> {
        return this.ipnsMock.getIPNSPublications(this.seenRequests);
    }

    async getAddedPins(): Promise<Array<{ cid: string }>> {
        return this.pinningMock.getAddedPins(this.seenRequests);
    }

    async getRemovedPins(): Promise<Array<{ cid: string }>> {
        return this.pinningMock.getRemovedPins(this.seenRequests);
    }
}