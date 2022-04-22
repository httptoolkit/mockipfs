/*
 * SPDX-FileCopyrightText: 2022 Tim Perry <tim@httptoolkit.tech>
 * SPDX-License-Identifier: Apache-2.0
 */

import * as Mockttp from "mockttp"
import { buildIpfsFixedValueResponse } from "../utils/http";

type MockttpRequestCallback = (request: Mockttp.CompletedRequest) =>
    Promise<Mockttp.requestHandlers.CallbackResponseResult>;

const notFoundResponse = (name: string) => buildIpfsFixedValueResponse(500, {
    Message: `queryTxt ENOTFOUND _dnslink.${name}`,
    Code: 0,
    Type: 'error'
});

const badRequestResponse = (message: string) => buildIpfsFixedValueResponse(400, {
    Message: message,
    Code: 1,
    Type: "error"
});

const RESOLVE_PATHS = ['/api/v0/name/resolve', '/api/v0/resolve'];

/**
 * Defines default behaviour for IPNS APIs, convenient methods for creating the rules
 * from the rule-builder data, and query methods to find and expose relevant request
 * data from a list of collected HTTP requests.
 */
export class IPNSMock {

    constructor(
        private mockttpServer: Mockttp.Mockttp
    ) {}

    async addMockttpFallbackRules() {
        await Promise.all([
            this.mockttpServer.addRequestRules({
                priority: Mockttp.RulePriority.FALLBACK,
                matchers: [
                    new Mockttp.matchers.MethodMatcher(Mockttp.Method.POST),
                    new Mockttp.matchers.SimplePathMatcher('/api/v0/name/publish')
                ],
                completionChecker: new Mockttp.completionCheckers.Always(),
                handler: new Mockttp.requestHandlers.CallbackHandler(this.publishHandler)
            }),

            this.addResolveRule({
                priority: Mockttp.RulePriority.FALLBACK,
                matchers: [], // Both paths are added in addResolveRule
                completionChecker: new Mockttp.completionCheckers.Always(),
                handler: new Mockttp.requestHandlers.CallbackHandler(this.resolveHandler)
            })
        ]);
    }

    addResolveRule = async (ruleData: Mockttp.RequestRuleData) => {
        await this.mockttpServer.addRequestRules(
            ...RESOLVE_PATHS.map((resolvePath) => ({
                ...ruleData,
                matchers: [
                    ...ruleData.matchers,
                    new Mockttp.matchers.MethodMatcher(Mockttp.Method.POST),
                    new Mockttp.matchers.SimplePathMatcher(resolvePath)
                ]
            }))
        );
    };

    resolveHandler: MockttpRequestCallback = async (request: Mockttp.CompletedRequest) => {
        const parsedURL = new URL(request.url);
        const name = parsedURL.searchParams.get('arg');

        if (!name) {
            return badRequestResponse("Invalid request query input");
        }

        return notFoundResponse(name);
    };

    publishHandler: MockttpRequestCallback = async (request: Mockttp.CompletedRequest) => {
        const parsedURL = new URL(request.url);

        const value = parsedURL.searchParams.get('arg')!;
        const name = parsedURL.searchParams.get('key');

        return buildIpfsFixedValueResponse(200, {
            Name: name ?? 'self-ipns-key',
            Value: value
        });
    };

    async getIPNSQueries(seenRequests: Mockttp.Request[]) {
        const relevantRequests = seenRequests
            .filter((request) =>
                RESOLVE_PATHS.some(resolvePath => request.path.startsWith(resolvePath))
            );

        return relevantRequests.map((request) => {
            const parsedURL = new URL(request.url)
            return { name: parsedURL.searchParams.get('arg') };
        });
    }

    async getIPNSPublications(seenRequests: Mockttp.Request[]) {
        const relevantRequests = seenRequests
            .filter((request) => request.path.startsWith('/api/v0/name/publish'));

        return relevantRequests.map((request) => {
            const parsedURL = new URL(request.url)
            return {
                name: parsedURL.searchParams.get('key'),
                value: parsedURL.searchParams.get('arg')!,
            };
        });
    }

}
