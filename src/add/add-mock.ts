/*
 * SPDX-FileCopyrightText: 2022 Tim Perry <tim@httptoolkit.tech>
 * SPDX-License-Identifier: Apache-2.0
 */

import * as Mockttp from "mockttp"
import { buildIpfsStreamResponse, MultipartPart, parseMultipartBody } from "../utils/http";
import { mockCid } from "../utils/ipfs";

type MockttpRequestCallback = (request: Mockttp.CompletedRequest) =>
    Promise<Mockttp.requestHandlers.CallbackResponseResult>;

export const mockAddResultPart = (part: MultipartPart, cid = mockCid()) => ({
    Name: decodeURIComponent(part.filename ?? '') || cid,
    Hash: cid,
    Size: -1
});

/**
 * Defines default behaviour for IPFS add APIs, convenient methods for creating rules
 * from the rule-builder data, and query methods to find and expose relevant request
 * data from a list of collected HTTP requests.
 */
export class AddMock {

    constructor(
        private mockttpServer: Mockttp.Mockttp
    ) {}

    addMockttpFallbackRules() {
        return this.mockttpServer.addRequestRules({
            priority: Mockttp.RulePriority.FALLBACK,
            matchers: [
                new Mockttp.matchers.MethodMatcher(Mockttp.Method.POST),
                new Mockttp.matchers.SimplePathMatcher('/api/v0/add')
            ],
            completionChecker: new Mockttp.completionCheckers.Always(),
            handler: new Mockttp.requestHandlers.CallbackHandler(this.defaultHandler)
        });
    }

    defaultHandler: MockttpRequestCallback = async (req: Mockttp.CompletedRequest) => {
        const addedParts = parseMultipartBody((await req.body.getDecodedBuffer())!, req.headers);

        return buildIpfsStreamResponse(200,
            ...addedParts.map((part) => mockAddResultPart(part))
        );
    };

    addAddRule = async (ruleData: Mockttp.RequestRuleData) => {
        await this.mockttpServer.addRequestRules({
            ...ruleData,
            matchers: [
                ...ruleData.matchers,
                new Mockttp.matchers.MethodMatcher(Mockttp.Method.POST),
                new Mockttp.matchers.SimplePathMatcher('/api/v0/add')
            ]
        });
    };

    async getAddedContent(seenRequests: Mockttp.CompletedRequest[]) {
        const relevantRequests = seenRequests
            .filter((request) => request.path.startsWith('/api/v0/add'));

        return (await Promise.all(relevantRequests.map(async (req) => {
            const addedParts = parseMultipartBody((await req.body.getDecodedBuffer())!, req.headers);

            return addedParts.map((part) => ({
                path: part.filename ? decodeURIComponent(part.filename) : undefined,
                content: part.data
            }));
        }))).flat();
    }

}