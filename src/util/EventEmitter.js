export default class EventEmitter extends EventTarget {

    #subsMap = new Map();

    emit(name, ...args) {
        const event = new Event(name);
        event.data = args;
        super.dispatchEvent(event);
    }

    addEventListener(name, handler) {
        if (typeof handler != "function") {
            throw new TypeError(`handler parameter must be of type "function" but was "${typeof handler}"`);
        }
        if (typeof name != "string") {
            throw new TypeError(`name parameter must be of type "string" but was "${typeof name}"`);
        }
        if (!this.#hasSub(name, handler)) {
            super.addEventListener(name, handler, {capture: false});
            this.#addSub(name, handler);
        }
    }

    removeEventListener(name, handler) {
        if (typeof name != "string") {
            throw new TypeError(`name parameter must be of type "string" but was "${typeof name}"`);
        }
        if (this.#hasSub(name, handler)) {
            super.removeEventListener(name, handler, {capture: false});
            this.#deleteSub(name, handler);
        }
    }

    removeAllEventListeners(name) {
        if (name != null) {
            if (this.#subsMap.has(name)) {
                const subs = this.#subsMap.get(name);
                for (const handler of subs) {
                    super.removeEventListener(name, handler, {capture: false});
                }
                this.#subsMap.delete(name);
            }
        } else {
            for (const [name, subs] of this.#subsMap) {
                for (const handler of subs) {
                    super.removeEventListener(name, handler, {capture: false});
                }
            }
            this.#subsMap.clear();
        }
    }

    #getSubs(name) {
        if (this.#subsMap.has(name)) {
            return this.#subsMap.get(name);
        }
        const subs = new Set();
        this.#subsMap.set(name, subs);
        return subs;
    }

    #hasSub(name, handler) {
        if (this.#subsMap.has(name)) {
            const subs = this.#subsMap.get(name);
            return subs.has(handler);
        }
        return false;
    }

    #addSub(name, handler) {
        const subs = this.#getSubs(name)
        subs.add(handler);
    }

    #deleteSub(name, handler) {
        if (this.#subsMap.has(name)) {
            const subs = this.#subsMap.get(name);
            subs.delete(handler);
        }
    }

}
