import * as Mockttp from "mockttp"

type MockttpRequestCallback = (request: Mockttp.CompletedRequest) =>
    Promise<Mockttp.requestHandlers.CallbackResponseResult>;

type IPNSResolveRequest = { type: 'resolve', name: string | null };
type IPNSPublishRequest = { type: 'publish', name: string | null, value: string };

export type IPNSRequest =
    | IPNSResolveRequest
    | IPNSPublishRequest;

export type IPNSAction =
    | { type: 'resolve', path: string, delay?: number }
    | { type: 'reject' }
    | { type: 'implicit-timeout' };

const successResponse = (path: string) => ({
    status: 200,
    headers: {
        // Workaround for https://github.com/nodejs/undici/issues/1414 in Node 18
        'transfer-encoding': 'chunked',
        // Workaround for https://github.com/nodejs/undici/issues/1415 in Node 18
        'connection': 'keep-alive'
    },
    json: { Path: path }
});

const notFoundResponse = (name: string) => ({
    status: 500,
    headers: {
        // Workaround for https://github.com/nodejs/undici/issues/1414 in Node 18
        'transfer-encoding': 'chunked',
        // Workaround for https://github.com/nodejs/undici/issues/1415 in Node 18
        'connection': 'keep-alive'
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
        // Workaround for https://github.com/nodejs/undici/issues/1414 in Node 18
        'transfer-encoding': 'chunked',
        // Workaround for https://github.com/nodejs/undici/issues/1415 in Node 18
        'connection': 'keep-alive'
    },
    json: {
        Message: message,
        Code: 1,
        Type: "error"
    }
});

export class IPNSMock {

    private hostnameActions: {
        [key: string]: Array<IPNSAction> | undefined
    } = {};

    private seenRequests: Array<IPNSRequest> = [];

    constructor(
        private recordTraffic: boolean = true
    ) {}

    async addAction(name: string, action: IPNSAction): Promise<void> {
        const existingActions = this.hostnameActions[name] ??= [];
        existingActions.push(action);
    }

    reset() {
        this.hostnameActions = {};
        this.seenRequests = [];
    }

    buildMockttpRules(): Array<Mockttp.RequestRuleData> {
        return [
            ...['/api/v0/name/resolve', '/api/v0/resolve'].map((resolvePath) => ({
                matchers: [
                    new Mockttp.matchers.MethodMatcher(Mockttp.Method.POST),
                    new Mockttp.matchers.SimplePathMatcher(resolvePath)
                ],
                completionChecker: new Mockttp.completionCheckers.Always(),
                handler: new Mockttp.requestHandlers.CallbackHandler(this.resolveHandler)
            })),
            {
                matchers: [
                    new Mockttp.matchers.MethodMatcher(Mockttp.Method.POST),
                    new Mockttp.matchers.SimplePathMatcher('/api/v0/name/publish')
                ],
                completionChecker: new Mockttp.completionCheckers.Always(),
                handler: new Mockttp.requestHandlers.CallbackHandler(this.publishHandler)
            }
        ];
    }

    resolveHandler: MockttpRequestCallback = async (request: Mockttp.CompletedRequest) => {
        const parsedURL = new URL(request.url);
        const name = parsedURL.searchParams.get('arg');

        if (this.recordTraffic) {
            this.seenRequests.push({ type: 'resolve', name });
        }

        if (!name) {
            return badRequestResponse("Invalid request query input");
        }

        const actions = this.hostnameActions[name];
        if (!actions?.length) {
            return notFoundResponse(name);
        } else {
            const selectedAction = actions[0];

            // If you define multiple actions for the same hostname, we run through them until
            // the last action, which repeats indefinitely:
            if (actions.length > 1) actions.shift();

            switch (selectedAction.type) {
                case 'resolve':
                    return successResponse(selectedAction.path);
                case 'reject':
                    return notFoundResponse(name);
                case 'implicit-timeout': // I.e. server never responds at all
                    return new Promise(() => {});
                default:
                    throw new Error(`Unrecognized IPNS action type: ${(selectedAction as any).type}`);
            }
        }
    };

    publishHandler: MockttpRequestCallback = async (request: Mockttp.CompletedRequest) => {
        const parsedURL = new URL(request.url);

        const value = parsedURL.searchParams.get('arg')!;
        const name = parsedURL.searchParams.get('key');

        if (this.recordTraffic) this.seenRequests.push({ type: 'publish', name, value });

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

    getIPNSQueries() {
        return this.seenRequests
            .filter((request) => request.type === 'resolve')
            .map((request) => ({ name: request.name }));
    }

    getIPNSPublications() {
        return this.seenRequests
            .filter((request): request is IPNSPublishRequest => request.type === 'publish')
            .map((request) => ({ name: request.name, value: request.value }));
    }

}