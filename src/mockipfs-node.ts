/*
 * SPDX-FileCopyrightText: 2022 Tim Perry <tim@httptoolkit.tech>
 * SPDX-License-Identifier: Apache-2.0
 */

import * as Mockttp from "mockttp";

import { CatRuleBuilder } from "./cat-rule-builder";

import { IPNSMock } from "./ipns/ipns-mock";
import { NamePublishRuleBuilder } from "./ipns/name-publish-rule-builder";
import { NameResolveRuleBuilder } from "./ipns/name-resolve-rule-builder";

import { PinningMock } from "./pinning/pinning-mock";
import { PinAddRuleBuilder } from "./pinning/pin-add-rule-builder";
import { PinRmRuleBuilder } from "./pinning/pin-rm-rule-builder";
import { PinLsRuleBuilder } from "./pinning/pin-ls-rule-builder";
import { AddMock } from "./add/add-mock";
import { AddRuleBuilder } from "./add/add-rule-builder";

export class MockIPFSNode {

    private ipnsMock: IPNSMock;
    private pinningMock: PinningMock;
    private addMock: AddMock;

    private seenRequests: Mockttp.CompletedRequest[] = []

    constructor(
        private mockttpServer: Mockttp.Mockttp,
    ) {
        // Can't initialize this in the field or it breaks in ESBuild's browser output
        this.ipnsMock = new IPNSMock(this.mockttpServer)
        this.pinningMock = new PinningMock(this.mockttpServer);
        this.addMock = new AddMock(this.mockttpServer);
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
        await Promise.all([
            this.mockttpServer.on('request', this.onRequest),

            this.ipnsMock.addMockttpFallbackRules(),
            this.pinningMock.addMockttpFallbackRules(),
            this.addMock.addMockttpFallbackRules(),

            // The real default IPFS cat behaviour seems to be just timing out:
            this.mockttpServer.forPost('/api/v0/cat')
                .asPriority(Mockttp.RulePriority.FALLBACK)
                .thenTimeout()
        ]);
    }

    private onRequest = (request: Mockttp.CompletedRequest) => {
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

    forAdd(...content: Array<
        | string
        | Uint8Array
        | { path: string, content?: string | Uint8Array }
    >) {
        return new AddRuleBuilder(
            content,
            this.addMock.addAddRule
        );
    }

    forNameResolve(name?: string) {
        return new NameResolveRuleBuilder(
            name,
            this.ipnsMock.addResolveRule
        );
    }

    forNamePublish(nameKey?: string) {
        return new NamePublishRuleBuilder(
            nameKey,
            this.ipnsMock.addPublishRule
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

    forPinLs() {
        return new PinLsRuleBuilder(
            this.pinningMock.addPinLsRule
        );
    }

    async getAddedContent(): Promise<Array<{ path?: string, content?: Uint8Array }>> {
        return this.addMock.getAddedContent(this.seenRequests);
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