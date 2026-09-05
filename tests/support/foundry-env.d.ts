/**
 * Foundry globals available inside `page.evaluate`.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

declare global {
  /** Undefined until Foundry boots, hence the optional chaining at call sites. */
  const game: any;
  /** Core config, including CONFIG.FFG. */
  const CONFIG: any;
  /** Notifications and open applications. */
  const ui: any;
  /** The v13 namespaced API root. */
  const foundry: any;
  /** Hook registration. */
  const Hooks: any;
  /** e.g. CONST.USER_ROLES */
  const CONST: any;

  /** Loaded by the system as a plain script - see system.json "scripts". */
  const JSZip: any;
  const JXON: any;

  const Actor: any;
  const Item: any;
  const ChatMessage: any;
  const Macro: any;
  const Roll: any;

  /** Resolve a document by UUID. Returns null if it's not there. */
  function fromUuid(uuid: string, options?: Record<string, unknown>): Promise<any>;

  interface Window {
    /** Set by the system on init - see swffg-main.js. */
    DicePoolFFG: any;
    game: any;
  }
}

export {};
