/*
 * SPDX-FileCopyrightText: 2022 Tim Perry <tim@httptoolkit.tech>
 * SPDX-License-Identifier: Apache-2.0
 */

import * as Mockttp from "mockttp";

import { CatMock } from "./cat/cat-mock";
import { CatRuleBuilder } from "./cat/cat-rule-builder";
import { AddMock } from "./add/add-mock";
import { AddRuleBuilder } from "./add/add-rule-builder";

import { IPNSMock } from "./ipns/ipns-mock";
import { NamePublishRuleBuilder } from "./ipns/name-publish-rule-builder";
import { NameResolveRuleBuilder } from "./ipns/name-resolve-rule-builder";

import { PinningMock } from "./pinning/pinning-mock";
import { PinAddRuleBuilder } from "./pinning/pin-add-rule-builder";
import { PinRmRuleBuilder } from "./pinning/pin-rm-rule-builder";
import { PinLsRuleBuilder } from "./pinning/pin-ls-rule-builder";
import { PinRemoteLsRuleBuilder } from "./pinning/pin-remote-ls-rule-builder";

export interface MockIPFSOptions {
    /**
     * Specify the behaviour of unmatched requests.
     *
     * By default this is set to `stub`, in which case default responses will be
     * returned, emulating a constantly available but empty IPFS node: all queries
     * will return no data, and all submitted data will be accepted (but ignored).
     *
     * Alternatively, this can be set to an object including a `proxyTo` property,
     * defining the URL of a remote IPFS node to which unmatched requests should be
     * forwarded. In this case all default behaviours will be disabled, and all
     * unmatched requests will receive real responses from that upstream IPFS node.
     */
    unmatchedRequests?:
        | 'stub'
        | { proxyTo: string }
}

/**
 * A MockIPFS node provides default behaviours and allows defining custom behaviour
 * rules to simulate interactions with the IPFS network without requiring a full
 * node or access to the real IPFS network.
 *
 * This should not be created directly: instead, call then `getLocal()` or `getRemote()`
 * methods exported from this module.
 *
 * Once you have a MockIPFS node, you can start defining rules using any of the
 * `forX()` methods. Each method returns a rule builder, allowing you to add extra
 * matching constraints, followed by a `thenX()` final method which enables the rule,
 * returning a promise that resolves once the rule is constructed and active.
 */
export class MockIPFSNode {

    private ipnsMock: IPNSMock;
    private pinningMock: PinningMock;
    private addMock: AddMock;
    private catMock: CatMock;

    private seenRequests: Mockttp.CompletedRequest[] = []

    constructor(
        private mockttpServer: Mockttp.Mockttp,
        private options: MockIPFSOptions = {}
    ) {
        // Can't initialize this in the field or it breaks in ESBuild's browser output
        this.ipnsMock = new IPNSMock(this.mockttpServer)
        this.pinningMock = new PinningMock(this.mockttpServer);
        this.addMock = new AddMock(this.mockttpServer);
        this.catMock = new CatMock(this.mockttpServer);
    }

