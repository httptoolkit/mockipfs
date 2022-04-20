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

    private activeResolveRules: Array<Mockttp.MockedEndpoint> = [];
    private activePublishRules: Array<Mockttp.MockedEndpoint> = [];

    constructor(
        private mockttpServer: Mockttp.Mockttp
    ) {}

    reset() {
        this.activeResolveRules = [];
        this.activePublishRules = [];
    }

    async addMockttpFallbackRules() {
        const [publishRule] = await Promise.all([
            this.mockttpServer.addRequestRules({
                priority: Mockttp.RulePriority.FALLBACK,
                matchers: [
                    new Mockttp.matchers.MethodMatcher(Mockttp.Method.POST),
                    new Mockttp.matchers.SimplePathMatcher('/api/v0/name/publish')
                ],
                completionChecker: new Mockttp.completionCheckers.Always(),
                handler: new Mockttp.requestHandlers.CallbackHandler(this.publishHandler)
            }),

            this.addResolveAction({
                priority: Mockttp.RulePriority.FALLBACK,
                matchers: [],
                completionChecker: new Mockttp.completionCheckers.Always(),
                handler: new Mockttp.requestHandlers.CallbackHandler(this.resolveHandler)
            })
        ]);

        this.activePublishRules.push(...publishRule);
    }

    addResolveAction = async (actionRuleData: Mockttp.RequestRuleData) => {
        const rules = await this.mockttpServer.addRequestRules(
            ...RESOLVE_PATHS.map((resolvePath) => ({
                ...actionRuleData,
                matchers: [
                    ...actionRuleData.matchers,
                    new Mockttp.matchers.MethodMatcher(Mockttp.Method.POST),
                    new Mockttp.matchers.SimplePathMatcher(resolvePath)
                ]
            }))
        );

        this.activeResolveRules.push(...rules);
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

    async getIPNSQueries() {
        const seenResolveRequests = (await Promise.all(
            this.activeResolveRules
            .map((rule) => rule.getSeenRequests())
        )).flat();

        sortRequestsByStartTime(seenResolveRequests);

        return seenResolveRequests.map((request) => {
            const parsedURL = new URL(request.url)
            return { name: parsedURL.searchParams.get('arg') };
        });
    }

    async getIPNSPublications() {
        const seenPublishRequests = (await Promise.all(
            this.activePublishRules
            .map((rule) => rule.getSeenRequests())
        )).flat();

        sortRequestsByStartTime(seenPublishRequests);

        return seenPublishRequests.map((request) => {
            const parsedURL = new URL(request.url)
            return {
                name: parsedURL.searchParams.get('key'),
                value: parsedURL.searchParams.get('arg')!,
            };
        });
    }

}

function sortRequestsByStartTime(requests: Mockttp.CompletedRequest[]) {
    requests.sort((r1, r2) =>
        (r1.timingEvents as Mockttp.TimingEvents).startTime - (r2.timingEvents as Mockttp.TimingEvents).startTime
    );
}