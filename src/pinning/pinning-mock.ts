/*
 * SPDX-FileCopyrightText: 2022 Tim Perry <tim@httptoolkit.tech>
 * SPDX-License-Identifier: Apache-2.0
 */

import * as Mockttp from "mockttp"
import { buildIpfsFixedValueResponse, IpfsStreamHandlerDefinition } from "../utils/http";

type MockttpRequestCallback = (request: Mockttp.CompletedRequest) =>
    Promise<Mockttp.requestHandlers.CallbackResponseResult>;

/**
 * Defines default behaviour for IPFS pin APIs, convenient methods for creating rules
 * from the rule-builder data, and query methods to find and expose relevant request
 * data from a list of collected HTTP requests.
 */
export class PinningMock {

    constructor(
        private mockttpServer: Mockttp.Mockttp
    ) {}

    async addMockttpFallbackRules() {
        await Promise.all([
            this.mockttpServer.addRequestRules({
                priority: Mockttp.RulePriority.FALLBACK,
                matchers: [
                    new Mockttp.matchers.MethodMatcher(Mockttp.Method.POST),
                    new Mockttp.matchers.SimplePathMatcher('/api/v0/pin/add')
                ],
                completionChecker: new Mockttp.completionCheckers.Always(),
                handler: new Mockttp.requestHandlers.CallbackHandler(this.defaultAddRmHandler)
            }),
            this.mockttpServer.addRequestRules({
                priority: Mockttp.RulePriority.FALLBACK,
                matchers: [
                    new Mockttp.matchers.MethodMatcher(Mockttp.Method.POST),
                    new Mockttp.matchers.SimplePathMatcher('/api/v0/pin/rm')
                ],
                completionChecker: new Mockttp.completionCheckers.Always(),
                handler: new Mockttp.requestHandlers.CallbackHandler(this.defaultAddRmHandler)
            }),
            this.mockttpServer.addRequestRules({
                priority: Mockttp.RulePriority.FALLBACK,
                matchers: [
                    new Mockttp.matchers.MethodMatcher(Mockttp.Method.POST),
                    new Mockttp.matchers.SimplePathMatcher('/api/v0/pin/ls')
                ],
                completionChecker: new Mockttp.completionCheckers.Always(),
                handler: new IpfsStreamHandlerDefinition(200)
            })
        ]);
    }

    defaultAddRmHandler: MockttpRequestCallback = async (request: Mockttp.CompletedRequest) => {
        const parsedURL = new URL(request.url);

        const value = parsedURL.searchParams.get('arg')!;

        return buildIpfsFixedValueResponse(200, { Pins: [value] });
    };

    addPinAddRule = async (ruleData: Mockttp.RequestRuleData) => {
        await this.mockttpServer.addRequestRules({
            ...ruleData,
            matchers: [
                ...ruleData.matchers,
                new Mockttp.matchers.MethodMatcher(Mockttp.Method.POST),
                new Mockttp.matchers.SimplePathMatcher('/api/v0/pin/add')
            ]
        });
    };

    addPinRmRule = async (ruleData: Mockttp.RequestRuleData) => {
        await this.mockttpServer.addRequestRules({
            ...ruleData,
            matchers: [
                ...ruleData.matchers,
                new Mockttp.matchers.MethodMatcher(Mockttp.Method.POST),
                new Mockttp.matchers.SimplePathMatcher('/api/v0/pin/rm')
            ]
        });
    };

    addPinLsRule = async (ruleData: Mockttp.RequestRuleData) => {
        await this.mockttpServer.addRequestRules({
            ...ruleData,
            matchers: [
                ...ruleData.matchers,
                new Mockttp.matchers.MethodMatcher(Mockttp.Method.POST),
                new Mockttp.matchers.SimplePathMatcher('/api/v0/pin/ls')
            ]
        });
    };

    async getAddedPins(seenRequests: Mockttp.Request[]) {
        const relevantRequests = seenRequests
            .filter((req) => req.path.startsWith('/api/v0/pin/add'));

        return relevantRequests.map((request) => {
            const parsedURL = new URL(request.url)
            return { cid: parsedURL.searchParams.get('arg')! };
        });
    }

    async getRemovedPins(seenRequests: Mockttp.Request[]) {
        const relevantRequests = seenRequests
            .filter((req) => req.path.startsWith('/api/v0/pin/rm'));

        return relevantRequests.map((request) => {
            const parsedURL = new URL(request.url)
            return { cid: parsedURL.searchParams.get('arg')! };
        });
    }

}