    /**
     * The node must be started before use. Starting the node resets it, removing any
     * rules that may have been added previously and configuring default behaviours
     * for unmatched requests.
     */
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
        this.mockttpServer.reset();
    }

    /**
     * The IPFS options required to connect to this MockIPFS node. These can be passed
     * directly to `IPFS.create` from ipfs-http-client to create a real IPFS client
     * that connects to this mock node.
     */
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

            ...(!this.options.unmatchedRequests || this.options.unmatchedRequests === 'stub'
            ? [
                this.ipnsMock.addMockttpFallbackRules(),
                this.pinningMock.addMockttpFallbackRules(),
                this.addMock.addMockttpFallbackRules(),
                this.catMock.addMockttpFallbackRules()
            ]
            : [
                this.mockttpServer.forUnmatchedRequest()
                    .thenForwardTo(this.options.unmatchedRequests.proxyTo)
            ])
        ]);
    }

    private onRequest = (request: Mockttp.CompletedRequest) => {
        if (request.path.startsWith('/api/v0')) {
            this.seenRequests.push(request);
        }
    }

    /**
     * Mock IPFS cat requests, returning fake content instead of the
     * real content for the given CID.
     *
     * This takes an optional CID argument. If not provided, the mock
     * will match all cat requests for any CID.
     */
    forCat(cid?: string) {
        let catRuleBuilder = this.mockttpServer.forPost('/api/v0/cat');

        if (cid !== undefined) {
            catRuleBuilder = catRuleBuilder.withQuery({ arg: cid });
        }

        return new CatRuleBuilder(catRuleBuilder);
    }

    /**
     * Mock IPFS add requests, mocking the behaviour of the add command
     * while ensuring that the added content is never actually sent
     * to a real IPFS node.
     */
    forAdd() {
        return this.forAddIncluding();
    }

    /**
     * Mock IPFS add requests containing certain types of content, mocking
     * the behaviour of the add command while ensuring that the added content
     * is never actually sent to a real IPFS node.
     */
    forAddIncluding(...content: Array<
        | string
        | Uint8Array
        | { path: string, content?: string | Uint8Array }
    >) {
        return new AddRuleBuilder(
            content,
            this.addMock.addAddRule
        );
    }

    /**
     * Mock the behaviour of IPNS name resolutions.
     *
     * This takes an optional name argument to match. If not provided, the
     * defined behaviour will apply for all IPFS resolutions for any name.
     */
    forNameResolve(name?: string) {
        return new NameResolveRuleBuilder(
            name,
            this.ipnsMock.addResolveRule
        );
    }

    /**
     * Mock the behaviour of IPNS name publishing.
     *
     * This takes an optional name argument to match. If not provided, the
     * defined behaviour will apply for all IPFS resolutions for any name.
     */
    forNamePublish(nameKey?: string) {
        return new NamePublishRuleBuilder(
            nameKey,
            this.ipnsMock.addPublishRule
        );
    }

    /**
     * Mock the behaviour of IPFS pinning.
     *
     * This takes an optional CID argument. If not provided, the mock
     * will match pinning of any CID.
     */
    forPinAdd(cid?: string) {
        return new PinAddRuleBuilder(
            cid,
            this.pinningMock.addPinAddRule
        );
    }

    /**
     * Mock the behaviour of IPFS pin removal.
     *
     * This takes an optional CID argument. If not provided, the mock
     * will match unpinning of any CID.
     */
    forPinRm(cid?: string) {
        return new PinRmRuleBuilder(
            cid,
            this.pinningMock.addPinRmRule
        );
    }

    /**
     * Mock the behaviour of IPFS pin listing.
     */
    forPinLs() {
        return new PinLsRuleBuilder(
            this.pinningMock.addPinLsRule
        );
    }

    /**
     * Mock the behaviour of IPFS remote pinning service listing.
     */
    forPinRemoteLs() {
        return new PinRemoteLsRuleBuilder(
            this.pinningMock.addPinRemoteLsRule
        );
    }

    /**
     * Get the list of all IPFS CIDs that have been requested
     * from this IPFS mock node since it started.
     */
    async getQueriedContent(): Promise<Array<{ path: string }>> {
        return this.catMock.getQueriedContent(this.seenRequests);
    }

    /**
     * Get the list of all IPFS CIDs & content that have been added to
     * this IPFS mock node since it started.
     */
    async getAddedContent(): Promise<Array<{ path?: string, content?: Uint8Array }>> {
        return this.addMock.getAddedContent(this.seenRequests);
    }

    /**
     * Get the list of all IPNS resolution queries that have been received by
     * this IPFS mock node since it started.
     */
    async getIPNSQueries(): Promise<Array<{ name: string | null }>> {
        return this.ipnsMock.getIPNSQueries(this.seenRequests);
    }

    /**
     * Get the list of all IPNS publications that have been received by
     * this IPFS mock node since it started.
     */
    async getIPNSPublications(): Promise<Array<{ name: string | null, value: string }>> {
        return this.ipnsMock.getIPNSPublications(this.seenRequests);
    }

    /**
     * Get the list of all IPFS pins that have been added to this IPFS mock
     * node since it started.
     */
    async getAddedPins(): Promise<Array<{ cid: string }>> {
        return this.pinningMock.getAddedPins(this.seenRequests);
    }

    /**
     * Get the list of all IPFS pins that have been removed from this IPFS mock
     * node since it started.
     */
    async getRemovedPins(): Promise<Array<{ cid: string }>> {
        return this.pinningMock.getRemovedPins(this.seenRequests);
    }
}