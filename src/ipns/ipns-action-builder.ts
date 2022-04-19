import { IPNSAction } from "./ipns-mock";

export class IPNSActionBuilder {

    constructor(
        private addActionCallback: (action: IPNSAction) => Promise<void>
    ) {}

    thenResolveTo(path: string) {
        return this.addActionCallback({ type: 'resolve', path });
    }

    thenFailToResolve() {
        return this.addActionCallback({ type: 'reject' });
    }

    thenTimeout() {
        return this.addActionCallback({ type: 'implicit-timeout' });
    }

}