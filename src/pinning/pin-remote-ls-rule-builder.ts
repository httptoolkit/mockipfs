/*
 * SPDX-FileCopyrightText: 2022 Tim Perry <tim@httptoolkit.tech>
 * SPDX-License-Identifier: Apache-2.0
 */

import * as Mockttp from "mockttp";
import {
    RemotePinService,
    RemotePinServiceWithStat,
    Stat
} from "ipfs-core-types/src/pin/remote/service";
import {
    buildIpfsFixedValueResponse,
} from "../utils/http";

/**
 * A builder to allow defining rules that will mock IPFS pin remote services ls requests.
 */
export class PinRemoteLsRuleBuilder {

    /**
     * This builder should not be constructed directly. Call `mockNode.forPinRemoteLs()` instead.
     */
    constructor(
        private addRuleCallback: (data: Mockttp.RequestRuleData) => Promise<void>
    ) {}

    /**
     * Return a successful result, returning the given fixed list of remote pinning services. The parameter
     * should be an array of `{ service, endpoint, stat? }` objects, where service is the name of the service,
     * endpoint is the URL of the remote service, and stat is the status and optional pin count object.
     *
     * When a request includes the stat=true querystring parameter return the stat object, otherwise exclude it.
     * Note: if the mock data did not include a stat object, the service is set to have an invalid status.
     *
     * This method completes the rule definition, and returns a promise that resolves once the rule is active.
     */
    thenReturn(values: Array<RemotePinServiceWithStat | RemotePinService>) {
        return this.addRuleCallback({
            matchers: [],
            handler: new Mockttp.requestHandlerDefinitions.CallbackHandlerDefinition((req) => {
                const searchParams = new URL(req.url).searchParams;
                const sendStat = searchParams.get('stat');

                const RemoteServices = values
                    .map(val => {
                        const retVal: ServiceResponse = {
                            Service: val.service,
                            ApiEndpoint: val.endpoint.toString()
                        }
                        if (sendStat === 'true') {
                            retVal.Stat = getStat(val);
                        }
                        return retVal;
                    });

                return buildIpfsFixedValueResponse(200, { RemoteServices });
            })
        });
    }

    /**
     * Timeout, accepting the request but never returning a response.
     *
     * This method completes the rule definition, and returns a promise that resolves once the rule is active.
     */
    thenTimeout() {
        return this.addRuleCallback({
            matchers: [],
            handler: new Mockttp.requestHandlerDefinitions.TimeoutHandlerDefinition()
        });
    }

    /**
     * Close the connection immediately after receiving the matching request, without sending any response.
     *
     * This method completes the rule definition, and returns a promise that resolves once the rule is active.
     */
    thenCloseConnection() {
        return this.addRuleCallback({
            matchers: [],
            handler: new Mockttp.requestHandlerDefinitions.CloseConnectionHandlerDefinition()
        });
    }

}

/**
 * interfaces that matches a real-life http response
 */
interface ServiceResponse {
    Service: string;
    ApiEndpoint: string;
    Stat?: ServiceStat;
}

interface ServiceStat {
    Status: 'valid' | 'invalid';
    PinCount?: {
        Queued: number;
        Pinning: number;
        Pinned: number;
        Failed: number;
    };
}

/**
 * extract the stat from a value given to the mock
 */
function getStat(service: RemotePinServiceWithStat | RemotePinService): ServiceStat {
    // if the mock was not given a stat value use a default of 'invalid' service
    if (!serviceHasStat(service)) {
        return {
            Status: 'invalid'
        };
    }

    const _stat = service.stat;
    const stat: ServiceStat = {
        Status: _stat.status
    };
    // pinCount may not exist for 'invalid'
    if (_stat.pinCount) {
        stat.PinCount = {
            Queued: _stat.pinCount.queued,
            Pinning: _stat.pinCount.pinning,
            Pinned: _stat.pinCount.pinned,
            Failed: _stat.pinCount.failed
        };
    }

    return stat;
}

function serviceHasStat(
    service: RemotePinServiceWithStat | RemotePinService
): service is RemotePinServiceWithStat {
    return (service as RemotePinServiceWithStat).stat !== undefined;
}