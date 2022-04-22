/*
 * SPDX-FileCopyrightText: 2022 Tim Perry <tim@httptoolkit.tech>
 * SPDX-License-Identifier: Apache-2.0
 */

import * as Mockttp from "mockttp"

type MockttpRequestCallback = (request: Mockttp.CompletedRequest) =>
    Promise<Mockttp.requestHandlers.CallbackResponseResult>;

const notFoundResponse = (name: string) => ({
    status: 500,
    headers: {
        // This matches the IPFS headers, and it's also required to work around various
        // Undici fetch + Mockttp minimal response bugs in Node 18
        'transfer-encoding': 'chunked',
        'connection': 'close'
    },
    json: {
        Message: `queryTxt ENOTFOUND _dnslink.${name}`,
        Code: 0,
        Type: 'error'
    }
});

const badRequestResponse = (message: string) => ({
    status: 400,
    headers: {
        // This matches the IPFS headers, and it's also required to work around various
        // Undici fetch + Mockttp minimal response bugs in Node 18
        'transfer-encoding': 'chunked',
        'connection': 'close'
    },
    json: {
        Message: message,
        Code: 1,
        Type: "error"
    }
});

const RESOLVE_PATHS = ['/api/v0/name/resolve', '/api/v0/resolve'];

/**
 * Wraps a set of Mockttp rules, providing an API over them to query their collected
 * traffic, providing fallback rules for default behaviour, and adding base configuration
 * to new rules as they're added.
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

        return {
            status: 200,
            headers: {
                // Workaround for https://github.com/nodejs/undici/issues/1414 in Node 18
                'transfer-encoding': 'chunked',
                // Workaround for https://github.com/nodejs/undici/issues/1415 in Node 18
                'connection': 'keep-alive'
            },
            json: {
                Name: name ?? 'self-ipns-key',
                Value: value
            }
        };
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
