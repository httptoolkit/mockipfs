import * as Mockttp from "mockttp"

type MockttpRequestCallback = (request: Mockttp.CompletedRequest) =>
    Promise<Mockttp.requestHandlers.CallbackResponseResult>;

export type IPNSRequest =
    | { type: 'resolve', name: string | null };

export type IPNSAction =
    | { type: 'resolve', path: string, delay?: number }
    | { type: 'reject' }
    | { type: 'implicit-timeout' };

const successResponse = (path: string) => ({
    status: 200,
    json: { Path: path }
});

const notFoundResponse = (name: string) => ({
    status: 500,
    json: {
        Message: `queryTxt ENOTFOUND _dnslink.${name}`,
        Code: 0,
        Type: 'error'
    }
});

const badRequestResponse = (message: string) => ({
    status: 400,
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
    }

    getIPNSQueries() {
        return this.seenRequests
            .filter((request) => request.type === 'resolve')
            .map((request) => ({ name: request.name }));
    }

}