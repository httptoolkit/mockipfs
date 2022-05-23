/*
 * SPDX-FileCopyrightText: 2022 Tim Perry <tim@httptoolkit.tech>
 * SPDX-License-Identifier: Apache-2.0
 */

import * as Mockttp from "mockttp"

export class CatMock {

    constructor(
        private mockttpServer: Mockttp.Mockttp
    ) {}

    addMockttpFallbackRules() {
        return this.mockttpServer.addRequestRules({
            priority: Mockttp.RulePriority.FALLBACK,
            matchers: [
                new Mockttp.matchers.MethodMatcher(Mockttp.Method.POST),
                new Mockttp.matchers.SimplePathMatcher('/api/v0/cat')
            ],
            completionChecker: new Mockttp.completionCheckers.Always(),
            handler: new Mockttp.requestHandlers.TimeoutHandler()
        });
    }

    async getQueriedContent(seenRequests: Mockttp.CompletedRequest[]) {
        const relevantRequests = seenRequests
            .filter((request) => request.path.startsWith('/api/v0/cat'));

        return Promise.all(relevantRequests.map(async (req) => {
            const parsedURL = new URL(req.url)
            return { path: parsedURL.searchParams.get('arg')! };
        }));
    }
}